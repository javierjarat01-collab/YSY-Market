import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const fmt = n => '$' + Math.round(n).toLocaleString('es-CL')

export default function Caja({ addToast }) {
  const [products, setProducts] = useState([])
  const [topIds, setTopIds] = useState([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [payMethod, setPayMethod] = useState('Efectivo')
  const [cashReceived, setCashReceived] = useState('')
  const [saving, setSaving] = useState(false)
  const [weightModal, setWeightModal] = useState(null)
  const [gramsInput, setGramsInput] = useState('')
  const [newProdModal, setNewProdModal] = useState(false)
  const [newProd, setNewProd] = useState({ name: '', sale_price: '' })

  useEffect(() => { loadProducts(); loadTop() }, [])

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
  }

  async function loadTop() {
    const { data } = await supabase
      .from('sale_items')
      .select('product_id, quantity')
    if (!data) return
    const counts = {}
    data.forEach(({ product_id, quantity }) => {
      if (product_id) counts[product_id] = (counts[product_id] || 0) + quantity
    })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id)
    setTopIds(sorted)
  }

  const topProducts = topIds.map(id => products.find(p => p.id === id)).filter(Boolean)
  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

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
    const subtotal = Math.round(product.sale_price / 1000 * grams)
    setCart(c => {
      const existing = c.find(x => x.id === product.id)
      if (existing) return c.map(x => x.id === product.id ? { ...x, qty: x.qty + grams, subtotal_override: (x.subtotal_override || 0) + subtotal } : x)
      return [...c, { ...product, qty: grams, unit: 'g', subtotal_override: subtotal }]
    })
    setWeightModal(null)
    setGramsInput('')
  }

  async function saveNewProd() {
    if (!newProd.name || !newProd.sale_price) return
    const payload = {
      name: newProd.name.trim(),
      category: 'Otro',
      sale_price: parseFloat(newProd.sale_price),
      stock_current: 0,
      stock_min: 5,
      sold_by_weight: false,
    }
    const { data: saved, error } = await supabase.from('products').insert(payload).select().single()
    if (error) { addToast('Error al guardar producto', 'error'); return }
    await loadProducts()
    addToCart(saved)
    setNewProd({ name: '', sale_price: '' })
    setNewProdModal(false)
    addToast('✅ Producto guardado y agregado')
  }

  function changeQty(id, delta) {
    setCart(c => c.map(x => x.id === id ? { ...x, qty: Math.max(0, x.qty + delta) } : x).filter(x => x.qty > 0))
  }

  const total = cart.reduce((s, x) => s + (x.subtotal_override ?? x.sale_price * x.qty), 0)
  const vuelto = cashReceived && parseFloat(cashReceived) >= total ? parseFloat(cashReceived) - total : null

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

      for (const x of cart) {
        const { data: prod } = await supabase.from('products').select('stock_current').eq('id', x.id).single()
        const currentStock = prod ? prod.stock_current : (x.stock_current || 0)
        const newStock = Math.max(0, currentStock - (x.unit === 'g' ? 0 : x.qty))
        await supabase.from('products').update({ stock_current: newStock }).eq('id', x.id)
      }

      setCart([])
      setSearch('')
      setCashReceived('')
      await loadProducts()
      loadTop()
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

        {/* Productos más vendidos */}
        {topProducts.length > 0 && !search && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>⭐ Más vendidos</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {topProducts.map(p => (
                <button key={p.id} onClick={() => addToCart(p)}
                  style={{ padding: '12px 6px', borderRadius: 12, border: '2px solid var(--green-light)', background: 'var(--green-bg)', cursor: 'pointer', textAlign: 'center', fontFamily: 'var(--font)' }}>
                  <div style={{ fontWeight: 700, fontSize: '.82rem', color: 'var(--gray-800)', marginBottom: 2, lineHeight: 1.2 }}>{p.name}</div>
                  <div style={{ fontWeight: 800, fontSize: '.85rem', color: 'var(--green-dark)' }}>{fmt(p.sale_price)}{p.sold_by_weight ? '/kg' : ''}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Buscador */}
        <div className="search-bar">
          <span>🔍</span>
          <input placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--gray-400)' }}>✕</button>}
        </div>

        {/* Botón producto nuevo */}
        <button onClick={() => { setNewProdModal(true); setNewProd({ name: search, sale_price: '' }) }}
          style={{ width: '100%', padding: '13px', borderRadius: 12, border: '2px dashed var(--green)', background: 'var(--green-bg)', color: 'var(--green-dark)', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', fontFamily: 'var(--font)', marginBottom: 12 }}>
          ➕ Agregar producto nuevo
        </button>

        {products.length === 0 && <div className="empty">Sin productos. Agrégalos en Inventario.</div>}

        {/* Lista de productos */}
        {search && filtered.slice(0, 8).map(p => (
          <div key={p.id} className="product-item" onClick={() => addToCart(p)}>
            <div>
              <div className="pi-name">{p.name} {p.sold_by_weight && <span style={{ fontSize: '.68rem', background: '#ede9fe', color: '#7c3aed', borderRadius: 6, padding: '1px 5px', fontWeight: 700 }}>⚖️</span>}</div>
              <div className="pi-cat">{p.category} · Stock: {p.stock_current}</div>
            </div>
            <div className="pi-price">{fmt(p.sale_price)}{p.sold_by_weight && <span style={{ fontSize: '.7rem', fontWeight: 400 }}>/kg</span>}</div>
          </div>
        ))}
        {!search && filtered.slice(0, 8).map(p => (
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
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>⚖️ {weightModal.name}</div>
                <div style={{ fontSize: '.8rem', color: 'var(--gray-400)' }}>${weightModal.sale_price.toLocaleString('es-CL')} por kilo</div>
              </div>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
                {[100, 200, 250, 500].map(g => (
                  <button key={g} onClick={() => setGramsInput(String(g))}
                    style={{ padding: '10px 4px', borderRadius: 10, border: '1.5px solid var(--gray-200)', background: gramsInput === String(g) ? '#ede9fe' : 'white', fontWeight: 700, fontSize: '.85rem', cursor: 'pointer', color: gramsInput === String(g) ? '#7c3aed' : 'inherit' }}>
                    {g}g
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                {[1,2,3,4,5,6,7,8,9].map(n => (
                  <button key={n} onClick={() => setGramsInput(p => p.length < 5 ? p + n : p)}
                    style={{ padding: '18px 8px', borderRadius: 12, border: '1.5px solid var(--gray-200)', background: 'white', fontWeight: 800, fontSize: '1.3rem', cursor: 'pointer' }}>
                    {n}
                  </button>
                ))}
                <button onClick={() => setGramsInput('')} style={{ padding: '18px 8px', borderRadius: 12, border: '1.5px solid var(--gray-200)', background: '#fff5f5', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', color: 'var(--red)' }}>✕</button>
                <button onClick={() => setGramsInput(p => p.length < 5 ? p + '0' : p)} style={{ padding: '18px 8px', borderRadius: 12, border: '1.5px solid var(--gray-200)', background: 'white', fontWeight: 800, fontSize: '1.3rem', cursor: 'pointer' }}>0</button>
                <button onClick={() => setGramsInput(p => p.slice(0, -1))} style={{ padding: '18px 8px', borderRadius: 12, border: '1.5px solid var(--gray-200)', background: '#fffbeb', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer' }}>⌫</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
                <button onClick={() => { setWeightModal(null); setGramsInput('') }} style={{ padding: '16px', borderRadius: 12, border: '1.5px solid var(--gray-200)', background: 'white', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>Cancelar</button>
                <button onClick={confirmGrams} disabled={!gramsInput || gramsInput === '0'} className="save-btn" style={{ margin: 0, fontSize: '1rem', opacity: (!gramsInput || gramsInput === '0') ? .4 : 1 }}>✅ Agregar al carrito</button>
              </div>
            </div>
          </div>
        )}

        {/* Carrito */}
        <div style={{ marginTop: 16, background: 'var(--green-bg)', borderRadius: 12, padding: 14, border: '1.5px solid var(--green-light)' }}>
          <div style={{ fontSize: '.78rem', fontWeight: 800, color: 'var(--green-dark)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Productos en esta venta
          </div>
          {cart.length === 0 ? (
            <div style={{ color: 'var(--gray-400)', fontSize: '.88rem', textAlign: 'center', padding: '8px 0' }}>Toca un producto para agregarlo 👆</div>
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
                <button key={p.id} className={`pay-btn ${payMethod === p.id ? 'active' : ''}`} onClick={() => { setPayMethod(p.id); setCashReceived('') }}>
                  <span className="pay-icon">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: '1.2rem', fontWeight: 800 }}>
              <span>Total</span>
              <span style={{ color: 'var(--green-dark)' }}>{fmt(total)}</span>
            </div>

            {/* Vuelto — solo en efectivo */}
            {payMethod === 'Efectivo' && (
              <div style={{ marginTop: 12, background: '#fffbeb', borderRadius: 12, padding: 14, border: '1.5px solid #fde68a' }}>
                <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#92400e', marginBottom: 8 }}>💵 ¿Cuánto pagó el cliente?</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
                  {[1000, 2000, 5000, 10000].map(v => (
                    <button key={v} onClick={() => setCashReceived(String(v))}
                      style={{ padding: '10px 2px', borderRadius: 10, border: `2px solid ${cashReceived === String(v) ? '#f59e0b' : '#fde68a'}`, background: cashReceived === String(v) ? '#fef3c7' : 'white', fontWeight: 700, fontSize: '.8rem', cursor: 'pointer', color: '#92400e' }}>
                      ${v >= 1000 ? (v/1000)+'mil' : v}
                    </button>
                  ))}
                </div>
                <input
                  className="field-input"
                  type="number"
                  placeholder="O escribe el monto..."
                  value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                  style={{ marginBottom: 0 }}
                />
                {vuelto !== null && (
                  <div style={{ marginTop: 10, textAlign: 'center', background: 'var(--green-bg)', borderRadius: 10, padding: '12px', border: '2px solid var(--green-light)' }}>
                    <div style={{ fontSize: '.78rem', color: 'var(--green-dark)', fontWeight: 700 }}>VUELTO</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--green-dark)' }}>{fmt(vuelto)}</div>
                  </div>
                )}
                {cashReceived && parseFloat(cashReceived) < total && (
                  <div style={{ marginTop: 8, textAlign: 'center', color: 'var(--red)', fontWeight: 700, fontSize: '.9rem' }}>
                    ⚠️ Falta {fmt(total - parseFloat(cashReceived))}
                  </div>
                )}
              </div>
            )}

            <button className="save-btn" onClick={saveSale} disabled={saving}>
              💾 {saving ? 'Guardando...' : 'Cobrar venta'}
            </button>
          </>
        )}
      </div>
    </div>

    {/* Modal nuevo producto */}
    {newProdModal && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '24px 20px 36px', width: '100%', maxWidth: 400 }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 4 }}>➕ Producto nuevo</div>
          <div style={{ fontSize: '.85rem', color: 'var(--gray-500)', marginBottom: 16 }}>Se guardará en inventario y se agrega a la venta.</div>

          <div className="field-label">Nombre del producto</div>
          <input
            className="field-input"
            placeholder="Ej: Coca-Cola 1.5L"
            value={newProd.name}
            onChange={e => setNewProd(p => ({ ...p, name: e.target.value }))}
            autoFocus
          />

          <div className="field-label">Precio de venta</div>
          <input
            className="field-input"
            type="number"
            placeholder="Ej: 1200"
            value={newProd.sale_price}
            onChange={e => setNewProd(p => ({ ...p, sale_price: e.target.value }))}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginTop: 20 }}>
            <button onClick={() => { setNewProdModal(false); setNewProd({ name: '', sale_price: '' }) }}
              style={{ padding: '16px', borderRadius: 12, border: '2px solid var(--gray-200)', background: 'white', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={saveNewProd} disabled={!newProd.name || !newProd.sale_price}
              className="save-btn" style={{ margin: 0, opacity: (!newProd.name || !newProd.sale_price) ? .4 : 1 }}>
              ✅ Guardar y agregar
            </button>
          </div>
        </div>
      </div>
    )}
  )
}
