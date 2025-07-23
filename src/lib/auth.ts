import { supabase } from "./supabaseClient";

export async function signInWithEmail(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
			emailRedirectTo: `http://localhost:5173/auth/callback`,
    },
  })

	if (error) {
		console.error("Error signing in:", error);
		throw error;
	}

	return data;
}