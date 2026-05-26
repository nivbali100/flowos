import { getStatusColors, getStatusLabel } from '../../utils/status.js'

export default function StatusBadge({ status, label, size = 'md' }) {
  const colors = getStatusColors(status)
  const text = label || getStatusLabel(status)
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClass}`}
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: colors.hex }}
      />
      {text}
    </span>
  )
}
