// Backend data types
interface Investment {
	id: string | number;
	videoId: string;
	videoUrl: string;
	amount: number;
	likeCountAtInvestment: number;
	commentCountAtInvestment: number;
	investedAt: string; // ISO date string
}

interface VideoSnapshot {
	videoId: string;
	likes: number;
	comments: number;
	createdAt: string;
}
