<script lang="ts">
	import { dummyInvestments } from '$lib/dummy';
</script>

<section class="investments">
	<h2>Investments</h2>
	<ul>
		{#each dummyInvestments as investment}
			<li>
				<p><strong>Video URL:</strong> {investment.videoUrl}</p>
				<p><strong>Amount:</strong> ${investment.amount}</p>
			</li>
		{/each}
	</ul>
</section>
