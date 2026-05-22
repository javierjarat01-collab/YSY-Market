import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { startOfMonth, endOfMonth, format } from 'date-fns'

const fmt = n => '$' + Math.round(n).toLocaleString('es-CL')
const fmtGreen = n => <span style={{ color: 'var(--green-dark)', fontWeight: 700 }}>{fmt(n)}</span>

export default function Compras({ addToast }) {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [qty, setQty] = useState('')
  const [total, setTotal] = useState('')
  const [hasIva, setHasIva] = useState(true)
  const [docType, setDocType] = useState('Factura')
  const [supplier, setSupplier] = useState('Otro')
  const [purchases, setPurchases] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: prods } = await supabase.from('products').select('*').order('name')
    setProducts(prods || [])
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd')
    const { data: purch } = await supabase.from('purchases').select('*')
      .gte('purchase_date', monthStart).lte('purchase_date', monthEnd)
      .eq('is_historical', false).order('created_at', { ascending: false })
    setPurchases(purch || [])
  }

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  async function savePurchase() {
    if (!selected || !total) return addToast('Selecciona un producto y monto', 'error')
    setSaving(true)
    const t = parseFloat(total)
    const q = parseInt(qty) || 0
    await supabase.from('purchases').insert({
      product_id: selected.id, product_name: selected.name,
      quantity: q, total: t, has_iva: hasIva, is_historical: false,
      supplier, document_type: docType,
      purchase_date: new Date().toISOString().split('T')[0]
    })
    if (q > 0) {
      await supabase.from('products').update({ stock_current: selected.stock_current + q }).eq('id', selected.id)
    }
    // Update cost price if has value
    if (q > 0 && t > 0) {
      const unitCost = t / q
      await supabase.from('products').update({ cost_price: unitCost, cost_has_iva: hasIva }).eq('id', selected.id)
    }
    addToast('✅ Compra registrada')
    setSelected(null); setQty(''); setTotal(''); setSearch('')
    setSaving(false); loadAll()
  }

  // Monthly summary
  const totalPaid = purchases.reduce((s, p) => s + p.total, 0)
  const ivaRecupera = purchases.filter(p => p.document_type === 'Factura' && p.has_iva)
    .reduce((s, p) => s + (p.total / 1.19) * 0.19, 0)
  const costoReal = totalPaid - ivaRecupera

  return (
    <div className="page">
      <div className="section">
        <div className="section-title">🛍️ Compra y reposición de stock</div>

        <div style={{ fontWeight: 800, fontSize: '.88rem', marginBottom: 10 }}>
          <span style={{ background: 'var(--green)', color: 'white', borderRadius: '50%', width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '.78rem', marginRight: 8 }}>1</span>
          ¿Qué producto compraste?
        </div>

        <div className="search-bar">
          <span>🔍</span>
          <input placeholder="Buscar en inventario..." value={search} onChange={e => { setSearch(e.target.value); setSelected(null) }} />
        </div>

        {products.length === 0 && <div className="notice red">⚠️ Sin productos en inventario.</div>}

        {search && filtered.slice(0, 5).map(p => (
          <div key={p.id} className={`product-item ${selected?.id === p.id ? 'selected' : ''}`}
            style={{ border: selected?.id === p.id ? '2px solid var(--green)' : undefined }}
            onClick={() => { setSelected(p); setSearch(p.name) }}>
            <div>
              <div className="pi-name">{p.name}</div>
              <div className="pi-cat">{p.category} · Stock: {p.stock_current}</div>
            </div>
            <div className="pi-price">${p.sale_price.toLocaleString('es-CL')}</div>
          </div>
        ))}

        {selected && (
          <>
            <div className="notice green" style={{ marginTop: 10 }}>✅ Seleccionado: {selected.name}</div>

            <div className="field-label">Proveedor</div>
            <select className="field-input" value={supplier} onChange={e => setSupplier(e.target.value)}>
              {['Cecinas', 'Lácteos', 'Bebidas', 'Abarrotes', 'Distribuidora', 'Otro'].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>

            <div className="field-label">Tipo de documento</div>
            <div className="toggle-pair">
              <button className={`toggle-btn ${docType === 'Factura' ? 'selected-green' : ''}`} onClick={() => setDocType('Factura')}>
                <span className="tog-icon">🧾</span><span>Factura<br /><span style={{ fontSize: '.68rem', fontWeight: 400 }}>(recupero IVA)</span></span>
              </button>
              <button className={`toggle-btn ${docType === 'Boleta' ? 'selected-purple' : ''}`} onClick={() => setDocType('Boleta')}>
                <span className="tog-icon">📄</span><span>Boleta<br /><span style={{ fontSize: '.68rem', fontWeight: 400 }}>(no recupero)</span></span>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div className="field-label">Cantidad comprada</div>
                <input className="field-input" type="number" placeholder="24" value={qty} onChange={e => setQty(e.target.value)} />
              </div>
              <div>
                <div className="field-label">Monto total ({hasIva ? 'con IVA' : 'neto'})</div>
                <input className="field-input" type="number" placeholder="0" value={total} onChange={e => setTotal(e.target.value)} />
              </div>
            </div>

            <button className="save-btn" onClick={savePurchase} disabled={saving}>
              💾 {saving ? 'Guardando...' : 'Registrar compra'}
            </button>
          </>
        )}
      </div>

      <div className="section">
        <div className="section-title">Compras del mes</div>
        {purchases.length === 0 ? (
          <div className="empty">No hay compras registradas.</div>
        ) : purchases.map(p => (
          <div key={p.id} className="history-item">
            <div>
              <div style={{ fontWeight: 700, fontSize: '.88rem' }}>{p.product_name}</div>
              <div style={{ fontSize: '.74rem', color: 'var(--gray-400)' }}>{p.purchase_date} · {p.document_type} · {p.quantity} ud.</div>
            </div>
            <div style={{ fontWeight: 800, color: 'var(--orange)' }}>{fmt(p.total)}</div>
          </div>
        ))}
        <hr className="divider" />
        <div className="summary-row"><span className="sr-label">Total pagado</span><span>{fmt(totalPaid)}</span></div>
        <div className="summary-row"><span className="sr-label">IVA que recuperas</span>{fmtGreen(ivaRecupera)}</div>
        <div className="summary-row total"><span>Costo real</span><span style={{ color: 'var(--orange)' }}>{fmt(costoReal)}</span></div>
      </div>
    </div>
  )
}
