<script lang="ts">
	export let data: any; // Using any for now to avoid type issues
</script>

<div class="debug-info">
	<h3>Debug Information</h3>
	<div class="debug-grid">
		<div class="debug-item">
			<strong>User ID:</strong>
			<span class="user-id">{data.user?.id || 'Not logged in'}</span>
		</div>
		<div class="debug-item">
			<strong>Email:</strong>
			<span>{data.user?.email || 'N/A'}</span>
		</div>
		<div class="debug-item">
			<strong>Has Session:</strong>
			<span class="status {data.debug.hasSession ? 'success' : 'error'}">
				{data.debug.hasSession ? 'Yes' : 'No'}
			</span>
		</div>
		<div class="debug-item">
			<strong>Investments Found:</strong>
			<span class="count">{data.debug.investmentCount}</span>
		</div>
		<div class="debug-item">
			<strong>Snapshots Found:</strong>
			<span class="count">{data.debug.snapshotCount}</span>
		</div>
		<div class="debug-item">
			<strong>Message:</strong>
			<span class="message">{data.debug.message}</span>
		</div>
		{#if data.debug.error}
			<div class="debug-item error-item">
				<strong>Error:</strong>
				<span class="error">{data.debug.error}</span>
			</div>
		{/if}
	</div>
</div>

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

	@media (min-width: 768px) {
		.debug-grid {
			grid-template-columns: 1fr 1fr;
		}

		.error-item {
			grid-column: 1 / -1;
		}
	}
</style>
