import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function Header({ desktop, pageTitle }) {
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es })

  if (desktop) {
    return (
      <div className="desktop-header">
        <div className="desktop-header-title">{pageTitle || 'YSY Market'}</div>
        <div className="desktop-header-date">{today}</div>
      </div>
    )
  }

  return (
    <div className="app-header">
      <div className="app-logo">🛒</div>
      <div>
        <div className="app-name">YSY Market</div>
        <div className="app-date">{today}</div>
      </div>
    </div>
  )
}
