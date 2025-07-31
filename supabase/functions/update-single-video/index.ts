import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

console.log('Hello from Functions!');

Deno.serve(async (req) => {
	const supabase = createClient(
		Deno.env.get('SUPABASE_URL'),
		Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
	);

	const { video_id, investment_id } = await req.json();

	// Get video_url from DB
	const { data: video, error } = await supabase
		.from('videos')
		.select('video_url, platform')
		.eq('id', video_id)
		.single();

	if (error || !video?.video_url) {
		console.error('Video lookup error:', error);
		return new Response(JSON.stringify({ error: 'Video not found' }), { status: 404 });
	}
	const { video_url, platform } = video;

	// Invoke scraping function
	console.info(`Updating stats for video id: ${video_id}, platform: ${platform}`);
	const { data: scrapeData, error: scrapeErr } = await supabase.functions.invoke(
		platform === 'tiktok' ? 'tiktok-apify' : 'instagram-apify',
		{
			body: {
				videoUrl: video_url
			}
		}
	);
	if (scrapeErr) {
		console.error(`Error scraping video ${video_id}:`, scrapeErr);
		return new Response(JSON.stringify({ error: 'Failed to scrape video data' }), { status: 500 });
	}
	if (!scrapeData) {
		console.warn(`No scrape data returned for video ${video_id}`);
		return new Response(JSON.stringify({ error: 'No scrape data returned' }), { status: 500 });
	}
	// Extract stats from consistent format
	const likes = scrapeData?.likesCount ?? null;
	const comments = scrapeData?.commentsCount ?? null;

	if (likes === null || comments === null) {
		console.warn(`Missing stats for video ${video_id}: likes=${likes}, comments=${comments}`);
		return new Response(JSON.stringify({ error: 'Missing stats data' }), { status: 500 });
	}
	// Insert snapshot
	const { error: snapshotErr } = await supabase.from('video_snapshots').insert({
		video_id: video_id,
		likes,
		comments,
		created_at: new Date().toISOString()
	});
	if (snapshotErr) {
		console.error(`Failed to insert snapshot for video ${video_id}:`, snapshotErr);
		return new Response(JSON.stringify({ error: 'Failed to insert snapshot' }), { status: 500 });
	}
	// Update current stats on videos table
	const { error: updateErr } = await supabase
		.from('videos')
		.update({
			current_likes: likes,
			current_comments: comments
		})
		.eq('id', video_id);
	if (updateErr) {
		console.error(`Failed to update video ${video_id} current stats:`, updateErr);
		return new Response(JSON.stringify({ error: 'Failed to update video stats' }), { status: 500 });
	}
	console.info(`Successfully updated video ${video_id} stats.`);

	// Update investment record with new stats
	const { error: investErr } = await supabase
		.from('investments')
		.update({
			like_count_at_investment: likes,
			comment_count_at_investment: comments
		})
		.eq('id', investment_id);

	if (investErr) {
		console.error(`Failed to update investment ${investment_id} with new stats:`, investErr);
		return new Response(JSON.stringify({ error: 'Failed to update investment' }), { status: 500 });
	}

	return new Response(
		JSON.stringify({
			success: true,
			video_id: video_id,
			likes,
			comments
		}),
		{ headers: { 'Content-Type': 'application/json' } }
	);
});
