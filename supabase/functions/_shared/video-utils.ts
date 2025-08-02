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
