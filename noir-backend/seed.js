// Populates the database with starter products so the site isn't empty on
// first run. These use the line-art placeholder images already in /uploads.
// Replace them any time from the admin panel at /admin — uploading a new
// image for a product (or a brand new product) automatically deletes the
// placeholder and resizes your photo to match.
require("dotenv").config();
const db = require("./db");

const products = [
  { name: "Tailored Wool Coat", category: "clothes", price_kes: 8500, stock: 6, image_path: "/uploads/coat-01.svg", description: "Structured double-breasted coat in charcoal wool blend." },
  { name: "Classic Oxford Shirt", category: "clothes", price_kes: 2800, stock: 15, image_path: "/uploads/shirt-01.svg", description: "Crisp cotton oxford shirt, tailored fit." },
  { name: "Silk Slip Dress", category: "clothes", price_kes: 5200, stock: 8, image_path: "/uploads/dress-01.svg", description: "Bias-cut silk dress with a fluid drape." },
  { name: "Cropped Denim Jacket", category: "clothes", price_kes: 4300, stock: 10, image_path: "/uploads/jacket-01.svg", description: "Cropped jacket in washed denim with patch pockets." },
  { name: "Merino Knit Sweater", category: "clothes", price_kes: 3600, stock: 12, image_path: "/uploads/sweater-01.svg", description: "Ribbed merino wool sweater, relaxed fit." },
  { name: "Single-Breasted Blazer", category: "clothes", price_kes: 7200, stock: 5, image_path: "/uploads/blazer-01.svg", description: "Sharp tailored blazer for evening and office wear." },
  { name: "Minimal Leather Sneakers", category: "shoes", price_kes: 5800, stock: 9, image_path: "/uploads/sneaker-01.svg", description: "Low-top leather sneakers in off-white." },
  { name: "Pointed Stiletto Heels", category: "shoes", price_kes: 4900, stock: 7, image_path: "/uploads/heel-01.svg", description: "Sleek pointed-toe heels, 9cm stiletto." },
  { name: "Suede Penny Loafers", category: "shoes", price_kes: 5400, stock: 6, image_path: "/uploads/loafer-01.svg", description: "Classic penny loafers in soft suede." },
  { name: "Leather Chelsea Boots", category: "shoes", price_kes: 6700, stock: 8, image_path: "/uploads/boot-01.svg", description: "Ankle-height Chelsea boots with elastic side panels." },
  { name: "Full-Grain Leather Belt", category: "accessories", price_kes: 2200, stock: 14, image_path: "/uploads/belt-01.svg", description: "Hand-finished leather belt with a brushed buckle." },
  { name: "Classic Sunglasses", category: "accessories", price_kes: 3100, stock: 11, image_path: "/uploads/sunglasses-01.svg", description: "Acetate frame sunglasses with UV protection." },
  { name: "Canvas Tote Bag", category: "accessories", price_kes: 2600, stock: 13, image_path: "/uploads/tote-01.svg", description: "Heavy canvas tote, reinforced handles and base." },
  { name: "Minimalist Watch", category: "accessories", price_kes: 6200, stock: 7, image_path: "/uploads/watch-01.svg", description: "Slim stainless steel watch with a leather strap." },
];

const insert = db.prepare(`
  INSERT INTO products (name, category, description, price_kes, stock, image_path)
  VALUES (@name, @category, @description, @price_kes, @stock, @image_path)
`);

const existing = db.prepare("SELECT COUNT(*) AS c FROM products").get();
if (existing.c > 0) {
  console.log(`Database already has ${existing.c} product(s) - skipping seed. Delete noir.db to reseed from scratch.`);
} else {
  const insertMany = db.transaction((rows) => rows.forEach((r) => insert.run(r)));
  insertMany(products);
  console.log(`Seeded ${products.length} demo products.`);
}
