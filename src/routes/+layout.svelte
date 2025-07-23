<script lang="ts">
	import '../styles/global.scss';

	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	let { data, children } = $props();
	let { session, supabase } = $derived(data);
	onMount(() => {
		const { data } = supabase.auth.onAuthStateChange(async (event, _) => {
			// Instead of using the potentially insecure session from the callback,
			// just invalidate on any auth state change to refetch secure data
			console.log('Auth state changed:', event);
			if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
				await invalidate('supabase:auth');
			}
		});
		return () => data.subscription.unsubscribe();
	});
</script>

{@render children()}
