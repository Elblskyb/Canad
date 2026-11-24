import React from 'react'
import { createRoot } from 'react-dom/client'
import App from '../src/App'

window.__errors = []
window.addEventListener('error', (e) => window.__errors.push(String(e.message)))

const root = createRoot(document.getElementById('root'))
root.render(React.createElement(App))
window.__rendered = true
