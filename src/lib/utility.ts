export function roundToTwoDecimals(num: number): number {
	return Math.round(num * 100) / 100;
}

// Helper function to calculate ROI
export function calculateROI(investment: Investment): {
	value: string;
	isPositive: boolean;
	percentage: number;
} {
	if (!investment.video) return { value: 'N/A', isPositive: false, percentage: 0 };

	const initialLikes = investment.like_count_at_investment;
	const currentLikes = investment.video.current_likes;
	const likesGrowth = currentLikes - initialLikes;

	const roi = (likesGrowth / initialLikes) * 100;
	const isPositive = roi > 0;
	const value = isPositive ? `+${roi.toFixed(2)}%` : `${roi.toFixed(2)}%`;

	return { value, isPositive, percentage: roi };
}

export interface VideoUrlResult {
	cleanUrl: string;
	platform: 'tiktok' | 'instagram';
}

export function cleanVideoUrl(videoUrl: string): VideoUrlResult {
	// Normalize URL
	let url: URL;
	try {
		url = new URL(videoUrl);
		url.search = '';
	} catch {
		throw new Error(`Invalid video URL format: ${videoUrl}`);
	}

	const cleanUrl = url.toString();

	// Determine platform
	let platform: 'tiktok' | 'instagram';
	if (url.hostname.includes('tiktok.com')) {
		platform = 'tiktok';
	} else if (url.hostname.includes('instagram.com')) {
		platform = 'instagram';
	} else {
		throw new Error(`Unsupported platform: ${url.hostname}`);
	}

	return {
		cleanUrl,
		platform
	};
}

export function formatVideoUrlForDisplay(videoUrl: string): string {
	try {
		const url = new URL(videoUrl);
		let hostname = url.hostname;

		// Remove 'www.' prefix if present
		hostname = hostname.replace(/^www\./, '');

		// Combine hostname and pathname
		return hostname + url.pathname;
	} catch {
		// If URL parsing fails, return the original URL
		return videoUrl;
	}
}
