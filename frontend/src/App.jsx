import { useState, useEffect } from 'react'
import axios from 'axios'
import { getApiUrl, getWsUrl } from './config'

function App() {
  const [orderType, setOrderType] = useState('market') // 'market' or 'limit'
  const [side, setSide] = useState('buy') // 'buy' or 'sell'
  const [symbol, setSymbol] = useState('BTC')
  const [quantityUsd, setQuantityUsd] = useState('100')
  const [askPrice, setAskPrice] = useState(null)
  const [bidPrice, setBidPrice] = useState(null)
  const [midPrice, setMidPrice] = useState(null)
  const [spread, setSpread] = useState(null)
  const [takeprofit, setTakeprofit] = useState('')
  const [profit, setProfit] = useState('')
  const [stoploss, setStoploss] = useState('')
  const [loss, setLoss] = useState('')
  const [leverage, setLeverage] = useState(10)
  const [tradeMargin, setTradeMargin] = useState(0)
  const [liquidation, setLiquidation] = useState(0)
  const [maintMargin, setMaintMargin] = useState(0)
  const [limitPrice, setLimitPrice] = useState('')
  const [priceError, setPriceError] = useState(null)
  
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [fetchingPrice, setFetchingPrice] = useState(false)

  // Fetch market price (REST or WebSocket)
  useEffect(() => {
    let priceInterval = null
    let wsConnection = null
    let reconnectTimeout = null
    let reconnectAttempts = 0
    const maxReconnectAttempts = 5
    let isSettingUp = false // Flag to prevent duplicate setup
    
    const setupPriceSource = async () => {
      // Prevent duplicate setup
      if (isSettingUp) {
        return
      }
      isSettingUp = true
      
      try {
        // Check current config
        const configResponse = await axios.get(getApiUrl('/api/config'))
        const priceSource = configResponse.data.price_source || 'rest'
        
        // Check localStorage for individual switches
        const storedRest = localStorage.getItem('rest_enabled')
        const storedWebsocket = localStorage.getItem('websocket_enabled')
        const restEnabled = storedRest !== null ? storedRest === 'true' : (configResponse.data.rest_enabled !== false)
        const websocketEnabled = storedWebsocket !== null ? storedWebsocket === 'true' : (configResponse.data.websocket_enabled === true)
        
        // Only log once
        if (!window._priceSourceSetupLogged) {
          console.log(`Setting up price source: REST=${restEnabled}, WebSocket=${websocketEnabled}`)
          window._priceSourceSetupLogged = true
        }
        
        let websocketFailed = false
        
        // PRIORITY 1: WebSocket (if enabled)
        if (websocketEnabled) {
          const wsUrl = getWsUrl('/ws/price')
          
          const connectWebSocket = () => {
            try {
              wsConnection = new WebSocket(wsUrl)
              
              wsConnection.onopen = () => {
                // Only log once per connection
                if (!wsConnection._connectedLogged) {
                  console.log('✅ WebSocket connected for price updates - PRIORITY MODE ACTIVE')
                  wsConnection._connectedLogged = true
                }
                reconnectAttempts = 0 // Reset on successful connection
                websocketFailed = false // Reset failure flag
                
                // Stop REST polling immediately - WebSocket has priority
                if (priceInterval) {
                  console.log('🛑 Stopping REST polling - WebSocket has priority and is connected')
                  clearInterval(priceInterval)
                  priceInterval = null
                }
                
                // Always get initial price from cache (source of truth)
                axios.get(getApiUrl(`/api/cache/prices/${symbol}`))
                  .then(response => {
                    if (response.data && response.data.success && response.data.data) {
                      const cacheData = response.data.data
                      if (cacheData.mid_price) {
                        const midPrice = parseFloat(cacheData.mid_price)
                        setMidPrice(midPrice)
                        // Use MID_PRICE for askPrice field (not ask_price)
                        setAskPrice(midPrice)
                        
                        if (cacheData.bid_price) {
                          setBidPrice(parseFloat(cacheData.bid_price))
                        } else {
                          setBidPrice(midPrice * 0.9995) // Fallback
                        }
                        
                        if (cacheData.spread) {
                          setSpread(parseFloat(cacheData.spread))
                        } else {
                          setSpread(midPrice * 0.001) // Fallback
                        }
                        
                        console.log('📊 Initial price loaded from cache:', {
                          symbol: symbol,
                          mid: midPrice,
                          askPrice_field: midPrice, // Using mid_price for askPrice field
                          bid: cacheData.bid_price,
                          source: cacheData.source || 'cache'
                        })
                        return // Don't fetch from REST if cache worked
                      }
                    }
                    
                    // Fallback: fetch from REST if cache unavailable
                    return axios.get(getApiUrl(`/api/market/${symbol}`))
                      .then(response => {
                        if (response.data && response.data.mid_price) {
                          const midPrice = parseFloat(response.data.mid_price)
                          setMidPrice(midPrice)
                          // Use MID_PRICE for askPrice field (not ask_price)
                          setAskPrice(midPrice)
                          
                          if (response.data.bid_price) {
                            setBidPrice(parseFloat(response.data.bid_price))
                          } else {
                            setBidPrice(midPrice * 0.9995) // Fallback
                          }
                          
                          if (response.data.spread) {
                            setSpread(parseFloat(response.data.spread))
                          } else {
                            setSpread(midPrice * 0.001) // Fallback
                          }
                          
                          console.log('📊 Initial price loaded from REST:', {
                            symbol: symbol,
                            mid_price: midPrice,
                            askPrice_field: midPrice, // Using mid_price for askPrice field
                            source: 'rest'
                          })
                        }
                      })
                  })
                  .catch(err => {
                    console.error('Error fetching initial price:', err)
                  })
              }
              
              wsConnection.onmessage = (event) => {
                try {
                  const data = JSON.parse(event.data)
                  
                  // Only process price_update messages (real-time data)
                  if (data.type === 'price_update' && data.symbol === symbol) {
                    const price = parseFloat(data.price)
                    
                    if (isNaN(price) || price <= 0) {
                      console.error('❌ Invalid price from WebSocket:', price)
                      return
                    }
                    
                    console.log('✅ Processing price_update for', symbol, ':', price, 'Cache data:', data.cache_data)
                    
                    // ALWAYS use cache_data if available (source of truth)
                    const cacheData = data.cache_data
                    
                    if (cacheData && cacheData.mid_price) {
                      // Use EXACT values from cache - no calculations!
                      const newMidPrice = parseFloat(cacheData.mid_price)
                      const newBidPrice = cacheData.bid_price ? parseFloat(cacheData.bid_price) : null
                      const newSpread = cacheData.spread ? parseFloat(cacheData.spread) : null
                      
                      // Always update mid_price
                      setMidPrice(newMidPrice)
                      
                      // Use MID_PRICE for askPrice field (not ask_price)
                      setAskPrice(newMidPrice)
                      console.log('💰 AskPrice atualizado do cache (MID_PRICE):', newMidPrice)
                      
                      // Update bid_price ONLY if exists in cache (real value)
                      if (newBidPrice !== null && newBidPrice > 0) {
                        setBidPrice(newBidPrice)
                      }
                      
                      // Update spread ONLY if exists in cache (real value)
                      if (newSpread !== null && newSpread > 0) {
                        setSpread(newSpread)
                      }
                      
                      console.log('📊 Preços atualizados do cache (valores reais):', {
                        mid: newMidPrice,
                        askPrice_field: newMidPrice, // Using mid_price for askPrice field
                        bid: newBidPrice,
                        spread: newSpread,
                        source: cacheData.source || 'websocket'
                      })
                    } else {
                      // If no cache_data, fetch from cache API immediately
                      axios.get(getApiUrl(`/api/cache/prices/${symbol}`))
                        .then(response => {
                          if (response.data && response.data.success && response.data.data) {
                            const cacheData = response.data.data
                            if (cacheData.mid_price) {
                              const midPrice = parseFloat(cacheData.mid_price)
                              setMidPrice(midPrice)
                              // Use MID_PRICE for askPrice field
                              setAskPrice(midPrice)
                              console.log('💰 AskPrice atualizado via API cache (MID_PRICE):', midPrice)
                            }
                            if (cacheData.bid_price) setBidPrice(parseFloat(cacheData.bid_price))
                            if (cacheData.spread) setSpread(parseFloat(cacheData.spread))
                          }
                        })
                        .catch(err => console.error('Error fetching cache after WebSocket update:', err))
                    }
                  }
                } catch (err) {
                  console.error('Error parsing WebSocket message:', err)
                }
              }
              
              wsConnection.onerror = (error) => {
                console.error('WebSocket error:', error)
                websocketFailed = true
                // Fallback to REST if WebSocket fails and REST is enabled
                const currentRestEnabled = localStorage.getItem('rest_enabled') === 'true'
                if (currentRestEnabled && restEnabled && !priceInterval) {
                  console.log('⚠️ WebSocket error, falling back to REST API')
                  setupRestPriceSource()
                }
              }
              
              wsConnection.onclose = (event) => {
                console.log('WebSocket disconnected', event.code, event.reason)
                
                // If WebSocket closes, try to reconnect first (WebSocket has priority)
                if (websocketEnabled && reconnectAttempts < maxReconnectAttempts) {
                  reconnectAttempts++
                  console.log(`🔄 Reconnecting WebSocket (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`)
                  reconnectTimeout = setTimeout(() => {
                    connectWebSocket()
                  }, 2000 * reconnectAttempts) // Exponential backoff
                } else {
                  // Only fallback to REST if max reconnection attempts reached
                  const currentRestEnabled = localStorage.getItem('rest_enabled') === 'true'
                  if (currentRestEnabled && restEnabled && reconnectAttempts >= maxReconnectAttempts) {
                    console.log('⚠️ WebSocket max reconnection attempts reached, falling back to REST')
                    websocketFailed = true
                    if (!priceInterval) {
                      setupRestPriceSource()
                    }
                  } else if (currentRestEnabled && restEnabled && !priceInterval) {
                    // Fallback to REST if WebSocket fails (only if REST is enabled)
                    console.log('⚠️ WebSocket failed, falling back to REST API')
                    websocketFailed = true
                    setupRestPriceSource()
                  }
                }
              }
            } catch (err) {
              console.error('Error creating WebSocket connection:', err)
              websocketFailed = true
              // Fallback to REST if WebSocket fails and REST is enabled
              const currentRestEnabled = localStorage.getItem('rest_enabled') === 'true'
              if (currentRestEnabled && restEnabled && !priceInterval) {
                console.log('⚠️ WebSocket connection failed, falling back to REST API')
                setupRestPriceSource()
              }
            }
          }
          
          connectWebSocket()
          
        } else {
          // PRIORITY 2: REST API (if WebSocket not enabled or failed)
          // Check if REST is actually enabled in localStorage
          const storedRest = localStorage.getItem('rest_enabled')
          const restActuallyEnabled = storedRest === 'true'
          
          if (restActuallyEnabled) {
            setupRestPriceSource()
          } else {
            console.log('⚠️ REST is disabled, not setting up REST price source')
          }
        }
      } catch (err) {
        console.error('Error setting up price source:', err)
        // Only fallback to REST if explicitly configured
        const storedSource = localStorage.getItem('price_source')
        if (!storedSource || storedSource === 'rest') {
          setupRestPriceSource()
        }
      }
    }
    
    const setupRestPriceSource = () => {
      // Check if REST is actually enabled in localStorage
      const storedRest = localStorage.getItem('rest_enabled')
      const restActuallyEnabled = storedRest === 'true'
      
      // Don't setup REST if it's disabled
      if (!restActuallyEnabled) {
        console.log('⚠️ REST is disabled, not setting up REST price source')
        return
      }
      
      // Don't setup REST if already running
      if (priceInterval) {
        return // Already running
      }
      
      // Check if WebSocket is active - if so, REST should only run as fallback
      const storedWebsocket = localStorage.getItem('websocket_enabled')
      const websocketActive = storedWebsocket === 'true'
      
      const fetchPrice = async () => {
        // Double-check REST is still enabled
        const currentRestEnabled = localStorage.getItem('rest_enabled') === 'true'
        if (!currentRestEnabled) {
          console.log('⚠️ REST was disabled, stopping REST price updates')
          if (priceInterval) {
            clearInterval(priceInterval)
            priceInterval = null
          }
          return
        }
        
        // Skip REST updates if WebSocket is active and working
        if (websocketActive && wsConnection && wsConnection.readyState === WebSocket.OPEN) {
          return // WebSocket is active, don't override with REST
        }
        
        setFetchingPrice(true)
        try {
          // ALWAYS use cache first (faster and has latest data)
          const cacheResponse = await axios.get(getApiUrl(`/api/cache/prices/${symbol}`))
          
          if (cacheResponse.data && cacheResponse.data.success && cacheResponse.data.data) {
            const cacheData = cacheResponse.data.data
            
            // Only update if WebSocket is not active or has failed
            if (!websocketActive || websocketFailed) {
              // Update all prices from cache (source of truth)
              if (cacheData.mid_price) {
                const midPrice = parseFloat(cacheData.mid_price)
                setMidPrice(midPrice)
                // Use MID_PRICE for askPrice field (not ask_price)
                setAskPrice(midPrice)
              }
              
              if (cacheData.bid_price) {
                setBidPrice(parseFloat(cacheData.bid_price))
              } else if (cacheData.mid_price) {
                setBidPrice(parseFloat(cacheData.mid_price) * 0.9995) // Fallback estimate
              }
              
              if (cacheData.spread) {
                setSpread(parseFloat(cacheData.spread))
              } else if (cacheData.ask_price && cacheData.bid_price) {
                setSpread(parseFloat(cacheData.ask_price) - parseFloat(cacheData.bid_price))
              }
              
              console.log('📊 Market data updated from cache:', {
                bid: cacheData.bid_price,
                askPrice_field: cacheData.mid_price, // Using mid_price for askPrice field
                mid: cacheData.mid_price,
                spread: cacheData.spread,
                source: cacheData.source || 'cache'
              })
            }
          } else {
            // Fallback to REST API if cache is empty
            const response = await axios.get(getApiUrl(`/api/market/${symbol}`))
            if (response.data) {
              if (!websocketActive || websocketFailed) {
                if (response.data.mid_price) {
                  const midPrice = parseFloat(response.data.mid_price)
                  setMidPrice(midPrice)
                  // Use MID_PRICE for askPrice field (not ask_price)
                  setAskPrice(midPrice)
                }
                
                if (response.data.bid_price) {
                  setBidPrice(parseFloat(response.data.bid_price))
                } else if (response.data.mid_price) {
                  setBidPrice(parseFloat(response.data.mid_price) * 0.9995)
                }
                
                if (response.data.spread) {
                  setSpread(parseFloat(response.data.spread))
                } else if (response.data.ask_price && response.data.bid_price) {
                  setSpread(parseFloat(response.data.ask_price) - parseFloat(response.data.bid_price))
                }
                
                console.log('📊 Market data updated via REST (fallback):', {
                  bid: response.data.bid_price,
                  askPrice_field: response.data.mid_price, // Using mid_price for askPrice field
                  mid: response.data.mid_price,
                  spread: response.data.spread,
                  source: 'rest'
                })
              }
            }
          }
        } catch (err) {
          console.error('Error fetching price from cache/REST:', err)
        } finally {
          setFetchingPrice(false)
        }
      }
      
      fetchPrice()
      priceInterval = setInterval(fetchPrice, 1500) // Update every 1.5 seconds (faster updates from cache)
    }
    
    setupPriceSource()
    
    // Listen for localStorage changes (when Settings toggle changes)
    const handleStorageChange = () => {
      const storedWebsocket = localStorage.getItem('websocket_enabled')
      
      // Check if WebSocket was just enabled
      if (storedWebsocket === 'true') {
        console.log('🔄 WebSocket enabled in Settings, reconnecting...')
        // Re-run setup to connect WebSocket
        isSettingUp = false // Reset flag to allow re-setup
        setupPriceSource()
      } else if (storedWebsocket === 'false') {
        // WebSocket was disabled, close connection
        if (wsConnection) {
          console.log('🛑 WebSocket disabled in Settings, closing connection...')
          wsConnection.close()
          wsConnection = null
        }
      }
    }
    
    // Listen for storage events (when localStorage changes in other tabs)
    window.addEventListener('storage', handleStorageChange)
    
    // Also listen for custom events (for same-tab changes)
    window.addEventListener('websocket-config-changed', handleStorageChange)
    
    // Separate polling for askPrice from cache (ensures real-time updates)
    // BUT: Only if WebSocket is NOT active (WebSocket has priority)
    const cachePollingInterval = setInterval(async () => {
      try {
        // Check if WebSocket is active and working - if so, skip REST polling
        const storedWebsocket = localStorage.getItem('websocket_enabled')
        const websocketActive = storedWebsocket === 'true'
        
        // If WebSocket is enabled and connected, don't poll cache (WebSocket has priority)
        if (websocketActive && wsConnection && wsConnection.readyState === WebSocket.OPEN) {
          return // WebSocket is active and working - skip REST polling
        }
        
        // Only poll cache if WebSocket is disabled or not working
        const cacheResponse = await axios.get(getApiUrl(`/api/cache/prices/${symbol}`))
        if (cacheResponse.data && cacheResponse.data.success && cacheResponse.data.data) {
          const cacheData = cacheResponse.data.data
          
          // Always update askPrice from cache MID_PRICE (not ask_price)
          if (cacheData.mid_price !== null && cacheData.mid_price !== undefined) {
            const newMidPrice = parseFloat(cacheData.mid_price)
            if (!isNaN(newMidPrice) && newMidPrice > 0) {
              setAskPrice(prev => {
                // Always update, even if value is the same (forces re-render)
                if (prev !== newMidPrice) {
                  console.log('💰 AskPrice atualizado do cache (MID_PRICE) - REST fallback:', prev?.toFixed(2), '→', newMidPrice.toFixed(2))
                  return newMidPrice
                }
                // Even if same, return new value to force re-render
                return newMidPrice
              })
            }
          }
          
          // Update other prices too
          if (cacheData.mid_price) {
            const newMid = parseFloat(cacheData.mid_price)
            setMidPrice(prev => prev !== newMid ? newMid : prev)
          }
          if (cacheData.bid_price) {
            const newBid = parseFloat(cacheData.bid_price)
            setBidPrice(prev => prev !== newBid ? newBid : prev)
          }
          if (cacheData.spread) {
            const newSpread = parseFloat(cacheData.spread)
            setSpread(prev => prev !== newSpread ? newSpread : prev)
          }
        }
      } catch (err) {
        // Silent fail - don't spam console
      }
    }, 500) // Poll every 0.5 seconds for faster updates
    
    return () => {
      clearInterval(cachePollingInterval)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('websocket-config-changed', handleStorageChange)
      isSettingUp = false // Reset flag on cleanup
      if (priceInterval) {
        clearInterval(priceInterval)
        priceInterval = null
      }
      if (wsConnection) {
        wsConnection._connectedLogged = false // Reset log flag
        wsConnection.close()
        wsConnection = null
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      // Reset global log flag when symbol changes
      window._priceSourceSetupLogged = false
    }
  }, [symbol])

  // Calculate profit/loss percentages
  useEffect(() => {
    if (askPrice && takeprofit && quantityUsd) {
      const tpPrice = parseFloat(takeprofit)
      const qty = parseFloat(quantityUsd)
      if (side === 'buy') {
        const profitValue = ((tpPrice - askPrice) / askPrice) * 100
        setProfit(profitValue.toFixed(2))
      } else {
        const profitValue = ((askPrice - tpPrice) / askPrice) * 100
        setProfit(profitValue.toFixed(2))
      }
    }
    
    if (askPrice && stoploss && quantityUsd) {
      const slPrice = parseFloat(stoploss)
      const qty = parseFloat(quantityUsd)
      if (side === 'buy') {
        const lossValue = ((askPrice - slPrice) / askPrice) * 100
        setLoss(lossValue.toFixed(2))
      } else {
        const lossValue = ((slPrice - askPrice) / askPrice) * 100
        setLoss(lossValue.toFixed(2))
      }
    }
  }, [askPrice, takeprofit, stoploss, quantityUsd, side])

  // Calculate margin and liquidation
  useEffect(() => {
    if (askPrice && quantityUsd && leverage) {
      const qty = parseFloat(quantityUsd)
      const lev = parseFloat(leverage)
      const price = parseFloat(askPrice)
      
      // Trade margin = quantity / leverage
      const margin = qty / lev
      setTradeMargin(margin.toFixed(2))
      
      // Maintenance margin (assume 1% of position)
      const maint = qty * 0.01
      setMaintMargin(maint.toFixed(2))
      
      // Liquidation price (simplified calculation)
      if (side === 'buy') {
        const liqPrice = price * (1 - (1 / lev) + 0.005) // Simplified
        setLiquidation(liqPrice.toFixed(2))
      } else {
        const liqPrice = price * (1 + (1 / lev) - 0.005) // Simplified
        setLiquidation(liqPrice.toFixed(2))
      }
    }
  }, [askPrice, quantityUsd, leverage, side])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      // Verificar status do backend antes de enviar
      try {
        const statusResponse = await axios.get(getApiUrl('/api/status'))
        if (!statusResponse.data.exchange_initialized) {
          const issues = statusResponse.data.issues || []
          let errorMsg = 'Exchange client não inicializado.\n\n'
          if (issues.length > 0) {
            errorMsg += 'Problemas encontrados:\n'
            issues.forEach((issue, idx) => {
              errorMsg += `${idx + 1}. ${issue}\n`
            })
            errorMsg += '\nPor favor, corrija o arquivo backend/.env e reinicie o servidor.'
          }
          setError(errorMsg)
          setLoading(false)
          return
        }
      } catch (statusErr) {
        console.warn('Não foi possível verificar o status:', statusErr)
        // Continua mesmo se não conseguir verificar o status
      }

      // Validate limit price if limit order
      if (orderType === 'limit') {
        const limitPriceNum = parseFloat(limitPrice)
        if (!limitPrice || isNaN(limitPriceNum) || limitPriceNum <= 0) {
          setError('Digite um preço válido para ordem limit')
          setLoading(false)
          return
        }
        
        // Validate price is within 80% of reference price
        if (midPrice && midPrice > 0) {
          const minPrice = midPrice * 0.2
          const maxPrice = midPrice * 1.8
          
          if (limitPriceNum < minPrice || limitPriceNum > maxPrice) {
            setError(
              `Preço inválido! Deve estar entre $${minPrice.toFixed(2)} e $${maxPrice.toFixed(2)} ` +
              `(preço atual: $${midPrice.toFixed(2)})`
            )
            setLoading(false)
            return
          }
        }
      }
      
      // Calculate size from USD quantity
      const size = askPrice ? parseFloat(quantityUsd) / askPrice : parseFloat(quantityUsd) / 100000

      const orderData = {
        symbol: symbol,
        side: side,
        order_type: orderType,
        quantity_usd: parseFloat(quantityUsd),
        size: size,
        price: orderType === 'limit' && limitPrice ? parseFloat(limitPrice.replace(/[^0-9.]/g, '')) : null,
        leverage: leverage,
        takeprofit: takeprofit ? parseFloat(takeprofit) : null,
        stoploss: stoploss ? parseFloat(stoploss) : null
      }

      const response = await axios.post(getApiUrl('/api/order'), orderData)
      setResult(response.data)
    } catch (err) {
      let errorMsg = err.response?.data?.detail || err.message || 'Erro ao enviar ordem'
      
      // Se o erro menciona credenciais, adicionar mais detalhes
      if (errorMsg.includes('credentials') || errorMsg.includes('SECRET_KEY') || errorMsg.includes('ACCOUNT_ADDRESS')) {
        errorMsg += '\n\nVerifique o console do backend para mais detalhes.'
        errorMsg += `\nAcesse: ${getApiUrl('/api/status')} para ver o status completo.`
      }
      
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price) => {
    if (!price) return '0.000'
    // Format with 3 decimal places for crypto prices (BTC)
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(price)
  }

  const formatNumber = (num) => {
    if (!num || num === '0') return '0'
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(parseFloat(num))
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md relative">
        {/* Settings Link */}
        <a
          href="#settings"
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          title="Configurações"
        >
          ⚙️
        </a>
        {/* Order Type Tabs */}
        <div className="flex justify-center mb-6 gap-2">
          <button
            type="button"
            onClick={() => setOrderType('market')}
            className={`px-6 py-2 rounded-l-md text-sm font-medium transition-colors duration-200 ${
              orderType === 'market'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-blue-500 hover:text-white'
            }`}
          >
            Market
          </button>
          <button
            type="button"
            onClick={() => setOrderType('limit')}
            className={`px-6 py-2 rounded-r-md text-sm font-medium transition-colors duration-200 ${
              orderType === 'limit'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-blue-500 hover:text-white'
            }`}
          >
            Limit
          </button>
        </div>

        {/* Buy/Sell Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            type="button"
            onClick={() => setSide('buy')}
            className={`flex-1 py-3 rounded-md font-bold transition-colors ${
              side === 'buy'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-400 border border-gray-600'
            }`}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => setSide('sell')}
            className={`flex-1 py-3 rounded-md font-bold transition-colors border ${
              side === 'sell'
                ? 'bg-gray-700 text-red-400 border-red-600'
                : 'bg-gray-700 text-gray-400 border-gray-600'
            }`}
          >
            Sell
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quantity */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Quantity</label>
            <div className="relative">
              <input
                type="number"
                value={quantityUsd}
                onChange={(e) => setQuantityUsd(e.target.value)}
                required
                step="0.01"
                min="0"
                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="100"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            </div>
          </div>

          {/* Ask Price - Always from cache, real value */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Ask Price {askPrice && `(Mid: ${askPrice.toFixed(3)})`}
            </label>
            <div className="relative">
              <input
                type="text"
                value={askPrice !== null && askPrice !== undefined ? formatPrice(askPrice) : 'Loading...'}
                readOnly
                key={`ask-price-${askPrice}`} // Force re-render when askPrice changes
                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white text-sm opacity-75"
              />
            </div>
          </div>

          {/* Limit Price (only for limit orders) */}
          {orderType === 'limit' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Limit Price</label>
              <div className="relative">
                <input
                  type="text"
                  value={limitPrice ? formatPrice(parseFloat(limitPrice.replace(/[^0-9.]/g, '') || 0)) : ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '') // Remove tudo exceto números e ponto
                    setPriceError(null)
                    
                    // Allow typing - will validate on blur
                    if (value === '' || value === '.') {
                      setLimitPrice(value)
                      return
                    }
                    
                    // Allow typing with decimal places
                    const num = parseFloat(value)
                    if (!isNaN(num) && num > 0) {
                      setLimitPrice(value)
                    } else if (value === '') {
                      setLimitPrice(value)
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '')
                    if (!value || value === '') {
                      setPriceError(null)
                      setLimitPrice('')
                      return
                    }
                    
                    const num = parseFloat(value)
                    if (isNaN(num) || num <= 0) {
                      setPriceError('Digite um preço válido maior que zero')
                      return
                    }
                    
                    // Round to 3 decimal places for display
                    const rounded = Math.round(num * 1000) / 1000
                    const roundedStr = rounded.toFixed(3)
                    
                    // Validate price is within 80% of reference price (20% to 180% of mid price)
                    // Hyperliquid requires price to be within 80% of reference price
                    if (midPrice && midPrice > 0) {
                      const minPrice = midPrice * 0.2  // 20% of reference
                      const maxPrice = midPrice * 1.8  // 180% of reference
                      
                      if (rounded < minPrice || rounded > maxPrice) {
                        setPriceError(
                          `Preço deve estar entre ${minPrice.toFixed(3)} e ${maxPrice.toFixed(3)} ` +
                          `(preço atual: ${midPrice.toFixed(3)})`
                        )
                        // Suggest valid price
                        const suggestedPrice = rounded < minPrice 
                          ? Math.max(minPrice, midPrice * 0.95)  // 5% below mid
                          : Math.min(maxPrice, midPrice * 1.05)  // 5% above mid
                        setLimitPrice(suggestedPrice.toFixed(3))
                        return
                      }
                    }
                    
                    // Format to 3 decimal places
                    setLimitPrice(roundedStr)
                    setPriceError(null)
                  }}
                  className={`w-full bg-gray-900 border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 ${
                    priceError 
                      ? 'border-orange-500 focus:ring-orange-500' 
                      : 'border-gray-700 focus:ring-blue-500'
                  }`}
                  placeholder={askPrice ? formatPrice(askPrice) : '100.789'}
                />
              </div>
              {priceError && (
                <div className="mt-1 flex items-start gap-2 text-xs">
                  <span className="text-orange-400">⚠</span>
                  <span className="text-orange-300">{priceError}</span>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Preço deve ter 2 casas decimais e estar dentro de 80% do preço de referência
                {midPrice && (
                  <span className="block mt-1">
                    Range válido: ${(midPrice * 0.2).toFixed(2)} - ${(midPrice * 1.8).toFixed(2)}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Takeprofit and Profit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Takeprofit</label>
              <div className="relative">
                <input
                  type="number"
                  value={takeprofit}
                  onChange={(e) => setTakeprofit(e.target.value)}
                  step="0.01"
                  min="0"
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Profit</label>
              <div className="relative">
                <input
                  type="text"
                  value={profit || '0.00'}
                  readOnly
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white text-sm opacity-75"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>
          </div>

          {/* Stoploss and Loss */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Stoploss</label>
              <div className="relative">
                <input
                  type="number"
                  value={stoploss}
                  onChange={(e) => setStoploss(e.target.value)}
                  step="0.01"
                  min="0"
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Loss</label>
              <div className="relative">
                <input
                  type="text"
                  value={loss || '0.00'}
                  readOnly
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white text-sm opacity-75"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>
          </div>

          {/* Leverage Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm text-gray-400">Leverage</label>
              <span className="text-white font-semibold">{leverage} X</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1</span>
              <span>50</span>
            </div>
          </div>

          {/* Trade Margin */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm text-gray-400">Trade Margin</label>
              <span className="text-white font-semibold">{formatNumber(tradeMargin)} $</span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-lg opacity-50">
              <div 
                className="h-2 bg-blue-500 rounded-lg"
                style={{ width: `${quantityUsd ? ((parseFloat(tradeMargin) / parseFloat(quantityUsd)) * 100) : 0}%` }}
              />
            </div>
          </div>

          {/* Liquidation */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm text-gray-400">Liquidation</label>
              <span className="text-white font-semibold">{formatPrice(liquidation)} $</span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-lg opacity-50">
              <div 
                className="h-2 bg-red-500 rounded-lg"
                style={{ width: `${askPrice ? ((parseFloat(liquidation || 0) / parseFloat(askPrice)) * 100) : 0}%` }}
              />
            </div>
          </div>

          {/* Maintenance Margin */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Maint. Margin</label>
            <div className="relative">
              <input
                type="text"
                value={formatNumber(maintMargin)}
                readOnly
                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white text-sm opacity-75"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            </div>
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-md font-bold transition-colors ${
              side === 'buy'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Enviando...' : (side === 'buy' ? 'Buy' : 'Sell')}
          </button>
        </form>

        {/* Results */}
        {result && (
          <div className={`mt-6 p-4 rounded-lg border ${
            result.success && (!result.result || (result.result.status !== 'err' && !result.error))
              ? 'bg-green-900/30 border-green-500'
              : 'bg-yellow-900/30 border-yellow-500'
          }`}>
            {result.success && (!result.result || (result.result.status !== 'err' && !result.error)) ? (
              <>
                <h3 className="text-green-400 font-semibold mb-2">✅ Ordem executada com sucesso!</h3>
                
                {/* Check if order was filled */}
                {result.result?.response?.data?.statuses?.[0]?.filled && (
                  <div className="mb-3 p-3 bg-green-900/50 rounded border border-green-600">
                    <p className="text-green-200 font-semibold mb-1">Ordem Preenchida (Filled)</p>
                    <div className="text-sm text-green-300 space-y-1">
                      <p><span className="text-green-400">Tamanho:</span> {result.result.response.data.statuses[0].filled.totalSz} {result.order.symbol}</p>
                      <p><span className="text-green-400">Preço Médio:</span> ${parseFloat(result.result.response.data.statuses[0].filled.avgPx).toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</p>
                      <p><span className="text-green-400">Order ID:</span> {result.result.response.data.statuses[0].filled.oid}</p>
                    </div>
                  </div>
                )}
                
                <details className="mt-2">
                  <summary className="text-xs text-green-400 cursor-pointer hover:text-green-300">Ver detalhes completos</summary>
                  <pre className="text-xs text-green-300 overflow-auto max-h-48 mt-2">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </>
            ) : (
              <>
                <h3 className="text-yellow-400 font-semibold mb-2">⚠️ Erro na ordem</h3>
                <p className="text-yellow-300 text-sm mb-2">
                  {result.error || result.result?.response || 'Erro desconhecido'}
                </p>
                {result.error_detail && (
                  <div className="mt-3 p-3 bg-yellow-900/50 rounded text-xs">
                    <p className="text-yellow-200 font-semibold mb-1">{result.error_detail}</p>
                    
                    {result.error_account_address && result.error_wallet_address && !result.addresses_match && (
                      <div className="mt-2 p-2 bg-gray-800 rounded space-y-1">
                        <div>
                          <p className="text-yellow-200 mb-1">ACCOUNT_ADDRESS (main wallet?):</p>
                          <p className="text-white font-mono text-xs break-all">{result.error_account_address}</p>
                        </div>
                        <div className="mt-2">
                          <p className="text-yellow-200 mb-1">Wallet da SECRET_KEY:</p>
                          <p className="text-white font-mono text-xs break-all">{result.error_wallet_address}</p>
                        </div>
                        <p className="text-yellow-300 text-xs mt-2 italic">
                          ⚠️ Endereços diferentes! Se usando API Wallet, certifique-se de que foi autorizada.
                        </p>
                      </div>
                    )}
                    
                    {result.error_wallet_address && result.addresses_match && (
                      <div className="mt-2 p-2 bg-gray-800 rounded">
                        <p className="text-yellow-200 mb-1">Endereço sendo usado:</p>
                        <p className="text-white font-mono text-xs break-all">{result.error_wallet_address}</p>
                      </div>
                    )}
                    
                    {result.error_solution && (
                      <div className="mt-2">
                        <p className="text-yellow-200 font-semibold mb-1">Solução:</p>
                        <div className="space-y-1 text-yellow-300">
                          {result.error_solution.map((step, idx) => (
                            <p key={idx} className={step.startsWith('⚠️') || step.startsWith('Se você') ? 'font-semibold mt-2' : ''}>
                              {step || <br />}
                            </p>
                          ))}
                        </div>
                        <p className="text-yellow-300 mt-2">
                          Acesse: <a href="https://app.hyperliquid-testnet.xyz" target="_blank" className="underline font-semibold">https://app.hyperliquid-testnet.xyz</a>
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <pre className="text-xs text-yellow-300 overflow-auto max-h-48 mt-2">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </>
            )}
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-900/30 border border-red-500 rounded-lg">
            <h3 className="text-red-400 font-semibold mb-2">Erro ao enviar ordem</h3>
            <pre className="text-sm text-red-300 whitespace-pre-wrap font-mono">{error}</pre>
            <div className="mt-3 pt-3 border-t border-red-700">
              <p className="text-xs text-red-400">Dica: Acesse <a href={getApiUrl('/api/status')} target="_blank" className="underline">{getApiUrl('/api/status')}</a> para verificar o status das credenciais</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
