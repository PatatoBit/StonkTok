<script lang="ts">
	import { signInWithEmail } from '$lib/auth';

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
</script>

<main class="flex-center">
	<h1>StonkTok</h1>
	<p>Grow a video</p>

	<form action="" on:submit|preventDefault={handleSubmit}>
		<input type="email" placeholder="Enter your email" required bind:value={email} />
		<button type="submit">Submit</button>
	</form>
</main>
