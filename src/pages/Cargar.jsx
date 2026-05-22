import { useState } from 'react'
import { supabase } from '../lib/supabase'

const fmt = n => '$' + Math.round(n).toLocaleString('es-CL')

export default function Cargar({ addToast }) {
  const [tab, setTab] = useState('ventas') // ventas | compras | inventario
  // --- Ventas históricas ---
  const [date, setDate] = useState('')
  const [desc, setDesc] = useState('')
  const [payMethod, setPayMethod] = useState('Efectivo')
  const [amount, setAmount] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [bulkPreview, setBulkPreview] = useState([])
  const [saving, setSaving] = useState(false)

  // --- Compras históricas ---
  const [cDate, setCDate] = useState('')
  const [cSupplier, setCSupplier] = useState('Otro')
  const [cDocType, setCDocType] = useState('Factura')
  const [cHasIva, setCHasIva] = useState(true)
  const [cAmount, setCAmount] = useState('')
  const [cNote, setCNote] = useState('')

  // --- Inventario rapido ---
  const [iName, setIName] = useState('')
  const [iPrice, setIPrice] = useState('1500')
  const [iStock, setIStock] = useState('24')
  const [iStockMin, setIStockMin] = useState('5')
  const [iExpiry, setIExpiry] = useState('')
  const [iCat, setICat] = useState('Otro')
  const [loaded, setLoaded] = useState([])

  const CATS = ['Bebestible','Lácteo','Cecina','Dulce','Snack','Limpieza','Abarrotes','Congelado','Otro']

  function parseBulk() {
    const lines = bulkText.trim().split('\n').filter(Boolean)
    const parsed = lines.map(line => {
      const parts = line.trim().split(/\s+/)
      if (parts.length < 2) return null
      const [rawDate, rawAmount] = parts
      const [d, m, y] = rawDate.split('/')
      const dateStr = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
      const amt = parseFloat(rawAmount)
      if (isNaN(amt) || !y) return null
      return { date: dateStr, amount: amt }
    }).filter(Boolean)
    setBulkPreview(parsed)
  }

  async function saveBulkSales() {
    if (bulkPreview.length === 0) return
    setSaving(true)
    const rows = bulkPreview.map(p => ({
      sale_date: p.date, total: p.amount, payment_method: payMethod,
      is_historical: true, description: 'Carga histórica'
    }))
    await supabase.from('sales').insert(rows)
    addToast(`✅ ${rows.length} ventas cargadas`)
    setBulkText(''); setBulkPreview([])
    setSaving(false)
  }

  async function saveSingleSale() {
    if (!date || !amount) return addToast('Fecha y monto son requeridos', 'error')
    setSaving(true)
    await supabase.from('sales').insert({
      sale_date: date, total: parseFloat(amount), payment_method: payMethod,
      is_historical: true, description: desc || 'Venta histórica'
    })
    addToast('✅ Venta histórica guardada')
    setDate(''); setAmount(''); setDesc('')
    setSaving(false)
  }

  async function saveHistoricalPurchase() {
    if (!cDate || !cAmount) return addToast('Fecha y monto son requeridos', 'error')
    setSaving(true)
    await supabase.from('purchases').insert({
      purchase_date: cDate, product_name: 'Compra general', product_id: null,
      quantity: 0, total: parseFloat(cAmount), has_iva: cHasIva,
      is_historical: true, supplier: cSupplier, document_type: cDocType, note: cNote
    })
    addToast('✅ Compra histórica guardada')
    setCDate(''); setCAmount(''); setCNote('')
    setSaving(false)
  }

  async function saveQuickProduct() {
    if (!iName || !iPrice) return addToast('Nombre y precio requeridos', 'error')
    setSaving(true)
    const { data } = await supabase.from('products').insert({
      name: iName.trim(), category: iCat, sale_price: parseFloat(iPrice),
      stock_current: parseInt(iStock) || 0, stock_min: parseInt(iStockMin) || 5,
      expiry_date: iExpiry || null
    }).select().single()
    setLoaded(l => [...l, data])
    addToast('✅ Producto agregado')
    setIName(''); setIPrice('1500'); setIStock('24'); setIExpiry('')
    setSaving(false)
  }

  const PAY = [
    { id: 'Efectivo', icon: '💵' },
    { id: 'Debito', icon: '💳' },
    { id: 'Transfer.', icon: '📱' },
  ]

  return (
    <div className="page">
      <div className="section">
        <div className="notice purple" style={{ marginBottom: 14 }}>
          📥 <strong>Carga de datos históricos</strong><br />
          <span style={{ fontWeight: 400 }}>Ingresa ventas y compras pasadas sin detallar productos.</span>
        </div>

        <div className="tab-row">
          {[{ id: 'ventas', icon: '🧾', label: 'Ventas' }, { id: 'compras', icon: '🛍️', label: 'Compras' }, { id: 'inventario', icon: '📦', label: 'Inventario' }].map(t => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              <span className="tab-icon">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* VENTAS TAB */}
        {tab === 'ventas' && (
          <>
            <div style={{ fontSize: '.95rem', fontWeight: 800, marginBottom: 10 }}>Registrar venta (sin detalle)</div>
            <div style={{ fontSize: '.82rem', color: 'var(--gray-500)', marginBottom: 10 }}>El monto total ya incluye IVA — el sistema lo descuenta automáticamente.</div>

            <div className="field-label">Fecha</div>
            <input className="field-input" type="date" value={date} onChange={e => setDate(e.target.value)} />

            <div className="field-label">Descripción (opcional)</div>
            <input className="field-input" placeholder="Ej: Ventas del dia, Boleta 123" value={desc} onChange={e => setDesc(e.target.value)} />

            <div className="field-label">Forma de pago</div>
            <div className="pay-row">
              {PAY.map(p => (
                <button key={p.id} className={`pay-btn ${payMethod === p.id ? 'active' : ''}`} onClick={() => setPayMethod(p.id)}>
                  <span className="pay-icon">{p.icon}</span>{p.id}
                </button>
              ))}
            </div>

            <div className="field-label">Monto total cobrado (con IVA)</div>
            <input className="amount-input" type="number" placeholder="$0" value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ color: amount ? 'var(--gray-800)' : undefined }} />

            <button className="save-btn" onClick={saveSingleSale} disabled={saving}>
              ✅ Guardar venta histórica
            </button>

            <hr className="divider" style={{ margin: '20px 0' }} />

            <div style={{ fontSize: '.95rem', fontWeight: 800, marginBottom: 6 }}>Cargar varios días de una vez</div>
            <div style={{ fontSize: '.82rem', color: 'var(--gray-500)', marginBottom: 4 }}>
              Una venta por línea: <strong>dd/mm/aaaa monto</strong>
            </div>
            <div style={{ background: 'var(--gray-100)', borderRadius: 8, padding: '10px 12px', fontFamily: 'monospace', fontSize: '.82rem', color: 'var(--gray-600)', marginBottom: 10 }}>
              11/04/2025 87500<br />12/04/2025 103200<br />13/04/2025 95000
            </div>

            <div className="field-label">Pegar datos aquí</div>
            <textarea className="field-input" rows={5} placeholder={'11/04/2025 87500\n12/04/2025 103200'} value={bulkText} onChange={e => { setBulkText(e.target.value); setBulkPreview([]) }} style={{ resize: 'vertical', fontFamily: 'monospace' }} />

            <button onClick={parseBulk} style={{ width: '100%', marginTop: 10, padding: '12px', borderRadius: 12, border: '1.5px solid var(--gray-200)', background: 'var(--white)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'var(--font)' }}>
              🔍 Revisar datos
            </button>

            {bulkPreview.length > 0 && (
              <>
                <div style={{ marginTop: 12, fontSize: '.82rem', color: 'var(--gray-500)' }}>{bulkPreview.length} ventas encontradas:</div>
                {bulkPreview.slice(0, 5).map((p, i) => (
                  <div key={i} className="history-item">
                    <span>{p.date}</span>
                    <span style={{ fontWeight: 800, color: 'var(--green-dark)' }}>{fmt(p.amount)}</span>
                  </div>
                ))}
                {bulkPreview.length > 5 && <div style={{ fontSize: '.8rem', color: 'var(--gray-400)' }}>...y {bulkPreview.length - 5} más</div>}
                <button className="save-btn" onClick={saveBulkSales} disabled={saving}>
                  ✅ Guardar {bulkPreview.length} ventas
                </button>
              </>
            )}
          </>
        )}

        {/* COMPRAS TAB */}
        {tab === 'compras' && (
          <>
            <div style={{ fontSize: '.95rem', fontWeight: 800, marginBottom: 6 }}>Registrar compra (sin detalle)</div>
            <div style={{ fontSize: '.82rem', color: 'var(--gray-500)', marginBottom: 10 }}>Con factura el IVA se recupera automáticamente.</div>

            <div className="field-label">Fecha</div>
            <input className="field-input" type="date" value={cDate} onChange={e => setCDate(e.target.value)} />

            <div className="field-label">Proveedor</div>
            <select className="field-input" value={cSupplier} onChange={e => setCSupplier(e.target.value)}>
              {['Cecinas', 'Lácteos', 'Bebidas', 'Abarrotes', 'Distribuidora', 'Otro'].map(s => <option key={s}>{s}</option>)}
            </select>

            <div className="field-label">Tipo de documento</div>
            <div className="toggle-pair">
              <button className={`toggle-btn ${cDocType === 'Factura' ? 'selected-green' : ''}`} onClick={() => setCDocType('Factura')}>
                <span className="tog-icon">🧾</span>Factura<br /><span style={{ fontSize: '.68rem', fontWeight: 400 }}>(recupero IVA)</span>
              </button>
              <button className={`toggle-btn ${cDocType === 'Boleta' ? 'selected-purple' : ''}`} onClick={() => setCDocType('Boleta')}>
                <span className="tog-icon">📄</span>Boleta<br /><span style={{ fontSize: '.68rem', fontWeight: 400 }}>(no recupero)</span>
              </button>
            </div>

            <div className="field-label">¿El monto tiene IVA incluido?</div>
            <div className="toggle-pair">
              <button className={`toggle-btn ${cHasIva ? 'selected-green' : ''}`} onClick={() => setCHasIva(true)}>
                <span className="tog-icon">💰</span>Sí, tiene IVA<br /><span style={{ fontSize: '.68rem', fontWeight: 400 }}>Lo que dice el doc.</span>
              </button>
              <button className={`toggle-btn ${!cHasIva ? 'selected-purple' : ''}`} onClick={() => setCHasIva(false)}>
                <span className="tog-icon">🧮</span>No, sin IVA<br /><span style={{ fontSize: '.68rem', fontWeight: 400 }}>Precio neto</span>
              </button>
            </div>

            <div className="field-label">Monto total (con IVA)</div>
            <input className="amount-input" type="number" placeholder="$0" value={cAmount}
              onChange={e => setCAmount(e.target.value)}
              style={{ color: cAmount ? 'var(--gray-800)' : undefined }} />

            <div className="field-label">Nota (opcional)</div>
            <input className="field-input" placeholder="Ej: Compra semanal, Factura 456" value={cNote} onChange={e => setCNote(e.target.value)} />

            <button className="save-btn" onClick={saveHistoricalPurchase} disabled={saving}>
              ✅ Guardar compra histórica
            </button>
          </>
        )}

        {/* INVENTARIO TAB */}
        {tab === 'inventario' && (
          <>
            <div className="notice purple" style={{ marginBottom: 12 }}>
              📦 Agrega los productos que tienes ahora. Si no sabes el costo, déjalo en blanco y complétalo después en Inventario.
            </div>
            <div style={{ fontSize: '.95rem', fontWeight: 800, marginBottom: 10 }}>Agregar producto rápido</div>

            <div className="field-label">Nombre del producto</div>
            <input className="field-input" placeholder="Ej: Coca-Cola 1.5L" value={iName} onChange={e => setIName(e.target.value)} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div className="field-label">Precio de venta</div>
                <input className="field-input" type="number" placeholder="1500" value={iPrice} onChange={e => setIPrice(e.target.value)} />
              </div>
              <div>
                <div className="field-label">Stock actual</div>
                <input className="field-input" type="number" placeholder="24" value={iStock} onChange={e => setIStock(e.target.value)} />
              </div>
              <div>
                <div className="field-label">Stock mínimo</div>
                <input className="field-input" type="number" placeholder="5" value={iStockMin} onChange={e => setIStockMin(e.target.value)} />
              </div>
              <div>
                <div className="field-label">Caducidad (opc.)</div>
                <input className="field-input" type="date" value={iExpiry} onChange={e => setIExpiry(e.target.value)} />
              </div>
            </div>

            <div className="field-label">Categoría</div>
            <div className="cat-grid">
              {CATS.map(c => (
                <button key={c} className={`cat-btn ${iCat === c ? 'selected' : ''}`} onClick={() => setICat(c)}>
                  <span className="cat-icon">📦</span>{c}
                </button>
              ))}
            </div>

            <button className="save-btn" onClick={saveQuickProduct} disabled={saving}>
              📦 Agregar al inventario
            </button>

            {loaded.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="section-title">Productos cargados</div>
                {loaded.map(p => (
                  <div key={p.id} className="history-item">
                    <span style={{ fontWeight: 700 }}>{p.name}</span>
                    <span style={{ color: 'var(--green-dark)', fontWeight: 800 }}>{fmt(p.sale_price)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
