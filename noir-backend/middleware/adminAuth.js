// Very lightweight protection for the admin endpoints: every admin request
// must include the header "x-admin-password" matching ADMIN_PASSWORD in .env.
// The admin panel asks for the password once and stores it in the browser's
// localStorage, then sends it on every request.
function adminAuth(req, res, next) {
  const supplied = req.header("x-admin-password") || "";
  const expected = process.env.ADMIN_PASSWORD || "";

  if (!expected) {
    return res.status(500).json({
      error: "Server misconfigured: set ADMIN_PASSWORD in backend/.env",
    });
  }

  if (supplied !== expected) {
    return res.status(401).json({ error: "Incorrect admin password" });
  }

  next();
}

module.exports = adminAuth;
