require("dotenv").config();

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const db = require("./db");

const IMAGE_DIR = path.resolve(__dirname, "..", "noir images");
const CLOTHING_WORDS = /outfit|fit|fashion|look|dress|shirt|tee|sweat|hoodie|jacket|coat|jean|denim|trouser|pants|top|sweater|cardigan|blazer|vintage|casual|style/i;
const SHOE_WORDS = /shoe|sneaker|nike|jordan|puma|vans|adidas|loafer|sandal|suede|air force|old skool|footwear/i;
const ACCESSORY_WORDS = /bag|belt|watch|sunglass|glasses|jewel|necklace|bracelet|ring|chain|cap|hat|tote/i;
const MENS_WORDS = /men|men's|mens|homme|male|gentleman/i;
const WOMENS_WORDS = /women|women's|womens|woman|female|ladies|lady|girl/i;

function titleFromFilename(filename) {
  const stem = path.basename(filename, path.extname(filename));
  return stem
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s'&]/gu, "")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase())
    .slice(0, 120) || "NOIR Collection Piece";
}

function categoryFor(filename) {
  if (SHOE_WORDS.test(filename)) return "shoes";
  if (ACCESSORY_WORDS.test(filename)) return "accessories";
  if (MENS_WORDS.test(filename)) return "mens_clothing";
  if (WOMENS_WORDS.test(filename)) return "womens_clothing";
  if (CLOTHING_WORDS.test(filename)) return "womens_clothing";
  return "womens_clothing";
}

function priceFor(category, digest) {
  const amount = parseInt(digest.slice(0, 6), 16);
  if (category === "shoes") return 4500 + (amount % 3500);
  if (category === "accessories") return 1500 + (amount % 3000);
  if (category === "mens_clothing") return 2800 + (amount % 4200);
  return 2500 + (amount % 4500);
}

function descriptionFor(category) {
  const descriptions = {
    mens_clothing: "Curated men's clothing from the NOIR collection.",
    womens_clothing: "Curated women's clothing from the NOIR collection.",
    shoes: "Statement footwear selected for everyday NOIR styling.",
    accessories: "Finishing accessories selected for the NOIR collection.",
  };
  return descriptions[category] || "Curated clothing from the NOIR collection.";
}

async function importImage(filename, existingPaths) {
  const filePath = path.join(IMAGE_DIR, filename);
  const buffer = fs.readFileSync(filePath);
  const digest = crypto.createHash("sha1").update(buffer).digest("hex");
  const storageKey = `catalog/${digest}.jpg`;
  const publicUrl = db.supabase.storage.from("product-images").getPublicUrl(storageKey).data.publicUrl;

  if (existingPaths.has(publicUrl)) return "skipped";

  const { error: uploadError } = await db.supabase.storage.from("product-images").upload(storageKey, buffer, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const category = categoryFor(filename);
  try {
    await db.insertProduct({
      name: titleFromFilename(filename),
      category,
      description: descriptionFor(category),
      price_kes: priceFor(category, digest),
      stock: 8,
      image_path: publicUrl,
    });
    existingPaths.add(publicUrl);
    return "imported";
  } catch (error) {
    await db.removeImage(storageKey).catch(() => {});
    throw error;
  }
}

(async () => {
  if (!fs.existsSync(IMAGE_DIR)) throw new Error(`Image folder not found: ${IMAGE_DIR}`);

  const files = fs.readdirSync(IMAGE_DIR)
    .filter((filename) => /\.jpe?g$/i.test(filename))
    .sort((left, right) => left.localeCompare(right));
  const existing = await db.listProducts();
  const existingPaths = new Set(existing.map((product) => product.image_path));
  let imported = 0;
  let skipped = 0;

  for (const filename of files) {
    const result = await importImage(filename, existingPaths);
    if (result === "imported") imported += 1;
    else skipped += 1;
    console.log(`${result}: ${filename}`);
  }

  console.log(`Imported ${imported} image(s); skipped ${skipped} already-imported image(s).`);
})().catch((error) => {
  console.error(error.message || error);
  if (/category|check constraint/i.test(error.message || "")) {
    console.error("Apply noir-backend/supabase/migrations/20260909_expand_clothing_categories.sql in Supabase SQL Editor, then rerun this importer.");
  }
  process.exitCode = 1;
});
