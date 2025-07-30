## Grow a Video

Inspired by Grow a Garden, this project is a web / app based game where you invest "money" into vieos. Each videos' values go up by how popular it is. Just like planting seeds.

The less popular the video, the cheaper it is to invest. If it blows up and you sell, you get big profit.

Meanwhile, videos from popular creators may be more expensive to buy in, but it guarantees you stable growth. Perfect for long term investment.

--- 

## Development
1. Setup a Supabase project and acquire the Supabase URL and Anon Key
2. Enable magic link authentication and setup the email link to use `{.RedirectTo}/auth/callback`
3. Setup the `.env` file


Finally run
```bash
pnpm install
pnpx supabase functions deploy
	
# Start the web frontend
pnpm dev
```
	
## Support the project (and me)
You can supoprt the development on the [Kofi Page](https://ko-fi.com/patatobit)!