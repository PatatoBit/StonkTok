import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { cleanVideoUrl } from '../_shared/video-utils.ts';

console.log('Preinvest function started');

// This function fetches data of a video for users before they commit to investing.
// 1. Checks if there are recents snapshots in the database
// 2. If not, it fetches the video data from TikTok using the Apify actor.
// 3. Saves the data to the database for future use.
// 4. Returns the video data to the user.
// If there are recent snapshots, it returns the latest snapshot data.

Deno.serve(async (req) => {
	const { videoUrl } = await req.json();

	if (
		Deno.env.get('SUPABASE_URL') === undefined ||
		Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') === undefined
	) {
		return new Response(JSON.stringify({ error: 'Missing Supabase credentials' }), { status: 500 });
	}

	const supabase = createClient(
		Deno.env.get('SUPABASE_URL')!,
		Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
	);

	if (!videoUrl) {
		return new Response(JSON.stringify({ error: 'Missing videoUrl' }), { status: 400 });
	}

	const cleanedVideoUrl = cleanVideoUrl(videoUrl);

	if (!cleanedVideoUrl) {
		return new Response(JSON.stringify({ error: 'Invalid video URL' }), { status: 400 });
	}

	// Check if the video URL is already in the database, if there is no video URL, it will create a new one, if there is, it will return the existing one
	const { data: existingVideo, error: existingError } = await supabase
		.from('videos')
		.select('id, video_url, platform')
		.eq('video_url', cleanedVideoUrl.cleanUrl)
		.single();

	if (existingError && existingError.code === 'PGRST116') {
		console.log('No existing video found, creating a new one');
	} else if (existingError) {
		console.error('Error fetching existing video:', existingError);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch existing video',
				details: existingError.message
			}),
			{ status: 500 }
		);
	}

	if (existingVideo) {
		console.log('Found existing video:', existingVideo);
	}

	const existingVideoId = existingVideo?.id;

	// Checks if there are recent snapshots in the database
	const { data: recentSnapshots, error: snapshotsError } = await supabase
		.from('video_snapshots')
		.select('*')
		.eq('video_id', existingVideoId)
		.order('created_at', { ascending: false })
		.limit(1);

	// If recent snapshot is within the last 3 hours, return it
	if (recentSnapshots && recentSnapshots.length > 0) {
		const latestSnapshot = recentSnapshots[0];
		const createdAt = new Date(latestSnapshot.created_at);
		const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

		if (createdAt > threeHoursAgo) {
			return new Response(JSON.stringify(latestSnapshot), {
				headers: { 'Content-Type': 'application/json' }
			});
		}
	} else if (snapshotsError && snapshotsError.code === 'PGRST116') {
		// Video snapshot not found or no recent snapshots
		console.log('No recent snapshots found, fetching from API');
		// Fetch video data then return it, also store it into snapshots
		const { data: videoData, error: fetchError } = await supabase.functions.invoke(
			'fetch-video-stats',
			{
				body: {
					videoUrl: cleanedVideoUrl.cleanUrl
				}
			}
		);

		if (fetchError) {
			return new Response(
				JSON.stringify({
					error: 'Failed to fetch video data',
					details: fetchError.message
				}),
				{ status: 500 }
			);
		}

		// Store the fetched video data into snapshots
		const { error: insertError } = await supabase
			.from('video_snapshots')
			.insert([{ video_id: existingVideoId, ...videoData }]);

		if (insertError) {
			console.error('Failed to store video snapshot:', insertError);
		}

		return new Response(JSON.stringify(videoData), {
			headers: { 'Content-Type': 'application/json' }
		});
	} else if (snapshotsError) {
		console.error('Error fetching recent snapshots:', snapshotsError);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch recent snapshots',
				details: snapshotsError.message
			}),
			{ status: 500 }
		);
	}

	// Default fallback response
	return new Response(JSON.stringify({ error: 'Unexpected error' }), { status: 500 });
});
