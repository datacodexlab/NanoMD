import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'
import './styles/themes.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { AppProvider } from './contexts/AppContext'
import { ReadAloudProvider } from './contexts/ReadAloudContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider>
            <AppProvider>
                <ReadAloudProvider>
                    <App />
                </ReadAloudProvider>
            </AppProvider>
        </ThemeProvider>
    </React.StrictMode>,
)
