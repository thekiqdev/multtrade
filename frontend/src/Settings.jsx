import { useState, useEffect } from 'react'
import axios from 'axios'
import { getApiUrl } from './config'

function Settings() {
  const [restEnabled, setRestEnabled] = useState(true)
  const [websocketEnabled, setWebsocketEnabled] = useState(false)
  const [websocketStatus, setWebsocketStatus] = useState(false)
  const [websocketPrices, setWebsocketPrices] = useState({})
  const [restPrices, setRestPrices] = useState({})
  const [restStatus, setRestStatus] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [accountAddress, setAccountAddress] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [credentialsLoading, setCredentialsLoading] = useState(false)
  const [showSecretKey, setShowSecretKey] = useState(false)

  useEffect(() => {
    // Load current config only once on mount
    loadConfig()
    loadCredentials()
  }, []) // Empty dependency array - only run once on mount

  const loadCredentials = async () => {
    try {
      console.log('📖 Carregando credenciais do backend...')
      const response = await axios.get(getApiUrl('/api/credentials'))
      console.log('✅ Credenciais carregadas:', {
        account_address: response.data.account_address?.substring(0, 10) + '...',
        account_present: response.data.account_address_present,
        secret_present: response.data.secret_key_present,
        secret_preview: response.data.secret_key_preview,
        file_path: response.data.credentials_file_path,
        file_exists: response.data.credentials_file_exists
      })
      setAccountAddress(response.data.account_address || '')
      // Always clear secret key field for security (never load it from backend)
      setSecretKey('')
    } catch (err) {
      console.error('❌ Erro ao carregar credenciais:', err)
    }
  }

  const handleSaveCredentials = async () => {
    setCredentialsLoading(true)
    setMessage(null)
    
    const account = accountAddress.trim()
    const secret = secretKey.trim()
    
    // Basic validation
    if (!account) {
      setMessage({
        type: 'error',
        text: 'Account Address não pode estar vazio'
      })
      setCredentialsLoading(false)
      return
    }
    
    if (!secret) {
      setMessage({
        type: 'error',
        text: 'Secret Key não pode estar vazio'
      })
      setCredentialsLoading(false)
      return
    }
    
    console.log('💾 Enviando credenciais para o backend...')
    console.log('   Account Address:', account.substring(0, 10) + '...')
    console.log('   Secret Key presente:', !!secret)
    
    try {
      const response = await axios.post(getApiUrl('/api/credentials'), {
        account_address: account,
        secret_key: secret
      })
      
      console.log('✅ Resposta do backend:', response.data)
      
      if (response.data.success) {
        setMessage({
          type: 'success',
          text: response.data.message || 'Credenciais salvas com sucesso!'
        })
        setSecretKey('') // Clear secret key after saving
        // Reload credentials to verify they were saved
        setTimeout(async () => {
          await loadCredentials()
        }, 500)
      } else {
        setMessage({
          type: 'error',
          text: response.data.message || 'Erro ao salvar credenciais'
        })
      }
    } catch (err) {
      console.error('❌ Erro ao salvar credenciais:', err)
      console.error('   Response:', err.response?.data)
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || err.message || 'Erro ao salvar credenciais'
      })
    } finally {
      setCredentialsLoading(false)
    }
  }

  // Separate effect for polling WebSocket status and REST prices
  useEffect(() => {
    // Poll WebSocket status
    const pollWebSocketStatus = setInterval(async () => {
      try {
        const response = await axios.get(getApiUrl('/api/config'))
        setWebsocketStatus(response.data.websocket_running || false)
        setWebsocketPrices(response.data.websocket_prices || {})
      } catch (err) {
        console.error('Error polling WebSocket status:', err)
      }
    }, 2000) // Check status every 2 seconds
    
    const storedRest = localStorage.getItem('rest_enabled')
    const isRestEnabled = storedRest === 'true' || (storedRest === null && restEnabled)
    
    if (!isRestEnabled) {
      return () => clearInterval(pollWebSocketStatus) // Only clear WebSocket polling
    }
    
    // Poll REST prices from cache (faster) if REST is enabled
    const pollRestPrices = setInterval(() => {
      const currentStoredRest = localStorage.getItem('rest_enabled')
      if (currentStoredRest === 'true') {
        // Try cache first (faster, no API calls)
        axios.get(getApiUrl('/api/cache/prices'))
          .then(response => {
            if (response.data && response.data.success && response.data.cache) {
              const cache = response.data.cache
              const prices = {}
              if (cache.BTC?.mid_price) prices.BTC = cache.BTC.mid_price
              if (cache.ETH?.mid_price) prices.ETH = cache.ETH.mid_price
              if (cache.SOL?.mid_price) prices.SOL = cache.SOL.mid_price
              
              if (Object.keys(prices).length > 0) {
                setRestPrices(prices)
                setRestStatus(true)
              }
            }
          })
          .catch(() => {
            // Fallback to direct REST API if cache fails
            Promise.all([
              axios.get(getApiUrl('/api/market/BTC')).catch(() => null),
              axios.get(getApiUrl('/api/market/ETH')).catch(() => null),
              axios.get(getApiUrl('/api/market/SOL')).catch(() => null)
            ]).then(([btcRes, ethRes, solRes]) => {
              const prices = {}
              if (btcRes?.data?.mid_price) prices.BTC = btcRes.data.mid_price
              if (ethRes?.data?.mid_price) prices.ETH = ethRes.data.mid_price
              if (solRes?.data?.mid_price) prices.SOL = solRes.data.mid_price
              
              if (Object.keys(prices).length > 0) {
                setRestPrices(prices)
                setRestStatus(true)
              }
            }).catch(() => {
              setRestStatus(false)
            })
          })
      }
    }, 2000) // Update every 2 seconds (faster with cache)
    
    return () => {
      clearInterval(pollWebSocketStatus)
      clearInterval(pollRestPrices)
    }
  }, [restEnabled])

  const loadConfig = async () => {
    try {
      // ALWAYS check localStorage FIRST - it's the source of truth
      const storedRest = localStorage.getItem('rest_enabled')
      const storedWebsocket = localStorage.getItem('websocket_enabled')
      
      // Set state from localStorage if available
      if (storedRest !== null) {
        setRestEnabled(storedRest === 'true')
      }
      if (storedWebsocket !== null) {
        setWebsocketEnabled(storedWebsocket === 'true')
      }
      
      // Then fetch API config for status info
      const response = await axios.get('http://localhost:8000/api/config')
      
      // Only set defaults if localStorage is empty
      if (storedRest === null) {
        const apiSource = response.data.price_source || 'rest'
        const shouldEnableRest = apiSource === 'rest'
        setRestEnabled(shouldEnableRest)
        localStorage.setItem('rest_enabled', shouldEnableRest.toString())
      }
      
      if (storedWebsocket === null) {
        const apiSource = response.data.price_source || 'rest'
        const shouldEnableWebsocket = apiSource === 'websocket'
        setWebsocketEnabled(shouldEnableWebsocket)
        localStorage.setItem('websocket_enabled', shouldEnableWebsocket.toString())
      }
      
      // Update status info (doesn't affect enabled state)
      setWebsocketStatus(response.data.websocket_running || false)
      setWebsocketPrices(response.data.websocket_prices || {})
      
      // Fetch REST prices from cache if REST is enabled (check localStorage, not state)
      const currentRestEnabled = storedRest === 'true' || (storedRest === null && (response.data.price_source || 'rest') === 'rest')
      if (currentRestEnabled) {
        try {
          // Try cache first
          const cacheResponse = await axios.get(getApiUrl('/api/cache/prices'))
          let prices = {}
          
          if (cacheResponse.data && cacheResponse.data.success && cacheResponse.data.cache) {
            const cache = cacheResponse.data.cache
            if (cache.BTC?.mid_price) prices.BTC = cache.BTC.mid_price
            if (cache.ETH?.mid_price) prices.ETH = cache.ETH.mid_price
            if (cache.SOL?.mid_price) prices.SOL = cache.SOL.mid_price
          }
          
          // Fallback to REST if cache is empty
          if (Object.keys(prices).length === 0) {
            const btcResponse = await axios.get(getApiUrl('/api/market/BTC'))
            const ethResponse = await axios.get(getApiUrl('/api/market/ETH'))
            const solResponse = await axios.get(getApiUrl('/api/market/SOL'))
            
            if (btcResponse?.data?.mid_price) prices.BTC = btcResponse.data.mid_price
            if (ethResponse?.data?.mid_price) prices.ETH = ethResponse.data.mid_price
            if (solResponse?.data?.mid_price) prices.SOL = solResponse.data.mid_price
          }
          
          setRestPrices(prices)
          setRestStatus(true)
        } catch (err) {
          console.error('Error fetching REST prices:', err)
          setRestStatus(false)
        }
      }
    } catch (err) {
      console.error('Error loading config:', err)
      // Fallback to localStorage only
      const storedRest = localStorage.getItem('rest_enabled')
      const storedWebsocket = localStorage.getItem('websocket_enabled')
      if (storedRest !== null) setRestEnabled(storedRest === 'true')
      if (storedWebsocket !== null) setWebsocketEnabled(storedWebsocket === 'true')
    }
  }

  const handleUpdateConfig = async () => {
    setLoading(true)
    setMessage(null)
    
    try {
      // Determine primary source (WebSocket takes priority if both are enabled)
      const primarySource = websocketEnabled ? 'websocket' : (restEnabled ? 'rest' : 'rest')
      
      const response = await axios.post(getApiUrl('/api/config'), {
        price_source: primarySource,
        rest_enabled: restEnabled,
        websocket_enabled: websocketEnabled
      })
      
      // Save to localStorage FIRST - this is the source of truth
      localStorage.setItem('rest_enabled', restEnabled.toString())
      localStorage.setItem('websocket_enabled', websocketEnabled.toString())
      localStorage.setItem('price_source', primarySource)
      
      // Update state immediately (don't wait for API response)
      // This prevents the state from being overridden
      
      setMessage({
        type: 'success',
        text: 'Configuração atualizada com sucesso!'
      })
      
      // Update status info immediately
      try {
        const statusResponse = await axios.get('http://localhost:8000/api/config')
        setWebsocketStatus(statusResponse.data.websocket_running || false)
        setWebsocketPrices(statusResponse.data.websocket_prices || {})
      } catch (err) {
        console.error('Error fetching status:', err)
      }
      
      // Don't reload - stay on Settings page
      setLoading(false)
      
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Erro ao atualizar configuração'
      })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">⚙️ Configurações</h1>

        {/* Credentials Section */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-3">🔐 Credenciais Hyperliquid</label>
          
          <div className="space-y-4">
            {/* Account Address */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">Account Address</label>
              <input
                type="text"
                value={accountAddress}
                onChange={(e) => setAccountAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Secret Key */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">Secret Key</label>
              <div className="relative">
                <input
                  type={showSecretKey ? "text" : "password"}
                  value={secretKey}
                  onChange={(e) => {
                    const value = e.target.value
                    // Only allow valid hex characters (0-9, a-f, A-F) and 0x prefix
                    if (value === '' || /^0x[0-9a-fA-F]*$/.test(value)) {
                      setSecretKey(value)
                    }
                  }}
                  placeholder="0x..."
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 pr-12"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 text-sm"
                >
                  {showSecretKey ? '🙈' : '👁️'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                ⚠️ Sua chave privada será armazenada localmente no servidor
              </p>
              {secretKey && secretKey.length > 0 && secretKey.length !== 66 && (
                <p className="text-xs text-yellow-500 mt-1">
                  ⚠️ Secret Key deve ter 66 caracteres (0x + 64 hex). Atual: {secretKey.length}
                </p>
              )}
            </div>

            {/* Save Credentials Button */}
            <button
              onClick={handleSaveCredentials}
              disabled={credentialsLoading || !accountAddress.trim() || !secretKey.trim()}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {credentialsLoading ? 'Salvando...' : '💾 Salvar Credenciais'}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 my-6"></div>

        {/* Price Source Selection */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-3">Fonte de Preço</label>
          
          <div className="space-y-3">
            {/* REST API Switch */}
            <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border-2 transition-colors"
              style={{ borderColor: restEnabled ? '#3b82f6' : '#374151' }}>
              <div className="flex-1">
                <div className="font-semibold">REST API</div>
                <div className="text-xs text-gray-400 mt-1">
                  Atualiza a cada 2 segundos via endpoint /info
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={restEnabled}
                  onChange={(e) => {
                    setRestEnabled(e.target.checked)
                    // Update immediately without saving
                    localStorage.setItem('rest_enabled', e.target.checked.toString())
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* WebSocket Switch */}
            <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border-2 transition-colors"
              style={{ borderColor: websocketEnabled ? '#3b82f6' : '#374151' }}>
              <div className="flex-1">
                <div className="font-semibold">WebSocket</div>
                <div className="text-xs text-gray-400 mt-1">
                  Preços em tempo real via WebSocket
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={websocketEnabled}
                  onChange={async (e) => {
                    const newValue = e.target.checked
                    setWebsocketEnabled(newValue)
                    // Update localStorage immediately
                    localStorage.setItem('websocket_enabled', newValue.toString())
                    
                    // Send to backend immediately to start/stop WebSocket
                    try {
                      const primarySource = newValue ? 'websocket' : (restEnabled ? 'rest' : 'rest')
                      await axios.post(getApiUrl('/api/config'), {
                        price_source: primarySource,
                        rest_enabled: restEnabled,
                        websocket_enabled: newValue
                      })
                      
                      // Update status immediately
                      const statusResponse = await axios.get(getApiUrl('/api/config'))
                      setWebsocketStatus(statusResponse.data.websocket_running || false)
                      setWebsocketPrices(statusResponse.data.websocket_prices || {})
                      
                      // Trigger custom event to notify App.jsx to reconnect (works in same tab)
                      window.dispatchEvent(new Event('websocket-config-changed'))
                      
                      console.log('✅ WebSocket', newValue ? 'ativado' : 'desativado', 'com sucesso')
                    } catch (err) {
                      console.error('❌ Erro ao atualizar WebSocket:', err)
                      // Revert on error
                      setWebsocketEnabled(!newValue)
                      localStorage.setItem('websocket_enabled', (!newValue).toString())
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
          
          {/* Warning if both disabled */}
          {!restEnabled && !websocketEnabled && (
            <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-500 rounded-lg">
              <p className="text-yellow-300 text-sm">
                ⚠️ Nenhuma fonte de preço ativada. Ative pelo menos uma opção.
              </p>
            </div>
          )}
        </div>

        {/* REST API Status */}
        {restEnabled && (
          <div className="mb-6 p-4 bg-gray-900 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Status REST API:</span>
              <span className={`text-sm font-semibold ${restStatus ? 'text-green-400' : 'text-red-400'}`}>
                {restStatus ? '✅ Conectado' : '❌ Desconectado'}
              </span>
            </div>
            
            {Object.keys(restPrices).length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-xs text-gray-400 mb-1">Preços atuais:</div>
                {Object.entries(restPrices).map(([symbol, price]) => (
                  <div key={symbol} className="text-sm">
                    <span className="text-gray-300">{symbol}:</span>{' '}
                    <span className="text-green-400 font-semibold">
                      ${parseFloat(price).toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 2})}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* WebSocket Status */}
        {websocketEnabled && (
          <div className="mb-6 p-4 bg-gray-900 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Status WebSocket:</span>
              <span className={`text-sm font-semibold ${websocketStatus ? 'text-green-400' : 'text-red-400'}`}>
                {websocketStatus ? '✅ Conectado' : '❌ Desconectado'}
              </span>
            </div>
            
            {Object.keys(websocketPrices).length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-xs text-gray-400 mb-1">Preços em tempo real:</div>
                {Object.entries(websocketPrices).map(([symbol, price]) => (
                  <div key={symbol} className="text-sm">
                    <span className="text-gray-300">{symbol}:</span>{' '}
                    <span className="text-green-400 font-semibold">
                      ${parseFloat(price).toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 2})}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-900/30 border border-green-500 text-green-300' 
              : 'bg-red-900/30 border border-red-500 text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleUpdateConfig}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Salvando...' : 'Salvar Configuração'}
        </button>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              window.location.hash = ''
            }}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            ← Voltar para Trading
          </a>
        </div>
      </div>
    </div>
  )
}

export default Settings

