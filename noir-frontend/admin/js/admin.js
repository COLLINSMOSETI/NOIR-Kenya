const API_BASE =
  window.NOIR_API_BASE ||
  (window.location.protocol === "http:" || window.location.protocol === "https:"
    ? `${window.location.origin}/api`
    : "http://127.0.0.1:4000/api");
const API_ORIGIN = new URL(API_BASE).origin;

const els = {
  loginScreen: document.getElementById("login-screen"),
  dashboard: document.getElementById("dashboard"),
  passwordInput: document.getElementById("password-input"),
  loginBtn: document.getElementById("login-btn"),
  loginError: document.getElementById("login-error"),
  logoutBtn: document.getElementById("logout-btn"),
  form: document.getElementById("product-form"),
  formTitle: document.getElementById("form-title"),
  formError: document.getElementById("form-error"),
  productId: document.getElementById("product-id"),
  name: document.getElementById("f-name"),
  category: document.getElementById("f-category"),
  price: document.getElementById("f-price"),
  stock: document.getElementById("f-stock"),
  description: document.getElementById("f-description"),
  image: document.getElementById("f-image"),
  imagePreview: document.getElementById("image-preview"),
  submitBtn: document.getElementById("submit-btn"),
  cancelEditBtn: document.getElementById("cancel-edit-btn"),
  inventoryList: document.getElementById("inventory-list"),
  filterTabs: document.querySelectorAll(".filter-tab"),
};

let currentFilter = "all";
let allProducts = [];

function getPassword() {
  return localStorage.getItem("noir_admin_password") || "";
}

function authHeaders() {
  return { "x-admin-password": getPassword() };
}

// ---------- Login ----------
async function verifyPassword() {
  try {
    const res = await fetch(`${API_BASE}/admin/verify`, { headers: authHeaders() });
    return res.ok;
  } catch {
    return false;
  }
}

async function tryLogin() {
  const pw = els.passwordInput.value.trim();
  if (!pw) return;
  localStorage.setItem("noir_admin_password", pw);

  const valid = await verifyPassword();
  if (valid) {
    await fetchProducts();
    els.loginScreen.classList.add("hidden");
    els.dashboard.classList.remove("hidden");
    els.loginError.textContent = "";
  } else {
    els.loginError.textContent = "Incorrect password. Try again.";
    localStorage.removeItem("noir_admin_password");
  }
}

els.loginBtn.addEventListener("click", tryLogin);
els.passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") tryLogin();
});

els.logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("noir_admin_password");
  els.dashboard.classList.add("hidden");
  els.loginScreen.classList.remove("hidden");
});

// ---------- Load products ----------
async function fetchProducts() {
  try {
    const res = await fetch(`${API_BASE}/products`);
    if (!res.ok) return false;
    allProducts = await res.json();
    renderInventory();
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

function buildFallbackImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
      <rect width="600" height="600" fill="#161613"/>
      <rect x="60" y="60" width="480" height="480" rx="18" fill="#1e1e1a" stroke="#d3a75c" stroke-width="5"/>
      <text x="300" y="320" text-anchor="middle" fill="#f5f2ea" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="700">NOIR</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function resolveImage(imagePath) {
  if (!imagePath) return buildFallbackImage();
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  return imagePath.startsWith("/") ? `${API_ORIGIN}${imagePath}` : `${API_ORIGIN}/${imagePath}`;
}

function renderInventory() {
  const filtered =
    currentFilter === "all" ? allProducts : allProducts.filter((p) => p.category === currentFilter);

  if (filtered.length === 0) {
    els.inventoryList.innerHTML = `<p class="muted">No products yet.</p>`;
    return;
  }

  els.inventoryList.innerHTML = filtered
    .map(
      (p) => `
      <div class="inventory-row" data-id="${p.id}">
        <img src="${resolveImage(p.image_path)}" alt="${escapeHtml(p.name)}" onerror="this.onerror=null;this.src='${buildFallbackImage()}';" />
        <div class="inventory-meta">
          <div class="name">${escapeHtml(p.name)}</div>
          <div class="sub">${p.category} · stock ${p.stock}</div>
        </div>
        <div class="inventory-price">KES ${Number(p.price_kes).toLocaleString()}</div>
        <div class="stock-control">
          <input type="number" min="0" value="${p.stock}" data-role="stock-input" />
          <button data-role="save-stock">Save</button>
        </div>
        <div class="row-actions">
          <button data-role="edit">Edit</button>
          <button data-role="delete" class="delete-btn">Delete</button>
        </div>
      </div>`
    )
    .join("");

  // Wire up per-row actions
  els.inventoryList.querySelectorAll(".inventory-row").forEach((row) => {
    const id = row.dataset.id;
    const product = allProducts.find((p) => String(p.id) === id);

    row.querySelector('[data-role="save-stock"]').addEventListener("click", async () => {
      const val = row.querySelector('[data-role="stock-input"]').value;
      await updateStock(id, val);
    });

    row.querySelector('[data-role="edit"]').addEventListener("click", () => startEdit(product));
    row.querySelector('[data-role="delete"]').addEventListener("click", () => deleteProduct(id));
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

els.filterTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    els.filterTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentFilter = tab.dataset.filter;
    renderInventory();
  });
});

// ---------- Create / update product ----------
function startEdit(product) {
  els.formTitle.textContent = `Editing "${product.name}"`;
  els.productId.value = product.id;
  els.name.value = product.name;
  els.category.value = product.category;
  els.price.value = product.price_kes;
  els.stock.value = product.stock;
  els.description.value = product.description || "";
  els.image.value = "";
  els.submitBtn.textContent = "Save changes";
  els.cancelEditBtn.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

els.cancelEditBtn.addEventListener("click", resetForm);

function resetForm() {
  els.form.reset();
  els.productId.value = "";
  els.formTitle.textContent = "Add a new product";
  els.submitBtn.textContent = "Add product";
  els.cancelEditBtn.classList.add("hidden");
  els.formError.textContent = "";
  els.imagePreview.src = "";
  els.imagePreview.classList.add("hidden");
}

els.image.addEventListener("change", () => {
  const file = els.image.files[0];
  if (!file) {
    els.imagePreview.src = "";
    els.imagePreview.classList.add("hidden");
    return;
  }
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
    els.image.value = "";
    els.formError.textContent = "Choose a JPG, PNG, WEBP or GIF image.";
    return;
  }
  if (file.size > 12 * 1024 * 1024) {
    els.image.value = "";
    els.formError.textContent = "Image is too large. Maximum size is 12MB.";
    return;
  }
  els.formError.textContent = "";
  els.imagePreview.src = URL.createObjectURL(file);
  els.imagePreview.classList.remove("hidden");
});

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  els.formError.textContent = "";

  const fd = new FormData();
  fd.append("name", els.name.value.trim());
  fd.append("category", els.category.value);
  fd.append("price_kes", els.price.value);
  fd.append("stock", els.stock.value);
  fd.append("description", els.description.value.trim());
  if (els.image.files[0]) fd.append("image", els.image.files[0]);

  const id = els.productId.value;
  const isEdit = Boolean(id);

  if (!isEdit && !els.image.files[0]) {
    els.formError.textContent = "Please choose an image for the new product.";
    return;
  }
  const name = els.name.value.trim();
  const price = Number(els.price.value);
  const stock = Number(els.stock.value);
  if (!name || name.length > 120) {
    els.formError.textContent = "Name is required and must be 120 characters or fewer.";
    return;
  }
  if (!Number.isInteger(price) || price < 0) {
    els.formError.textContent = "Price must be a non-negative whole number.";
    return;
  }
  if (!Number.isInteger(stock) || stock < 0) {
    els.formError.textContent = "Stock must be a non-negative whole number.";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/products${isEdit ? `/${id}` : ""}`, {
      method: isEdit ? "PUT" : "POST",
      headers: authHeaders(),
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong");

    resetForm();
    await fetchProducts();
  } catch (err) {
    els.formError.textContent = err.message;
  }
});

async function updateStock(id, stock) {
  try {
    const res = await fetch(`${API_BASE}/products/${id}/stock`, {
      method: "PUT",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ stock: Number(stock) }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await fetchProducts();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteProduct(id) {
  if (!confirm("Delete this product? This can't be undone.")) return;
  try {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await fetchProducts();
  } catch (err) {
    alert(err.message);
  }
}

// ---------- Boot ----------
(async function init() {
  if (getPassword()) {
    const valid = await verifyPassword();
    if (valid) {
      await fetchProducts();
      els.loginScreen.classList.add("hidden");
      els.dashboard.classList.remove("hidden");
    }
  }
})();
