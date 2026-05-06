# Cafe Maza Frontend

This branch contains frontend-only code for the Cafe Maza web application.

## Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Supabase client SDK

## Project Structure

- `app/` routes and pages
- `components/` UI and feature components
- `data/` static/mock data used by UI
- `lib/` frontend utilities
- `public/` static assets

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create local environment file:

```bash
cp .env.example .env.local
```

3. Start development server:

```bash
npm run dev
```

4. Open:

`http://localhost:3000`

## Build

```bash
npm run build
npm run start
```

## Notes

- This branch intentionally excludes backend services and server runtime code.
- Keep secrets only in `.env.local` (never commit real credentials).
