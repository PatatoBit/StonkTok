import { createClient } from '@supabase/supabase-js';

const VITE_PUBLIC_SUPABASE_URL = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const VITE_PUBLIC_SUPABASE_ANON_KEY = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

// For server-side operations, we might need the service role key
// Add this to your .env file: SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// Client-side supabase client (uses anon key)
export const supabase = createClient(VITE_PUBLIC_SUPABASE_URL, VITE_PUBLIC_SUPABASE_ANON_KEY);

// Server-side supabase client (uses service role key for bypassing RLS when needed)
export const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
	? createClient(VITE_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
	: supabase;

// Create authenticated client for server-side operations with user context
export function createServerSupabaseClient(accessToken?: string, refreshToken?: string) {
	const config: { global?: { headers?: Record<string, string> } } = {};

	// Add auth header if we have an access token
	if (accessToken) {
		config.global = {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		};
	}

	const client = createClient(VITE_PUBLIC_SUPABASE_URL, VITE_PUBLIC_SUPABASE_ANON_KEY, config);

	// If we have tokens, set the session
	if (accessToken && refreshToken) {
		client.auth.setSession({
			access_token: accessToken,
			refresh_token: refreshToken
		});
	}

	return client;
}
