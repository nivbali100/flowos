export default function Card({ children, className = '', onClick, hover = false }) {
  const base = 'bg-white rounded-2xl border border-slate-200/80 shadow-card'
  const hoverClass = hover || onClick
    ? 'hover:shadow-card-hover hover:border-slate-300 transition-all duration-200 cursor-pointer'
    : ''
  return (
    <div className={`${base} ${hoverClass} ${className}`} onClick={onClick}>
      {children}
    </div>
  )
}
