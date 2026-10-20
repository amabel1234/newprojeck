const CONFIG = {
  whatsapp: "6283182791150",
  apiBase: "",
};

const PRODUCTS = [
  {
    id: "1d",
    durationType: "short",
    name: "NIXX VIP — 1 Hari",
    title: "1 Hari",
    price: "Rp5.000",
    days: 1,
    badge: "AKSES PEMULA",
    shortDescription: "Paket singkat untuk mencoba akses dan alur aktivasi NIXX VIP.",
    description: "Lisensi 1 hari untuk kebutuhan akses sementara. Setelah pembayaran diverifikasi admin, kamu mendapatkan key personal dengan masa aktif 24 jam sejak pertama kali diaktifkan.",
    features: [
      "Masa aktif 24 jam setelah aktivasi",
      "Key lisensi personal",
      "Pengecekan status key melalui halaman resmi",
      "Panduan aktivasi dari admin",
      "Bantuan order melalui WhatsApp",
    ],
  },
  {
    id: "3d",
    durationType: "short",
    name: "NIXX VIP — 3 Hari",
    title: "3 Hari",
    price: "Rp10.000",
    days: 3,
    badge: "PALING HEMAT",
    popular: true,
    shortDescription: "Pilihan seimbang untuk pemakaian beberapa hari dengan harga lebih hemat.",
    description: "Lisensi 3 hari dengan key personal dan proses aktivasi yang sama seperti paket lainnya. Cocok jika kamu ingin akses lebih lama tanpa mengambil paket bulanan.",
    features: [
      "Masa aktif 72 jam setelah aktivasi",
      "Key lisensi personal",
      "Status key dapat dicek online",
      "Bantuan prioritas untuk kendala aktivasi",
      "Informasi pembaruan dari kanal resmi",
    ],
  },
  {
    id: "7d",
    durationType: "medium",
    name: "NIXX VIP — 7 Hari",
    title: "7 Hari",
    price: "Rp20.000",
    days: 7,
    badge: "AKSES MINGGUAN",
    shortDescription: "Akses mingguan untuk penggunaan yang lebih konsisten dan praktis.",
    description: "Paket mingguan dengan masa aktif 7 × 24 jam. Key dibuat khusus untuk pembeli dan dapat diperiksa kapan saja menggunakan fitur Cek Key.",
    features: [
      "Masa aktif 7 × 24 jam setelah aktivasi",
      "Key lisensi personal",
      "Detail tanggal aktivasi dan berakhir",
      "Bantuan prioritas",
      "Pembaruan dari kanal resmi",
    ],
  },
  {
    id: "30d",
    durationType: "long",
    name: "NIXX VIP — 30 Hari",
    title: "30 Hari",
    price: "Rp50.000",
    days: 30,
    badge: "PAKET BULANAN",
    shortDescription: "Paket bulanan untuk penggunaan jangka panjang dengan nilai terbaik.",
    description: "Lisensi 30 hari dengan key personal. Masa aktif dihitung dari aktivasi pertama dan detail tanggal berakhir dapat dilihat kembali melalui halaman Cek Key.",
    features: [
      "Masa aktif 30 × 24 jam setelah aktivasi",
      "Key lisensi personal",
      "Detail status dan berakhir online",
      "Bantuan VIP",
      "Akses informasi pembaruan resmi",
    ],
  },
];

const PROMO_IMAGES = [
  { src: "./assets/products/nixx-vip-01.png", title: "NIXX VIP / Showcase 01" },
  { src: "./assets/products/nixx-vip-02.jpg", title: "NIXX VIP / Showcase 02" },
  { src: "./assets/products/nixx-vip-03.png", title: "NIXX VIP / Showcase 03" },
  { src: "./assets/products/nixx-vip-04.jpg", title: "NIXX VIP / Showcase 04" },
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
}[char]));

$("#year").textContent = new Date().getFullYear();

// Lightweight ambient particles.
const particleLayer = $("#particles");
if (particleLayer) {
  for (let i = 0; i < 22; i += 1) {
    const particle = document.createElement("i");
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 5}s`;
    particle.style.animationDuration = `${5 + Math.random() * 7}s`;
    particleLayer.appendChild(particle);
  }
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.13 });
$$('.reveal').forEach((element) => revealObserver.observe(element));

function renderProducts(filter = "all") {
  const grid = $("#planGrid");
  if (!grid) return;

  const visible = PRODUCTS.filter((product) => filter === "all" || product.durationType === filter);
  grid.innerHTML = visible.map((product, index) => `
    <article class="plan reveal ${product.popular ? "plan-featured" : ""}" data-duration="${escapeHtml(product.durationType)}" data-product-id="${escapeHtml(product.id)}">
      ${product.popular ? '<span class="popular">PALING LARIS</span>' : ""}
      <span class="plan-kicker">${escapeHtml(product.badge)}</span>
      <h3>${escapeHtml(product.title)}</h3>
       <strong class="price">${escapeHtml(product.price)} <small>/ masa aktif</small></strong>
      <p>${escapeHtml(product.shortDescription)}</p>
      <ul>${product.features.slice(0, 3).map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul>
       <button class="button button-full ${product.popular ? "button-primary" : ""}" data-order data-product-id="${escapeHtml(product.id)}">Pilih paket</button>
      <button class="plan-more" type="button" data-details="${escapeHtml(product.id)}">Lihat detail lengkap →</button>
    </article>
  `).join("");

  $$(".plan.reveal", grid).forEach((element, index) => {
    element.style.animationDelay = `${index * 70}ms`;
    revealObserver.observe(element);
  });

  $$("[data-order]", grid).forEach((button) => {
    button.addEventListener("click", () => openOrder(button.dataset.productId));
  });

  $$("[data-details]", grid).forEach((button) => {
    button.addEventListener("click", () => openDetails(button.dataset.details));
  });
}

renderProducts();

$$('.filter').forEach((filter) => {
  filter.addEventListener("click", () => {
    $$('.filter').forEach((item) => item.classList.remove("active"));
    filter.classList.add("active");
    renderProducts(filter.dataset.filter);
  });
});

// Promo carousel: the four uploaded product images rotate automatically.
const promoSlides = $("#promoSlides");
const promoDots = $("#promoDots");
let promoIndex = 0;
let promoTimer;

function renderPromo() {
  if (!promoSlides || !promoDots || !PROMO_IMAGES.length) return;
  promoSlides.innerHTML = PROMO_IMAGES.map((image, index) => `
    <div class="promo-slide ${index === promoIndex ? "active" : ""}" aria-hidden="${index !== promoIndex}">
      <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.title)}" loading="${index === 0 ? "eager" : "lazy"}">
    </div>
  `).join("");
  promoDots.innerHTML = PROMO_IMAGES.map((image, index) => `
    <button type="button" class="promo-dot ${index === promoIndex ? "active" : ""}" data-promo-index="${index}" aria-label="Tampilkan ${escapeHtml(image.title)}"></button>
  `).join("");

  const product = PRODUCTS[promoIndex % PRODUCTS.length];
  if ($("#promoTitle")) $("#promoTitle").textContent = product.name;
  if ($("#promoDescription")) $("#promoDescription").textContent = product.description;
  if ($("#promoPrice")) $("#promoPrice").textContent = `Mulai ${product.price}`;
  if ($("#promoDuration")) $("#promoDuration").textContent = `${product.days} Hari`;

  $$("[data-promo-index]", promoDots).forEach((dot) => {
    dot.addEventListener("click", () => {
      promoIndex = Number(dot.dataset.promoIndex);
      renderPromo();
      restartPromoTimer();
    });
  });
}

function nextPromo(step = 1) {
  promoIndex = (promoIndex + step + PROMO_IMAGES.length) % PROMO_IMAGES.length;
  renderPromo();
}
function restartPromoTimer() {
  clearInterval(promoTimer);
  promoTimer = setInterval(() => nextPromo(1), 5000);
}

$("#promoPrev")?.addEventListener("click", () => { nextPromo(-1); restartPromoTimer(); });
$("#promoNext")?.addEventListener("click", () => { nextPromo(1); restartPromoTimer(); });
renderPromo();
restartPromoTimer();

const modal = $("#orderModal");
let selected = PRODUCTS[0];

function openOrder(productId) {
  selected = PRODUCTS.find((product) => product.id === productId) || PRODUCTS[0];
  $("#selectedPlan").textContent = selected.name;
  $("#selectedPrice").textContent = selected.price;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  $("#buyerName").focus();
}

function closeModal() {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}

$("#closeModal").addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});

$("#continueOrder").addEventListener("click", () => {
  const name = $("#buyerName").value.trim() || "belum diisi";
  const note = $("#buyerNote").value.trim();
  const message = [
    `Halo admin NIXX, saya ingin order ${selected.name} (${selected.price}).`,
    `Nama/username: ${name}.`,
    note ? `Catatan: ${note}` : "",
  ].filter(Boolean).join(" ");
  window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
});

function openDetails(productId) {
  const product = PRODUCTS.find((item) => item.id === productId);
  if (!product) return;
  const features = product.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("");
  const details = document.createElement("div");
  details.className = "product-detail-backdrop";
  details.innerHTML = `
    <div class="product-detail" role="dialog" aria-modal="true" aria-label="Detail ${escapeHtml(product.name)}">
      <button class="close product-detail-close" type="button" aria-label="Tutup">×</button>
      <span class="section-number">DETAIL PAKET</span>
      <h2>${escapeHtml(product.name)}</h2>
      <p class="product-detail-description">${escapeHtml(product.description)}</p>
      <div class="product-detail-price"><b>${escapeHtml(product.price)}</b><span>${product.days} hari akses</span></div>
      <h3>Yang termasuk</h3>
      <ul class="product-detail-features">${features}</ul>
      <button class="button button-primary button-full" type="button" data-detail-order>Pilih paket ↗</button>
    </div>
  `;
  document.body.appendChild(details);
  const remove = () => details.remove();
  $(".product-detail-close", details).addEventListener("click", remove);
  details.addEventListener("click", (event) => { if (event.target === details) remove(); });
  $("[data-detail-order]", details).addEventListener("click", () => { remove(); openOrder(product.id); });
}

$("#licenseForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const output = $("#licenseResult");
  const key = $("#licenseKey").value.trim();
  if (!key) return;
  output.innerHTML = `<div class="license-loading">Sedang memeriksa key...</div>`;

  try {
    const response = await fetch(`${CONFIG.apiBase}/api/license/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`Respons server tidak valid (HTTP ${response.status}).`); }

    if (!data.active && data.code !== "EXPIRED" && data.code !== "REVOKED") {
      output.innerHTML = `<div class="license-error">${escapeHtml(data.message || "Key tidak ditemukan.")}</div>`;
      return;
    }

    const status = String(data.status || (data.active ? "active" : data.code === "EXPIRED" ? "expired" : "revoked")).toUpperCase();
    const statusText = ({
      ACTIVE: "AKTIF",
      ISSUED: "BELUM AKTIF",
      EXPIRED: "KEDALUWARSA",
      REVOKED: "DICABUT",
    })[status] || status;
    const statusClass = status === "ACTIVE" ? "is-active" : status === "ISSUED" ? "is-issued" : "is-expired";
    const plan = Number(data.planDays) === 1 ? "1 Hari" : `${Number(data.planDays) || 0} Hari`;
    const fmt = (value) => value ? `${new Date(value).toLocaleString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} WIB` : "Belum diaktifkan";
    const duration = (seconds) => {
      if (!Number.isFinite(seconds) || seconds <= 0) return "0 Menit";
      const d = Math.floor(seconds / 86400), h = Math.floor((seconds % 86400) / 3600), m = Math.floor((seconds % 3600) / 60);
      return [d ? `${d} Hari` : "", h ? `${h} Jam` : "", m ? `${m} Menit` : ""].filter(Boolean).join(" ") || "< 1 Menit";
    };

    output.innerHTML = `
      <div class="license-detail ${statusClass}">
        <div class="license-detail-head"><div><span>DETAIL LISENSI</span><strong>${escapeHtml(data.message || "Status lisensi")}</strong></div><b class="license-status">● ${statusText}</b></div>
        <div class="license-detail-grid">
          <div><small>👤 Pembeli</small><b>${escapeHtml(data.customer || "-")}</b></div>
          <div><small>🔑 Kunci Lisensi</small><b class="license-key-value">${escapeHtml(data.key || key.toUpperCase())}</b></div>
          <div><small>📦 Paket</small><b>${plan}</b></div>
          <div><small>📅 Dibeli</small><b>${fmt(data.createdAt)}</b></div>
          <div><small>🕐 Diaktifkan</small><b>${fmt(data.activatedAt)}</b></div>
          <div><small>⏳ Masa Aktif</small><b>${data.active ? duration(data.remainingSeconds) : plan}</b></div>
          <div class="license-detail-wide"><small>📆 ${data.active ? "Aktif Sampai" : "Berakhir"}</small><b>${fmt(data.expiresAt)}</b></div>
        </div>
      </div>`;
  } catch (error) {
    output.innerHTML = `<div class="license-error">${escapeHtml(error.message || "API lisensi belum tersambung. Coba lagi setelah backend aktif.")}</div>`;
  }
});
