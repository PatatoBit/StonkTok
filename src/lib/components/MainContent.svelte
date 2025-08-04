<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { signInWithEmail } from '$lib/auth';
	import { supabase } from '$lib/supabaseClient';
	import { cleanVideoUrl } from '$lib/utility';
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

	async function handlePreinvest() {
		console.log('Pre-investing with video URL:', formVideoUrl);

		if (!formVideoUrl.trim()) {
			alert('Please enter a video URL');
			return;
		}

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
				showPreinvestPopup = false;
			} else {
				console.log('Video data:', res);
				videoData = res;
			}
		} catch (err) {
			console.error('Unexpected error during preinvest:', err);
			alert('Unexpected error occurred. Check console for details.');
			showPreinvestPopup = false;
		} finally {
			isLoadingVideoData = false;
		}
	}

	async function confirmInvestment() {
		console.log('Confirming investment with video URL:', formVideoUrl, 'and amount:', amount);

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

				// Reset form fields and close popup
				formVideoUrl = '';
				amount = 1;
				showPreinvestPopup = false;
				videoData = null;
				await invalidateAll();
			}
		} catch (err) {
			console.error('Unexpected error during function call:', err);
			alert('Unexpected error occurred. Check console for details.');
		}
	}

	function cancelInvestment() {
		showPreinvestPopup = false;
		videoData = null;
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
				/>
				<input
					type="number"
					placeholder="Enter amount"
					required
					bind:value={amount}
					class="form-input"
				/>
				<button type="submit" class="btn btn-primary">Preview Investment</button>
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
				<h3>Investment Preview</h3>
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
							{#if videoData.viewsCount}
								<div class="stat-item">
									<span class="stat-label">Views:</span>
									<span class="stat-value">{videoData.viewsCount.toLocaleString()}</span>
								</div>
							{/if}
							{#if videoData.sharesCount}
								<div class="stat-item">
									<span class="stat-label">Shares:</span>
									<span class="stat-value">{videoData.sharesCount.toLocaleString()}</span>
								</div>
							{/if}
						</div>

						<div class="investment-summary">
							<h4>Investment Summary</h4>
							<div class="summary-item">
								<span class="summary-label">Video URL:</span>
								<span class="summary-value">{formVideoUrl}</span>
							</div>
							<div class="summary-item">
								<span class="summary-label">Investment Amount:</span>
								<span class="summary-value">${amount}</span>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<div class="popup-footer">
				<button class="btn btn-secondary" on:click={cancelInvestment}>Cancel</button>
				{#if videoData && !isLoadingVideoData}
					<button class="btn btn-primary" on:click={confirmInvestment}>Confirm Investment</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
