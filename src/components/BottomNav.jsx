const NAV = [
  { id: 'inicio', icon: '🏠', label: 'Inicio' },
  { id: 'caja', icon: '🧾', label: 'Caja' },
  { id: 'precios', icon: '🏷️', label: 'Precios' },
  { id: 'inventario', icon: '📦', label: 'Inv.' },
  { id: 'registro', icon: '📋', label: 'Registro' },
  { id: 'compras', icon: '🛍️', label: 'Compras' },
  { id: 'gastos', icon: '💡', label: 'Gastos' },
  { id: 'cargar', icon: '📥', label: 'Cargar' },
]

export default function BottomNav({ current, onChange }) {
  return (
    <nav className="bottom-nav">
      {NAV.map(n => (
        <button
          key={n.id}
          className={`nav-item ${current === n.id ? (n.id === 'cargar' ? 'active-load' : 'active') : ''}`}
          onClick={() => onChange(n.id)}
        >
          <span className="nav-icon">{n.icon}</span>
          <span className="nav-label" style={n.id === 'cargar' && current === n.id ? { color: '#3b82f6' } : {}}>{n.label}</span>
        </button>
      ))}
    </nav>
  )
}
