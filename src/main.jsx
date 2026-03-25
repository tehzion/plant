import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './AppRoot.jsx'
import './index.css'

console.log('🚀 main.jsx: Mounting restored App...');
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
