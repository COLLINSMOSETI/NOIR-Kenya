const multer = require("multer");
const sharp = require("sharp");
const crypto = require("crypto");
const { supabase } = require("../db");

// Standard dimensions so every product image on the site is the same size,
// no matter what size photo the admin uploads. Matches the placeholder art
// already shipped in /uploads.
const DIMENSIONS = {
  clothes: { width: 1000, height: 1250 }, // portrait, 4:5 - matches hanger illustrations
  mens_clothing: { width: 1000, height: 1250 },
  womens_clothing: { width: 1000, height: 1250 },
  shoes: { width: 1000, height: 1000 }, // square
  accessories: { width: 1000, height: 1000 }, // square
};

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

// Keep the file in memory first; we don't know the target size until we
// read req.body.category, which multer only gives us once parsing is done.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES }, // 12MB raw upload cap
  fileFilter: (req, file, cb) => {
    const ok = ACCEPTED_IMAGE_TYPES.has(file.mimetype);
    cb(ok ? null : new Error("Only JPG, PNG, WEBP or GIF images are allowed"), ok);
  },
});

/**
 * Resizes the uploaded image (req.file.buffer) to match the standard
 * dimensions for its category, writes it to /uploads as a .webp file,
 * and sets req.processedImagePath to the public path (e.g. "/uploads/xyz.webp").
 * Call this AFTER upload.single('image') in the route chain.
 */
async function resizeAndSave(req, res, next) {
  try {
    if (!req.file) return next(); // allow updates that don't change the image
    const category = (req.body.category || "clothes").toLowerCase();
    const dims = DIMENSIONS[category] || DIMENSIONS.clothes;

    const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.webp`;

    const image = sharp(req.file.buffer)
      .resize(dims.width, dims.height, {
        fit: "cover", // crop to exactly match existing product image dimensions
        position: "centre",
      })
      .flatten({ background: "#F4F1EA" })
      .webp({ quality: 88 });

    const buffer = await image.toBuffer();
    const { error } = await supabase.storage.from("product-images").upload(filename, buffer, {
      contentType: "image/webp",
      upsert: true,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("product-images").getPublicUrl(filename);
    req.processedImagePath = data.publicUrl;

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, resizeAndSave, DIMENSIONS };
