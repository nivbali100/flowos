/**
 * ImportPage — URL-based weekly form import.
 *
 * n8n flow:
 *   Google Form submitted
 *   → n8n processes + writes to flowos_weekly_forms (Supabase)
 *   → n8n redirects coach to: /import?email=...&data=BASE64_JSON
 *
 * What this page does:
 *   1. Decodes URL params
 *   2. Saves the form data to localStorage
 *   3. Auto-opens the week (sets monthly KPI targets if provided)
 *   4. Fires Supabase insert
 *   5. Redirects to /weekly after 2 seconds
 *
 * Manual "week open" URL format:
 *   /import?action=open&week=1&month=מאי&targets_revenue=14000&targets_leads=18&targets_calls=8&targets_closures=3&big_three=X|Y|Z
 *
 * Manual "week close summary" URL format:
 *   /import?action=summary&data=BASE64_JSON
 */
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../../hooks/useStore.js'
import { supabase } from '../../lib/supabase.js'

function decode(str) {
  try { return JSON.parse(atob(str)) } catch { return null }
}

export default function ImportPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { updateMonthly, updateMonthlyMove, updateMonthlyActual, addTask, profile } = useStore()
  const [status, setStatus] = useState('processing') // processing | done | error
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    async function process() {
      try {
        const action = params.get('action') || 'open'
        const rawData = params.get('data')
        const formData = rawData ? decode(rawData) : null

        // ── Case 1: action=open — n8n is opening a new week for this coach ──
        if (action === 'open') {
          const weekData = formData || {
            week:              Number(params.get('week')) || null,
            month:             params.get('month') || null,
            targets_revenue:   Number(params.get('targets_revenue')) || 0,
            targets_leads:     Number(params.get('targets_leads')) || 0,
            targets_calls:     Number(params.get('targets_calls')) || 0,
            targets_closures:  Number(params.get('targets_closures')) || 0,
            big_three:         params.get('big_three')?.split('|') || [],
            most_important_next: params.get('most_important') || '',
          }

          setSummary({
            type: 'open',
            week: weekData.week,
            month: weekData.month,
          })

          // Update monthly targets from form data
          if (weekData.targets_revenue)  updateMonthly('revenueTarget',  weekData.targets_revenue)
          if (weekData.targets_leads)    updateMonthly('leadsTarget',     weekData.targets_leads)
          if (weekData.targets_calls)    updateMonthly('callsTarget',     weekData.targets_calls)
          if (weekData.targets_closures) updateMonthly('closuresTarget',  weekData.targets_closures)

          // Create tasks from big3 commitments
          const bigThree = Array.isArray(weekData.big_three) ? weekData.big_three : []
          bigThree.filter(t => t?.trim()).forEach((title, i) => {
            addTask({
              title:       title.trim(),
              status:      'week',
              priority:    i === 0 ? 'high' : 'medium',
              isBigThree:  true,
              source:      'טופס שבועי',
            })
          })

          // Add "most important" as a week task if provided
          if (weekData.most_important_next?.trim()) {
            addTask({
              title:    weekData.most_important_next.trim(),
              status:   'week',
              priority: 'high',
              source:   'טופס שבועי',
            })
          }

          // Save incoming form data to localStorage for reference
          try {
            const incoming = JSON.parse(localStorage.getItem('flowos_incoming_form') || '[]')
            localStorage.setItem('flowos_incoming_form', JSON.stringify([{ ...weekData, receivedAt: new Date().toISOString() }, ...incoming].slice(0, 8)))
          } catch {}

          // Sync to Supabase — fire-and-forget
          const coachEmail = profile?.email || 'unknown@flowos.app'
          supabase.from('flowos_weekly_forms').insert({
            coach_email:        coachEmail,
            coach_name:         profile?.name,
            form_week:          weekData.week,
            form_month:         weekData.month,
            targets_leads:      weekData.targets_leads,
            targets_calls:      weekData.targets_calls,
            targets_closures:   weekData.targets_closures,
            targets_revenue:    weekData.targets_revenue,
            big_three:          bigThree,
            most_important_next: weekData.most_important_next,
            raw_payload:        weekData,
          }).then(({ error }) => {
            if (error) console.warn('[Import] Supabase insert error:', error.message)
          })

          setStatus('done')
          setTimeout(() => navigate('/weekly'), 2000)
        }

        // ── Case 2: action=summary — view a shared week close summary ──
        else if (action === 'summary' && formData) {
          setSummary({ type: 'summary', data: formData })
          setStatus('done')
          // Don't auto-redirect — just show the summary
        }

        else {
          setStatus('error')
          setTimeout(() => navigate('/weekly'), 3000)
        }
      } catch (e) {
        console.error('[Import] error:', e)
        setStatus('error')
        setTimeout(() => navigate('/weekly'), 3000)
      }
    }

    process()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
        {status === 'processing' && (
          <>
            <div className="text-4xl mb-4 animate-spin">⚙️</div>
            <h2 className="text-lg font-black text-slate-800 mb-2">מעבד נתונים...</h2>
            <p className="text-sm text-slate-400">מייבא את נתוני הטופס השבועי</p>
          </>
        )}

        {status === 'done' && summary?.type === 'open' && (
          <>
            <div className="text-4xl mb-4">🚀</div>
            <h2 className="text-lg font-black text-slate-800 mb-2">השבוע נפתח!</h2>
            {summary.month && (
              <p className="text-sm text-brand-600 font-semibold mb-3">
                {summary.month} · שבוע {summary.week}
              </p>
            )}
            <p className="text-sm text-slate-500 mb-4">יעדי החודש עודכנו, המשימות נוספו ללוח</p>
            <div className="text-xs text-slate-400">עוברים ללוח תוך שניות...</div>
            <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full animate-[progress_2s_linear_forwards]" />
            </div>
          </>
        )}

        {status === 'done' && summary?.type === 'summary' && (
          <>
            <div className="text-4xl mb-4">📋</div>
            <h2 className="text-lg font-black text-slate-800 mb-2">סיכום שבוע</h2>
            <div className="space-y-2 text-right">
              {summary.data?.weekLabel && (
                <p className="text-sm font-bold text-slate-600">שבוע: {summary.data.weekLabel}</p>
              )}
              {summary.data?.mainWin && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-green-600 uppercase mb-1">הניצחון הגדול</div>
                  <p className="text-sm text-slate-700">{summary.data.mainWin}</p>
                </div>
              )}
              {summary.data?.completionPct != null && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs text-slate-500">% ביצוע</span>
                  <span className="text-sm font-black text-slate-800">{summary.data.completionPct}%</span>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate('/admin')}
              className="mt-4 w-full py-2.5 bg-brand-600 text-white text-sm font-bold rounded-xl hover:bg-brand-700 transition-colors"
            >
              לדשבורד המלווה
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-black text-slate-800 mb-2">שגיאה בייבוא</h2>
            <p className="text-sm text-slate-400 mb-4">לא ניתן לעבד את הנתונים מהקישור הזה</p>
            <p className="text-xs text-slate-300">חוזרים ללוח תוך שניות...</p>
          </>
        )}
      </div>
    </div>
  )
}
