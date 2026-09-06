# NOIR — Backend

Node.js + Express API that powers the NOIR storefront: product catalogue, image
uploads (auto-resized to match the site), stock counts, and Safaricom M-Pesa
STK Push payments.

## 1. Install

```bash
cd noir-backend
npm install
cp .env.example .env
```

Open `.env` and set:

- `ADMIN_PASSWORD` — the password you'll use to log into `/admin`.
- `WHATSAPP_NUMBER` — already set to `254703502267` (no `+`, no spaces).
- `CORS_ORIGIN` — comma-separated frontend origins, including your Vercel URL.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — required in production for
   durable database and image storage on Supabase. Never expose the service role
   key in the frontend.
- The `MPESA_*` values — see the M-Pesa section below. The site works fine
  without these; only the "Pay with M-Pesa" button needs them.

## 2. Seed starter products (optional but recommended)

```bash
npm run seed
```

This adds 14 demo products (6 clothing items, 4 pairs of shoes, 4 accessories)
using the included placeholder artwork, so the site isn't empty. Replace any
of them from the admin panel whenever you have real product photos —
uploading a new image automatically deletes the placeholder.

## 3. Run the server

```bash
npm start
```

On Windows PowerShell, if script execution policy blocks `npm`, run `npm.cmd start` instead.

- API: `http://localhost:4000/api`
- Admin panel: `http://localhost:4000/admin` (log in with `ADMIN_PASSWORD`)
- Uploaded/seeded images: `http://localhost:4000/uploads/...`

## Image sizing

Every product image is cropped and resized on upload so the whole catalogue
stays visually consistent:

- **Clothes:** 1000×1250 (portrait)
- **Shoes:** 1000×1000 (square)
- **Accessories:** 1000×1000 (square)

You can upload any photo of any size/aspect ratio in the admin panel — it is
validated (JPG, PNG, WEBP or GIF; maximum 12MB), previewed before submission,
and automatically converted to match. Product names, categories, prices and
stock values are validated in both the browser and API.

## API reference

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/products` | — | List all products (`?category=clothes`, `?category=shoes`, or `?category=accessories` to filter) |
| GET | `/api/products/:id` | — | Get one product |
| POST | `/api/products` | admin | Create a product (multipart form: name, category, price_kes, stock, description, image) |
| PUT | `/api/products/:id` | admin | Update a product, optionally replacing its image |
| PUT | `/api/products/:id/stock` | admin | Update just the stock count |
| DELETE | `/api/products/:id` | admin | Delete a product and its image file |
| GET | `/api/config` | — | Returns the WhatsApp number the frontend should message |
| POST | `/api/mpesa/stkpush` | — | Trigger an STK push to a customer's phone |
| POST | `/api/mpesa/callback` | — | Safaricom's payment result webhook (point Daraja here) |
| GET | `/api/mpesa/status/:checkoutRequestId` | — | Check an order's payment status |

Admin routes require an `x-admin-password` header matching `ADMIN_PASSWORD`.
The admin panel handles this automatically once you log in.

## Setting up M-Pesa STK Push

1. Create an app at [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
   and get your **Consumer Key** and **Consumer Secret**.
2. For testing, use the Sandbox shortcode `174379` and the sandbox passkey
   provided in your Daraja account (also on the Daraja docs "Test Credentials" page).
3. Safaricom needs a **public HTTPS URL** to send payment results to. While
   developing locally, run `ngrok http 4000` and set
   `MPESA_CALLBACK_URL=https://<your-ngrok-id>.ngrok-free.app/api/mpesa/callback`.
4. Fill all `MPESA_*` values into `.env` and restart the server.
5. When you're ready to accept real payments, apply for a production
   shortcode/till number from Safaricom, set `MPESA_ENV=production`, and
   swap in your production credentials + a real callback URL.

Until these are filled in, tapping "Pay with M-Pesa" on the site will show a
friendly "payment isn't set up yet" message instead of failing silently.

## Deploying

### Separate Render + Vercel + Supabase deployment

1. In Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql).
2. Deploy `noir-backend` to Render as a Node web service. Set its root
   directory to `noir-backend`, build command to `npm install`, and start
   command to `npm start`. Add the values from `.env.example`, including the
   Supabase service-role key and your Vercel URL in `CORS_ORIGIN`.
3. Run `npm run seed` once against the Render environment, or run it locally
   with the production Supabase variables, to upload the starter products and
   placeholder images.
4. In `noir-frontend/config.js`, set `window.NOIR_API_BASE` to the Render API
   URL ending in `/api`, then deploy the `noir-frontend` folder to Vercel.
5. Open the Vercel site. Product changes made in the Render admin panel are
   read from Supabase whenever the storefront loads.

Any Node host works (Render, Railway, a VPS, etc.). For production:

- Set all the same environment variables from `.env` on the host.
- Use Supabase rather than the local SQLite database and `uploads/` folder;
   Render's local filesystem is ephemeral.
- Point `MPESA_CALLBACK_URL` at your real deployed domain.
- Update `CORS_ORIGIN` to your deployed frontend's URL.
