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
				videoPrice = res.likes / 1000; // Example: price based on likes, adjust as needed
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
						<div class="video-stats">
							<div class="stat-item">
								<span class="stat-label">Likes:</span>
								<span class="stat-value">{videoData.likes ? videoData.likes : 'N/A'}</span>
							</div>
							<div class="stat-item">
								<span class="stat-label">Comments:</span>
								<span class="stat-value">{videoData.comments ? videoData.comments : 'N/A'}</span>
							</div>

							<div class="stat-item">
								<span class="stat-label">Shares remaining:</span>
								<span class="stat-value"
									>{videoData.total_shares ? videoData.total_shares : 'N/A'} / {videoData.available_shares
										? videoData.available_shares
										: 'N/A'}</span
								>
							</div>
						</div>

						<div class="investment-summary">
							<h4>Investment Summary</h4>
							<div class="summary-item">
								<span class="summary-label">Video URL:</span>
								<span class="summary-value">{formatVideoUrlForDisplay(formVideoUrl)}</span>
							</div>
							<div class="summary-item">
								<span class="summary-label">Total cost:</span>
								<span class="summary-value"
									>${amount} &times; {videoPrice} = ${(amount * videoPrice).toFixed(2)}</span
								>
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
