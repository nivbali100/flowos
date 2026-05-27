/**
 * useAuth — global auth context for FlowOS.
 *
 * Provides:
 *   - user: current Supabase user object (null = not authenticated)
 *   - loading: true during initial session check
 *   - signIn / signUp / signOut / resetPassword
 *   - isAuthenticated: boolean shorthand
 *
 * Wraps the app at root level via <AuthProvider>.
 * Use the hook anywhere: const { user, signIn } = useAuth()
 */

import {
  createContext, useContext, useState, useEffect, useCallback, createElement
} from 'react'
import { supabase } from '../lib/supabase.js'
import {
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
  resetPassword as authReset,
  onAuthChange,
  getSession,
} from '../lib/auth.js'

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null)

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)   // true until initial session resolved

  // Resolve initial session on mount
  useEffect(() => {
    getSession().then(session => {
      setUser(session?.user || null)
      setLoading(false)
    })

    // Subscribe to future auth changes (login/logout/token refresh)
    const unsub = onAuthChange((event, session) => {
      setUser(session?.user || null)
      // On sign-out: store is already cleared by authSignOut
    })
    return unsub
  }, [])

  // ── Auth operations ───────────────────────────────────────────────────────
  const signIn = useCallback(async (email, password) => {
    const result = await authSignIn(email, password)
    if (!result.error) setUser(result.user)
    return result
  }, [])

  const signUp = useCallback(async (email, password) => {
    const result = await authSignUp(email, password)
    // Note: Supabase may require email confirmation before session is created
    if (!result.error && result.user) setUser(result.user)
    return result
  }, [])

  const signOut = useCallback(async () => {
    await authSignOut()
    setUser(null)
  }, [])

  const resetPassword = useCallback(async (email) => {
    return authReset(email)
  }, [])

  return createElement(AuthContext.Provider, {
    value: {
      user,
      loading,
      isAuthenticated: !!user,
      userEmail: user?.email || null,
      signIn,
      signUp,
      signOut,
      resetPassword,
    }
  }, children)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('[FlowOS] useAuth must be used within <AuthProvider>')
  return ctx
}
