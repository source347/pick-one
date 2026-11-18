# Pick One

**The easiest way to make decisions together.**

Pick One is a free, open-source group polling app. Create a question, add options, share one link, and let everyone vote. No account is required.

## Features

- Create a poll with 2–8 options
- Shareable poll URLs
- Named voting: voters choose a display name and names are visible with each choice
- One case-insensitive display name per poll
- Voters can update their choice without creating a second vote
- Live-ish results (the page refreshes results every five seconds)
- Responsive, mobile-first interface
- No user accounts required

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

4. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key from Supabase → Project Settings → API.

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

## Deploy

Deploy the repository to [Vercel](https://vercel.com/). Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables, then deploy. Run the SQL schema once in the Supabase project before sharing the app.

## Security and privacy notes

- Polls and named voting results are publicly readable by design: anyone with a poll URL can see voter names and choices. Do not use this for sensitive or confidential decisions.
- A display name is not a verified identity. The database prevents the same normalized name from being used twice in one poll, but a person can choose another name or impersonate someone else.
- A browser identifier lets the same browser update its existing vote. Clearing browser storage or switching devices does not authenticate the voter; a duplicate name is rejected rather than verified.
- The public client uses only the Supabase publishable key. Never expose a service-role key in frontend code.
- For a high-traffic public launch, add server-side rate limiting, automated abuse detection, poll expiration/deletion controls, and a privacy review.

## Project status

Early MVP. Contributions, bug reports, and accessibility feedback are welcome.

## License

MIT. See [LICENSE](LICENSE).
