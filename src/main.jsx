/**
 * PharmaTalent — Sistema de gestión de personal
 * Copyright (c) 2026 Marc Aquino Carhuas. Todos los derechos reservados.
 * Software propietario. Ver LICENSE.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
