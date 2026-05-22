import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const fmt = n => '$' + Math.round(n).toLocaleString('es-CL')

export default function Caja({ addToast }) {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [payMethod, setPayMethod] = useState('Efectivo')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  function addToCart(product) {
    setCart(c => {
      const existing = c.find(x => x.id === product.id)
      if (existing) return c.map(x => x.id === product.id ? { ...x, qty: x.qty + 1 } : x)
      return [...c, { ...product, qty: 1 }]
    })
  }

  function changeQty(id, delta) {
    setCart(c => {
      const updated = c.map(x => x.id === id ? { ...x, qty: Math.max(0, x.qty + delta) } : x)
      return updated.filter(x => x.qty > 0)
    })
  }

  const total = cart.reduce((s, x) => s + x.sale_price * x.qty, 0)

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
        product_name: x.name,
        quantity: x.qty,
        unit_price: x.sale_price,
        subtotal: x.sale_price * x.qty,
      }))
      await supabase.from('sale_items').insert(items)

      // Update stock
      for (const x of cart) {
        const newStock = Math.max(0, (x.stock_current || 0) - x.qty)
        await supabase.from('products').update({ stock_current: newStock }).eq('id', x.id)
      }

      setCart([])
      setSearch('')
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
              <div className="pi-name">{p.name}</div>
              <div className="pi-cat">{p.category} · Stock: {p.stock_current}</div>
            </div>
            <div className="pi-price">{fmt(p.sale_price)}</div>
          </div>
        ))}

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
                <div className="ci-qty-ctrl">
                  <button className="qty-btn" onClick={() => changeQty(x.id, -1)}>−</button>
                  <span style={{ fontWeight: 800, minWidth: 20, textAlign: 'center' }}>{x.qty}</span>
                  <button className="qty-btn" onClick={() => changeQty(x.id, 1)}>+</button>
                </div>
                <div className="ci-subtotal">{fmt(x.sale_price * x.qty)}</div>
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
