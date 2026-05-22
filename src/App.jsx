import { useState } from 'react'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
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
    inicio: <Inicio onNavigate={setPage} />,
    caja: <Caja addToast={addToast} />,
    precios: <Precios addToast={addToast} onNavigate={setPage} />,
    inventario: <Inventario addToast={addToast} />,
    registro: <Registro />,
    compras: <Compras addToast={addToast} />,
    gastos: <Gastos addToast={addToast} />,
    cargar: <Cargar addToast={addToast} />,
  }

  return (
    <>
      <ToastContainer toasts={toasts} />
      <Header />
      {pages[page] || pages.inicio}
      <BottomNav current={page} onChange={setPage} />
    </>
  )
}
