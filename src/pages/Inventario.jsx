import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const CATS = [
  { id: 'Bebestible', icon: '🧃' },
  { id: 'Lácteo', icon: '🥛' },
  { id: 'Cecina', icon: '🥩' },
  { id: 'Dulce', icon: '🍫' },
  { id: 'Snack', icon: '🍿' },
  { id: 'Limpieza', icon: '🧹' },
  { id: 'Abarrotes', icon: '🥫' },
  { id: 'Congelado', icon: '🧊' },
  { id: 'Otro', icon: '📦', wide: true },
]

const fmt = n => '$' + Math.round(n).toLocaleString('es-CL')

export default function Inventario({ addToast }) {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    name: '', category: 'Otro', sale_price: '', cost_price: '', cost_has_iva: true,
    stock_current: '', stock_min: '5', expiry_date: '', sold_by_weight: false
  })
  const [saving, setSaving] = useState(false)
  const [editProd, setEditProd] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.name || !form.sale_price) return addToast('Nombre y precio son requeridos', 'error')
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      category: form.category,
      sale_price: parseFloat(form.sale_price),
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
      cost_has_iva: form.cost_has_iva,
      stock_current: parseInt(form.stock_current) || 0,
      stock_min: parseInt(form.stock_min) || 5,
      expiry_date: form.expiry_date || null,
      sold_by_weight: form.sold_by_weight,
    }
    if (editProd) {
      const { error } = await supabase.from('products').update(payload).eq('id', editProd.id)
      if (error) { addToast('Error: ' + error.message, 'error'); setSaving(false); return }
      addToast('✅ Producto actualizado')
      setEditProd(null)
    } else {
      const { error } = await supabase.from('products').insert(payload)
      if (error) { addToast('Error: ' + error.message, 'error'); setSaving(false); return }
      addToast('✅ Producto guardado')
    }
    setForm({ name: '', category: 'Otro', sale_price: '', cost_price: '', cost_has_iva: true, stock_current: '', stock_min: '5', expiry_date: '', sold_by_weight: false })
    setSaving(false)
    load()
  }

  async function deleteProduct(id) {
    await supabase.from('products').delete().eq('id', id)
    addToast('Producto eliminado')
    setConfirmDelete(null)
    load()
  }

  function startEdit(p) {
    setEditProd(p)
    setForm({
      name: p.name, category: p.category, sale_price: String(p.sale_price),
      cost_price: p.cost_price ? String(p.cost_price) : '',
      cost_has_iva: p.cost_has_iva, stock_current: String(p.stock_current),
      stock_min: String(p.stock_min), expiry_date: p.expiry_date || '',
      sold_by_weight: p.sold_by_weight || false
    })
    window.scrollTo(0, 0)
  }

  return (
    <div className="page">
      <div className="section">
        <div className="section-title">📦 {editProd ? 'Editar producto' : 'Agregar producto'}</div>

        <div className="field-label">Nombre del producto</div>
        <input className="field-input" placeholder="Ej: Coca-Cola 1.5L" value={form.name} onChange={e => set('name', e.target.value)} />

        <div className="field-label">Categoría</div>
        <div className="cat-grid">
          {CATS.map(c => (
            <button key={c.id} className={`cat-btn ${c.wide ? 'cat-btn-wide' : ''} ${form.category === c.id ? 'selected' : ''}`}
              onClick={() => set('category', c.id)}>
              <span className="cat-icon">{c.icon}</span>{c.id}
            </button>
          ))}
        </div>

        <button
          onClick={() => set('sold_by_weight', !form.sold_by_weight)}
          style={{
            width: '100%', marginBottom: 10, padding: '14px 16px',
            borderRadius: 12, border: `2px solid ${form.sold_by_weight ? '#7c3aed' : 'var(--gray-200)'}`,
            background: form.sold_by_weight ? '#ede9fe' : 'white',
            display: 'flex', alignItems: 'center', gap: 12,
            cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)'
          }}>
          <span style={{ fontSize: '1.4rem' }}>{form.sold_by_weight ? '✅' : '⬜'}</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '.9rem', color: form.sold_by_weight ? '#7c3aed' : 'var(--gray-700)' }}>
              ⚖️ Se vende por peso (fiambre, queso, etc.)
            </div>
            <div style={{ fontSize: '.75rem', color: 'var(--gray-400)', marginTop: 2 }}>
              {form.sold_by_weight ? 'Activo — el precio es por kilo' : 'Toca para activar'}
            </div>
          </div>
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div className="field-label">Precio de venta</div>
            <div style={{ fontSize: '.74rem', color: 'var(--gray-400)', marginBottom: 4 }}>
              {form.sold_by_weight ? 'Precio por kilo (con IVA)' : 'Con IVA incluido'}
            </div>
            <input className="field-input" type="number" placeholder={form.sold_by_weight ? '8000' : '1200'} value={form.sale_price} onChange={e => set('sale_price', e.target.value)} />
          </div>
          <div>
            <div className="field-label">Costo de compra</div>
            <div style={{ fontSize: '.74rem', color: 'var(--gray-400)', marginBottom: 4 }}>¿El monto tiene IVA?</div>
            <div className="toggle-pair" style={{ marginBottom: 6 }}>
              <button className={`toggle-btn ${form.cost_has_iva ? 'selected-green' : ''}`} onClick={() => set('cost_has_iva', true)}>
                <span className="tog-icon">💰</span><span style={{ fontSize: '.7rem' }}>Sí, IVA</span>
              </button>
              <button className={`toggle-btn ${!form.cost_has_iva ? 'selected-purple' : ''}`} onClick={() => set('cost_has_iva', false)}>
                <span className="tog-icon">🧮</span><span style={{ fontSize: '.7rem' }}>No, neto</span>
              </button>
            </div>
            <input className="field-input" type="number" placeholder="Ej: 952" value={form.cost_price} onChange={e => set('cost_price', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div className="field-label">Stock actual</div>
            <input className="field-input" type="number" placeholder="24" value={form.stock_current} onChange={e => set('stock_current', e.target.value)} />
          </div>
          <div>
            <div className="field-label">Stock mínimo</div>
            <input className="field-input" type="number" placeholder="5" value={form.stock_min} onChange={e => set('stock_min', e.target.value)} />
          </div>
        </div>

        <div className="field-label">Fecha de caducidad <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>(opcional)</span></div>
        <input className="field-input" type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} />

        <button className="save-btn" onClick={save} disabled={saving}>
          💾 {saving ? 'Guardando...' : editProd ? 'Actualizar producto' : 'Guardar producto'}
        </button>
        {editProd && (
          <button onClick={() => { setEditProd(null); setForm({ name: '', category: 'Otro', sale_price: '', cost_price: '', cost_has_iva: true, stock_current: '', stock_min: '5', expiry_date: '', sold_by_weight: false }) }}
            style={{ width: '100%', marginTop: 8, padding: '12px', borderRadius: 12, border: '1.5px solid var(--gray-200)', background: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
            Cancelar edición
          </button>
        )}
      </div>

      <div className="section">
        <div className="section-title">Mis productos <span style={{ fontSize: '.8rem', fontWeight: 400, color: 'var(--gray-400)' }}>({products.length})</span></div>
        <div className="search-bar">
          <span>🔍</span>
          <input placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {products.length === 0 ? (
          <div className="empty">Aun no hay productos.</div>
        ) : products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => (
          <div key={p.id} className="product-item" style={{ cursor: 'default' }}>
            <div onClick={() => startEdit(p)} style={{ flex: 1, cursor: 'pointer' }}>
              <div className="pi-name">{p.name} {p.sold_by_weight && <span style={{ fontSize: '.7rem', background: 'var(--purple-light, #ede9fe)', color: '#7c3aed', borderRadius: 6, padding: '1px 6px', fontWeight: 700 }}>⚖️ kg</span>}</div>
              <div className="pi-cat">{p.category} · Stock: {p.stock_current}</div>
              {p.stock_current <= p.stock_min && (
                <div style={{ fontSize: '.72rem', color: 'var(--orange)', fontWeight: 700 }}>⚠️ Stock bajo</div>
              )}
            </div>
            <div style={{ textAlign: 'right', marginLeft: 8 }}>
              <div className="pi-price">${p.sale_price.toLocaleString('es-CL')}{p.sold_by_weight && <span style={{ fontSize: '.7rem', fontWeight: 400 }}>/kg</span>}</div>
              {p.cost_price && <div style={{ fontSize: '.7rem', color: 'var(--gray-400)' }}>C: ${p.cost_price.toLocaleString('es-CL')}</div>}
              <button onClick={() => setConfirmDelete(p)} style={{ fontSize: '.8rem', color: 'var(--red)', background: 'var(--red-light)', border: 'none', cursor: 'pointer', fontWeight: 700, padding: '6px 10px', borderRadius: 8 }}>🗑 Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Modal confirmación eliminar */}
    {confirmDelete && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '28px 20px 36px', width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗑️</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 8 }}>¿Eliminar producto?</div>
          <div style={{ color: 'var(--gray-500)', fontSize: '.95rem', marginBottom: 24 }}>
            Se eliminará <strong>{confirmDelete.name}</strong> del inventario. Esto no se puede deshacer.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={() => setConfirmDelete(null)}
              style={{ padding: '16px', borderRadius: 12, border: '2px solid var(--gray-200)', background: 'white', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={() => deleteProduct(confirmDelete.id)}
              style={{ padding: '16px', borderRadius: 12, border: 'none', background: 'var(--red)', color: 'white', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>
              Sí, eliminar
            </button>
          </div>
        </div>
      </div>
    )}
  )
}
