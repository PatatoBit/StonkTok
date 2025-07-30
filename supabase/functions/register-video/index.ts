import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
serve(async (req) => {
	const { videoUrl } = await req.json();
	const supabase = createClient(
		Deno.env.get('SUPABASE_URL'),
		Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
	);
	// Use the URL as-is without cleaning since it's already cleaned upstream
	const parsed = new URL(videoUrl);
	// Remove these lines so URL is NOT cleaned here:
	// parsed.search = '';
	// parsed.hash = '';
	const platform = parsed.hostname.includes('tiktok') ? 'tiktok' : 'instagram';
	// Check for existing video
	const { data: existing } = await supabase
		.from('videos')
		.select('*')
		.eq('video_url', videoUrl)
		.single();
	if (existing) {
		return new Response(
			JSON.stringify({
				id: existing.id
			}),
			{
				status: 200
			}
		);
	}
	// Insert new video
	const { data: inserted, error: insertErr } = await supabase
		.from('videos')
		.insert({
			video_url: videoUrl,
			platform
		})
		.select()
		.single();
	if (insertErr || !inserted) {
		return new Response(
			JSON.stringify({
				error: insertErr?.message || 'Insert failed'
			}),
			{
				status: 500
			}
		);
	}
	// Scrape video stats
	const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke(
		platform === 'tiktok' ? 'tiktok-apify' : 'instagram-apify',
		{
			body: {
				videoUrl
			}
		}
	);
	if (scrapeError || !scrapeData) {
		return new Response(
			JSON.stringify({
				id: inserted.id
			}),
			{
				status: 200
			}
		);
	}
	// Extract stats from consistent format
	const likes = scrapeData?.likesCount ?? null;
	const comments = scrapeData?.commentsCount ?? null;

	if (likes !== null || comments !== null) {
		await supabase
			.from('videos')
			.update({
				current_likes: likes,
				current_comments: comments
			})
			.eq('id', inserted.id);
	}
	const { data: updatedVideo } = await supabase
		.from('videos')
		.select('*')
		.eq('id', inserted.id)
		.single();
	return new Response(JSON.stringify(updatedVideo), {
		status: 200
	});
});
