import type { EmailOtpType } from '@supabase/supabase-js'
import { redirect } from '@sveltejs/kit'

import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
  console.log('=== Auth Callback Handler ===');
  console.log('Full URL:', url.toString());
  
  const token_hash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const next = url.searchParams.get('next') ?? '/'

  console.log('Extracted parameters:');
  console.log('- token_hash:', token_hash ? `${token_hash.substring(0, 10)}...` : 'null');
  console.log('- type:', type);
  console.log('- next:', next);

  /**
   * Clean up the redirect URL by deleting the Auth flow parameters.
   *
   * `next` is preserved for now, because it's needed in the error case.
   */
  const redirectTo = new URL(url)
  redirectTo.pathname = next
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')

  if (token_hash && type) {
    console.log(`Attempting to verify OTP with type: ${type}`);
    
    try {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash })

      if (!error) {
        console.log('✅ OTP verification successful');
        redirectTo.searchParams.delete('next')
        console.log('Redirecting to:', redirectTo.toString());
        redirect(303, redirectTo)
      } else {
        console.error('❌ OTP verification failed:', error);
      }
    } catch (err) {
      console.error('❌ Exception during OTP verification:', err);
    }
  } else {
    console.error('❌ Missing required parameters (token_hash or type)');
  }

  console.log('Redirecting to error page');
  redirectTo.pathname = '/auth/error'
  redirect(303, redirectTo)
}