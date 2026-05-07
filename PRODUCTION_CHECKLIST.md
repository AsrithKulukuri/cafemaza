# Cafe Maza Production Checklist

## Required Frontend Variables

Set these on the Next.js deployment:

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://your-frontend-domain.com
NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain.com
NEXT_PUBLIC_SOCKET_URL=https://your-backend-domain.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SUPABASE_MENU_BUCKET=menu-images
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
BACKEND_ORIGIN=https://your-backend-domain.com
```

`SUPABASE_SERVICE_ROLE_KEY` is required on the frontend deployment because the Next.js upload route writes admin menu images to Supabase Storage.

## Required Backend Variables

Set these on the backend deployment:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=strong_32_plus_character_secret
FRONTEND_URL=https://your-frontend-domain.com
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
MSG91_AUTH_KEY=...
MSG91_INTEGRATED_NUMBER=...
```

## Supabase Storage

Create a public bucket named `menu-images`, or change `NEXT_PUBLIC_SUPABASE_MENU_BUCKET` to your bucket name.

Recommended bucket policy:

- Public read enabled for menu images.
- Uploads only through the server-side service role key.

## Socket.io Proxy

If using Nginx or another proxy, `/socket.io/` must support WebSocket upgrades:

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_http_version 1.1;
```

## Verification

After deploy:

```bash
npm run build
pm2 status
pm2 logs
```

Then test:

- Admin login with a fresh token.
- Admin menu image upload.
- Menu page image fallback.
- Kitchen/admin/order tracking live updates.
