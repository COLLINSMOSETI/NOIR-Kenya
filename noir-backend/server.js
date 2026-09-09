require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");

const productsRouter = require("./routes/products");
const mpesaRouter = require("./routes/mpesa");

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5500,http://127.0.0.1:5500")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin(origin, callback) {
      // Browsers omit Origin for same-origin and local file requests.
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Allow Vercel production, preview, and branch deployments.
      if (/^https:\/\/[^/]+\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error("Origin is not allowed by CORS"));
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public config the frontend needs (WhatsApp number etc.)
app.get("/api/config", (req, res) => {
  res.json({
    whatsappNumber: process.env.WHATSAPP_NUMBER || "254703502267",
    storeName: "NOIR",
  });
});

app.use("/api/products", productsRouter);
app.use("/api/mpesa", mpesaRouter);

// Lets the admin panel verify the password on login before showing the dashboard.
const adminAuth = require("./middleware/adminAuth");
app.get("/api/admin/verify", adminAuth, (req, res) => res.json({ ok: true }));

app.get("/api/health", (req, res) => res.json({ ok: true, store: "NOIR" }));

// Fallback error handler (multer/sharp errors etc.)
app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE"
      ? "Image is too large. Maximum size is 12MB."
      : "The image upload could not be processed.";
    return res.status(400).json({ error: message });
  }
  if (err.message === "Only JPG, PNG, WEBP or GIF images are allowed") {
    return res.status(400).json({ error: err.message });
  }
  if (err.message && /unsupported image format|Input buffer contains/i.test(err.message)) {
    return res.status(400).json({ error: "The selected file is not a valid image." });
  }
  res.status(err.status || 500).json({ error: err.message || "Something went wrong" });
});

app.listen(PORT, () => {
  console.log(`NOIR backend running on http://localhost:${PORT}`);
  console.log("Admin panel:            deploy noir-frontend/admin separately");
});
