<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, type ChartConfiguration } from 'chart.js/auto';
	import type { PageData } from '../../routes/$types';

	export let data: PageData;

	let charts: Chart[] = [];

	// Helper function to calculate ROI
	function calculateROI(investment: Investment): { value: string; isPositive: boolean } {
		if (!investment.video) return { value: 'N/A', isPositive: false };

		const initialLikes = investment.like_count_at_investment;
		const currentLikes = investment.video.current_likes;
		const likesGrowth = currentLikes - initialLikes;

		// Simple ROI calculation - you can adjust this formula based on your business logic
		const roi = (likesGrowth / investment.amount) * 100;
		const isPositive = roi > 0;
		const value = isPositive ? `+${roi.toFixed(2)}%` : `${roi.toFixed(2)}%`;

		return { value, isPositive };
	}

	onMount(() => {
		// Create a chart for each investment
		if (data.investments && data.investments.length > 0) {
			data.investments.forEach((investment) => {
				const canvas = document.querySelector(`.investment-${investment.id}`) as HTMLCanvasElement;
				if (canvas) {
					createInvestmentChart(canvas, investment);
				}
			});
		}

		// Cleanup function
		return () => {
			charts.forEach((chart) => chart.destroy());
		};
	});

	function createInvestmentChart(canvas: HTMLCanvasElement, investment: Investment) {
		// Get snapshots for this specific video
		const videoSnapshots = (data.videoSnapshots || []).filter(
			(snapshot) => snapshot.video_id === investment.video_id
		);

		// If no snapshots, don't create chart
		if (videoSnapshots.length === 0) {
			const ctx = canvas.getContext('2d');
			if (ctx) {
				ctx.fillStyle = '#666';
				ctx.font = '14px Arial';
				ctx.textAlign = 'center';
				ctx.fillText('No tracking data available', canvas.width / 2, canvas.height / 2);
			}
			return;
		}

		// Sort snapshots by creation date
		videoSnapshots.sort(
			(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
		);

		// Prepare data for the chart
		const labels = videoSnapshots.map((snapshot) =>
			new Date(snapshot.created_at).toLocaleTimeString('en-US', {
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
						text: `${investment.video?.creator_handle || 'Unknown Creator'} - $${investment.amount} (ROI: ${calculateROI(investment).value})`
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
	{#if data.investments && data.investments.length === 0}
		<p class="no-investments">No investments found. Start investing in viral videos!</p>
	{:else if data.investments}
		<div class="investments-grid">
			{#each data.investments as investment}
				<div class="investment-card">
					<div class="investment-info">
						<h3>Investment #{investment.id.slice(-8)}</h3>
						<p><strong>Amount:</strong> ${investment.amount}</p>
						<p>
							<strong>ROI:</strong>
							<span class="roi {calculateROI(investment).isPositive ? 'positive' : 'negative'}">
								{calculateROI(investment).value}
							</span>
						</p>
						<p>
							<strong>Video URL:</strong>
							<a href={investment.video?.video_url} target="_blank" rel="noopener noreferrer">
								{investment.video?.video_url || 'N/A'}
							</a>
						</p>
						<p><strong>Platform:</strong> {investment.video?.platform || 'N/A'}</p>
						<p><strong>Creator:</strong> {investment.video?.creator_handle || 'N/A'}</p>
						<p>
							<strong>Invested:</strong>
							{new Date(investment.invested_at).toLocaleDateString()}
						</p>
						<p><strong>Initial Likes:</strong> {investment.like_count_at_investment}</p>
						<p><strong>Initial Comments:</strong> {investment.comment_count_at_investment}</p>
						<p><strong>Current Likes:</strong> {investment.video?.current_likes || 'N/A'}</p>
						<p><strong>Current Comments:</strong> {investment.video?.current_comments || 'N/A'}</p>
					</div>
					<canvas class="investment-{investment.id}"></canvas>
				</div>
			{/each}
		</div>
	{:else}
		<p class="no-investments">Loading investments...</p>
	{/if}
</section>

<style>
	.no-investments {
		text-align: center;
		color: #666;
		font-style: italic;
		margin: 2rem 0;
	}

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

	.investment-info a {
		color: #0066cc;
		text-decoration: none;
		word-break: break-all;
	}

	.investment-info a:hover {
		text-decoration: underline;
	}

	.roi {
		font-weight: bold;
	}

	.roi.positive {
		color: #28a745;
	}

	.roi.negative {
		color: #dc3545;
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
