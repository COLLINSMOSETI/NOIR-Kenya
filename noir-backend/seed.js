// Populates the database with starter products so the site isn't empty on
// first run. These use the line-art placeholder images already in /uploads.
// Replace them any time from the admin panel at /admin — uploading a new
// image for a product (or a brand new product) automatically deletes the
// placeholder and resizes your photo to match.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const db = require("./db");

const products = [
  ["Tailored Wool Coat", "clothes", 8500, 6, "coat-01.svg", "Structured double-breasted coat in charcoal wool blend."],
  ["Classic Oxford Shirt", "clothes", 2800, 15, "shirt-01.svg", "Crisp cotton oxford shirt, tailored fit."],
  ["Silk Slip Dress", "clothes", 5200, 8, "dress-01.svg", "Bias-cut silk dress with a fluid drape."],
  ["Cropped Denim Jacket", "clothes", 4300, 10, "jacket-01.svg", "Cropped jacket in washed denim with patch pockets."],
  ["Merino Knit Sweater", "clothes", 3600, 12, "sweater-01.svg", "Ribbed merino wool sweater, relaxed fit."],
  ["Single-Breasted Blazer", "clothes", 7200, 5, "blazer-01.svg", "Sharp tailored blazer for evening and office wear."],
  ["Minimal Leather Sneakers", "shoes", 5800, 9, "sneaker-01.svg", "Low-top leather sneakers in off-white."],
  ["Pointed Stiletto Heels", "shoes", 4900, 7, "heel-01.svg", "Sleek pointed-toe heels, 9cm stiletto."],
  ["Suede Penny Loafers", "shoes", 5400, 6, "loafer-01.svg", "Classic penny loafers in soft suede."],
  ["Leather Chelsea Boots", "shoes", 6700, 8, "boot-01.svg", "Ankle-height Chelsea boots with elastic side panels."],
  ["Full-Grain Leather Belt", "accessories", 2200, 14, "belt-01.svg", "Hand-finished leather belt with a brushed buckle."],
  ["Classic Sunglasses", "accessories", 3100, 11, "sunglasses-01.svg", "Acetate frame sunglasses with UV protection."],
  ["Canvas Tote Bag", "accessories", 2600, 13, "tote-01.svg", "Heavy canvas tote, reinforced handles and base."],
  ["Minimalist Watch", "accessories", 6200, 7, "watch-01.svg", "Slim stainless steel watch with a leather strap."],
];

async function imagePath(filename) {
  const file = path.join(__dirname, "uploads", filename);
  const { error } = await db.supabase.storage.from("product-images").upload(filename, fs.readFileSync(file), { contentType: "image/svg+xml", upsert: true });
  if (error) throw error;
  return db.supabase.storage.from("product-images").getPublicUrl(filename).data.publicUrl;
}

(async () => {
  const existing = await db.countProducts();
  if (existing > 0) {
    console.log(`Database already has ${existing} product(s) - skipping seed.`);
    return;
  }
  for (const [name, category, price_kes, stock, filename, description] of products) {
    await db.insertProduct({ name, category, price_kes, stock, description, image_path: await imagePath(filename) });
  }
  console.log(`Seeded ${products.length} demo products.`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
