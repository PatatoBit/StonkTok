// supabase/functions/on-signup/index.ts

import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

interface SupabaseUserInsertEvent {
	type: 'INSERT';
	table: 'users';
	schema: 'auth';
	record: {
		id: string;
		aud: string;
		role: string;
		email: string;
		phone: string | null;
		created_at: string;
		deleted_at: string | null;
		invited_at: string | null;
		updated_at: string;
		instance_id: string;
		is_sso_user: boolean;
		banned_until: string | null;
		confirmed_at: string | null;
		email_change: string;
		is_anonymous: boolean;
		phone_change: string;
		is_super_admin: boolean | null;
		recovery_token: string;
		last_sign_in_at: string | null;
		recovery_sent_at: string | null;
		raw_app_meta_data: {
			provider: string;
			providers: string[];
		};
		confirmation_token: string;
		email_confirmed_at: string | null;
		encrypted_password: string;
		phone_change_token: string;
		phone_confirmed_at: string | null;
		raw_user_meta_data: Record<string, unknown>;
		confirmation_sent_at: string | null;
		email_change_sent_at: string | null;
		phone_change_sent_at: string | null;
		email_change_token_new: string;
		reauthentication_token: string;
		reauthentication_sent_at: string | null;
		email_change_token_current: string;
		email_change_confirm_status: number;
	};
	old_record: null;
}

serve(async (req) => {
	const payload: SupabaseUserInsertEvent = await req.json();
	console.log(JSON.stringify(payload, null, 2));

	const supabase = createClient(
		Deno.env.get('SUPABASE_URL'),
		Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
	);

	await supabase.from('profiles').insert({
		id: payload.record.id,
		balance: 1000
	});

	return new Response('OK', { status: 200 });
});
