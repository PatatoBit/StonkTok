<script lang="ts">
	import Investments from '$lib/components/Investments.svelte';
	import MainContent from '$lib/components/MainContent.svelte';
	import DebugInfo from '$lib/components/DebugInfo.svelte';
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<DebugInfo {data} />
<MainContent {data} />
<Investments {data} />
