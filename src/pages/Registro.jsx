import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const fmt = n => '$' + Math.round(n).toLocaleString('es-CL')

export default function Registro() {
  const [sales, setSales] = useState([])
  const [filter, setFilter] = useState('Todo')
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null)

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
    await supabase.from('sales').delete().eq('id', id)
    setConfirmDelete(null)
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
                  <button onClick={() => setConfirmDelete(s)} style={{ fontSize: '.85rem', color: 'var(--red)', background: 'var(--red-light)', border: 'none', cursor: 'pointer', fontWeight: 700, padding: '6px 10px', borderRadius: 8 }}>🗑</button>
                </div>
              </div>
            ))
        }
      </div>
    </div>

    {confirmDelete && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '28px 20px 36px', width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗑️</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 8 }}>¿Eliminar esta venta?</div>
          <div style={{ color: 'var(--gray-500)', fontSize: '.95rem', marginBottom: 24 }}>
            Venta de <strong>{fmt(confirmDelete.total)}</strong> del {confirmDelete.sale_date}. Esto no se puede deshacer.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={() => setConfirmDelete(null)}
              style={{ padding: '16px', borderRadius: 12, border: '2px solid var(--gray-200)', background: 'white', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={() => deleteSale(confirmDelete.id)}
              style={{ padding: '16px', borderRadius: 12, border: 'none', background: 'var(--red)', color: 'white', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>
              Sí, eliminar
            </button>
          </div>
        </div>
      </div>
    )}
  )
}
