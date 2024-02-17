import ReactDOM from 'react-dom/client'
import React from 'react'
import { navigator } from './app'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <div style={{ position: 'fixed', height: '100%', width: '100%' }}>
            <navigator.Stack />
        </div>
    </React.StrictMode>,
);