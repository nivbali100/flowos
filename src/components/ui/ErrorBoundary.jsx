/**
 * ErrorBoundary — catches React render errors so a single page crash
 * doesn't take down the entire app.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomePage />
 *   </ErrorBoundary>
 */
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[FlowOS] Render error:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">⚡</div>
          <h2 className="text-lg font-black text-slate-800 mb-2">קרתה תקלה</h2>
          <p className="text-sm text-slate-500 mb-6">
            משהו השתבש בדף הזה. הנתונים שלך שמורים ולא נפגעו.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              נסה שוב
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-bold rounded-xl transition-colors"
            >
              לדף הבית
            </button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <details className="mt-6 text-left">
              <summary className="text-xs text-slate-400 cursor-pointer">פרטי שגיאה (dev)</summary>
              <pre className="mt-2 text-[10px] text-red-600 bg-red-50 rounded-xl p-3 overflow-auto text-left">
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      </div>
    )
  }
}
