import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function Header() {
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es })
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
