import { useState, useEffect, useRef } from 'react'
import { testConnection } from '../../ai/aiService'

const PROVIDERS = [
  { value: 'ollama', label: 'Ollama (Local)', defaultEndpoint: '/ollama/v1/chat/completions' },
  { value: 'openai', label: 'OpenAI', defaultEndpoint: 'https://api.openai.com/v1/chat/completions' },
  { value: 'custom', label: 'Custom', defaultEndpoint: '' },
]

export default function AISettingsPanel({ settings, updateSettings, onClose }) {
  const [draft, setDraft] = useState({ ...settings })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null) // { ok, message, models? }
  const [availableModels, setAvailableModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)
  const hasFetched = useRef(false)

  const update = (field, value) => setDraft((d) => ({ ...d, [field]: value }))

  // Auto-fetch models on mount when provider is Ollama
  useEffect(() => {
    if (hasFetched.current) return
    if (draft.provider === 'ollama' && draft.endpoint) {
      hasFetched.current = true
      setLoadingModels(true)
      testConnection(draft)
        .then((result) => {
          const models = result.models || []
          setAvailableModels(models)
          // If current model isn't in list, select first available
          if (models.length > 0 && !models.includes(draft.model)) {
            setDraft((d) => ({ ...d, model: models[0] }))
          }
        })
        .catch(() => {
          // Silent fail on auto-fetch — user can still type manually
        })
        .finally(() => setLoadingModels(false))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleProviderChange(provider) {
    const preset = PROVIDERS.find((p) => p.value === provider)
    setDraft((d) => ({
      ...d,
      provider,
      endpoint: preset?.defaultEndpoint || d.endpoint,
    }))
    setTestResult(null)
    if (provider !== 'ollama') {
      setAvailableModels([])
    }
  }

  async function handleTestConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testConnection(draft)
      const models = result.models || []
      setAvailableModels(models)
      setTestResult({
        ok: true,
        message: models.length
          ? `Connected! ${models.length} model(s) available.`
          : 'Connected successfully!',
        models,
      })
      // If current model isn't in the returned list, select first available
      if (models.length > 0 && !models.includes(draft.model)) {
        setDraft((d) => ({ ...d, model: models[0] }))
      }
    } catch (err) {
      setTestResult({ ok: false, message: err.message, models: [] })
    } finally {
      setTesting(false)
    }
  }

  function handleSave() {
    updateSettings(draft)
    onClose()
  }

  return (
    <div className="border-t border-gray-700 pt-3">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-400">
        AI Settings
      </h4>

      {/* Provider */}
      <div className="mb-2">
        <label className="mb-1 block text-xs text-gray-500">Provider</label>
        <select
          value={draft.provider}
          onChange={(e) => handleProviderChange(e.target.value)}
          className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 outline-none focus:border-amber-500"
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Endpoint */}
      <div className="mb-2">
        <label className="mb-1 block text-xs text-gray-500">Endpoint URL</label>
        <input
          type="text"
          value={draft.endpoint}
          onChange={(e) => update('endpoint', e.target.value)}
          placeholder="https://api.example.com/v1/chat/completions"
          className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 outline-none focus:border-amber-500"
        />
      </div>

      {/* Model */}
      <div className="mb-2">
        <label className="mb-1 block text-xs text-gray-500">
          Model{loadingModels ? ' (loading…)' : ''}
        </label>
        {availableModels.length > 0 && draft.provider === 'ollama' ? (
          <select
            value={draft.model}
            onChange={(e) => update('model', e.target.value)}
            className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 outline-none focus:border-amber-500"
          >
            {availableModels.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={draft.model}
            onChange={(e) => update('model', e.target.value)}
            placeholder="qwen2.5:72b"
            className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 outline-none focus:border-amber-500"
          />
        )}
      </div>

      {/* API Key (hidden for Ollama) */}
      {draft.provider !== 'ollama' && (
        <div className="mb-2">
          <label className="mb-1 block text-xs text-gray-500">API Key</label>
          <input
            type="password"
            value={draft.apiKey}
            onChange={(e) => update('apiKey', e.target.value)}
            placeholder="sk-..."
            className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 outline-none focus:border-amber-500"
          />
        </div>
      )}

      {/* Temperature */}
      <div className="mb-3">
        <label className="mb-1 block text-xs text-gray-500">
          Temperature: {draft.temperature.toFixed(1)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={draft.temperature}
          onChange={(e) => update('temperature', parseFloat(e.target.value))}
          className="w-full accent-amber-500"
        />
      </div>

      {/* Test Connection */}
      <button
        onClick={handleTestConnection}
        disabled={testing}
        className="mb-2 w-full rounded bg-gray-700 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-600 disabled:opacity-50"
      >
        {testing ? 'Testing...' : 'Test Connection'}
      </button>

      {testResult && (
        <div
          className={`mb-2 rounded px-2 py-1.5 text-xs ${
            testResult.ok
              ? 'bg-emerald-900/40 text-emerald-300'
              : 'bg-red-900/40 text-red-300'
          }`}
        >
          {testResult.message}
        </div>
      )}

      {/* Save / Cancel */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 rounded bg-amber-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-amber-500"
        >
          Save
        </button>
        <button
          onClick={onClose}
          className="flex-1 rounded bg-gray-700 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
