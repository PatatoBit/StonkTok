// Setup type definitions for built-in Supabase Runtime APIs
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

console.info('Listening to investments!');

// Start Supabase Edge Function
Deno.serve(async (req) => {
	// Handle CORS preflight requests
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
		return new Response('Method Not Allowed', {
			status: 405,
			headers: {
				...corsHeaders
			}
		});
	}

	const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
		global: {
			headers: {
				Authorization: req.headers.get('Authorization')
			}
		}
	});

	const { videoUrl, amount } = await req.json();
	const authHeader = req.headers.get('Authorization')!;
	const token = authHeader.replace('Bearer ', '');
	const {
		data: { user }
	} = await supabase.auth.getUser(token);

	if (!user) {
		return new Response('Unauthorized', {
			status: 401
		});
	}

	// Normalize and identify platform
	const url = new URL(videoUrl);
	let platform = null;
	if (url.hostname.includes('tiktok.com')) platform = 'tiktok';
	else if (url.hostname.includes('instagram.com')) platform = 'instagram';
	else
		return new Response('Unsupported platform', {
			status: 400
		});

	// 1. Lookup or create video entry
	let { data: video, error: videoErr } = await supabase
		.from('videos')
		.select('*')
		.eq('video_url', videoUrl)
		.single();

	if (videoErr) {
		if (videoErr.code === 'PGRST116') {
			// Not found, insert it
			const { data: insertedVideo, error: insertErr } = await supabase
				.from('videos')
				.insert({ video_url: videoUrl, platform })
				.select()
				.single();

			if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`);
			video = insertedVideo;
		} else {
			// Something went wrong with the query
			throw new Error(`Select failed: ${videoErr.message}`);
		}
	}

	videoErr = videoErr || (video ? null : { message: 'Failed to create or fetch video' });
	if (videoErr || !video) {
		return new Response(
			JSON.stringify(videoErr || { message: 'Failed to create or fetch video' }),
			{
				status: 500
			}
		);
	}

	// 2. Insert investment
	const investRes = await supabase.from('investments').insert({
		user_id: user.id,
		video_id: video.id,
		amount,
		like_count_at_investment: 0,
		comment_count_at_investment: 0
	});
	if (investRes.error) {
		return new Response(JSON.stringify(investRes.error), {
			status: 500
		});
	}

	return new Response(
		JSON.stringify({
			message: 'Investment successful',
			videoId: video.id,
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
