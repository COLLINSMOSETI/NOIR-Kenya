# NOIR — Frontend

Dark, editorial storefront (plain HTML/CSS/JS, no build step) for the NOIR
boutique. Products are pulled live from the backend API and shown as
photographed pieces on colored backdrops — clothing, shoes and accessories,
no models.

## Run it

You need the **backend** running first (see `../noir-backend/README.md`).

Then just open `index.html` in a browser (double-click works — CORS is
already configured to allow this), or serve the folder with any static
server if you prefer:

```bash
npx serve .
# or
python3 -m http.server 5500
```

## Connecting to the backend

Open `config.js` and set the public Render API URL:

```js
window.NOIR_API_BASE = "https://your-render-service.onrender.com/api";
```

- While developing locally with the default backend setup, leave this as-is.
- Keep the backend URL ending in `/api`.
- Configure the same Vercel origin in the backend's `CORS_ORIGIN` variable.
- Deploy the `admin` folder separately as a second Vercel project, or serve it
  from the same Vercel project at `/admin/`. Set its `config.js` to the Render
  API URL before deploying.

## What's on the page

- **Hero** — headline, intro copy, and a visual built from your own product
  photos (no stock imagery).
- **Category tiles** (Clothing / Shoes / Accessories) — click one to jump
  straight to that filtered section of the shop, with a live item count.
- **Shop grid** with All / Clothing / Shoes / Accessories tabs, populated
  automatically from `GET /api/products`. Add, edit, restock or remove
  items from the admin panel at the deployed admin URL and they
  appear here immediately.
- **Quick view** — clicking a product's image or name (not its buttons)
  opens a detail panel with a larger photo, description, stock, and a
  **"You may also like"** row of related items from the same category —
  clicking one of those swaps the panel to that product, Jumia-style, so
  people can keep browsing without leaving the view.
- **Order via WhatsApp** — opens WhatsApp with a pre-filled message
  ("Hello NOIR, I need to order this: …") addressed to the store's number.
  Available on both product cards and inside quick view.
- **Pay with M-Pesa** — opens a small modal, takes the customer's phone
  number, and triggers a Safaricom STK push via the backend.
- Stock badges ("Only 2 left" / "Sold out") update automatically based on
  what's set in the admin panel.
- The wishlist/cart icons in the header are shown for a familiar layout but
  intentionally aren't a real cart — NOIR's checkout is per-item via
  WhatsApp or M-Pesa, so tapping them explains that instead of doing nothing.

## Customising the look

All styling lives in `css/style.css` — colors, type and layout are defined
as CSS custom properties near the top of the file (`--ink`, `--cream`,
`--accent`, etc.) if you want to adjust the palette or fonts.
