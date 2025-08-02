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
