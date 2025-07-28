export const dummyInvestments: Investment[] = [
	{
		id: 1,
		videoId: '1234567890',
		videoUrl: 'https://www.tiktok.com/@example/video/1234567890',
		amount: 100,
		commentCountAtInvestment: 10,
		likeCountAtInvestment: 50,
		investedAt: new Date('2023-10-01T12:00:00Z').toISOString()
	},

	{
		id: 2,
		videoId: '0987654321',
		videoUrl: 'https://www.tiktok.com/@example/video/0987654321',
		amount: 200,
		commentCountAtInvestment: 20,
		likeCountAtInvestment: 100,
		investedAt: new Date('2023-10-02T12:00:00Z').toISOString()
	},

	{
		id: 3,
		videoId: '1122334455',
		videoUrl: 'https://www.tiktok.com/@example/video/1122334455',
		amount: 150,
		commentCountAtInvestment: 15,
		likeCountAtInvestment: 75,
		investedAt: new Date('2023-10-03T12:00:00Z').toISOString()
	}
];

export const dummySnapshots: VideoSnapshot[] = [
	// First video snapshots
	{
		videoId: '1234567890',
		likes: 60,
		comments: 12,
		createdAt: new Date('2023-10-01T12:00:00Z').toISOString()
	},
	{
		videoId: '1234567890',
		likes: 72,
		comments: 16,
		createdAt: new Date('2023-10-01T12:05:00Z').toISOString()
	},
	{
		videoId: '1234567890',
		likes: 110,
		comments: 22,
		createdAt: new Date('2023-10-02T12:20:00Z').toISOString()
	},
	{
		videoId: '1234567890',
		likes: 130,
		comments: 30,
		createdAt: new Date('2023-10-02T12:30:00Z').toISOString()
	},
	{
		videoId: '1234567890',
		likes: 150,
		comments: 35,
		createdAt: new Date('2023-10-03T12:40:00Z').toISOString()
	},
	{
		videoId: '1234567890',
		likes: 180,
		comments: 40,
		createdAt: new Date('2023-10-03T12:50:00Z').toISOString()
	},
	{
		videoId: '1234567890',
		likes: 200,
		comments: 50,
		createdAt: new Date('2023-10-04T13:00:00Z').toISOString()
	},
	{
		videoId: '1234567890',
		likes: 220,
		comments: 60,
		createdAt: new Date('2023-10-04T13:10:00Z').toISOString()
	},
	{
		videoId: '1234567890',
		likes: 250,
		comments: 70,
		createdAt: new Date('2023-10-05T13:20:00Z').toISOString()
	},
	{
		videoId: '1234567890',
		likes: 300,
		comments: 80,
		createdAt: new Date('2023-10-05T13:30:00Z').toISOString()
	},
	{
		videoId: '1234567890',
		likes: 350,
		comments: 90,
		createdAt: new Date('2023-10-06T13:40:00Z').toISOString()
	},
	{
		videoId: '1234567890',
		likes: 400,
		comments: 100,
		createdAt: new Date('2023-10-06T13:50:00Z').toISOString()
	},

	{
		videoId: '1234567890',
		likes: 1000,
		comments: 110,
		createdAt: new Date('2023-10-07T14:00:00Z').toISOString()
	},

	// Second video snapshots
	{
		videoId: '0987654321',
		likes: 90,
		comments: 15,
		createdAt: new Date('2023-10-02T12:00:00Z').toISOString()
	},
	{
		videoId: '0987654321',
		likes: 100,
		comments: 20,
		createdAt: new Date('2023-10-02T12:00:00Z').toISOString()
	},
	{
		videoId: '0987654321',
		likes: 120,
		comments: 25,
		createdAt: new Date('2023-10-02T12:00:00Z').toISOString()
	},

	{
		videoId: '1122334455',
		likes: 80,
		comments: 18,
		createdAt: new Date('2023-10-03T12:00:00Z').toISOString()
	}
];
