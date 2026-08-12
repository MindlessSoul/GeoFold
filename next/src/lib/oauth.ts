import type { Provider } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from './supabase/client'

/**
 * Social sign-in providers offered on the web login screen.
 *
 * Each one must ALSO be enabled in the Supabase dashboard
 * (Authentication → Providers) with its client id/secret, and the provider's own console
 * must list `https://<project-ref>.supabase.co/auth/v1/callback` as an authorised
 * redirect URI. Adding an entry here without that config yields a provider error at runtime.
 */
export const OAUTH_PROVIDERS = [
  { id: 'google' as Provider, label: 'Google' },
  { id: 'facebook' as Provider, label: 'Facebook' },
  { id: 'apple' as Provider, label: 'Apple' },
]

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number]

/**
 * Kicks off the OAuth redirect. Supabase sends the user to the provider, the provider
 * returns to Supabase, and Supabase redirects to our /auth/callback with a `?code`,
 * which the existing route handler exchanges for a session cookie.
 */
export async function signInWithProvider(provider: Provider, next = '/home') {
  const supabase = createSupabaseBrowserClient()
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      // Ask Google for a refresh token so long-lived sessions survive without re-consent.
      ...(provider === 'google'
        ? { queryParams: { access_type: 'offline', prompt: 'consent' } }
        : {}),
    },
  })

  if (error) throw error
}
