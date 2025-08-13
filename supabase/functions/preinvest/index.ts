import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { cleanVideoUrl } from '../_shared/video-utils.ts';
import { corsHeaders } from '../_shared/cors.ts';

console.log('Preinvest function started');

// This function fetches data of a video for users before they commit to investing.
// 1. Checks if there are recents snapshots in the database
// 2. If not, it fetches the video data from TikTok using the Apify actor.
// 3. Saves the data to the database for future use.
// 4. Returns the video data to the user.
// If there are recent snapshots, it returns the latest snapshot data.

Deno.serve(async (req) => {
	console.log('Received request:', req.method, req.url);

	// Handle CORS preflight requests
	if (req.method === 'OPTIONS') {
		return new Response('ok', {
			headers: corsHeaders
		});
	}

	if (req.method !== 'POST') {
		console.error('Method Not Allowed:', req.method);
		return new Response('Method Not Allowed', {
			status: 405,
			headers: corsHeaders
		});
	}

	let videoUrl;
	try {
		const body = await req.json();
		videoUrl = body.videoUrl;
		console.log('Parsed video URL:', videoUrl);
	} catch (err) {
		console.error('Invalid JSON body:', err);
		return new Response('Invalid JSON body', {
			status: 400,
			headers: corsHeaders
		});
	}

	if (
		Deno.env.get('SUPABASE_URL') === undefined ||
		Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') === undefined
	) {
		return new Response(JSON.stringify({ error: 'Missing Supabase credentials' }), {
			status: 500,
			headers: corsHeaders
		});
	}

	const supabase = createClient(
		Deno.env.get('SUPABASE_URL')!,
		Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
	);

	if (!videoUrl) {
		return new Response(JSON.stringify({ error: 'Missing videoUrl' }), {
			status: 400,
			headers: corsHeaders
		});
	}

	const cleanedVideoUrl = cleanVideoUrl(videoUrl);

	if (!cleanedVideoUrl) {
		return new Response(JSON.stringify({ error: 'Invalid video URL' }), {
			status: 400,
			headers: corsHeaders
		});
	}

	let existingVideoId: string | undefined;
	// Check if the video URL is already in the database, if there is no video URL, it will create a new one, if there is, it will return the existing one
	const { data: existingVideo, error: existingError } = await supabase
		.from('videos')
		.select('id, video_url, platform, total_shares, available_shares')
		.eq('video_url', cleanedVideoUrl.cleanUrl)
		.single();

	if (existingError && existingError.code === 'PGRST116') {
		console.log('No existing video found, creating a new one');

		// Create a new video entry
		const { data: newVideo, error: createError } = await supabase
			.from('videos')
			.insert([{ video_url: cleanedVideoUrl.cleanUrl, platform: cleanedVideoUrl.platform }])
			.select('id, video_url, platform')
			.single();

		if (createError) {
			return new Response(
				JSON.stringify({
					error: 'Failed to create new video entry',
					details: createError.message
				}),
				{
					status: 500,
					headers: corsHeaders
				}
			);
		}

		existingVideoId = newVideo.id;
	} else if (existingError && existingError.code !== 'PGRST116') {
		console.error('Error fetching existing video:', existingError);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch existing video',
				details: existingError.message
			}),
			{
				status: 500,
				headers: corsHeaders
			}
		);
	}

	if (existingVideo) {
		console.log('Found existing video:', existingVideo);
		existingVideoId = existingVideo.id;
	}

	// Checks if there are recent snapshots in the database
	const { data: recentSnapshots, error: snapshotsError } = await supabase
		.from('video_snapshots')
		.select('*')
		.eq('video_id', existingVideoId)
		.order('created_at', { ascending: false })
		.limit(1);

	// If recent snapshot is within the last 3 hours, return it
	if (recentSnapshots && recentSnapshots.length > 0) {
		console.log('Recent snapshots found:', recentSnapshots);
		const latestSnapshot = recentSnapshots[0];
		const createdAt = new Date(latestSnapshot.created_at);
		const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

		if (createdAt > threeHoursAgo) {
			console.log('Returning recent snapshot:', latestSnapshot);
			// Snapshot likes and comments are unliked video stats likesCount and commentsCount
			return new Response(
				JSON.stringify({
					videoId: existingVideoId,
					likesCount: latestSnapshot.likes,
					commentsCount: latestSnapshot.comments,
					totalShares: existingVideo.total_shares ? existingVideo.total_shares : 1000,
					availableShares: existingVideo.available_shares ? existingVideo.available_shares : 1000,
					platform: cleanedVideoUrl.platform,
					createdAt: latestSnapshot.created_at
				}),
				{
					headers: {
						'Content-Type': 'application/json',
						...corsHeaders
					}
				}
			);
		} else {
			console.log('Snapshot is older than 3 hours, fetching fresh data');
		}
	}

	// Handle errors first
	if (snapshotsError && snapshotsError.code !== 'PGRST116') {
		console.error('Error fetching recent snapshots:', snapshotsError);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch recent snapshots',
				details: snapshotsError.message
			}),
			{
				status: 500,
				headers: corsHeaders
			}
		);
	}

	// Fetch fresh data if no recent snapshots, snapshots are old, or no snapshots found
	console.log('No recent snapshots found or snapshots are old, fetching from API');
	// Fetch video data then return it, also store it into snapshots
	const { data: videoData, error: fetchError } = await supabase.functions.invoke(
		'fetch-video-stats',
		{
			body: {
				videoUrl: cleanedVideoUrl.cleanUrl,
				platform: cleanedVideoUrl.platform
			}
		}
	);

	if (fetchError) {
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch video data',
				details: fetchError.message
			}),
			{
				status: 500,
				headers: corsHeaders
			}
		);
	}

	// Store the fetched video data into snapshots
	const { error: insertError } = await supabase.from('video_snapshots').insert([
		{
			video_id: existingVideoId,
			likes: videoData.likesCount,
			comments: videoData.commentsCount,
			created_at: new Date().toISOString()
		}
	]);

	if (insertError) {
		console.error('Failed to store video snapshot:', insertError);
	}

	// Update video data with the fetched stats
	const { error: updateError } = await supabase
		.from('videos')
		.update({
			current_likes: videoData.likesCount,
			current_comments: videoData.commentsCount
		})
		.eq('id', existingVideoId);

	if (updateError) {
		console.error('Failed to update video data:', updateError);
		return new Response(
			JSON.stringify({
				error: 'Failed to update video data',
				details: updateError.message
			}),
			{
				status: 500,
				headers: corsHeaders
			}
		);
	}

	console.log('Video data updated successfully:', videoData);
	console.log('Video data fetched and stored successfully:', videoData);

	console.log('Total shares:', existingVideo.total_shares);
	console.log('Available shares:', existingVideo.available_shares);

	const finalReturnData = {
		...videoData,
		totalShares: existingVideo.total_shares ? existingVideo.total_shares : 1000,
		availableShares: existingVideo.available_shares ? existingVideo.available_shares : 1000
	};

	return new Response(JSON.stringify(finalReturnData), {
		headers: {
			'Content-Type': 'application/json',
			...corsHeaders
		}
	});
});
