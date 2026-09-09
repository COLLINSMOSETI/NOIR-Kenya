const express = require("express");
const path = require("path");
const db = require("../db");
const adminAuth = require("../middleware/adminAuth");
const { upload, resizeAndSave } = require("../middleware/upload");

const router = express.Router();
const CATEGORIES = new Set(["clothes", "mens_clothing", "womens_clothing", "shoes", "accessories"]);

function validateProductFields(body, requireImage) {
  const name = String(body.name || "").trim();
  const category = String(body.category || "").trim().toLowerCase();
  const description = String(body.description || "").trim();
  const price = Number(body.price_kes);
  const stock = Number(body.stock);

  if (!name || name.length > 120) return "Name is required and must be 120 characters or fewer";
  if (!CATEGORIES.has(category)) return "Choose a valid product category";
  if (body.price_kes === undefined || String(body.price_kes).trim() === "") {
    return "Price is required";
  }
  if (!Number.isInteger(price) || price < 0) return "Price must be a non-negative whole number";
  if (body.stock === undefined || String(body.stock).trim() === "") return "Stock is required";
  if (!Number.isInteger(stock) || stock < 0) return "Stock must be a non-negative whole number";
  if (description.length > 1000) return "Description must be 1,000 characters or fewer";
  if (requireImage && !body.image) return "An image is required";
  return null;
}

// ---------- Public: list products (optionally filtered by category) ----------
router.get("/", async (req, res, next) => {
  try {
  const { category } = req.query;
  res.json(await db.listProducts(category));
  } catch (err) { next(err); }
});

// ---------- Public: single product ----------
router.get("/:id", async (req, res, next) => {
  try {
  const row = await db.getProduct(req.params.id);
  if (!row) return res.status(404).json({ error: "Product not found" });
  res.json(row);
  } catch (err) { next(err); }
});

// ---------- Admin: create product with image ----------
router.post("/", adminAuth, upload.single("image"), resizeAndSave, async (req, res, next) => {
  try {
    const { name, category, description = "", price_kes, stock } = req.body;

    if (!req.processedImagePath) {
      return res.status(400).json({ error: "An image is required" });
    }
    const validationError = validateProductFields(
      { ...req.body, image: req.processedImagePath },
      true
    );
    if (validationError) {
      if (req.processedImagePath) {
        await db.removeImage(path.basename(req.processedImagePath));
      }
      return res.status(400).json({ error: validationError });
    }

    const product = await db.insertProduct({ name, category, description, price_kes: Number(price_kes), stock: Number(stock) || 0, image_path: req.processedImagePath });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

// ---------- Admin: update product fields (name/price/description/category), optionally replace image ----------
router.put("/:id", adminAuth, upload.single("image"), resizeAndSave, async (req, res, next) => {
  try {
  const existing = await db.getProduct(req.params.id);
  if (!existing) return res.status(404).json({ error: "Product not found" });

  const {
    name = existing.name,
    category = existing.category,
    description = existing.description,
    price_kes = existing.price_kes,
    stock = existing.stock,
  } = req.body;

  const validationError = validateProductFields(
    { name, category, description, price_kes, stock },
    false
  );
  if (validationError) {
    if (req.processedImagePath) {
      await db.removeImage(path.basename(req.processedImagePath));
    }
    return res.status(400).json({ error: validationError });
  }

  const image_path = req.processedImagePath || existing.image_path;

  const product = await db.updateProduct(req.params.id, { name, category, description, price_kes: Number(price_kes), stock: Number(stock), image_path });

  // If a new image replaced the old one, remove the old file (skip placeholder art on first-run seed).
  if (req.processedImagePath && existing.image_path !== req.processedImagePath) {
    if (/^https?:\/\//i.test(existing.image_path)) {
      await db.removeImage(path.basename(new URL(existing.image_path).pathname));
    }
  }

  res.json(product);
  
  } catch (err) {
    next(err);
  }
});

// ---------- Admin: update stock only (quick +/- from the admin table) ----------
router.put("/:id/stock", adminAuth, async (req, res, next) => {
  try {
  const { stock } = req.body;
  if (stock === undefined || Number(stock) < 0) {
    return res.status(400).json({ error: "A valid non-negative stock number is required" });
  }
  const existing = await db.getProduct(req.params.id);
  if (!existing) return res.status(404).json({ error: "Product not found" });

  res.json(await db.updateStock(req.params.id, Number(stock)));
  } catch (err) { next(err); }
});

// ---------- Admin: delete product ----------
router.delete("/:id", adminAuth, async (req, res, next) => {
  try {
  const existing = await db.getProduct(req.params.id);
  if (!existing) return res.status(404).json({ error: "Product not found" });

  await db.deleteProduct(req.params.id);

  if (/^https?:\/\//i.test(existing.image_path)) {
    await db.removeImage(path.basename(new URL(existing.image_path).pathname));
  }

  res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
