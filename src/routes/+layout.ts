import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr'
import type { LayoutLoad } from './$types'

const VITE_PUBLIC_SUPABASE_URL = import.meta.env.VITE_PUBLIC_SUPABASE_URL
const VITE_PUBLIC_SUPABASE_ANON_KEY = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
  /**
   * Declare a dependency so the layout can be invalidated, for example, on
   * session refresh.
   */
  depends('supabase:auth')

  const supabase = isBrowser()
    ? createBrowserClient(VITE_PUBLIC_SUPABASE_URL, VITE_PUBLIC_SUPABASE_ANON_KEY, {
        global: {
          fetch,
        },
      })
    : createServerClient(VITE_PUBLIC_SUPABASE_URL, VITE_PUBLIC_SUPABASE_ANON_KEY, {
        global: {
          fetch,
        },
        cookies: {
          getAll() {
            return data.cookies
          },
        },
      })

  /**
   * Use the session from server-side data which was safely validated,
   * instead of calling getSession() which can be insecure.
   */
  const session = data.session

  /**
   * Get the user data securely by validating the JWT token.
   * This is the recommended way to verify authentication.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { session, supabase, user }
}