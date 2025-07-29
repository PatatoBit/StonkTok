<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, type ChartConfiguration } from 'chart.js/auto';
	import type { PageData } from '../../routes/$types';

	export let data: PageData;

	let charts: Chart[] = [];
	let investments: Investment[] = [];
	let videoSnapshots: VideoSnapshot[] = [];
	let loading = true;
	let error = '';
	let debug = {
		hasSession: false,
		userId: null as string | null,
		investmentCount: 0,
		snapshotCount: 0,
		message: 'Loading...'
	};

	// Helper function to calculate ROI
	function calculateROI(investment: Investment): {
		value: string;
		isPositive: boolean;
		percentage: number;
	} {
		if (!investment.video) return { value: 'N/A', isPositive: false, percentage: 0 };

		const initialLikes = investment.like_count_at_investment;
		const currentLikes = investment.video.current_likes;
		const likesGrowth = currentLikes - initialLikes;

		// Simple ROI calculation - you can adjust this formula based on your business logic
		const roi = (likesGrowth / currentLikes) * 100;
		const isPositive = roi > 0;
		const value = isPositive ? `+${roi.toFixed(2)}%` : `${roi.toFixed(2)}%`;

		return { value, isPositive, percentage: roi };
	}

	async function fetchData() {
		console.log('Session:', data.session ? 'Found' : 'Not found');
		console.log('User ID:', data.session?.user?.id || 'No user ID');

		debug.hasSession = !!data.session;
		debug.userId = data.session?.user?.id || null;

		if (!data.session) {
			debug.message = 'No session found - please log in';
			loading = false;
			return;
		}

		try {
			console.log('Fetching investments for user:', data.session.user.id);

			// Fetch investments with joined video data for the current user
			const { data: investmentData, error: investmentsError } = await data.supabase
				.from('investments')
				.select(
					`
					*,
					video:videos(*)
				`
				)
				.eq('user_id', data.session.user.id)
				.order('invested_at', { ascending: false });

			console.log('Investments query result:', {
				count: investmentData?.length || 0,
				error: investmentsError,
				data: investmentData
			});

			if (investmentsError) {
				console.error('Error fetching investments:', investmentsError);
				error = `Failed to fetch investments: ${investmentsError.message}`;
				loading = false;
				return;
			}

			investments = investmentData || [];
			debug.investmentCount = investments.length;

			// Get all video IDs from investments to fetch snapshots
			const videoIds = investments.map((inv) => inv.video_id);
			console.log('Video IDs for snapshots:', videoIds);

			if (videoIds.length > 0) {
				const { data: snapshotData, error: snapshotsError } = await data.supabase
					.from('video_snapshots')
					.select('*')
					.in('video_id', videoIds)
					.order('created_at', { ascending: true });

				console.log('Snapshots query result:', {
					count: snapshotData?.length || 0,
					error: snapshotsError
				});

				if (snapshotsError) {
					console.error('Error fetching video snapshots:', snapshotsError);
					error = `Failed to fetch video snapshots: ${snapshotsError.message}`;
				} else {
					videoSnapshots = snapshotData || [];
				}
			}

			debug.snapshotCount = videoSnapshots.length;
			debug.message = 'Data loaded successfully from frontend';
			loading = false;

			// Create charts after data is loaded
			setTimeout(createCharts, 100);
		} catch (err) {
			console.error('Error in data fetching:', err);
			error = err instanceof Error ? err.message : 'Unknown error occurred';
			loading = false;
		}
	}

	function createCharts() {
		// Create charts for each investment
		investments.forEach((investment) => {
			const likesCanvas = document.querySelector(
				`.investment-likes-${investment.id}`
			) as HTMLCanvasElement;
			const commentsCanvas = document.querySelector(
				`.investment-comments-${investment.id}`
			) as HTMLCanvasElement;

			if (likesCanvas) {
				createInvestmentChart(likesCanvas, investment, 'likes');
			}
			if (commentsCanvas) {
				createInvestmentChart(commentsCanvas, investment, 'comments');
			}
		});
	}

	function createInvestmentChart(
		canvas: HTMLCanvasElement,
		investment: Investment,
		chartType: 'likes' | 'comments'
	) {
		// Get snapshots for this specific video
		const investmentSnapshots = videoSnapshots.filter(
			(snapshot) => snapshot.video_id === investment.video_id
		);

		// If no snapshots, show message
		if (investmentSnapshots.length === 0) {
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
		investmentSnapshots.sort(
			(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
		);

		// Prepare data for the chart
		const labels = investmentSnapshots.map((snapshot) =>
			new Date(snapshot.created_at).toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit'
			})
		);

		const data =
			chartType === 'likes'
				? investmentSnapshots.map((snapshot) => snapshot.likes)
				: investmentSnapshots.map((snapshot) => snapshot.comments);

		const chartColor = chartType === 'likes' ? 'rgb(255, 99, 132)' : 'rgb(54, 162, 235)';
		const chartBgColor =
			chartType === 'likes' ? 'rgba(255, 99, 132, 0.2)' : 'rgba(54, 162, 235, 0.2)';
		const chartLabel = chartType === 'likes' ? 'Likes' : 'Comments';

		const config: ChartConfiguration = {
			type: 'line',
			data: {
				labels: labels,
				datasets: [
					{
						label: chartLabel,
						data: data,
						borderColor: chartColor,
						backgroundColor: chartBgColor,
						tension: 0.1,
						fill: true
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					intersect: false
				},
				plugins: {
					title: {
						display: true,
						text: `${chartLabel} - ${investment.video?.creator_handle || 'Unknown Creator'} ($${investment.amount})`
					},
					legend: {
						display: false
					}
				},
				scales: {
					y: {
						beginAtZero: false,
						suggestedMin: Math.min(...data) * 0.9,
						suggestedMax: Math.max(...data) * 1.1,
						title: {
							display: true,
							text: chartLabel
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

	onMount(() => {
		fetchData();

		// Cleanup function
		return () => {
			charts.forEach((chart) => chart.destroy());
		};
	});
</script>

<!-- Debug Info -->
<div class="debug-info">
	<h3>Debug Information (Frontend)</h3>
	<div class="debug-grid">
		<div class="debug-item">
			<strong>User ID:</strong>
			<span class="user-id">{debug.userId || 'Not logged in'}</span>
		</div>
		<div class="debug-item">
			<strong>Email:</strong>
			<span>{data.session?.user?.email || 'N/A'}</span>
		</div>
		<div class="debug-item">
			<strong>Has Session:</strong>
			<span class="status {debug.hasSession ? 'success' : 'error'}">
				{debug.hasSession ? 'Yes' : 'No'}
			</span>
		</div>
		<div class="debug-item">
			<strong>Investments Found:</strong>
			<span class="count">{debug.investmentCount}</span>
		</div>
		<div class="debug-item">
			<strong>Snapshots Found:</strong>
			<span class="count">{debug.snapshotCount}</span>
		</div>
		<div class="debug-item">
			<strong>Message:</strong>
			<span class="message">{debug.message}</span>
		</div>
		{#if error}
			<div class="debug-item error-item">
				<strong>Error:</strong>
				<span class="error">{error}</span>
			</div>
		{/if}
	</div>
</div>

<section class="investments wrapper">
	<h2>Investments</h2>

	{#if loading}
		<p class="loading">Loading investments...</p>
	{:else if error}
		<p class="error">Error: {error}</p>
	{:else if !data.session}
		<p class="no-session">Please log in to view your investments.</p>
	{:else if investments.length === 0}
		<p class="no-investments">No investments found. Start investing in viral videos!</p>
	{:else}
		<div class="investments-grid">
			{#each investments as investment}
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
							<strong
								>Profit:
								<span class="roi {calculateROI(investment).isPositive ? 'positive' : 'negative'}">
									{investment.amount
										? (investment.amount * calculateROI(investment).percentage) / 100
										: 'N/A'}
								</span>
							</strong>
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
					<div class="charts-container">
						<div class="chart-section">
							<h4>Likes Over Time</h4>
							<canvas class="investment-likes-{investment.id}"></canvas>
						</div>
						<div class="chart-section">
							<h4>Comments Over Time</h4>
							<canvas class="investment-comments-{investment.id}"></canvas>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>

<style>
	.debug-info {
		background: #f8f9fa;
		border: 1px solid #dee2e6;
		border-radius: 8px;
		padding: 1rem;
		margin: 1rem 0;
		font-family: 'Courier New', monospace;
		font-size: 0.9rem;
	}

	.debug-info h3 {
		margin: 0 0 1rem 0;
		color: #495057;
		font-family: inherit;
	}

	.debug-grid {
		display: grid;
		gap: 0.5rem;
	}

	.debug-item {
		display: flex;
		justify-content: space-between;
		padding: 0.25rem 0;
	}

	.debug-item strong {
		color: #495057;
		min-width: 140px;
	}

	.user-id {
		font-family: monospace;
		background: #e9ecef;
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 0.8rem;
	}

	.status.success {
		color: #28a745;
		font-weight: bold;
	}

	.status.error {
		color: #dc3545;
		font-weight: bold;
	}

	.count {
		background: #007bff;
		color: white;
		padding: 2px 8px;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: bold;
	}

	.message {
		color: #6c757d;
		font-style: italic;
	}

	.error-item {
		background: #f8d7da;
		padding: 0.5rem;
		border-radius: 4px;
		margin-top: 0.5rem;
	}

	.error {
		color: #721c24;
		font-weight: bold;
	}

	.loading {
		text-align: center;
		color: #007bff;
		font-style: italic;
		margin: 2rem 0;
	}

	.no-session {
		text-align: center;
		color: #dc3545;
		font-weight: bold;
		margin: 2rem 0;
	}

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

	.charts-container {
		display: grid;
		gap: 1.5rem;
		margin-top: 1rem;
	}

	.chart-section {
		background: #f8f9fa;
		border-radius: 6px;
		padding: 1rem;
	}

	.chart-section h4 {
		margin: 0 0 1rem 0;
		color: #495057;
		font-size: 1rem;
		text-align: center;
	}

	canvas {
		width: 100% !important;
		height: 250px !important;
		max-height: 250px;
	}

	@media (min-width: 768px) {
		.debug-grid {
			grid-template-columns: 1fr 1fr;
		}

		.error-item {
			grid-column: 1 / -1;
		}

		.investments-grid {
			grid-template-columns: repeat(auto-fit, minmax(600px, 1fr));
		}

		.charts-container {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (min-width: 1200px) {
		.investments-grid {
			grid-template-columns: repeat(auto-fit, minmax(800px, 1fr));
		}
	}
</style>
