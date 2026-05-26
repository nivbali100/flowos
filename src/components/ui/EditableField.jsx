/**
 * EditableField — reusable editable field with label, hint, and inline edit mode.
 * Used throughout Journey and Goals pages to make all data user-editable.
 */
import { useState, useRef, useEffect } from 'react'
import { Pencil, Save, X, HelpCircle, Check } from 'lucide-react'

export default function EditableField({
  label,
  hint,           // explanation shown when editing (and via tooltip)
  value,
  type = 'text',  // 'text' | 'textarea' | 'number' | 'currency' | 'percent' | 'slider'
  onSave,
  formatDisplay,  // optional: (value) => string | ReactNode for display
  placeholder = 'לחץ לעריכה',
  className = '',
}) {
  const [editing, setEditing]     = useState(false)
  const [draft, setDraft]         = useState(value)
  const [showHint, setShowHint]   = useState(false)
  const [saved, setSaved]         = useState(false)
  const inputRef = useRef(null)

  // Sync draft when value changes externally
  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      if (inputRef.current.select) inputRef.current.select()
    }
  }, [editing])

  function open()   { setDraft(value); setEditing(true); setShowHint(false) }
  function cancel() { setDraft(value); setEditing(false) }
  function save()   {
    const parsed = (type === 'number' || type === 'currency' || type === 'percent')
      ? Number(draft) || 0
      : type === 'slider'
      ? Number(draft)
      : draft
    onSave?.(parsed)
    setEditing(false)
    // Flash "saved" indicator
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
  }

  const display = value != null && value !== ''
    ? (formatDisplay ? formatDisplay(value) : String(value))
    : null

  return (
    <div className={`space-y-1 ${className}`}>
      {/* ── Label row ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 select-none">{label}</span>
          {hint && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setShowHint(h => !h) }}
              className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                showHint ? 'bg-brand-100 text-brand-500' : 'bg-slate-100 text-slate-400 hover:bg-brand-50 hover:text-brand-500'
              }`}
              aria-label="הצג הסבר"
            >
              <HelpCircle className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Saved flash / Edit button */}
        {!editing && (
          saved ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-green-600">
              <Check className="w-3 h-3" />
              נשמר
            </span>
          ) : (
            <button
              type="button"
              onClick={open}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-brand-600 transition-colors group"
            >
              <Pencil className="w-3 h-3 group-hover:text-brand-500" />
              ערוך
            </button>
          )
        )}
      </div>

      {/* ── Hint bubble ── */}
      {hint && showHint && !editing && (
        <div className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 leading-relaxed">
          💡 {hint}
        </div>
      )}

      {/* ── View mode ── */}
      {!editing && (
        <div
          onClick={open}
          className={`text-sm rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-150 border ${
            display
              ? 'bg-slate-50 hover:bg-white hover:border-brand-200 text-slate-800 border-transparent hover:shadow-sm'
              : 'bg-slate-50 text-slate-300 italic border-transparent hover:border-slate-200'
          }`}
        >
          {display || placeholder}
        </div>
      )}

      {/* ── Edit mode ── */}
      {editing && (
        <div className="space-y-2">
          {/* Hint always shown in edit mode */}
          {hint && (
            <div className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 leading-relaxed">
              💡 {hint}
            </div>
          )}

          {/* Input */}
          {type === 'textarea' ? (
            <textarea
              ref={inputRef}
              className="w-full text-sm text-slate-800 bg-white border border-brand-300 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-brand-200 transition-shadow"
              rows={4}
              value={draft ?? ''}
              placeholder={placeholder}
              onChange={e => setDraft(e.target.value)}
            />
          ) : type === 'slider' ? (
            <div className="py-2 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-4">1</span>
                <input
                  type="range" min={1} max={10} step={1}
                  value={draft ?? 5}
                  onChange={e => setDraft(Number(e.target.value))}
                  className="flex-1 accent-brand-600"
                />
                <span className="text-xs text-slate-400 w-6 text-left">10</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-black text-brand-700">{draft ?? 5}</span>
                <span className="text-sm text-slate-400">/ 10</span>
              </div>
            </div>
          ) : (
            <input
              ref={inputRef}
              type={type === 'currency' || type === 'number' || type === 'percent' ? 'number' : 'text'}
              className="w-full text-sm text-slate-800 bg-white border border-brand-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-200 transition-shadow"
              value={draft ?? ''}
              placeholder={placeholder}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') save()
                if (e.key === 'Escape') cancel()
              }}
            />
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              שמור
            </button>
            <button
              type="button"
              onClick={cancel}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 text-xs border border-slate-200 hover:border-slate-300 rounded-xl transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
