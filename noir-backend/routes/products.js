const express = require("express");
const fs = require("fs");
const path = require("path");
const db = require("../db");
const adminAuth = require("../middleware/adminAuth");
const { upload, resizeAndSave, UPLOAD_DIR } = require("../middleware/upload");

const router = express.Router();
const CATEGORIES = new Set(["clothes", "shoes", "accessories"]);

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
router.get("/", (req, res) => {
  const { category } = req.query;
  const rows = category
    ? db.prepare("SELECT * FROM products WHERE category = ? ORDER BY created_at DESC").all(category)
    : db.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
  res.json(rows);
});

// ---------- Public: single product ----------
router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Product not found" });
  res.json(row);
});

// ---------- Admin: create product with image ----------
router.post("/", adminAuth, upload.single("image"), resizeAndSave, (req, res) => {
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
        fs.unlink(path.join(UPLOAD_DIR, path.basename(req.processedImagePath)), () => {});
      }
      return res.status(400).json({ error: validationError });
    }

    const info = db
      .prepare(
        `INSERT INTO products (name, category, description, price_kes, stock, image_path)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(name, category, description, Number(price_kes), Number(stock) || 0, req.processedImagePath);

    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create product" });
  }
});

// ---------- Admin: update product fields (name/price/description/category), optionally replace image ----------
router.put("/:id", adminAuth, upload.single("image"), resizeAndSave, (req, res) => {
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
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
      fs.unlink(path.join(UPLOAD_DIR, path.basename(req.processedImagePath)), () => {});
    }
    return res.status(400).json({ error: validationError });
  }

  const image_path = req.processedImagePath || existing.image_path;

  db.prepare(
    `UPDATE products SET name = ?, category = ?, description = ?, price_kes = ?, stock = ?, image_path = ? WHERE id = ?`
  ).run(name, category, description, Number(price_kes), Number(stock), image_path, req.params.id);

  // If a new image replaced the old one, remove the old file (skip placeholder art on first-run seed).
  if (req.processedImagePath && existing.image_path !== req.processedImagePath) {
    const oldFile = path.join(UPLOAD_DIR, path.basename(existing.image_path));
    fs.unlink(oldFile, () => {});
  }

  res.json(db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id));
});

// ---------- Admin: update stock only (quick +/- from the admin table) ----------
router.put("/:id/stock", adminAuth, (req, res) => {
  const { stock } = req.body;
  if (stock === undefined || Number(stock) < 0) {
    return res.status(400).json({ error: "A valid non-negative stock number is required" });
  }
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Product not found" });

  db.prepare("UPDATE products SET stock = ? WHERE id = ?").run(Number(stock), req.params.id);
  res.json(db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id));
});

// ---------- Admin: delete product ----------
router.delete("/:id", adminAuth, (req, res) => {
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Product not found" });

  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);

  const filePath = path.join(UPLOAD_DIR, path.basename(existing.image_path));
  fs.unlink(filePath, () => {}); // best-effort cleanup, ignore if already gone

  res.json({ success: true });
});

module.exports = router;
