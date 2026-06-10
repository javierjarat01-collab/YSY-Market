import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const fmt = n => '$' + Math.round(n).toLocaleString('es-CL')

export default function Caja({ addToast }) {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [payMethod, setPayMethod] = useState('Efectivo')
  const [saving, setSaving] = useState(false)
  const [weightModal, setWeightModal] = useState(null) // producto seleccionado para ingresar gramos
  const [gramsInput, setGramsInput] = useState('')

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  function addToCart(product) {
    if (product.sold_by_weight) {
      setWeightModal(product)
      setGramsInput('')
      return
    }
    setCart(c => {
      const existing = c.find(x => x.id === product.id)
      if (existing) return c.map(x => x.id === product.id ? { ...x, qty: x.qty + 1 } : x)
      return [...c, { ...product, qty: 1 }]
    })
  }

  function confirmGrams() {
    const grams = parseFloat(gramsInput)
    if (!grams || grams <= 0) return
    const product = weightModal
    const pricePerGram = product.sale_price / 1000
    const subtotal = Math.round(pricePerGram * grams)
    setCart(c => {
      const existing = c.find(x => x.id === product.id)
      if (existing) return c.map(x => x.id === product.id ? { ...x, qty: x.qty + grams, subtotal_override: (x.subtotal_override || x.sale_price * x.qty) + subtotal } : x)
      return [...c, { ...product, qty: grams, unit: 'g', subtotal_override: subtotal }]
    })
    setWeightModal(null)
    setGramsInput('')
  }

  function changeQty(id, delta) {
    setCart(c => {
      const updated = c.map(x => x.id === id ? { ...x, qty: Math.max(0, x.qty + delta) } : x)
      return updated.filter(x => x.qty > 0)
    })
  }

  const total = cart.reduce((s, x) => s + (x.subtotal_override ?? x.sale_price * x.qty), 0)

  async function saveSale() {
    if (cart.length === 0) return
    setSaving(true)
    try {
      const { data: sale, error } = await supabase.from('sales').insert({
        total, payment_method: payMethod, is_historical: false,
        sale_date: new Date().toISOString().split('T')[0]
      }).select().single()
      if (error) throw error

      const items = cart.map(x => ({
        sale_id: sale.id,
        product_id: x.id,
        product_name: x.unit === 'g' ? `${x.name} (${x.qty}g)` : x.name,
        quantity: x.unit === 'g' ? 1 : x.qty,
        unit_price: x.subtotal_override ?? x.sale_price * x.qty,
        subtotal: x.subtotal_override ?? x.sale_price * x.qty,
      }))
      await supabase.from('sale_items').insert(items)

      // Update stock
      for (const x of cart) {
        const { data: prod } = await supabase.from('products').select('stock_current').eq('id', x.id).single()
        const currentStock = prod ? prod.stock_current : (x.stock_current || 0)
        const newStock = Math.max(0, currentStock - x.qty)
        await supabase.from('products').update({ stock_current: newStock }).eq('id', x.id)
      }

      setCart([])
      setSearch('')
      await loadProducts()
      addToast('✅ Venta registrada correctamente')
    } catch (e) {
      addToast('Error al guardar venta', 'error')
    }
    setSaving(false)
  }

  const PAY = [
    { id: 'Efectivo', icon: '💵', label: 'Efectivo' },
    { id: 'Debito', icon: '💳', label: 'Débito' },
    { id: 'Transfer.', icon: '📱', label: 'Transfer.' },
  ]

  return (
    <div className="page">
      <div className="section">
        <div className="section-title">🧾 Nueva venta</div>

        <div className="search-bar">
          <span>🔍</span>
          <input placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {products.length === 0 && (
          <div className="empty">Sin productos. Agrégalos en Inventario.</div>
        )}

        {/* Product list */}
        {filtered.slice(0, 8).map(p => (
          <div key={p.id} className="product-item" onClick={() => addToCart(p)}>
            <div>
              <div className="pi-name">{p.name} {p.sold_by_weight && <span style={{ fontSize: '.68rem', background: '#ede9fe', color: '#7c3aed', borderRadius: 6, padding: '1px 5px', fontWeight: 700 }}>⚖️</span>}</div>
              <div className="pi-cat">{p.category} · Stock: {p.stock_current}</div>
            </div>
            <div className="pi-price">{fmt(p.sale_price)}{p.sold_by_weight && <span style={{ fontSize: '.7rem', fontWeight: 400 }}>/kg</span>}</div>
          </div>
        ))}

        {/* Modal gramos */}
        {weightModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '20px 16px 32px', width: '100%', maxWidth: 400 }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>⚖️ {weightModal.name}</div>
                <div style={{ fontSize: '.8rem', color: 'var(--gray-400)' }}>${weightModal.sale_price.toLocaleString('es-CL')} por kilo</div>
              </div>

              {/* Display */}
              <div style={{ background: '#f8f9fa', borderRadius: 12, padding: '12px 16px', textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: 2, color: gramsInput ? 'var(--gray-800)' : 'var(--gray-300)' }}>
                  {gramsInput || '0'}<span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--gray-400)', marginLeft: 4 }}>g</span>
                </div>
                {gramsInput > 0 && (
                  <div style={{ fontWeight: 700, color: 'var(--green-dark)', fontSize: '1.1rem', marginTop: 4 }}>
                    = {fmt(Math.round(weightModal.sale_price / 1000 * parseFloat(gramsInput)))}
                  </div>
                )}
              </div>

              {/* Atajos rápidos */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
                {[100, 200, 250, 500].map(g => (
                  <button key={g} onClick={() => setGramsInput(String(g))}
                    style={{ padding: '10px 4px', borderRadius: 10, border: '1.5px solid var(--gray-200)', background: gramsInput === String(g) ? '#ede9fe' : 'white', fontWeight: 700, fontSize: '.85rem', cursor: 'pointer', color: gramsInput === String(g) ? '#7c3aed' : 'inherit' }}>
                    {g}g
                  </button>
                ))}
              </div>

              {/* Teclado numérico */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                {[1,2,3,4,5,6,7,8,9].map(n => (
                  <button key={n} onClick={() => setGramsInput(p => p.length < 5 ? p + n : p)}
                    style={{ padding: '18px 8px', borderRadius: 12, border: '1.5px solid var(--gray-200)', background: 'white', fontWeight: 800, fontSize: '1.3rem', cursor: 'pointer' }}>
                    {n}
                  </button>
                ))}
                <button onClick={() => setGramsInput('')}
                  style={{ padding: '18px 8px', borderRadius: 12, border: '1.5px solid var(--gray-200)', background: '#fff5f5', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', color: 'var(--red)' }}>
                  ✕
                </button>
                <button onClick={() => setGramsInput(p => p.length < 5 ? p + '0' : p)}
                  style={{ padding: '18px 8px', borderRadius: 12, border: '1.5px solid var(--gray-200)', background: 'white', fontWeight: 800, fontSize: '1.3rem', cursor: 'pointer' }}>
                  0
                </button>
                <button onClick={() => setGramsInput(p => p.slice(0, -1))}
                  style={{ padding: '18px 8px', borderRadius: 12, border: '1.5px solid var(--gray-200)', background: '#fffbeb', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>
                  ⌫
                </button>
              </div>

              {/* Botones acción */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
                <button onClick={() => { setWeightModal(null); setGramsInput('') }}
                  style={{ padding: '16px', borderRadius: 12, border: '1.5px solid var(--gray-200)', background: 'white', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={confirmGrams} disabled={!gramsInput || gramsInput === '0'}
                  className="save-btn" style={{ margin: 0, fontSize: '1rem', opacity: (!gramsInput || gramsInput === '0') ? .4 : 1 }}>
                  ✅ Agregar al carrito
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cart */}
        <div style={{ marginTop: 16, background: 'var(--green-bg)', borderRadius: 12, padding: 14, border: '1.5px solid var(--green-light)' }}>
          <div style={{ fontSize: '.78rem', fontWeight: 800, color: 'var(--green-dark)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Productos en esta venta
          </div>
          {cart.length === 0 ? (
            <div style={{ color: 'var(--gray-400)', fontSize: '.88rem', textAlign: 'center', padding: '8px 0' }}>
              Toca un producto para agregarlo 👆
            </div>
          ) : (
            cart.map(x => (
              <div key={x.id} className="cart-item">
                <div className="ci-name">{x.name}</div>
                {x.unit === 'g' ? (
                  <div style={{ fontSize: '.78rem', color: 'var(--gray-400)' }}>{x.qty}g</div>
                ) : (
                  <div className="ci-qty-ctrl">
                    <button className="qty-btn" onClick={() => changeQty(x.id, -1)}>−</button>
                    <span style={{ fontWeight: 800, minWidth: 20, textAlign: 'center' }}>{x.qty}</span>
                    <button className="qty-btn" onClick={() => changeQty(x.id, 1)}>+</button>
                  </div>
                )}
                <div className="ci-subtotal">{fmt(x.subtotal_override ?? x.sale_price * x.qty)}</div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <>
            <div className="field-label">Forma de pago</div>
            <div className="pay-row">
              {PAY.map(p => (
                <button key={p.id} className={`pay-btn ${payMethod === p.id ? 'active' : ''}`} onClick={() => setPayMethod(p.id)}>
                  <span className="pay-icon">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: '1.1rem', fontWeight: 800 }}>
              <span>Total</span>
              <span style={{ color: 'var(--green-dark)' }}>{fmt(total)}</span>
            </div>

            <button className="save-btn" onClick={saveSale} disabled={saving}>
              💾 {saving ? 'Guardando...' : 'Cobrar venta'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
