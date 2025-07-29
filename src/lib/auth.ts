import { supabase } from './supabaseClient';

const redirectUrl =
	process.env.NODE_ENV === 'development'
		? 'http://localhost:5173/auth/callback'
		: 'https://grow-a-video.patato.me/auth/callback';

export async function signInWithEmail(email: string) {
	const { data, error } = await supabase.auth.signInWithOtp({
		email: email,
		options: {
			emailRedirectTo: redirectUrl
		}
	});

	if (error) {
		console.error('Error signing in:', error);
		throw error;
	}

	return data;
}
