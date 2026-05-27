/**
 * FlowOS Auth — Supabase Auth helpers.
 *
 * Strategy:
 *   - Email/password auth via Supabase Auth
 *   - Session stored automatically by Supabase in localStorage
 *   - On signup: email becomes the coach_email key for all data
 *   - On login: tasks/profile loaded from Supabase if localStorage empty
 *   - On logout: flowos_ localStorage keys cleared
 *   - All flowos_ tables use coach_email = auth user email for isolation
 *
 * Supabase RLS (future): add `auth.email() = coach_email` policies
 * Currently: anon key with email-scoped queries (functional, not secure)
 */

import { supabase } from './supabase.js'

// ─── Session ──────────────────────────────────────────────────────────────────

/**
 * Get current session synchronously from Supabase cache.
 * Returns null if not authenticated or Supabase not initialized.
 */
export function getSessionSync() {
  if (!supabase) return null
  // Supabase v2 caches session in localStorage — access synchronously
  try {
    const raw = localStorage.getItem(`sb-${getProjectRef()}-auth-token`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.access_token ? parsed : null
  } catch { return null }
}

/**
 * Get current user email synchronously (from Supabase session cache).
 * Returns null if not authenticated.
 */
export function getAuthEmailSync() {
  try {
    const raw = localStorage.getItem(`sb-${getProjectRef()}-auth-token`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.user?.email || null
  } catch { return null }
}

/**
 * Get current auth session asynchronously (authoritative).
 */
export async function getSession() {
  if (!supabase) return null
  try {
    const { data } = await supabase.auth.getSession()
    return data?.session || null
  } catch { return null }
}

// ─── Auth operations ──────────────────────────────────────────────────────────

/**
 * Sign up with email + password.
 * Returns { user, error }.
 */
export async function signUp(email, password) {
  if (!supabase) return { user: null, error: new Error('Supabase not configured') }
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    })
    return { user: data?.user || null, error }
  } catch (e) {
    return { user: null, error: e }
  }
}

/**
 * Sign in with email + password.
 * Returns { user, session, error }.
 */
export async function signIn(email, password) {
  if (!supabase) return { user: null, session: null, error: new Error('Supabase not configured') }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    return { user: data?.user || null, session: data?.session || null, error }
  } catch (e) {
    return { user: null, session: null, error: e }
  }
}

/**
 * Sign out — clears Supabase session AND all flowos_ localStorage keys.
 */
export async function signOut() {
  if (supabase) {
    try { await supabase.auth.signOut() } catch {}
  }
  // Clear all FlowOS data from localStorage
  Object.keys(localStorage)
    .filter(k => k.startsWith('flowos_'))
    .forEach(k => localStorage.removeItem(k))
}

/**
 * Send password reset email.
 */
export async function resetPassword(email) {
  if (!supabase) return { error: new Error('Supabase not configured') }
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/auth/reset` }
    )
    return { error }
  } catch (e) {
    return { error: e }
  }
}

/**
 * Subscribe to auth state changes.
 * Returns unsubscribe function.
 */
export function onAuthChange(callback) {
  if (!supabase) return () => {}
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)
  return () => subscription.unsubscribe()
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getProjectRef() {
  // Extract ref from Supabase URL: https://<ref>.supabase.co
  try {
    const url = import.meta.env.VITE_SUPABASE_URL || 'https://lgvncozlqtbaxbkdjmms.supabase.co'
    return new URL(url).hostname.split('.')[0]
  } catch { return 'lgvncozlqtbaxbkdjmms' }
}
