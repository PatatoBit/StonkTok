import { supabase } from "./supabaseClient";

export async function signInWithEmail(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
			emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })

	if (error) {
		console.error("Error signing in:", error);
		throw error;
	}

	return data;
}