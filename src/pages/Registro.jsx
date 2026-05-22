import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const fmt = n => '$' + Math.round(n).toLocaleString('es-CL')

export default function Registro() {
  const [sales, setSales] = useState([])
  const [filter, setFilter] = useState('Todo')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('sales').select('*').order('sale_date', { ascending: false }).order('created_at', { ascending: false })
    setSales(data || [])
    setLoading(false)
  }

  const today = format(new Date(), 'yyyy-MM-dd')
  const FILTERS = ['Todo', 'Hoy', 'Efectivo', 'Debito', 'Transfer.']

  const filtered = sales.filter(s => {
    if (filter === 'Todo') return true
    if (filter === 'Hoy') return s.sale_date === today
    return s.payment_method === filter
  })

  const totalSales = filtered.length
  const totalAmount = filtered.reduce((s, x) => s + x.total, 0)
  const avgTicket = totalSales > 0 ? totalAmount / totalSales : 0

  const PAY_ICONS = { Efectivo: '💵', Debito: '💳', 'Transfer.': '📱' }

  async function deleteSale(id) {
    if (!confirm('¿Eliminar esta venta?')) return
    await supabase.from('sales').delete().eq('id', id)
    load()
  }

  return (
    <div className="page">
      {/* Summary */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Ventas</div>
          <div className="stat-value">{totalSales}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-value text-green">{fmt(totalAmount)}</div>
        </div>
        <div className="stat-card" style={{ gridColumn: 'span 2' }}>
          <div className="stat-label">Ticket promedio</div>
          <div className="stat-value text-blue">{totalSales > 0 ? fmt(avgTicket) : '—'}</div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">📋 Historial de ventas</div>
        <div className="pill-row">
          {FILTERS.map(f => (
            <button key={f} className={`pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>

        {loading ? <div className="spinner" /> :
          filtered.length === 0 ? <div className="empty">No hay ventas para este filtro.</div> :
            filtered.map(s => (
              <div key={s.id} className="history-item">
                <div className="hi-left">
                  <div className="hi-desc">
                    {PAY_ICONS[s.payment_method]} {s.description || 'Venta'}
                    {s.is_historical && <span style={{ fontSize: '.7rem', color: 'var(--gray-400)', marginLeft: 6 }}>(histórico)</span>}
                  </div>
                  <div className="hi-date">{s.sale_date}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="hi-amount">{fmt(s.total)}</div>
                  <button onClick={() => deleteSale(s.id)} style={{ fontSize: '.7rem', color: 'var(--gray-300)', background: 'none', border: 'none', cursor: 'pointer' }}>🗑</button>
                </div>
              </div>
            ))
        }
      </div>
    </div>
  )
}
