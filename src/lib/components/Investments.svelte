<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, type ChartConfiguration } from 'chart.js/auto';
	import { dummyInvestments, dummySnapshots } from '$lib/dummy';

	let charts: Chart[] = [];

	onMount(() => {
		// Create a chart for each investment
		dummyInvestments.forEach((investment, index) => {
			const canvas = document.querySelector(`.investment-${investment.id}`) as HTMLCanvasElement;
			if (canvas) {
				createInvestmentChart(canvas, investment);
			}
		});

		// Cleanup function
		return () => {
			charts.forEach((chart) => chart.destroy());
		};
	});

	function createInvestmentChart(canvas: HTMLCanvasElement, investment: Investment) {
		// Get snapshots for this specific video
		const videoSnapshots = dummySnapshots.filter(
			(snapshot) => snapshot.videoId === investment.videoId
		);

		// Sort snapshots by creation date
		videoSnapshots.sort(
			(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
		);

		// Prepare data for the chart
		const labels = videoSnapshots.map((snapshot) =>
			new Date(snapshot.createdAt).toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit'
			})
		);

		const likesData = videoSnapshots.map((snapshot) => snapshot.likes);
		const commentsData = videoSnapshots.map((snapshot) => snapshot.comments);

		const config: ChartConfiguration = {
			type: 'line',
			data: {
				labels: labels,
				datasets: [
					{
						label: 'Likes',
						data: likesData,
						borderColor: 'rgb(255, 99, 132)',
						backgroundColor: 'rgba(255, 99, 132, 0.2)',
						tension: 0.1
					},
					{
						label: 'Comments',
						data: commentsData,
						borderColor: 'rgb(54, 162, 235)',
						backgroundColor: 'rgba(54, 162, 235, 0.2)',
						tension: 0.1
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					title: {
						display: true,
						text: `Investment #${investment.id} - $${investment.amount}`
					},
					legend: {
						position: 'top'
					}
				},
				scales: {
					y: {
						beginAtZero: true,
						title: {
							display: true,
							text: 'Count'
						}
					},
					x: {
						title: {
							display: true,
							text: 'Time'
						}
					}
				}
			}
		};

		const chart = new Chart(canvas, config);
		charts.push(chart);
	}
</script>

<section class="investments wrapper">
	<h2>Investments</h2>
	<div class="investments-grid">
		{#each dummyInvestments as investment}
			<div class="investment-card">
				<div class="investment-info">
					<h3>Investment #{investment.id}</h3>
					<p><strong>Amount:</strong> ${investment.amount}</p>
					<p><strong>Video ID:</strong> {investment.videoId}</p>
					<p><strong>Invested:</strong> {new Date(investment.investedAt).toLocaleDateString()}</p>
					<p><strong>Initial Likes:</strong> {investment.likeCountAtInvestment}</p>
					<p><strong>Initial Comments:</strong> {investment.commentCountAtInvestment}</p>
				</div>
				<canvas class="investment-{investment.id}"></canvas>
			</div>
		{/each}
	</div>
</section>

<style>
	.investments-grid {
		display: grid;
		gap: 2rem;
		margin-top: 1rem;
	}

	.investment-card {
		border: 1px solid #e1e5e9;
		border-radius: 8px;
		padding: 1.5rem;
		background: white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.investment-info {
		margin-bottom: 1rem;
	}

	.investment-info h3 {
		margin: 0 0 0.5rem 0;
		color: #333;
	}

	.investment-info p {
		margin: 0.25rem 0;
		font-size: 0.9rem;
		color: #666;
	}

	canvas {
		width: 100% !important;
		height: 300px !important;
		max-height: 300px;
	}

	@media (min-width: 768px) {
		.investments-grid {
			grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
		}
	}
</style>
