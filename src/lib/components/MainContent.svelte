<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { signInWithEmail } from '$lib/auth';
	import { cleanVideoUrl, formatVideoUrlForDisplay } from '$lib/utility';
	import type { PageData } from '../../routes/$types';

	export let data: PageData;

	let email: string = '';

	async function handleSubmit() {
		try {
			await signInWithEmail(email);
			alert('Check your email for the sign-in link!');
		} catch (error) {
			console.error('Error signing in:', error);
			alert('Failed to sign in. Please try again.');
		}
	}

	let formVideoUrl: string = 'https://www.tiktok.com/@marrizzlleee/video/7512370847206739246';
	let amount: number = 1;

	// Popup state
	let showPreinvestPopup: boolean = false;
	let videoData: any = null;
	let isLoadingVideoData: boolean = false;
	let isInvesting: boolean = false;

	let videoPrice: number = 10;

	// Helper function to format video stats
	function getVideoStats(data: any) {
		const stats = [
			{ label: 'Likes', value: formatNumber(data.likesCount) },
			{ label: 'Comments', value: formatNumber(data.commentsCount) },
			{ label: 'Views', value: formatNumber(data.viewsCount) },
			{ label: 'Shares', value: formatNumber(data.sharesCount) },
			{ label: 'Duration', value: data.duration ? `${data.duration}s` : 'N/A' },
			{ label: 'Upload Date', value: data.uploadDate || 'N/A' }
		];

		// Add shares remaining if available
		if (data.availableShares !== undefined || data.totalShares !== undefined) {
			stats.push({
				label: 'Shares Available',
				value: `${formatNumber(data.availableShares)} / ${formatNumber(data.totalShares)}`
			});
		}

		// Filter out stats that are null/undefined and return
		return stats.filter((stat) => stat.value !== 'N/A' && stat.value !== 'null / null');
	}

	// Helper function to format numbers
	function formatNumber(num: number | null | undefined): string {
		if (num === null || num === undefined || isNaN(num)) return 'N/A';

		if (num >= 1000000) {
			return (num / 1000000).toFixed(1) + 'M';
		} else if (num >= 1000) {
			return (num / 1000).toFixed(1) + 'K';
		}
		return num.toString();
	}

	// Helper function to reset preinvest state
	function resetPreinvestState() {
		showPreinvestPopup = false;
		videoData = null;
		isLoadingVideoData = false;
		isInvesting = false;
	}

	async function handlePreinvest() {
		console.log('Pre-investing with video URL:', formVideoUrl);

		if (!formVideoUrl.trim()) {
			alert('Please enter a video URL');
			return;
		}

		// Reset states before starting
		videoData = null;
		isLoadingVideoData = true;
		showPreinvestPopup = true;

		try {
			const { data: res, error } = await data.supabase.functions.invoke('preinvest', {
				body: {
					videoUrl: formVideoUrl
				}
			});

			if (error) {
				console.error('Error fetching video data:', error);
				alert('Failed to fetch video data. Please try again.');
				resetPreinvestState();
			} else {
				console.log('Video data:', res);
				videoData = res;
				videoPrice = res.likesCount / 1000; // Example: price based on likes, adjust as needed
			}
		} catch (err) {
			console.error('Unexpected error during preinvest:', err);
			alert('Unexpected error occurred. Check console for details.');
			resetPreinvestState();
		} finally {
			isLoadingVideoData = false;
		}
	}

	async function confirmInvestment() {
		console.log('Confirming investment with video URL:', formVideoUrl, 'and amount:', amount);

		isInvesting = true;

		try {
			const { data: res, error } = await data.supabase.functions.invoke('invest', {
				body: {
					videoUrl: formVideoUrl,
					amount: amount
				}
			});

			console.log('Function response:', res);

			if (error) {
				console.error('Error during investment:', error);
				alert('Investment failed. Please try again.');
			} else {
				alert('Investment successful!');

				// Reset form fields and state completely
				formVideoUrl = '';
				amount = 1;
				resetPreinvestState();

				// Invalidate all data to refresh the page state
				await invalidateAll();
			}
		} catch (err) {
			console.error('Unexpected error during function call:', err);
			alert('Unexpected error occurred. Check console for details.');
		} finally {
			isInvesting = false;
		}
	}

	function cancelInvestment() {
		resetPreinvestState();
	}
</script>

<main class="flex-center">
	<div class="header-section">
		<h1>StonkTok</h1>
		<p class="subtitle">Grow a video</p>
	</div>

	{#if !data.session}
		<div class="auth-section">
			<form class="auth-form" on:submit|preventDefault={async () => await handleSubmit()}>
				<input
					type="email"
					placeholder="Enter your email"
					required
					bind:value={email}
					class="form-input"
				/>
				<button type="submit" class="btn btn-primary">Submit</button>
			</form>
		</div>
	{:else}
		<div class="user-section">
			<p class="welcome-text">Welcome back, {data.user?.email}!</p>
		</div>

		<div class="invest-section">
			<form class="invest-form" on:submit|preventDefault={async () => await handlePreinvest()}>
				<input
					type="text"
					placeholder="Enter video URL"
					required
					bind:value={formVideoUrl}
					class="form-input"
					disabled={isLoadingVideoData || isInvesting}
				/>
				<input
					type="number"
					placeholder="Enter amount"
					required
					bind:value={amount}
					class="form-input"
					disabled={isLoadingVideoData || isInvesting}
				/>
				<button type="submit" class="btn btn-primary" disabled={isLoadingVideoData || isInvesting}>
					{isLoadingVideoData ? 'Loading...' : 'Preview Investment'}
				</button>
			</form>
		</div>

		<div class="logout-section">
			<button
				class="btn btn-secondary"
				on:click={async () => {
					try {
						const { error } = await data.supabase.auth.signOut();
						if (error) {
							console.error('Error signing out:', error);
						} else {
							// Force invalidation of auth state immediately
							await invalidateAll();
						}
					} catch (error) {
						console.error('Unexpected error during sign out:', error);
					}
				}}>Sign out</button
			>
		</div>
	{/if}
</main>

<!-- Preinvest Popup -->
{#if showPreinvestPopup}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div
		class="popup-overlay"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		on:click={cancelInvestment}
		on:keydown={(e) => e.key === 'Escape' && cancelInvestment()}
	>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
		<div
			class="popup-content"
			role="document"
			on:click={(e) => e.stopPropagation()}
			on:keydown={() => {}}
		>
			<div class="popup-header">
				<h3>Confirm Investment</h3>
				<button class="close-btn" on:click={cancelInvestment}>&times;</button>
			</div>

			<div class="popup-body">
				{#if isLoadingVideoData}
					<div class="loading">
						<p>Fetching video data...</p>
					</div>
				{:else if videoData}
					<div class="video-info">
						<h4>Video Details</h4>
						<div class="video-stats-grid">
							{#each getVideoStats(videoData) as stat}
								<div class="stat-card">
									<span class="stat-label">{stat.label}:</span>
									<span class="stat-value">{stat.value}</span>
								</div>
							{/each}
						</div>

						<div class="investment-summary">
							<h4>Investment Summary</h4>
							<div class="summary-grid">
								<div class="summary-card">
									<span class="summary-label">Video URL:</span>
									<span class="summary-value" title={formVideoUrl}>
										{formatVideoUrlForDisplay(formVideoUrl)}
									</span>
								</div>
								<div class="summary-card">
									<span class="summary-label">Price per share:</span>
									<span class="summary-value">${videoPrice.toFixed(2)}</span>
								</div>
								<div class="summary-card">
									<span class="summary-label">Shares to buy:</span>
									<span class="summary-value">{amount}</span>
								</div>
								<div class="summary-card total-cost">
									<span class="summary-label">Total cost:</span>
									<span class="summary-value">${(amount * videoPrice).toFixed(2)}</span>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<div class="popup-footer">
				<button class="btn btn-secondary" on:click={cancelInvestment} disabled={isInvesting}
					>Cancel</button
				>
				{#if videoData && !isLoadingVideoData}
					<button class="btn btn-primary" on:click={confirmInvestment} disabled={isInvesting}>
						{isInvesting ? 'Investing...' : 'Confirm Investment'}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* Video stats grid layout */
	.video-stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.stat-card {
		background: rgba(0, 0, 0, 0.05);
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		transition: all 0.2s ease;
	}

	.stat-card:hover {
		background: rgba(0, 0, 0, 0.08);
		border-color: rgba(0, 0, 0, 0.2);
		transform: translateY(-2px);
	}

	.stat-label {
		font-size: 0.875rem;
		color: rgba(0, 0, 0, 0.6);
		font-weight: 500;
		margin-bottom: 0.25rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: #333;
	}

	/* Investment summary grid */
	.summary-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.75rem;
	}

	.summary-card {
		background: rgba(0, 0, 0, 0.03);
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 6px;
		padding: 0.875rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.summary-card.total-cost {
		background: rgba(34, 197, 94, 0.1);
		border-color: rgba(34, 197, 94, 0.3);
		font-weight: 600;
	}

	.summary-label {
		font-size: 0.875rem;
		color: rgba(0, 0, 0, 0.7);
		font-weight: 500;
	}

	.summary-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: #333;
		text-align: right;
		max-width: 60%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.total-cost .summary-value {
		color: #16a34a;
		font-size: 1rem;
	}

	/* Video info container */
	.video-info {
		width: 100%;
		max-width: 600px;
	}

	.video-info h4 {
		margin-bottom: 1rem;
		color: #333;
		font-size: 1.125rem;
		font-weight: 600;
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.video-stats-grid {
			grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
			gap: 0.75rem;
		}

		.stat-card {
			padding: 0.75rem;
		}

		.stat-value {
			font-size: 1.125rem;
		}
	}

	@media (max-width: 480px) {
		.video-stats-grid {
			grid-template-columns: 1fr 1fr;
			gap: 0.5rem;
		}

		.stat-card {
			padding: 0.625rem;
		}

		.stat-value {
			font-size: 1rem;
		}

		.summary-value {
			max-width: 50%;
			font-size: 0.8125rem;
		}
	}
</style>
