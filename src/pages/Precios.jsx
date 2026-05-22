import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const fmt = n => '$' + Math.round(n).toLocaleString('es-CL')

export default function Precios({ addToast, onNavigate }) {
  const [products, setProducts] = useState([])
  const [editing, setEditing] = useState(null)
  const [newPrice, setNewPrice] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
  }

  async function savePrice() {
    if (!editing || !newPrice) return
    const price = parseFloat(newPrice)
    if (isNaN(price) || price <= 0) return addToast('Precio inválido', 'error')
    await supabase.from('products').update({ sale_price: price }).eq('id', editing.id)
    addToast('✅ Precio actualizado')
    setEditing(null)
    setNewPrice('')
    load()
  }

  if (products.length === 0) return (
    <div className="page">
      <div className="section">
        <div className="section-title">🏷️ Lista de precios</div>
        <p style={{ fontSize: '.88rem', color: 'var(--gray-500)', marginBottom: 12 }}>
          Edita el precio de cualquier producto. El cambio se aplica de inmediato en caja.
        </p>
        <div className="notice blue">ℹ️ Sin productos aun. Agrégalos en Inventario.</div>
        <button className="action-btn purple" style={{ marginTop: 12 }} onClick={() => onNavigate('inventario')}>
          <span>📦</span> Ir a agregar productos
        </button>
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="section">
        <div className="section-title">🏷️ Lista de precios</div>
        <p style={{ fontSize: '.88rem', color: 'var(--gray-500)', marginBottom: 12 }}>
          Edita el precio de cualquier producto. El cambio se aplica de inmediato en caja.
        </p>
        {products.map(p => (
          <div key={p.id}>
            <div className="product-item" onClick={() => { setEditing(p); setNewPrice(String(p.sale_price)) }}>
              <div>
                <div className="pi-name">{p.name}</div>
                <div className="pi-cat">{p.category}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="pi-price">{fmt(p.sale_price)}</div>
                {p.cost_price && (
                  <div style={{ fontSize: '.7rem', color: 'var(--gray-400)' }}>
                    Costo: {fmt(p.cost_price)}
                  </div>
                )}
              </div>
            </div>
            {editing?.id === p.id && (
              <div style={{ padding: '10px 12px', background: 'var(--green-bg)', borderRadius: 10, marginBottom: 8, border: '1.5px solid var(--green-light)' }}>
                <div className="field-label">Nuevo precio de venta (con IVA)</div>
                <input className="field-input" type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Ej: 1500" autoFocus />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button className="save-btn" style={{ flex: 1, marginTop: 0 }} onClick={savePrice}>💾 Guardar</button>
                  <button onClick={() => setEditing(null)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid var(--gray-200)', background: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
