<script lang="ts">
	import Investments from '$lib/components/Investments.svelte';
	import MainContent from '$lib/components/MainContent.svelte';
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<MainContent {data} />
<Investments {data} />
