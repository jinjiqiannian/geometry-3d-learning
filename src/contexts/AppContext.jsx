import { createContext, useContext, useState, useCallback } from 'react'

const API_KEY_STORAGE = 'geometry_api_key'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem(API_KEY_STORAGE) || '' }
    catch { return '' }
  })

  const updateApiKey = useCallback((key) => {
    setApiKey(key)
    try {
      if (key) localStorage.setItem(API_KEY_STORAGE, key)
      else localStorage.removeItem(API_KEY_STORAGE)
    } catch { /* localStorage 不可用 */ }
  }, [])

  return (
    <AppContext.Provider value={{ apiKey, setApiKey: updateApiKey }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}

export default AppContext
