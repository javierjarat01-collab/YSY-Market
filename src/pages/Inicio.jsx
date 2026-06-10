import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { format, startOfMonth, endOfMonth } from 'date-fns'

const fmt = n => '$' + Math.round(n).toLocaleString('es-CL')

export default function Inicio({ onNavigate }) {
  const [stats, setStats] = useState({ ventasHoy:0, clientes:0, gastosMes:0, gananciaNeta:0, gainPerPeso:null, sinCosto:0 })
  const [topSales, setTopSales] = useState([])
  const [topMargin, setTopMargin] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const today = format(new Date(), 'yyyy-MM-dd')
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const monthEnd   = format(endOfMonth(new Date()),   'yyyy-MM-dd')

    const { data: salesToday } = await supabase.from('sales').select('total,id').eq('sale_date', today)
    const ventasHoy = salesToday?.reduce((s,x) => s+x.total, 0) || 0
    const clientes  = salesToday?.length || 0

    const { data: exps } = await supabase.from('expenses').select('amount,has_iva,document_type').gte('expense_date', monthStart).lte('expense_date', monthEnd)
    let gastosMes = 0
    exps?.forEach(e => { const iva = e.has_iva ? e.amount/1.19*0.19 : 0; gastosMes += e.document_type==='Factura' ? e.amount-iva : e.amount })

    const { data: purchases } = await supabase.from('purchases').select('total,has_iva,document_type').gte('purchase_date', monthStart).lte('purchase_date', monthEnd).eq('is_historical', false)
    let costoPurchases = 0
    purchases?.forEach(p => { const iva = p.has_iva ? p.total/1.19*0.19 : 0; costoPurchases += p.document_type==='Factura' ? p.total-iva : p.total })

    const { data: salesMonth } = await supabase.from('sales').select('total').gte('sale_date', monthStart).lte('sale_date', monthEnd)
    const ventasMesNeto = (salesMonth?.reduce((s,x) => s+x.total, 0) || 0) / 1.19
    const gananciaNeta = ventasMesNeto - gastosMes - costoPurchases

    const { data: saleItems } = await supabase.from('sale_items').select('product_id,quantity,subtotal,product_name')
    const { data: allProducts } = await supabase.from('products').select('id,cost_price,cost_has_iva,sale_price')

    let totalRevenue=0, totalCost=0, sinCosto=0
    const sinCostoNombres = new Set()
    saleItems?.forEach(si => {
      const prod = allProducts?.find(p => p.id===si.product_id)
      if (prod?.cost_price) {
        const costNeto = prod.cost_has_iva ? prod.cost_price/1.19 : prod.cost_price
        totalCost += costNeto * si.quantity
        totalRevenue += si.subtotal/1.19
      } else {
        sinCostoNombres.add(si.product_name)
      }
    })
    sinCosto = sinCostoNombres.size
    const gainPerPeso = totalCost > 0 ? (totalRevenue-totalCost)/totalCost : null

    const productSales = {}
    saleItems?.forEach(si => { productSales[si.product_name] = (productSales[si.product_name]||0)+si.quantity })
    const topSalesList = Object.entries(productSales).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,qty])=>({name,qty}))

    const { data: allProds2 } = await supabase.from('products').select('id,name,cost_price,cost_has_iva,sale_price').not('cost_price','is',null)
    const marginList = (allProds2||[]).map(p => {
      const costNeto = p.cost_has_iva ? p.cost_price/1.19 : p.cost_price
      const saleNeto = p.sale_price/1.19
      const margin = costNeto>0 ? ((saleNeto-costNeto)/costNeto)*100 : 0
      return { name:p.name, margin:Math.round(margin) }
    }).sort((a,b)=>b.margin-a.margin).slice(0,5)

    setStats({ ventasHoy, clientes, gastosMes, gananciaNeta, gainPerPeso, sinCosto })
    setTopSales(topSalesList)
    setTopMargin(marginList)
    setLoading(false)
  }

  const ACTIONS = [
    { label:'Registrar una venta',            icon:'🧾', cls:'green',  page:'caja' },
    { label:'Cambiar precios de productos',    icon:'🏷️', cls:'purple', page:'precios' },
    { label:'Anotar compra y reponer stock',   icon:'🛍️', cls:'yellow', page:'compras' },
    { label:'Anotar un gasto',                 icon:'💡', cls:'red',    page:'gastos' },
    { label:'Ver ganancias',                   icon:'📊', cls:'blue',   page:'registro' },
    { label:'Cargar datos históricos',         icon:'📥', cls:'teal',   page:'cargar' },
  ]

  const rankColors = ['gold','silver','bronze','','']

  return (
    <div className="page">
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Ventas del día</div><div className="stat-value text-green">{fmt(stats.ventasHoy)}</div></div>
        <div className="stat-card"><div className="stat-label">Clientes hoy</div><div className="stat-value">{stats.clientes}</div></div>
        <div className="stat-card"><div className="stat-label">Gastos del mes</div><div className="stat-value" style={{color:'var(--red)'}}>{fmt(stats.gastosMes)}</div></div>
        <div className="stat-card"><div className="stat-label">Ganancia neta</div><div className="stat-value text-green">{fmt(stats.gananciaNeta)}</div></div>
      </div>

      {/* Ganancia por peso */}
      {stats.gainPerPeso !== null && (
        <div className="gain-card">
          <div style={{flex:1}}>
            <div className="gain-label">💰 Ganancia por peso invertido</div>
            <div className="gain-sub" style={{marginTop:4}}>Por cada $1 invertido en productos con costo registrado, ganas ${stats.gainPerPeso.toFixed(2)} neto</div>
            {stats.sinCosto > 0 && (
              <div style={{marginTop:8, background:'rgba(255,255,255,.2)', borderRadius:8, padding:'6px 10px', fontSize:'.78rem', fontWeight:700}}>
                ⚠️ {stats.sinCosto} producto{stats.sinCosto>1?'s':''} vendido{stats.sinCosto>1?'s':''} sin costo registrado — el margen real puede ser menor
              </div>
            )}
          </div>
          <div className="gain-value">{stats.gainPerPeso>=0?'+':''}{(stats.gainPerPeso*100).toFixed(1)}%</div>
        </div>
      )}
      {stats.gainPerPeso === null && stats.sinCosto > 0 && (
        <div style={{margin:'0 12px 12px', background:'#fff7ed', borderRadius:12, padding:'14px 16px', border:'1.5px solid #fde68a'}}>
          <div style={{fontWeight:700, color:'#92400e', fontSize:'.9rem'}}>⚠️ No se puede calcular el margen</div>
          <div style={{fontSize:'.82rem', color:'#b45309', marginTop:4}}>
            {stats.sinCosto} producto{stats.sinCosto>1?'s':''} vendido{stats.sinCosto>1?'s':''} no tienen costo registrado. Agrégalos en Inventario para ver la ganancia real.
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="inicio-grid">
        {/* Acciones */}
        <div className="section">
          <div className="section-title">⚡ Acciones rápidas</div>
          <div className="actions-grid">
            {ACTIONS.map(a => (
              <button key={a.page} className={`action-btn ${a.cls}`} onClick={() => onNavigate(a.page)}>
                <span style={{fontSize:'1.3rem'}}>{a.icon}</span>{a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Top ventas */}
        <div className="section">
          <div className="section-title">🏆 Productos más vendidos</div>
          {topSales.length === 0
            ? <div className="empty">Sin ventas registradas aún.</div>
            : topSales.map((p,i) => (
              <div key={p.name} className="rank-item">
                <div className={`rank-num ${rankColors[i]||''}`}>{i+1}</div>
                <div className="rank-info"><div className="rank-name">{p.name}</div><div className="rank-sub">{p.qty} unidades</div></div>
                <div className="rank-val">{p.qty} ud.</div>
              </div>
            ))
          }
        </div>

        {/* Top margen */}
        <div className="section">
          <div className="section-title">📈 Mejor margen de ganancia</div>
          <div style={{fontSize:'.78rem',color:'var(--gray-400)',marginBottom:10}}>Solo productos con costo registrado</div>
          {topMargin.length === 0
            ? <div className="empty">Agrega costos en Inventario para ver márgenes.</div>
            : topMargin.map((p,i) => (
              <div key={p.name} className="rank-item">
                <div className={`rank-num ${rankColors[i]||''}`}>{i+1}</div>
                <div className="rank-info"><div className="rank-name">{p.name}</div><div className="rank-sub">Margen sobre costo</div></div>
                <div className="rank-val" style={{color:p.margin>=0?'var(--green-dark)':'var(--red)'}}>{p.margin>=0?'+':''}{p.margin}%</div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Avisos */}
      <div className="section" style={{marginTop:12}}>
        <div className="section-title">Avisos</div>
        <div className="notice green">✅ Todo en orden. ¡Buen día de trabajo!</div>
      </div>
    </div>
  )
}
