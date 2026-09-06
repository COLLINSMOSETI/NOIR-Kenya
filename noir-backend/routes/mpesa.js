const express = require("express");
const axios = require("axios");
const db = require("../db");

const router = express.Router();

const BASE_URL = () =>
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

// Turns "0703502267" / "+254703502267" / "254703502267" into "254703502267"
function normalizePhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") || digits.startsWith("1")) return `254${digits}`;
  return digits;
}

function timestampNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

async function getAccessToken() {
  const { MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET } = process.env;
  if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET || MPESA_CONSUMER_KEY === "your_consumer_key") {
    throw new Error(
      "M-Pesa is not configured yet. Add MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET (and the other MPESA_ vars) to backend/.env — see .env.example."
    );
  }
  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");
  const { data } = await axios.get(`${BASE_URL()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  return data.access_token;
}

// ---------- Initiate an STK push (sends a "Enter M-Pesa PIN" prompt to the customer's phone) ----------
router.post("/stkpush", async (req, res) => {
  try {
    const { phone, amount, productId, productName } = req.body;
    if (!phone || !amount) {
      return res.status(400).json({ error: "phone and amount are required" });
    }

    const phoneNumber = normalizePhone(phone);
    if (!/^2547\d{8}$|^2541\d{8}$/.test(phoneNumber)) {
      return res.status(400).json({ error: "Enter a valid Safaricom number, e.g. 0712345678" });
    }

    const { MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_URL } = process.env;
    const accessToken = await getAccessToken();
    const timestamp = timestampNow();
    const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString("base64");

    const payload = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(Number(amount)),
      PartyA: phoneNumber,
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: phoneNumber,
      CallBackURL: MPESA_CALLBACK_URL,
      AccountReference: "NOIR",
      TransactionDesc: productName ? `NOIR order - ${productName}` : "NOIR order",
    };

    const { data } = await axios.post(`${BASE_URL()}/mpesa/stkpush/v1/processrequest`, payload, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    db.prepare(
      `INSERT INTO orders (product_id, product_name, amount_kes, phone, checkout_request_id, merchant_request_id, status)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`
    ).run(productId || null, productName || null, Math.round(Number(amount)), phoneNumber, data.CheckoutRequestID, data.MerchantRequestID);

    res.json({
      success: true,
      message: "STK push sent. Check your phone and enter your M-Pesa PIN to complete payment.",
      checkoutRequestId: data.CheckoutRequestID,
    });
  } catch (err) {
    const daraja = err.response?.data;
    console.error("STK push error:", daraja || err.message);
    res.status(500).json({
      error: daraja?.errorMessage || err.message || "Could not initiate M-Pesa payment",
    });
  }
});

// ---------- Safaricom calls this URL with the payment result ----------
router.post("/callback", (req, res) => {
  try {
    const stk = req.body?.Body?.stkCallback;
    if (stk) {
      const status = stk.ResultCode === 0 ? "SUCCESS" : "FAILED";
      db.prepare(
        `UPDATE orders SET status = ?, result_description = ? WHERE checkout_request_id = ?`
      ).run(status, stk.ResultDesc, stk.CheckoutRequestID);
      console.log(`M-Pesa callback: ${stk.CheckoutRequestID} -> ${status} (${stk.ResultDesc})`);
    }
  } catch (err) {
    console.error("Error handling M-Pesa callback:", err);
  }
  // Safaricom just needs a 200 acknowledging receipt
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

// ---------- Admin: check status of an order by CheckoutRequestID ----------
router.get("/status/:checkoutRequestId", (req, res) => {
  const order = db
    .prepare("SELECT * FROM orders WHERE checkout_request_id = ?")
    .get(req.params.checkoutRequestId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});

module.exports = router;
