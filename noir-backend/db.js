const { createClient } = require("@supabase/supabase-js");

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function check(error) {
  if (error) throw new Error(error.message || "Supabase request failed");
}

async function listProducts(category) {
  let query = supabase.from("products").select("*").order("created_at", { ascending: false });
  if (category) query = query.eq("category", category);
  const { data, error } = await query;
  check(error);
  return data;
}

async function getProduct(id) {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  check(error);
  return data;
}

async function insertProduct(product) {
  const { data, error } = await supabase.from("products").insert(product).select().single();
  check(error);
  return data;
}

async function updateProduct(id, product) {
  const { data, error } = await supabase.from("products").update(product).eq("id", id).select().single();
  check(error);
  return data;
}

async function updateStock(id, stock) {
  const { data, error } = await supabase.from("products").update({ stock }).eq("id", id).select().single();
  check(error);
  return data;
}

async function deleteProduct(id) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  check(error);
}

async function insertOrder(order) {
  const { error } = await supabase.from("orders").insert(order);
  check(error);
}

async function updateOrderStatus(checkoutRequestId, status, resultDescription) {
  const { error } = await supabase.from("orders").update({ status, result_description: resultDescription }).eq("checkout_request_id", checkoutRequestId);
  check(error);
}

async function getOrder(checkoutRequestId) {
  const { data, error } = await supabase.from("orders").select("*").eq("checkout_request_id", checkoutRequestId).maybeSingle();
  check(error);
  return data;
}

async function countProducts() {
  const { count, error } = await supabase.from("products").select("id", { count: "exact", head: true });
  check(error);
  return count;
}

async function removeImage(filename) {
  const { error } = await supabase.storage.from("product-images").remove([filename]);
  check(error);
}

module.exports = { listProducts, getProduct, insertProduct, updateProduct, updateStock, deleteProduct, insertOrder, updateOrderStatus, getOrder, countProducts, removeImage, supabase };
