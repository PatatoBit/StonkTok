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
