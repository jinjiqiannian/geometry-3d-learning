import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(<App />)

// Signal to boot watchdog in index.html that React mounted successfully
window.__MATHVIZ_MOUNTED__ = true
