import { useState, useEffect } from 'react'
import axios from 'axios'
import { getApiUrl } from './config'

function Logs() {
  const [logs, setLogs] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [logInfo, setLogInfo] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(5) // seconds

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(getApiUrl('/api/logs'), {
        params: { limit: 200 } // Get last 200 lines
      })
      
      if (response.data.error) {
        setError(response.data.error)
        setLogs('')
      } else {
        setLogs(response.data.logs || '')
        setLogInfo({
          logFile: response.data.log_file,
          totalLines: response.data.total_lines,
          returnedLines: response.data.returned_lines
        })
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Erro ao buscar logs')
      setLogs('')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    
    let interval = null
    if (autoRefresh) {
      interval = setInterval(fetchLogs, refreshInterval * 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const handleRefresh = () => {
    fetchLogs()
  }

  const formatLogText = (text) => {
    if (!text) return ''
    
    // Split by lines and add some basic formatting
    return text.split('\n').map((line, index) => {
      // Highlight timestamps
      if (line.includes('Timestamp:')) {
        return <span key={index} className="text-blue-400 font-semibold">{line}</span>
      }
      // Highlight errors
      if (line.includes('ERROR:') || line.includes('ERRO')) {
        return <span key={index} className="text-red-400">{line}</span>
      }
      // Highlight success messages
      if (line.includes('SUCESSO') || line.includes('SUCCESS') || line.includes('✅')) {
        return <span key={index} className="text-green-400">{line}</span>
      }
      // Highlight separators
      if (line.trim().startsWith('===') || line.trim().startsWith('---')) {
        return <span key={index} className="text-gray-500">{line}</span>
      }
      return <span key={index}>{line}</span>
    })
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Logs de Ordens</h1>
            <p className="text-gray-400">Visualização dos logs de ordens enviadas</p>
          </div>
          <a
            href="/"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-md transition-colors text-sm"
          >
            ← Voltar para Trading
          </a>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4 flex flex-wrap items-center gap-4">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <span>Atualização automática</span>
          </label>

          {autoRefresh && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Intervalo:</label>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-gray-700 text-white px-2 py-1 rounded text-sm border border-gray-600"
              >
                <option value={3}>3 segundos</option>
                <option value={5}>5 segundos</option>
                <option value={10}>10 segundos</option>
                <option value={30}>30 segundos</option>
              </select>
            </div>
          )}

          {logInfo && (
            <div className="ml-auto text-sm text-gray-400">
              <span>Total: {logInfo.totalLines} linhas</span>
              {logInfo.returnedLines < logInfo.totalLines && (
                <span className="ml-2">(Mostrando últimas {logInfo.returnedLines})</span>
              )}
            </div>
          )}
        </div>

        {/* Log Content */}
        <div className="bg-gray-800 rounded-lg p-4">
          {error && (
            <div className="mb-4 p-4 bg-red-900/30 border border-red-500 rounded-lg">
              <p className="text-red-400 font-semibold">Erro ao carregar logs</p>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
          )}

          {loading && !logs && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-400">Carregando logs...</p>
            </div>
          )}

          {!loading && !logs && !error && (
            <div className="text-center py-8 text-gray-400">
              <p>Nenhum log encontrado para hoje.</p>
              <p className="text-sm mt-2">Os logs aparecerão aqui após enviar ordens.</p>
            </div>
          )}

          {logs && (
            <div className="relative">
              <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[calc(100vh-300px)]">
                <pre className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
                  {formatLogText(logs)}
                </pre>
              </div>
              
              {/* Copy button */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(logs)
                  alert('Logs copiados para a área de transferência!')
                }}
                className="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-sm rounded transition-colors"
                title="Copiar logs"
              >
                📋 Copiar
              </button>
            </div>
          )}

          {logInfo && (
            <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500">
              <p>Arquivo: {logInfo.logFile}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Logs

