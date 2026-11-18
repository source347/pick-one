# Pick One

**The easiest way to make decisions together.**

Pick One is a free, open-source group polling app. Create a question, add options, share one link, and let everyone vote. No account is required.

## Features

- Create a poll with 2–8 options
- Shareable poll URLs
- Anonymous voting with one vote per browser identity
- Live-ish results (the page refreshes results every five seconds)
- Responsive, mobile-first interface
- No user accounts or tracking by default

## Stack

- Next.js 15, React 19, TypeScript
- Supabase (Postgres + RPC functions)
- CSS, no component library

## Run locally

Requirements: Node.js 20.9+ and a Supabase project.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project at [supabase.com](https://supabase.com).

3. In the Supabase SQL Editor, run the contents of [supabase/schema.sql](supabase/schema.sql).

4. Copy `.env.example` to `.env.local` and fill in the project URL and anon key from Supabase → Project Settings → API.

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

## Deploy

Deploy the repository to [Vercel](https://vercel.com/) or another Next.js host. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables, then deploy. Run the SQL schema once in the Supabase project before sharing the app.

## Security and privacy notes

- Polls and aggregate results are publicly readable by design: anyone with a poll URL can view them.
- The database stores a random browser identifier to enforce one vote per browser identity. It is not a verified identity; clearing browser storage or switching devices can create another vote.
- The public client uses only the Supabase anon key. Never expose a service-role key in frontend code.
- The included SQL functions validate poll options and enforce a unique vote per poll/browser identifier. For a high-traffic public launch, add rate limiting, automated abuse detection, poll expiration/deletion controls, and a privacy review.

## Project status

Early MVP. Contributions, bug reports, and accessibility feedback are welcome.

## License

MIT. See [LICENSE](LICENSE).