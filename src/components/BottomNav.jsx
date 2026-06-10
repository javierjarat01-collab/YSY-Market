import { useState } from 'react'

const MAIN_NAV = [
  { id: 'caja',       icon: '🧾', label: 'Vender' },
  { id: 'inventario', icon: '📦', label: 'Inventario' },
  { id: 'inicio',     icon: '📊', label: 'Resumen' },
]

const MORE_NAV = [
  { id: 'registro',  icon: '📋', label: 'Registro de ventas' },
  { id: 'compras',   icon: '🛍️', label: 'Compras' },
  { id: 'gastos',    icon: '💡', label: 'Gastos' },
  { id: 'precios',   icon: '🏷️', label: 'Precios' },
  { id: 'cargar',    icon: '📥', label: 'Cargar histórico' },
]

export default function BottomNav({ current, onChange }) {
  const [showMore, setShowMore] = useState(false)
  const isMore = MORE_NAV.some(n => n.id === current)

  return (
    <>
      {/* Panel "Más" */}
      {showMore && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowMore(false)}>
          <div style={{ position: 'absolute', bottom: 70, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'white', borderRadius: '20px 20px 0 0', padding: '16px 16px 8px', boxShadow: '0 -4px 24px rgba(0,0,0,.15)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12, textAlign: 'center' }}>Más opciones</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, paddingBottom: 8 }}>
              {MORE_NAV.map(n => (
                <button key={n.id}
                  onClick={() => { onChange(n.id); setShowMore(false) }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 4px', borderRadius: 12, border: 'none', background: current === n.id ? 'var(--green-light)' : 'var(--gray-50)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  <span style={{ fontSize: '1.4rem' }}>{n.icon}</span>
                  <span style={{ fontSize: '.62rem', fontWeight: 700, color: current === n.id ? 'var(--green-dark)' : 'var(--gray-500)', textAlign: 'center', lineHeight: 1.2 }}>{n.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        {MAIN_NAV.map(n => (
          <button key={n.id}
            className={`nav-item ${current === n.id ? 'active' : ''}`}
            onClick={() => { onChange(n.id); setShowMore(false) }}>
            <span className="nav-icon">{n.icon}</span>
            <span className="nav-label">{n.label}</span>
          </button>
        ))}
        <button
          className={`nav-item ${isMore || showMore ? 'active' : ''}`}
          onClick={() => setShowMore(s => !s)}>
          <span className="nav-icon">{showMore ? '✕' : '☰'}</span>
          <span className="nav-label">Más</span>
        </button>
      </nav>
    </>
  )
}
