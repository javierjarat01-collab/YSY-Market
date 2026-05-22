# 🛒 YSY Market CRM

CRM completo para minimarket — funciona desde cualquier dispositivo móvil o desktop.

## Stack
- **Frontend**: React + Vite
- **Base de datos**: Supabase (PostgreSQL)
- **Deploy**: GitHub Pages / Vercel / Netlify

---

## 🚀 Setup rápido

### 1. Crear proyecto en Supabase
1. Ve a [supabase.com](https://supabase.com) y crea un proyecto gratis
2. Ve a **SQL Editor** y ejecuta todo el contenido de `supabase_schema.sql`
3. Copia tu **Project URL** y **anon key** desde Settings → API

### 2. Configurar variables de entorno
```bash
cp .env.example .env
```
Edita `.env` y pega tus credenciales de Supabase:
```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### 3. Instalar y correr
```bash
npm install
npm run dev
```
Abre http://localhost:5173

---

## 📦 Deploy en Vercel (recomendado)

1. Sube el proyecto a GitHub
2. Ve a [vercel.com](https://vercel.com) → New Project → importa tu repo
3. Agrega las variables de entorno en Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy ✅

---

## 🌐 Deploy en GitHub Pages

```bash
npm install -D gh-pages
```
Agrega en `package.json`:
```json
"homepage": "https://TU_USUARIO.github.io/ysy-market-crm",
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
}
```
```bash
npm run deploy
```

---

## ✨ Funcionalidades

| Módulo | Descripción |
|--------|-------------|
| 🏠 **Inicio** | Dashboard con ventas del día, clientes, gastos, ganancia neta, ganancia por peso invertido, top productos más vendidos y mejor margen |
| 🧾 **Caja** | Registrar ventas en tiempo real con buscador de productos, carrito y método de pago |
| 🏷️ **Precios** | Editar precios de productos al instante |
| 📦 **Inventario** | Agregar/editar/eliminar productos con categoría, costo, stock y caducidad |
| 📋 **Registro** | Historial de ventas con filtros por día y método de pago |
| 🛍️ **Compras** | Registrar compras con actualización automática de stock y costo unitario |
| 💡 **Gastos** | Anotar gastos operacionales con recuperación automática de IVA |
| 📥 **Cargar** | Carga masiva de datos históricos de ventas, compras e inventario |

---

## 💡 Notas importantes

- **IVA**: El sistema trabaja con IVA del 19% (Chile). Los precios de venta incluyen IVA y el sistema descuenta automáticamente.
- **Ganancia por peso invertido**: Solo considera ventas con detalle de productos (no históricos). Solo toma productos que tienen precio de costo registrado.
- **Mejor margen**: Solo considera productos con costo registrado.
- **Datos históricos**: Las ventas/compras cargadas como históricos NO afectan el cálculo de ganancia por peso invertido.
