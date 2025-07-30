import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
serve(async () => {
	const supabase = createClient(
		Deno.env.get('SUPABASE_URL'),
		Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
	);
	try {
		const { data: videos, error: fetchErr } = await supabase
			.from('videos')
			.select('id, video_url, platform');
		if (fetchErr) {
			console.error('Error fetching videos:', fetchErr);
			return new Response('Failed to fetch videos', {
				status: 500
			});
		}
		if (!videos || videos.length === 0) {
			console.info('No videos found to update.');
			return new Response('No videos found', {
				status: 200
			});
		}
		for (const video of videos) {
			try {
				const { video_url, platform, id } = video;
				console.info(`Updating stats for video id: ${id}, platform: ${platform}`);
				const { data: scrapeData, error: scrapeErr } = await supabase.functions.invoke(
					platform === 'tiktok' ? 'tiktok-apify' : 'instagram-apify',
					{
						body: {
							videoUrl: video_url
						}
					}
				);
				if (scrapeErr) {
					console.error(`Error scraping video ${id}:`, scrapeErr);
					continue;
				}
				if (!scrapeData) {
					console.warn(`No scrape data returned for video ${id}`);
					continue;
				}
				// Extract stats from consistent format
				const likes = scrapeData?.likesCount ?? null;
				const comments = scrapeData?.commentsCount ?? null;

				if (likes === null || comments === null) {
					console.warn(`Missing stats for video ${id}: likes=${likes}, comments=${comments}`);
					continue;
				}
				// Insert snapshot
				const { error: snapshotErr } = await supabase.from('video_snapshots').insert({
					video_id: id,
					likes,
					comments,
					created_at: new Date().toISOString()
				});
				if (snapshotErr) {
					console.error(`Failed to insert snapshot for video ${id}:`, snapshotErr);
					continue;
				}
				// Update current stats on videos table
				const { error: updateErr } = await supabase
					.from('videos')
					.update({
						current_likes: likes,
						current_comments: comments
					})
					.eq('id', id);
				if (updateErr) {
					console.error(`Failed to update video ${id} current stats:`, updateErr);
					continue;
				}
				console.info(`Successfully updated video ${id} stats.`);
			} catch (innerErr) {
				console.error(`Unexpected error processing video ${video.id}:`, innerErr);
			}
		}
		return new Response('Update complete', {
			status: 200
		});
	} catch (err) {
		console.error('Fatal error in update-video-stats function:', err);
		return new Response('Internal server error', {
			status: 500
		});
	}
});
