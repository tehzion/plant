import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './AppRoot.jsx'
import './index.css'
import './styles/uiPrimitives.css'
import { initBrowserErrorTracking } from './utils/errorTracking.js'

initBrowserErrorTracking().catch(() => {})

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
