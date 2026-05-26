import { getStatusColors } from '../../utils/status.js'

export default function StatusDot({ status, size = 'md' }) {
  const colors = getStatusColors(status)
  const sizeClass = size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-3 h-3' : 'w-2.5 h-2.5'
  return (
    <span
      className={`inline-block rounded-full flex-shrink-0 ${sizeClass}`}
      style={{ backgroundColor: colors.hex }}
    />
  )
}
