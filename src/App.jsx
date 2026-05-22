import { useState } from 'react'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import Sidebar, { PAGE_TITLES } from './components/Sidebar'
import { ToastContainer, useToast } from './hooks/useToast'

import Inicio from './pages/Inicio'
import Caja from './pages/Caja'
import Precios from './pages/Precios'
import Inventario from './pages/Inventario'
import Registro from './pages/Registro'
import Compras from './pages/Compras'
import Gastos from './pages/Gastos'
import Cargar from './pages/Cargar'

export default function App() {
  const [page, setPage] = useState('inicio')
  const { toasts, addToast } = useToast()

  const pages = {
    inicio:     <Inicio onNavigate={setPage} />,
    caja:       <Caja addToast={addToast} />,
    precios:    <Precios addToast={addToast} onNavigate={setPage} />,
    inventario: <Inventario addToast={addToast} />,
    registro:   <Registro />,
    compras:    <Compras addToast={addToast} />,
    gastos:     <Gastos addToast={addToast} />,
    cargar:     <Cargar addToast={addToast} />,
  }

  const content = pages[page] || pages.inicio

  return (
    <>
      <ToastContainer toasts={toasts} />

      {/* ── Mobile ── */}
      <div className="mobile-shell">
        <Header />
        {content}
        <BottomNav current={page} onChange={setPage} />
      </div>

      {/* ── Desktop ── */}
      <div className="desktop-shell">
        <Sidebar current={page} onChange={setPage} />
        <div className="desktop-main">
          <Header desktop pageTitle={PAGE_TITLES[page]} />
          <div className="desktop-content">
            {content}
          </div>
        </div>
      </div>
    </>
  )
}
