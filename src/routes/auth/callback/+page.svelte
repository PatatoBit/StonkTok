<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';

	let loading = true;
	let errorMsg = '';

	onMount(async () => {
		const url = new URL(window.location.href);
		const token_hash = url.searchParams.get('token_hash');
		const type = url.searchParams.get('type');

		if (token_hash && type) {
			const { data, error } = await supabase.auth.verifyOtp({
				type: type as 'email',
				token_hash
			});

			if (error) {
				errorMsg = error.message;
				loading = false;
				return;
			}

			// login successful
			goto('/');
		} else {
			errorMsg = 'Missing token or type.';
			loading = false;
		}
	});
</script>

{#if loading}
	<p>Verifying your login...</p>
{:else if errorMsg}
	<p style="color: red;">{errorMsg}</p>
{/if}
