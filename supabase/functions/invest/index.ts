// Setup type definitions for built-in Supabase Runtime APIs
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { cleanVideoUrl } from '../_shared/video-utils.ts';
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

	if (
		Deno.env.get('SUPABASE_URL') === undefined ||
		Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') === undefined
	) {
		console.error('Missing Supabase credentials');
		return new Response('Missing Supabase credentials', {
			status: 500,
			headers: corsHeaders
		});
	}

	const supabase = createClient(
		Deno.env.get('SUPABASE_URL')!,
		Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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

	// Clean and validate video URL
	let processedVideoUrl: string;
	try {
		const result = cleanVideoUrl(videoUrl);
		processedVideoUrl = result.cleanUrl;
	} catch (err) {
		console.error('Video URL processing error:', err);
		return new Response((err as Error).message, {
			status: 400,
			headers: corsHeaders
		});
	}

	// Calculate video price based on likes
	const { data: videoData, error: videoErr } = await supabase
		.from('videos')
		.select('id, current_likes, current_comments, total_shares, available_shares')
		.eq('video_url', processedVideoUrl)
		.single();
	if (videoErr || !videoData) {
		console.error(
			'Video not found or error fetching video data:',
			videoErr?.message || 'No video data'
		);
		return new Response('Video not found', {
			status: 404,
			headers: corsHeaders
		});
	}

	const videoPrice = videoData.current_likes / 1000; // Example: price based on likes, adjust as needed
	if (!videoPrice || videoPrice <= 0) {
		console.error('Invalid video price:', videoPrice);
		return new Response('Invalid video price', {
			status: 400,
			headers: corsHeaders
		});
	}

	// Check if user balance is sufficient
	const { data: userProfile, error: profileErr } = await supabase
		.from('profiles')
		.select('id, balance')
		.eq('id', user.id)
		.single();

	if (profileErr || !userProfile) {
		console.error(
			'User profile not found or error fetching profile:',
			profileErr?.message || 'No profile data'
		);
		return new Response('User profile not found', {
			status: 404,
			headers: corsHeaders
		});
	}

	// Check if the user has enough balance
	if (amount <= 0 || amount * videoPrice > userProfile.balance) {
		console.error('Invalid investment amount:', amount);
		return new Response('Invalid investment amount', {
			status: 400,
			headers: corsHeaders
		});
	}

	// Check if the video has enough shares available
	if (videoData.available_shares < amount) {
		console.error('Not enough shares available for investment:', videoData.available_shares);
		return new Response('Not enough shares available', {
			status: 400,
			headers: corsHeaders
		});
	}

	// Investment logic
	// Create investment record
	const { data: investRes, error: investErr } = await supabase.from('investments').insert({
		user_id: user.id,
		video_id: videoData.id,
		amount,
		like_count_at_investment: videoData.current_likes,
		comment_count_at_investment: videoData.current_comments || 0
	});

	if (investErr) {
		console.error('Error creating investment record:', investErr.message);
		return new Response('Error creating investment record', {
			status: 500,
			headers: corsHeaders
		});
	}

	// Update tracking status and remaining shares
	const { data: existingVideo, error: videoUpdateErr } = await supabase
		.from('videos')
		.update({
			available_shares: videoData.available_shares - amount,
			tracking: true
		})
		.eq('id', videoData.id)
		.select('id')
		.single();

	if (videoUpdateErr || !existingVideo) {
		console.error('Error updating video shares:', videoUpdateErr?.message || 'No video data');
		return new Response('Error updating video shares', {
			status: 500,
			headers: corsHeaders
		});
	}

	// Deduct the investment amount from the user's balance
	console.log(
		'Deducting investment amount from user balance:',
		userProfile.balance,
		// Round to two decimal places
		Math.round(amount * videoPrice * 100) / 100
	);

	const { error: balanceErr } = await supabase
		.from('profiles')
		.update({ balance: userProfile.balance - Math.round(amount * videoPrice * 100) / 100 })
		.eq('id', user.id);
	if (balanceErr) {
		console.error('Error updating user balance:', balanceErr.message);
		// Rollback investment creation if balance update fails
		await supabase.from('investments').delete().eq('id', investRes.data[0].id);
		console.error('Rolled back investment due to balance update failure');

		return new Response('Error updating user balance', {
			status: 500,
			headers: corsHeaders
		});
	}

	// supabase.functions.invoke('update-single-video', {
	// 	body: {
	// 		video_id: existingVideo.id,
	// 		investment_id: investRes.data.id
	// 	}
	// });

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
