import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { startOfMonth, endOfMonth, format } from 'date-fns'

const fmt = n => '$' + Math.round(n).toLocaleString('es-CL')

const CATS = [
  { id: 'Electricidad', icon: '💡' },
  { id: 'Agua', icon: '💧' },
  { id: 'Arriendo', icon: '🏠' },
  { id: 'Préstamo', icon: '🏦' },
  { id: 'Contadora', icon: '📒' },
  { id: 'Internet', icon: '📶' },
  { id: 'Alarma', icon: '🔒' },
  { id: 'Otro', icon: '➕' },
]

export default function Gastos({ addToast }) {
  const [category, setCategory] = useState('')
  const [docType, setDocType] = useState('Factura')
  const [hasIva, setHasIva] = useState(true)
  const [amount, setAmount] = useState('')
  const [expenses, setExpenses] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd')
    const { data } = await supabase.from('expenses').select('*')
      .gte('expense_date', monthStart).lte('expense_date', monthEnd)
      .order('created_at', { ascending: false })
    setExpenses(data || [])
  }

  async function save() {
    if (!category || !amount) return addToast('Selecciona categoría y monto', 'error')
    setSaving(true)
    await supabase.from('expenses').insert({
      category, document_type: docType, has_iva: hasIva,
      amount: parseFloat(amount),
      expense_date: new Date().toISOString().split('T')[0]
    })
    addToast('✅ Gasto registrado')
    setCategory(''); setAmount(''); setSaving(false); load()
  }

  async function deleteExpense(id) {
    await supabase.from('expenses').delete().eq('id', id)
    addToast('Gasto eliminado'); load()
  }

  const totalPaid = expenses.reduce((s, e) => s + e.amount, 0)
  const ivaRecupera = expenses.filter(e => e.document_type === 'Factura' && e.has_iva)
    .reduce((s, e) => s + (e.amount / 1.19) * 0.19, 0)
  const gastoReal = totalPaid - ivaRecupera

  return (
    <div className="page">
      <div className="section">
        <div className="section-title">💡 Anotar un gasto</div>
        <div className="notice blue" style={{ marginBottom: 14 }}>
          ℹ️ Con factura de luz, agua u otros servicios también recuperas el IVA.
        </div>

        <div className="field-label">¿En qué gastaste?</div>
        <div className="cat-grid">
          {CATS.map(c => (
            <button key={c.id} className={`cat-btn ${category === c.id ? 'selected' : ''}`}
              onClick={() => setCategory(c.id)}>
              <span className="cat-icon">{c.icon}</span>{c.id}
            </button>
          ))}
        </div>

        <div className="field-label">¿Con qué documento?</div>
        <div className="toggle-pair">
          <button className={`toggle-btn ${docType === 'Factura' ? 'selected-green' : ''}`} onClick={() => setDocType('Factura')}>
            <span className="tog-icon">🧾</span>Factura<br /><span style={{ fontSize: '.68rem', fontWeight: 400 }}>(recupero IVA)</span>
          </button>
          <button className={`toggle-btn ${docType === 'Boleta' ? 'selected-purple' : ''}`} onClick={() => setDocType('Boleta')}>
            <span className="tog-icon">📄</span>Boleta<br /><span style={{ fontSize: '.68rem', fontWeight: 400 }}>(no recupero)</span>
          </button>
        </div>

        <div className="field-label">¿El monto tiene IVA incluido?</div>
        <div className="toggle-pair">
          <button className={`toggle-btn ${hasIva ? 'selected-green' : ''}`} onClick={() => setHasIva(true)}>
            <span className="tog-icon">💰</span>Sí, tiene IVA<br /><span style={{ fontSize: '.68rem', fontWeight: 400 }}>Lo que dice el doc.</span>
          </button>
          <button className={`toggle-btn ${!hasIva ? 'selected-purple' : ''}`} onClick={() => setHasIva(false)}>
            <span className="tog-icon">🧮</span>No, sin IVA<br /><span style={{ fontSize: '.68rem', fontWeight: 400 }}>Precio neto</span>
          </button>
        </div>

        <div className="field-label">¿Cuánto pagaste? ({hasIva ? 'con IVA' : 'neto'})</div>
        <input className="amount-input" type="number" placeholder="$0"
          value={amount} onChange={e => setAmount(e.target.value)}
          style={{ color: amount ? 'var(--gray-800)' : undefined }} />

        <button className="save-btn" onClick={save} disabled={saving}>
          💾 {saving ? 'Guardando...' : 'Guardar gasto'}
        </button>
      </div>

      <div className="section">
        <div className="section-title">Gastos del mes</div>
        {expenses.length === 0 ? <div className="empty">No hay gastos.</div> :
          expenses.map(e => {
            const iva = e.has_iva && e.document_type === 'Factura' ? (e.amount / 1.19) * 0.19 : 0
            return (
              <div key={e.id} className="history-item">
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.88rem' }}>{CATS.find(c => c.id === e.category)?.icon} {e.category}</div>
                  <div style={{ fontSize: '.74rem', color: 'var(--gray-400)' }}>{e.expense_date} · {e.document_type}</div>
                  {iva > 0 && <div style={{ fontSize: '.72rem', color: 'var(--green-dark)' }}>IVA recuperable: {fmt(iva)}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontWeight: 800, color: 'var(--red)' }}>{fmt(e.amount)}</div>
                  <button onClick={() => deleteExpense(e.id)} style={{ fontSize: '.7rem', color: 'var(--gray-300)', background: 'none', border: 'none', cursor: 'pointer' }}>🗑</button>
                </div>
              </div>
            )
          })
        }
        <hr className="divider" />
        <div className="summary-row"><span className="sr-label">Total pagado</span><span>{fmt(totalPaid)}</span></div>
        <div className="summary-row"><span className="sr-label">IVA que recuperas</span><span style={{ color: 'var(--green-dark)', fontWeight: 700 }}>{fmt(ivaRecupera)}</span></div>
        <div className="summary-row total"><span>Gasto real del mes</span><span style={{ color: 'var(--red)' }}>{fmt(gastoReal)}</span></div>
      </div>
    </div>
  )
}
