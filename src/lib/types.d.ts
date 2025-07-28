// Backend data types matching Supabase schema
interface Video {
	id: string;
	video_url: string;
	platform: string | null;
	creator_handle: string | null;
	current_likes: number;
	current_comments: number;
	created_at: string;
}

interface Investment {
	id: string;
	user_id: string;
	video_id: string;
	amount: number;
	invested_at: string;
	like_count_at_investment: number;
	comment_count_at_investment: number;
	video?: Video; // Optional joined video data
}

interface VideoSnapshot {
	id: number;
	video_id: string;
	likes: number;
	comments: number;
	created_at: string;
}
