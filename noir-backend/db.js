const path = require("path");
const Database = require("better-sqlite3");
const { createClient } = require("@supabase/supabase-js");

const useSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = useSupabase
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

let sqlite;
if (!useSupabase) {
  sqlite = new Database(path.join(__dirname, "noir.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL,
      description TEXT DEFAULT '', price_kes INTEGER NOT NULL, stock INTEGER NOT NULL DEFAULT 0,
      image_path TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, product_name TEXT, amount_kes INTEGER,
      phone TEXT, checkout_request_id TEXT, merchant_request_id TEXT, status TEXT DEFAULT 'PENDING',
      result_description TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function check(error) {
  if (error) throw new Error(error.message || "Supabase request failed");
}

async function listProducts(category) {
  if (!useSupabase) return category
    ? sqlite.prepare("SELECT * FROM products WHERE category = ? ORDER BY created_at DESC").all(category)
    : sqlite.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
  let query = supabase.from("products").select("*").order("created_at", { ascending: false });
  if (category) query = query.eq("category", category);
  const { data, error } = await query;
  check(error);
  return data;
}

async function getProduct(id) {
  if (!useSupabase) return sqlite.prepare("SELECT * FROM products WHERE id = ?").get(id);
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  check(error);
  return data;
}

async function insertProduct(product) {
  if (!useSupabase) {
    const result = sqlite.prepare(`INSERT INTO products (name, category, description, price_kes, stock, image_path) VALUES (?, ?, ?, ?, ?, ?)`).run(product.name, product.category, product.description, product.price_kes, product.stock, product.image_path);
    return getProduct(result.lastInsertRowid);
  }
  const { data, error } = await supabase.from("products").insert(product).select().single();
  check(error);
  return data;
}

async function updateProduct(id, product) {
  if (!useSupabase) {
    sqlite.prepare(`UPDATE products SET name = ?, category = ?, description = ?, price_kes = ?, stock = ?, image_path = ? WHERE id = ?`).run(product.name, product.category, product.description, product.price_kes, product.stock, product.image_path, id);
    return getProduct(id);
  }
  const { data, error } = await supabase.from("products").update(product).eq("id", id).select().single();
  check(error);
  return data;
}

async function updateStock(id, stock) {
  if (!useSupabase) {
    sqlite.prepare("UPDATE products SET stock = ? WHERE id = ?").run(stock, id);
    return getProduct(id);
  }
  const { data, error } = await supabase.from("products").update({ stock }).eq("id", id).select().single();
  check(error);
  return data;
}

async function deleteProduct(id) {
  if (!useSupabase) return sqlite.prepare("DELETE FROM products WHERE id = ?").run(id);
  const { error } = await supabase.from("products").delete().eq("id", id);
  check(error);
}

async function insertOrder(order) {
  if (!useSupabase) return sqlite.prepare(`INSERT INTO orders (product_id, product_name, amount_kes, phone, checkout_request_id, merchant_request_id, status) VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`).run(order.product_id, order.product_name, order.amount_kes, order.phone, order.checkout_request_id, order.merchant_request_id);
  const { error } = await supabase.from("orders").insert(order);
  check(error);
}

async function updateOrderStatus(checkoutRequestId, status, resultDescription) {
  if (!useSupabase) return sqlite.prepare("UPDATE orders SET status = ?, result_description = ? WHERE checkout_request_id = ?").run(status, resultDescription, checkoutRequestId);
  const { error } = await supabase.from("orders").update({ status, result_description: resultDescription }).eq("checkout_request_id", checkoutRequestId);
  check(error);
}

async function getOrder(checkoutRequestId) {
  if (!useSupabase) return sqlite.prepare("SELECT * FROM orders WHERE checkout_request_id = ?").get(checkoutRequestId);
  const { data, error } = await supabase.from("orders").select("*").eq("checkout_request_id", checkoutRequestId).maybeSingle();
  check(error);
  return data;
}

async function countProducts() {
  if (!useSupabase) return sqlite.prepare("SELECT COUNT(*) AS c FROM products").get().c;
  const { count, error } = await supabase.from("products").select("id", { count: "exact", head: true });
  check(error);
  return count;
}

module.exports = { listProducts, getProduct, insertProduct, updateProduct, updateStock, deleteProduct, insertOrder, updateOrderStatus, getOrder, countProducts, supabase, useSupabase };
