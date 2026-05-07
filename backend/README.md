# Cafe Maza Backend

This branch contains backend-only code for Cafe Maza.

## Stack

- Node.js + Express
- MongoDB + Mongoose
- Socket.IO
- JWT auth
- Razorpay + MSG91 integrations

## Project Structure

- `src/` main backend app code
- `scripts/` utilities and migration scripts
- `TESTING_GUIDE.md` backend testing guidance

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Set required values in `.env`:

- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `FRONTEND_URL`
- payment/messaging keys as needed

4. Run development server:

```bash
npm run dev
```

5. Run production mode:

```bash
npm start
```

## Notes

- This branch intentionally excludes frontend application code.
- Never commit real secrets to git.
