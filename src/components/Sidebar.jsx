import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const NAV = [
  { id: 'inicio', icon: '🏠', label: 'Inicio' },
  { id: 'caja', icon: '🧾', label: 'Caja' },
  { id: 'precios', icon: '🏷️', label: 'Precios' },
  { id: 'inventario', icon: '📦', label: 'Inventario' },
  { id: 'registro', icon: '📋', label: 'Registro' },
  { id: 'compras', icon: '🛍️', label: 'Compras' },
  { id: 'gastos', icon: '💡', label: 'Gastos' },
  { id: 'cargar', icon: '📥', label: 'Cargar datos' },
]

export default function Sidebar({ current, onChange }) {
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es })

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🛒</div>
        <div>
          <div className="sidebar-name">YSY Market</div>
          <div className="sidebar-date">{today}</div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="sidebar-nav">
        {NAV.map(n => (
          <button
            key={n.id}
            className={`sidebar-item ${current === n.id ? 'active' : ''} ${n.id === 'cargar' && current === n.id ? 'active-blue' : ''}`}
            onClick={() => onChange(n.id)}
          >
            <span className="sidebar-item-icon">{n.icon}</span>
            <span className="sidebar-item-label">{n.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontSize: '.72rem', color: 'var(--gray-400)', textAlign: 'center' }}>
          YSY Market CRM v1.0
        </div>
      </div>
    </aside>
  )
}
