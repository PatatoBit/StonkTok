// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('Fetch Video Stats Function Started!');

function detectPlatform(videoUrl: string): 'tiktok' | 'instagram' | null {
	if (videoUrl.includes('tiktok.com') || videoUrl.includes('vm.tiktok.com')) {
		return 'tiktok';
	}
	if (videoUrl.includes('instagram.com')) {
		return 'instagram';
	}
	return null;
}

async function fetchTikTokStats(videoUrl: string, apiToken: string) {
	// 1. Start the TikTok actor run
	const inputPayload = {
		postURLs: [videoUrl],
		scrapeRelatedVideos: false,
		resultsPerPage: 100,
		shouldDownloadVideos: false,
		shouldDownloadCovers: false,
		shouldDownloadSubtitles: false,
		shouldDownloadSlideshowImages: false
	};

	const startRunRes = await fetch('https://api.apify.com/v2/acts/S5h7zRLfKFEr8pdj7/runs', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(inputPayload)
	});

	if (!startRunRes.ok) {
		const err = await startRunRes.text();
		throw new Error(`Failed to start TikTok Apify run: ${err}`);
	}

	const run = await startRunRes.json();
	const runId = run.data.id;
	const datasetId = run.data.defaultDatasetId;

	// 2. Poll run status (up to 30s)
	let status = run.data.status;
	const maxTries = 15;
	let tries = 0;

	while ((status === 'READY' || status === 'RUNNING') && tries < maxTries) {
		await new Promise((res) => setTimeout(res, 2000)); // 2 sec delay
		const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
			headers: {
				Authorization: `Bearer ${apiToken}`
			}
		});
		const statusData = await statusRes.json();
		status = statusData.data.status;
		tries++;
	}

	if (status !== 'SUCCEEDED') {
		throw new Error(`TikTok Apify run did not complete in time. Status: ${status}`);
	}

	// 3. Fetch dataset results
	const datasetRes = await fetch(
		`https://api.apify.com/v2/datasets/${datasetId}/items?format=json`,
		{
			headers: {
				Authorization: `Bearer ${apiToken}`
			}
		}
	);

	if (!datasetRes.ok) {
		const err = await datasetRes.text();
		throw new Error(`Failed to fetch TikTok Apify dataset: ${err}`);
	}

	const items = await datasetRes.json();
	return {
		likesCount: items[0]?.diggCount ?? null,
		commentsCount: items[0]?.commentCount ?? null
	};
}

async function fetchInstagramStats(videoUrl: string, apiToken: string) {
	// 1. Start the Instagram actor run
	const inputPayload = {
		username: [videoUrl]
	};

	const startRunRes = await fetch('https://api.apify.com/v2/acts/xMc5Ga1oCONPmWJIa/runs', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(inputPayload)
	});

	if (!startRunRes.ok) {
		const err = await startRunRes.text();
		throw new Error(`Failed to start Instagram Apify run: ${err}`);
	}

	const run = await startRunRes.json();
	const runId = run.data.id;
	const datasetId = run.data.defaultDatasetId;

	// 2. Poll run status (up to 30s)
	let status = run.data.status;
	const maxTries = 15;
	let tries = 0;

	while ((status === 'READY' || status === 'RUNNING') && tries < maxTries) {
		await new Promise((res) => setTimeout(res, 2000)); // 2 sec delay
		const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
			headers: {
				Authorization: `Bearer ${apiToken}`
			}
		});
		const statusData = await statusRes.json();
		status = statusData.data.status;
		tries++;
	}

	if (status !== 'SUCCEEDED') {
		throw new Error(`Instagram Apify run did not complete in time. Status: ${status}`);
	}

	// 3. Fetch dataset results
	const datasetRes = await fetch(
		`https://api.apify.com/v2/datasets/${datasetId}/items?format=json`,
		{
			headers: {
				Authorization: `Bearer ${apiToken}`
			}
		}
	);

	if (!datasetRes.ok) {
		const err = await datasetRes.text();
		throw new Error(`Failed to fetch Instagram Apify dataset: ${err}`);
	}

	const items = await datasetRes.json();
	return {
		likesCount: items[0]?.likesCount ?? null,
		commentsCount: items[0]?.commentsCount ?? null
	};
}

Deno.serve(async (req) => {
	if (
		Deno.env.get('SUPABASE_URL') === undefined ||
		Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') === undefined ||
		Deno.env.get('APIFY_TOKEN') === undefined
	) {
		return new Response(JSON.stringify({ error: 'Missing Supabase or Apify credentials' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const supabase = createClient(
		Deno.env.get('SUPABASE_URL')!,
		Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
	);

	try {
		const { videoUrl, platform } = await req.json();
		const apiToken = Deno.env.get('APIFY_TOKEN');

		if (!videoUrl || !apiToken) {
			return new Response(
				JSON.stringify({
					error: 'Missing videoUrl or API token'
				}),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// Detect platform if not explicitly provided
		const detectedPlatform = platform || detectPlatform(videoUrl);

		if (!detectedPlatform) {
			return new Response(
				JSON.stringify({
					error: 'Unable to detect platform. Supported platforms: TikTok, Instagram'
				}),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		let finalData;

		if (detectedPlatform === 'tiktok') {
			finalData = await fetchTikTokStats(videoUrl, apiToken);
		} else if (detectedPlatform === 'instagram') {
			finalData = await fetchInstagramStats(videoUrl, apiToken);
		} else {
			return new Response(
				JSON.stringify({
					error: 'Unsupported platform. Supported platforms: TikTok, Instagram'
				}),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		if (!finalData.likesCount && !finalData.commentsCount) {
			return new Response(
				JSON.stringify({
					error: 'No valid data found in Apify results',
					platform: detectedPlatform
				}),
				{
					status: 404,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		return new Response(
			JSON.stringify({
				platform: detectedPlatform,
				likesCount: finalData.likesCount,
				commentsCount: finalData.commentsCount
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (error) {
		console.error('Error in fetch-video-stats:', error);
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : 'Internal server error'
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  For TikTok:
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/fetch-video-stats' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"videoUrl":"https://www.tiktok.com/@username/video/1234567890", "platform":"tiktok"}'

  For Instagram:
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/fetch-video-stats' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"videoUrl":"https://www.instagram.com/p/ABC123/", "platform":"instagram"}'

  Note: Platform detection is automatic based on URL, so the "platform" parameter is optional.

*/
