<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, type ChartConfiguration } from 'chart.js/auto';
	import type { PageData } from '../../routes/$types';
	import { roundToTwoDecimals, calculateROI } from '$lib/utility';

	export let data: PageData;

	let charts: Chart[] = [];
	let investments: Investment[] = [];
	let userBalance: number = 0;
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

			const { data: userBalanceData, error: balanceError } = await data.supabase
				.from('profiles')
				.select('balance')
				.eq('id', data.session.user.id)
				.single();

			if (balanceError) {
				console.error('Error fetching user balance:', balanceError);
				error = `Failed to fetch user balance: ${balanceError.message}`;
				loading = false;
				return;
			}

			userBalance = userBalanceData?.balance || 0;
			debug.message = 'User balance fetched successfully';

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

			if (likesCanvas) {
				createInvestmentChart(likesCanvas, investment);
			}
		});
	}

	function createInvestmentChart(canvas: HTMLCanvasElement, investment: Investment) {
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

		const likesData = investmentSnapshots.map((snapshot) => snapshot.likes);
		const priceData = investmentSnapshots.map((snapshot) => snapshot.likes / 1000);

		const config: ChartConfiguration = {
			type: 'line',
			data: {
				labels: labels,
				datasets: [
					{
						label: 'Likes',
						data: likesData,
						borderColor: 'rgb(255, 99, 132)',
						backgroundColor: 'rgba(255, 99, 132, 0.1)',
						tension: 0.1,
						fill: true,
						yAxisID: 'y'
					},
					{
						label: 'Price ($)',
						data: priceData,
						borderColor: 'rgb(54, 162, 235)',
						backgroundColor: 'rgba(54, 162, 235, 0.1)',
						tension: 0.1,
						fill: false,
						yAxisID: 'y1'
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
						text: `Performance - ${investment.amount} shares @ $${roundToTwoDecimals(investment.like_count_at_investment / 1000)}`
					},
					legend: {
						display: true,
						position: 'top'
					}
				},
				scales: {
					y: {
						type: 'linear',
						display: true,
						position: 'left',
						beginAtZero: false,
						suggestedMin: Math.min(...likesData) * 0.9,
						suggestedMax: Math.max(...likesData) * 1.1,
						title: {
							display: true,
							text: 'Likes',
							color: 'rgb(255, 99, 132)'
						},
						ticks: {
							color: 'rgb(255, 99, 132)'
						}
					},
					y1: {
						type: 'linear',
						display: true,
						position: 'right',
						beginAtZero: false,
						suggestedMin: Math.min(...priceData) * 0.9,
						suggestedMax: Math.max(...priceData) * 1.1,
						title: {
							display: true,
							text: 'Price ($)',
							color: 'rgb(54, 162, 235)'
						},
						ticks: {
							color: 'rgb(54, 162, 235)',
							callback: function (value) {
								return '$' + Number(value).toFixed(3);
							}
						},
						grid: {
							drawOnChartArea: false
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
		<div class="debug-item">
			<strong>Balance: </strong>
			<span class="count"
				>${userBalance.toLocaleString(undefined, {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2
				})}</span
			>
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
						<div class="investment-header">
							<h3>Investment #{investment.id.slice(-8)}</h3>
							<div class="platform-icon">
								<img
									src={investment.video?.platform == 'tiktok'
										? '/icons/tiktok.svg'
										: 'icons/instagram.svg'}
									alt="{investment.video?.platform || 'Platform'} icon"
									title={investment.video?.platform || 'Unknown Platform'}
								/>
							</div>
						</div>

						<div class="investment-metrics">
							<div class="metric-row">
								<span class="metric-label">Shares Bought:</span>
								<span class="metric-value">{investment.amount.toLocaleString()}</span>
							</div>

							<div class="metric-row">
								<span class="metric-label">Price at Investment:</span>
								<span class="metric-value"
									>${roundToTwoDecimals(
										investment.like_count_at_investment / 1000
									).toLocaleString()}</span
								>
							</div>

							<div class="metric-row">
								<span class="metric-label">Current Price:</span>
								<span class="metric-value"
									>${roundToTwoDecimals(
										(investment.video?.current_likes || 0) / 1000
									).toLocaleString()}</span
								>
							</div>

							<div class="metric-row">
								<span class="metric-label">ROI:</span>
								<span class="roi {calculateROI(investment).isPositive ? 'positive' : 'negative'}">
									{calculateROI(investment).value}
								</span>
							</div>

							<div class="metric-row profit-row">
								<span class="metric-label">You spent: </span>
								<span class="metric-value"
									>${roundToTwoDecimals(
										(investment.like_count_at_investment / 1000) * investment.amount
									).toLocaleString()}</span
								>
							</div>

							<div class="metric-row">
								<span class="metric-label">Current value: </span>
								<span class="metric-value"
									>${roundToTwoDecimals(
										((investment.video?.current_likes || 0) / 1000) * investment.amount
									).toLocaleString()}</span
								>
							</div>

							<div class="metric-row profit-row">
								<span class="metric-label">Profit:</span>
								<span class="roi {calculateROI(investment).isPositive ? 'positive' : 'negative'}">
									${investment.amount
										? roundToTwoDecimals(
												((investment.video?.current_likes || 0) / 1000 -
													investment.like_count_at_investment / 1000) *
													investment.amount
											).toLocaleString()
										: 'N/A'}
								</span>
							</div>
						</div>

						<div class="likes-info">
							<div class="likes-row">
								<span
									>Initial Likes: <strong
										>{investment.like_count_at_investment.toLocaleString()}</strong
									></span
								>
								<span
									>Current Likes: <strong
										>{(investment.video?.current_likes || 0).toLocaleString()}</strong
									></span
								>
							</div>
						</div>

						<div class="investment-date">
							<small>Invested: {new Date(investment.invested_at).toLocaleDateString()}</small>
						</div>
					</div>
					<div class="charts-container">
						<div class="chart-section">
							<h4>Likes Over Time</h4>
							<canvas class="investment-likes-{investment.id}"></canvas>
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

	.investment-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #e9ecef;
	}

	.investment-header h3 {
		margin: 0;
		color: #333;
		font-size: 1.1rem;
	}

	.platform-icon {
		display: flex;
		align-items: center;
	}

	.platform-icon img {
		width: 24px;
		height: 24px;
		border-radius: 4px;
	}

	.investment-metrics {
		display: grid;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.metric-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.25rem 0;
	}

	.metric-label {
		color: #666;
		font-weight: 500;
	}

	.metric-value {
		font-weight: bold;
		color: #333;
	}

	.profit-row {
		border-top: 1px solid #e9ecef;
		padding-top: 0.75rem;
		margin-top: 0.5rem;
		font-size: 1.05rem;
	}

	.likes-info {
		background: #f8f9fa;
		padding: 0.75rem;
		border-radius: 6px;
		margin-bottom: 0.75rem;
	}

	.likes-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.9rem;
		color: #666;
	}

	.investment-date {
		text-align: center;
		color: #999;
		font-style: italic;
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
		height: 300px !important;
		max-height: 300px;
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

		.likes-row {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 1rem;
		}
	}

	@media (min-width: 1200px) {
		.investments-grid {
			grid-template-columns: repeat(auto-fit, minmax(800px, 1fr));
		}
	}
</style>
