// Setup type definitions for built-in Supabase Runtime APIs
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
console.info('🧠 Listening to investments!');
Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response(null, {
			status: 200,
			headers: {
				...corsHeaders,
				'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
			}
		});
	}
	if (req.method !== 'POST') {
		console.error('Method Not Allowed:', req.method);
		return new Response('Method Not Allowed', {
			status: 405,
			headers: corsHeaders
		});
	}

	const supabase = createClient(
		Deno.env.get('SUPABASE_URL'),
		Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
	);

	let videoUrl, amount;
	try {
		const body = await req.json();
		videoUrl = body.videoUrl;
		amount = body.amount;
	} catch (err) {
		console.error('Invalid JSON body:', err);
		return new Response('Invalid JSON body', {
			status: 400,
			headers: corsHeaders
		});
	}

	// Authentication check
	const authHeader = req.headers.get('Authorization');
	const token = authHeader?.replace('Bearer ', '');
	const {
		data: { user },
		error: userErr
	} = await supabase.auth.getUser(token);
	if (userErr || !user) {
		console.error('Unauthorized access attempt:', userErr?.message || 'No user');
		return new Response('Unauthorized', {
			status: 401,
			headers: corsHeaders
		});
	}

	// Normalize URL
	let url;
	try {
		url = new URL(videoUrl);
		url.search = '';
	} catch (err) {
		console.error('Invalid videoUrl format:', videoUrl, err);
		return new Response('Invalid video URL format', {
			status: 400,
			headers: corsHeaders
		});
	}
	const cleanVideoUrl = url.toString();
	let platform = null;
	if (url.hostname.includes('tiktok.com')) platform = 'tiktok';
	else if (url.hostname.includes('instagram.com')) platform = 'instagram';
	else {
		console.error('Unsupported platform:', url.hostname);
		return new Response('Unsupported platform', {
			status: 400,
			headers: corsHeaders
		});
	}

	// Check if video already exists, if not, insert it
	const { data: fetchedVideo, error: fetchErr } = await supabase
		.from('videos')
		.select('id, current_likes, current_comments')
		.eq('video_url', cleanVideoUrl)
		.single();
	let existingVideo = fetchedVideo;

	// Handle fetch errors or if video does not exist
	if (fetchErr && fetchErr.code !== 'PGRST116') {
		console.error('Error fetching video:', fetchErr);
		return new Response('Failed to fetch video', {
			status: 500,
			headers: corsHeaders
		});
	} else if ((fetchErr && fetchErr.code === 'PGRST116') || !existingVideo) {
		// Insert new video if it doesn't exist
		const { data: insertedVideo, error: insertErr } = await supabase
			.from('videos')
			.insert({
				video_url: cleanVideoUrl,
				platform
			})
			.select()
			.single();

		if (insertErr) {
			console.error('Failed to insert new video:', insertErr);
			return new Response(JSON.stringify({ error: 'Failed to insert video' }), {
				status: 500,
				headers: corsHeaders
			});
		}
		console.info('Inserted new video:', insertedVideo);
		existingVideo = insertedVideo;
	} else {
		console.info('Found existing video:', existingVideo);
	}

	const investRes = await supabase
		.from('investments')
		.insert({
			user_id: user.id,
			video_id: existingVideo.id,
			amount,
			like_count_at_investment: existingVideo.current_likes,
			comment_count_at_investment: existingVideo.current_comments
		})
		.select()
		.single();
	if (investRes.error) {
		console.error('Investment insertion failed:', investRes.error);
		return new Response(JSON.stringify(investRes.error), {
			status: 500,
			headers: corsHeaders
		});
	}
	console.log('Investment recorded:', investRes.data);

	supabase.functions.invoke('update-single-video', {
		body: {
			video_id: existingVideo.id,
			investment_id: investRes.data.id
		}
	});

	return new Response(
		JSON.stringify({
			message: 'Investment successful',
			videoId: existingVideo.id,
			userId: user.id,
			amount
		}),
		{
			status: 200,
			headers: {
				...corsHeaders,
				'Content-Type': 'application/json'
			}
		}
	);
});
