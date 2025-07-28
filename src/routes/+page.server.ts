import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabaseClient';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
	const { session } = await safeGetSession();

	console.log('Session:', session ? 'Found' : 'Not found');
	console.log('User ID:', session?.user?.id || 'No user ID');

	if (!session) {
		// If user is not authenticated, redirect to auth or return empty data
		return {
			investments: [],
			videoSnapshots: [],
			user: null,
			debug: {
				hasSession: false,
				userId: null,
				message: 'No session found'
			}
		};
	}

	try {
		console.log('Fetching investments for user:', session.user.id);

		// Fetch investments with joined video data for the current user
		const { data: investments, error: investmentsError } = await supabase
			.from('investments')
			.select(
				`
				*,
				video:videos(*)
			`
			)
			.eq('user_id', session.user.id)
			.order('invested_at', { ascending: false });

		console.log('Investments query result:', {
			count: investments?.length || 0,
			error: investmentsError,
			data: investments
		});

		if (investmentsError) {
			console.error('Error fetching investments:', investmentsError);
			throw error(500, 'Failed to fetch investments');
		}

		// Get all video IDs from investments to fetch snapshots
		const videoIds = investments?.map((inv) => inv.video_id) || [];
		console.log('Video IDs for snapshots:', videoIds);

		let videoSnapshots: VideoSnapshot[] = [];
		if (videoIds.length > 0) {
			const { data: snapshots, error: snapshotsError } = await supabase
				.from('video_snapshots')
				.select('*')
				.in('video_id', videoIds)
				.order('created_at', { ascending: true });

			console.log('Snapshots query result:', {
				count: snapshots?.length || 0,
				error: snapshotsError
			});

			if (snapshotsError) {
				console.error('Error fetching video snapshots:', snapshotsError);
				throw error(500, 'Failed to fetch video snapshots');
			}

			videoSnapshots = snapshots || [];
		}

		return {
			investments: investments || [],
			videoSnapshots,
			user: session.user,
			debug: {
				hasSession: true,
				userId: session.user.id,
				investmentCount: investments?.length || 0,
				snapshotCount: videoSnapshots.length,
				message: 'Data loaded successfully'
			}
		};
	} catch (err) {
		console.error('Error in page load:', err);
		return {
			investments: [],
			videoSnapshots: [],
			user: session?.user || null,
			debug: {
				hasSession: !!session,
				userId: session?.user?.id || null,
				error: err instanceof Error ? err.message : 'Unknown error',
				message: 'Error occurred during data loading'
			}
		};
	}
};
