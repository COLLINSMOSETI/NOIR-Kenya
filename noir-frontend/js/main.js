// Point this at your backend. Change to your deployed API URL when you go live,
// e.g. "https://api.yournoirstore.com/api"
// Use the loopback address for local development; it avoids hosts-file
// resolution issues while keeping a single override for deployment.
const API_BASE =
  window.NOIR_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://127.0.0.1:4000/api"
    : "http://localhost:4000/api");

let WHATSAPP_NUMBER = "254703502267"; // overwritten by /api/config on load
let allProducts = [];
let currentFilter = "all";

const CATEGORY_LABELS = {
  clothes: "Clothing",
  shoes: "Shoes",
  accessories: "Accessories",
};

const grid = document.getElementById("product-grid");
const shopHeading = document.getElementById("shop-heading");
const categoryStrip = document.getElementById("category-strip");
const heroCollage = document.getElementById("hero-collage");
const heroRack = document.getElementById("hero-rack");

// ---------------- Load config + products ----------------
async function loadConfig() {
  try {
    const res = await fetch(`${API_BASE}/config`);
    const data = await res.json();
    if (data.whatsappNumber) WHATSAPP_NUMBER = data.whatsappNumber;
  } catch (err) {
    console.warn("Could not load store config, using default WhatsApp number.", err);
  }
}

async function loadProducts() {
  try {
    const res = await fetch(`${API_BASE}/products`);
    allProducts = await res.json();
    renderHero();
    renderCategoryTiles();
    renderGrid();
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<div class="empty-state">Couldn't load products right now. Make sure the NOIR backend is running at ${API_BASE}.</div>`;
  }
}

function buildPlaceholderSvg(label = "NOIR") {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1200 1500">
      <rect width="1200" height="1500" fill="#161613"/>
      <rect x="120" y="120" width="960" height="1260" rx="36" fill="#1e1e1a" stroke="#d3a75c" stroke-width="8"/>
      <circle cx="600" cy="520" r="165" fill="#f5f2ea" fill-opacity="0.1"/>
      <path d="M470 540C470 462 530 400 600 400C670 400 730 462 730 540V665H470V540Z" fill="#f5f2ea" fill-opacity="0.12"/>
      <rect x="500" y="690" width="200" height="180" rx="12" fill="#f5f2ea" fill-opacity="0.12"/>
      <text x="600" y="990" text-anchor="middle" fill="#f5f2ea" font-family="Arial, Helvetica, sans-serif" font-size="88" font-weight="700">NOIR</text>
      <text x="600" y="1060" text-anchor="middle" fill="#d3a75c" font-family="Arial, Helvetica, sans-serif" font-size="38" letter-spacing="10">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function resolveImage(pathValue) {
  if (!pathValue) return buildPlaceholderSvg();
  if (pathValue.startsWith("http")) return pathValue;
  if (pathValue.startsWith("/")) return `${new URL(API_BASE).origin}${pathValue}`;
  return new URL(pathValue, `${new URL(API_BASE).origin}/`).toString();
}

function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString("en-KE")}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

// ---------------- Hero visuals (built from real product images) ----------------
function renderHero() {
  const clothes = allProducts.filter((p) => p.category === "clothes");
  const shoesOrAcc = allProducts.filter((p) => p.category !== "clothes");

  const collageItems = clothes.slice(0, 4);
  heroCollage.innerHTML = collageItems
    .map((p) => `<img src="${resolveImage(p.image_path)}" alt="${escapeHtml(p.name)}" />`)
    .join("");

  const rackItems = (clothes.length ? clothes : allProducts).slice(0, 3);
  heroRack.innerHTML = rackItems
    .map((p) => `<img src="${resolveImage(p.image_path)}" alt="${escapeHtml(p.name)}" />`)
    .join("");
}

// ---------------- Category tile strip ----------------
function renderCategoryTiles() {
  const cats = ["clothes", "shoes", "accessories"];
  categoryStrip.innerHTML = cats
    .map((cat) => {
      const items = allProducts.filter((p) => p.category === cat);
      const cover = items[0];
      const img = cover ? resolveImage(cover.image_path) : "";
      return `
        <button class="category-tile" data-cat="${cat}">
          ${img ? `<img src="${img}" alt="${CATEGORY_LABELS[cat]}" />` : ""}
          <span class="tile-label">${CATEGORY_LABELS[cat]}</span>
          <span class="tile-count">${items.length} piece${items.length === 1 ? "" : "s"}</span>
        </button>`;
    })
    .join("");
}

// ---------------- Product grid ----------------
function stockBadge(stock) {
  if (stock <= 0) return `<span class="stock-badge out">Sold out</span>`;
  if (stock <= 3) return `<span class="stock-badge low">Only ${stock} left</span>`;
  return "";
}

function renderGrid() {
  const items = currentFilter === "all" ? allProducts : allProducts.filter((p) => p.category === currentFilter);
  shopHeading.textContent = currentFilter === "all" ? "All Products" : CATEGORY_LABELS[currentFilter];

  if (items.length === 0) {
    grid.innerHTML = `<div class="empty-state">New pieces arriving soon.</div>`;
    return;
  }

  grid.innerHTML = items.map((p) => productCardHtml(p)).join("");
}

function productCardHtml(p) {
  const soldOut = p.stock <= 0;
  const mediaClass = p.category === "clothes" ? "product-media" : "product-media square";
  return `
    <div class="product-card" data-id="${p.id}">
      <div class="${mediaClass}" data-open-quickview="${p.id}">
        <img src="${resolveImage(p.image_path)}" alt="${escapeHtml(p.name)}" loading="lazy" />
        ${stockBadge(p.stock)}
      </div>
      <div class="product-info">
        <div data-open-quickview="${p.id}">
          <div class="product-cat">${CATEGORY_LABELS[p.category] || p.category}</div>
          <div class="product-name">${escapeHtml(p.name)}</div>
          <div class="product-price">${formatKES(p.price_kes)}</div>
        </div>
        <div class="product-actions">
          <button class="action-btn whatsapp" ${soldOut ? "disabled" : ""} data-action="whatsapp" data-id="${p.id}">
            ${soldOut ? "Sold out" : "Order via WhatsApp"}
          </button>
          <button class="action-btn mpesa" ${soldOut ? "disabled" : ""} data-action="mpesa" data-id="${p.id}">
            Pay with M-Pesa
          </button>
        </div>
      </div>
    </div>`;
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll(".shop-tab").forEach((t) => t.classList.toggle("active", t.dataset.filter === filter));
  document.querySelectorAll(".main-nav button").forEach((b) => b.classList.toggle("active", b.dataset.nav === filter));
  renderGrid();
}

document.addEventListener(
  "error",
  (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) return;
    if (img.dataset.fallbackUsed === "true") return;
    img.dataset.fallbackUsed = "true";
    img.src = buildPlaceholderSvg();
  },
  true
);

document.querySelectorAll(".shop-tab").forEach((tab) => {
  tab.addEventListener("click", () => setFilter(tab.dataset.filter));
});

document.querySelectorAll(".main-nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    setFilter(btn.dataset.nav);
    document.getElementById("shop").scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

categoryStrip.addEventListener("click", (e) => {
  const tile = e.target.closest(".category-tile");
  if (!tile) return;
  setFilter(tile.dataset.cat);
  document.getElementById("shop").scrollIntoView({ behavior: "smooth", block: "start" });
});

// ---------------- Quick view modal (Jumia-style: product + related items) ----------------
const qvModal = document.getElementById("quickview-modal");
const qvImage = document.getElementById("qv-image");
const qvCategory = document.getElementById("qv-category");
const qvName = document.getElementById("qv-name");
const qvPrice = document.getElementById("qv-price");
const qvDesc = document.getElementById("qv-desc");
const qvStock = document.getElementById("qv-stock");
const qvWhatsappBtn = document.getElementById("qv-whatsapp-btn");
const qvMpesaBtn = document.getElementById("qv-mpesa-btn");
const relatedGrid = document.getElementById("related-grid");
const quickviewClose = document.getElementById("quickview-close");

let qvActiveProduct = null;

function openQuickview(productId) {
  const product = allProducts.find((p) => String(p.id) === String(productId));
  if (!product) return;
  qvActiveProduct = product;

  qvImage.src = resolveImage(product.image_path);
  qvImage.alt = product.name;
  qvCategory.textContent = CATEGORY_LABELS[product.category] || product.category;
  qvName.textContent = product.name;
  qvPrice.textContent = formatKES(product.price_kes);
  qvDesc.textContent = product.description || "";

  const soldOut = product.stock <= 0;
  qvStock.textContent = soldOut ? "Currently sold out" : product.stock <= 3 ? `Only ${product.stock} left in stock` : `${product.stock} in stock`;
  qvStock.classList.toggle("low", product.stock > 0 && product.stock <= 3);

  qvWhatsappBtn.disabled = soldOut;
  qvWhatsappBtn.textContent = soldOut ? "Sold out" : "Order via WhatsApp";
  qvMpesaBtn.disabled = soldOut;

  renderRelated(product);

  qvModal.classList.remove("hidden");
}

function renderRelated(product) {
  const related = allProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  if (related.length === 0) {
    relatedGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:24px;">No other pieces in this category yet.</div>`;
    return;
  }

  relatedGrid.innerHTML = related
    .map(
      (p) => `
      <div class="related-card" data-id="${p.id}">
        <div class="related-media"><img src="${resolveImage(p.image_path)}" alt="${escapeHtml(p.name)}" /></div>
        <div class="related-name">${escapeHtml(p.name)}</div>
        <div class="related-price">${formatKES(p.price_kes)}</div>
      </div>`
    )
    .join("");
}

relatedGrid.addEventListener("click", (e) => {
  const card = e.target.closest(".related-card");
  if (!card) return;
  openQuickview(card.dataset.id);
  document.querySelector("#quickview-modal .modal").scrollTo({ top: 0, behavior: "smooth" });
});

function closeQuickview() {
  qvModal.classList.add("hidden");
  qvActiveProduct = null;
}
quickviewClose.addEventListener("click", closeQuickview);
qvModal.addEventListener("click", (e) => {
  if (e.target === qvModal) closeQuickview();
});

qvWhatsappBtn.addEventListener("click", () => {
  if (qvActiveProduct) orderViaWhatsApp(qvActiveProduct);
});
qvMpesaBtn.addEventListener("click", () => {
  if (qvActiveProduct) openMpesaModal(qvActiveProduct);
});

// ---------------- WhatsApp ordering ----------------
function orderViaWhatsApp(product) {
  const message = `Hello NOIR, I need to order this: ${product.name} (${formatKES(product.price_kes)}).`;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener");
}

// ---------------- M-Pesa STK push modal ----------------
const modal = document.getElementById("mpesa-modal");
const modalProductName = document.getElementById("modal-product-name");
const modalPhoneInput = document.getElementById("modal-phone");
const modalPayBtn = document.getElementById("modal-pay-btn");
const modalStatus = document.getElementById("modal-status");
const modalClose = document.getElementById("modal-close");
let activeProduct = null;

function openMpesaModal(product) {
  activeProduct = product;
  modalProductName.textContent = `${product.name} — ${formatKES(product.price_kes)}`;
  modalPhoneInput.value = "";
  modalStatus.textContent = "";
  modalStatus.className = "modal-status";
  modal.classList.remove("hidden");
}

function closeMpesaModal() {
  modal.classList.add("hidden");
  activeProduct = null;
}

modalClose.addEventListener("click", closeMpesaModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeMpesaModal();
});

modalPayBtn.addEventListener("click", async () => {
  if (!activeProduct) return;
  const phone = modalPhoneInput.value.trim();
  if (!/^0?7\d{8}$|^0?1\d{8}$|^254\d{9}$/.test(phone)) {
    modalStatus.textContent = "Enter a valid Safaricom number, e.g. 0712345678";
    modalStatus.className = "modal-status error";
    return;
  }

  modalStatus.textContent = "Sending payment request to your phone…";
  modalStatus.className = "modal-status pending";
  modalPayBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/mpesa/stkpush`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        amount: activeProduct.price_kes,
        productId: activeProduct.id,
        productName: activeProduct.name,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Payment could not be started");

    modalStatus.textContent = "Check your phone and enter your M-Pesa PIN to complete payment.";
    modalStatus.className = "modal-status success";
  } catch (err) {
    modalStatus.textContent = err.message;
    modalStatus.className = "modal-status error";
  } finally {
    modalPayBtn.disabled = false;
  }
});

// ---------------- Event delegation for product cards (open quick view or run an action) ----------------
document.addEventListener("click", (e) => {
  const actionBtn = e.target.closest("[data-action]");
  if (actionBtn) {
    const product = allProducts.find((p) => String(p.id) === actionBtn.dataset.id);
    if (!product) return;
    if (actionBtn.dataset.action === "whatsapp") orderViaWhatsApp(product);
    if (actionBtn.dataset.action === "mpesa") openMpesaModal(product);
    return;
  }

  const openTrigger = e.target.closest("[data-open-quickview]");
  if (openTrigger) {
    openQuickview(openTrigger.dataset.openQuickview);
  }
});

// ---------------- Wishlist / cart placeholders ----------------
const toast = document.getElementById("toast");
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2600);
}
document.getElementById("wishlist-btn").addEventListener("click", () => {
  showToast("Wishlist isn't needed here — order directly via WhatsApp or M-Pesa on any item.");
});
document.getElementById("cart-btn").addEventListener("click", () => {
  showToast("NOIR doesn't use a cart — tap Order via WhatsApp or Pay with M-Pesa on each piece.");
});

// ---------------- Boot ----------------
(async function init() {
  await loadConfig();
  await loadProducts();
})();
