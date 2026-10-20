(function () {
  "use strict";

  const OWNER_WHATSAPP = "6283182791150";
  const PRODUCTS = [
    {
      title: "VVIP Key / 1 Hari",
      price: "Rp10.000",
      features: [
        "Masa aktif 24 jam setelah aktivasi",
        "Key lisensi personal",
        "Status key dapat dicek online",
        "Panduan aktivasi",
        "Bantuan order melalui WhatsApp",
      ],
    },
    {
      title: "VVIP Key / 7 Hari",
      price: "Rp15.000",
      features: [
        "Masa aktif 7 × 24 jam setelah aktivasi",
        "Key lisensi personal",
        "Detail tanggal aktivasi dan berakhir",
        "Bantuan prioritas",
        "Pembaruan dari kanal resmi",
      ],
    },
    {
      title: "VVIP Key / 30 Hari",
      price: "Rp25.000",
      features: [
        "Masa aktif 30 × 24 jam setelah aktivasi",
        "Key lisensi personal",
        "Detail status dan tanggal berakhir",
        "VIP support",
        "Akses informasi pembaruan resmi",
      ],
    },
    {
      title: "VVIP Key / Lifetime",
      price: "Rp50.000",
      features: [
        "Akses jangka panjang",
        "Key lisensi personal",
        "Pengecekan status key online",
        "Panduan aktivasi",
        "Support owner melalui WhatsApp",
      ],
    },
  ];

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    }[char]));

  const productForCard = (card) => {
    const text = card.textContent.toLowerCase();
    return PRODUCTS.find((product) => text.includes(product.title.toLowerCase().replace("vvip key / ", ""))) ||
      PRODUCTS.find((product) => text.includes(product.title.toLowerCase())) ||
      PRODUCTS[0];
  };

  function addScriptStoreLink() {
    if (document.querySelector('[data-nixx-script-store-link]')) return;
    const navs = document.querySelectorAll('.nav-links, .mobile-links, nav');
    navs.forEach((nav) => {
      if (nav.querySelector('[data-nixx-script-store-link]')) return;
      const link = document.createElement('a');
      link.href = '#nixx-script-store';
      link.textContent = 'Script Store';
      link.dataset.nixxScriptStoreLink = 'true';
      link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('#nixx-script-store')?.scrollIntoView({behavior:'smooth', block:'start'});
      });
      nav.appendChild(link);
    });
  }

  function addObfuscatorLink() {
    document.querySelectorAll(".nav-links, .mobile-links").forEach((nav) => {
      if (nav.querySelector("[data-nixx-obfuscator-link]")) return;
      const link = document.createElement("a");
      link.href = "#nixx-lua-obfuscator";
      link.textContent = "Lua Obfus";
      link.dataset.nixxObfuscatorLink = "true";
      link.addEventListener("click", (e) => {
        e.preventDefault();
        document.querySelector("#nixx-lua-obfuscator")?.scrollIntoView({behavior:"smooth", block:"start"});
      });
      nav.appendChild(link);
    });
  }

  function addNavLink() {
    document.querySelectorAll(".nav-links, .mobile-links").forEach((nav) => {
      if (nav.querySelector("[data-feature-license-link]")) return;
      const link = document.createElement("a");
      link.href = "#roblox-access";
      link.textContent = "Cek key";
      link.dataset.featureLicenseLink = "true";
      nav.appendChild(link);
    });
  }

  function openOrder(product) {
    closeModal();
    const backdrop = document.createElement("div");
    backdrop.className = "feature-extension feature-modal-backdrop";
    backdrop.innerHTML = `
      <div class="feature-modal" role="dialog" aria-modal="true" aria-labelledby="feature-order-title">
        <button class="feature-close" type="button" aria-label="Tutup">×</button>
        <span class="feature-eyebrow">DETAIL PRODUK</span>
        <h2 id="feature-order-title">${escapeHtml(product.title)}</h2>
        <p class="feature-price">${escapeHtml(product.price)}</p>
        <ul class="feature-list">${product.features.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        <div class="feature-form">
          <label for="feature-buyer-name">Nama / username</label>
          <input id="feature-buyer-name" autocomplete="name" placeholder="Masukkan nama atau username" required>
          <label for="feature-buyer-note">Catatan (opsional)</label>
          <input id="feature-buyer-note" placeholder="Contoh: mau proses sekarang">
          <button class="feature-submit" type="button">Lanjut ke WhatsApp ↗</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const remove = () => backdrop.remove();
    backdrop.querySelector(".feature-close").addEventListener("click", remove);
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) remove();
    });
    const nameInput = backdrop.querySelector("#feature-buyer-name");
    backdrop.querySelector(".feature-submit").addEventListener("click", () => {
      const name = nameInput.value.trim();
      const note = backdrop.querySelector("#feature-buyer-note").value.trim();
      if (!name) {
        nameInput.focus();
        return;
      }
      const message = [
        `Halo Nixx, saya mau order ${product.title} (${product.price}).`,
        `Nama/username: ${name}.`,
        note ? `Catatan: ${note}` : "",
      ].filter(Boolean).join(" ");
      window.open(`https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
      remove();
    });
    document.addEventListener("keydown", function onEscape(event) {
      if (event.key === "Escape") {
        remove();
        document.removeEventListener("keydown", onEscape);
      }
    });
    nameInput.focus();
  }

  function statusCard(data, input) {
    const status = String(data.status || (data.active ? "active" : data.code || "unknown")).toUpperCase();
    const label = ({ ACTIVE: "AKTIF", ISSUED: "BELUM AKTIF", EXPIRED: "KEDALUWARSA", REVOKED: "DICABUT" })[status] || status;
    const expiry = data.expiresAt ? new Date(data.expiresAt).toLocaleString("id-ID") : "Belum diaktifkan";
    const plan = data.planDays ? `${data.planDays} Hari` : "-";
    return `
      <div class="feature-key-result ${data.active ? "is-active" : "is-inactive"}">
        <div class="feature-key-result-head"><strong>${escapeHtml(data.message || "Status key")}</strong><b>${label}</b></div>
        <div class="feature-key-grid">
          <span>Pembeli<strong>${escapeHtml(data.customer || "-")}</strong></span>
          <span>Paket<strong>${escapeHtml(plan)}</strong></span>
          <span>Berakhir<strong>${escapeHtml(expiry)}</strong></span>
          <span>Key<strong>${escapeHtml(data.key || input)}</strong></span>
        </div>
      </div>
    `;
  }

  function insertLicenseSection() {
    if (document.querySelector("#license-check") || !document.querySelector(".products-section")) return;
    const section = document.createElement("section");
    section.id = "license-check";
    section.className = "feature-extension feature-license-section";
    section.innerHTML = `
      <div class="feature-license-wrap">
        <div>
          <span class="feature-eyebrow">LICENSE STATUS</span>
          <h2>Cek key kamu.</h2>
          <p>Masukkan key untuk melihat status dan masa aktif dari server lisensi.</p>
        </div>
        <form class="feature-license-form">
          <label for="feature-license-key">License key</label>
          <div class="feature-license-input">
            <input id="feature-license-key" placeholder="NIXX-XXXX-XXXX-XXXX" autocomplete="off" required>
            <button class="feature-submit" type="submit">Cek key</button>
          </div>
          <output class="feature-license-output" role="status"></output>
        </form>
      </div>
    `;
    document.querySelector(".products-section").insertAdjacentElement("afterend", section);
    section.querySelector("form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = section.querySelector("#feature-license-key");
      const output = section.querySelector(".feature-license-output");
      const key = input.value.trim();
      if (!key) return;
      output.innerHTML = `<div class="feature-key-loading">Memeriksa key...</div>`;
      try {
        const response = await fetch("/api/license/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        const data = await response.json();
        output.innerHTML = statusCard(data, key);
      } catch (error) {
        output.innerHTML = `<div class="feature-key-error">${escapeHtml(error.message || "API license belum tersambung.")}</div>`;
      }
    });
  }


  function insertRobloxAccessSection(){
    if(document.querySelector("#roblox-access") || !document.querySelector(".products-section")) return;
    const section=document.createElement("section");
    section.id="roblox-access";
    section.className="feature-extension feature-license-section nixx-roblox-access-section";
    section.innerHTML=`<div class="feature-license-wrap"><div><span class="feature-eyebrow">ROBLOX ACCESS</span><h2>Akses pakai username.</h2><p>Cukup masukkan username Roblox. Akses aktif 24 jam dan setelah habis bisa daftar lagi.</p><div class="nixx-access-points"><span>✓ Tanpa license key</span><span>✓ 1 akun Roblox = 1 akses aktif</span><span>✓ Reset otomatis setelah 24 jam</span></div></div><form class="feature-license-form nixx-roblox-access-form"><label for="nixx-roblox-username">Username Roblox</label><div class="feature-license-input"><input id="nixx-roblox-username" maxlength="20" autocomplete="off" placeholder="Contoh: Nixxcooll" required><button class="feature-submit" type="submit">Aktifkan Akses</button></div><output class="feature-license-output" role="status"></output></form></div>`;
    document.querySelector(".products-section").insertAdjacentElement("afterend",section);
    const form=section.querySelector("form"), input=section.querySelector("#nixx-roblox-username"), output=section.querySelector("output"), btn=section.querySelector("button");
    form.addEventListener("submit",async e=>{e.preventDefault(); const username=input.value.trim(); if(!username)return; btn.disabled=true; btn.textContent="Checking..."; output.innerHTML=`<div class="feature-key-loading">Mencari akun Roblox dan memeriksa akses...</div>`; try{const r=await fetch("/api/roblox/access",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username})}); const d=await r.json(); const exp=d.expiresAt?new Date(d.expiresAt).toLocaleString("id-ID"):"-"; output.innerHTML=`<div class="feature-key-result ${d.active?"is-active":"is-inactive"}"><div class="feature-key-result-head"><strong>${escapeHtml(d.message||"Status akses")}</strong><b>${d.active?"AKTIF":"DITOLAK"}</b></div><div class="feature-key-grid"><span>Username<strong>@${escapeHtml(d.username||username)}</strong></span><span>User ID<strong>${escapeHtml(d.userId||"-")}</strong></span><span>Berakhir<strong>${escapeHtml(exp)}</strong></span><span>Sisa<strong>${escapeHtml(formatAccessTime(d.remainingSeconds))}</strong></span></div></div>`;}catch(err){output.innerHTML=`<div class="feature-key-error">${escapeHtml(err.message||"Gagal menghubungi server.")}</div>`;}finally{btn.disabled=false;btn.textContent="Aktifkan Akses";}});
  }

  function formatAccessTime(sec){let s=Math.max(0,Math.floor(Number(sec)||0));const d=Math.floor(s/86400);s%=86400;const h=Math.floor(s/3600);s%=3600;const m=Math.floor(s/60);const x=s%60;return d?`${d}h ${h}j ${m}m`:h?`${h}j ${m}m ${x}d`:m?`${m}m ${x}d`:`${x}d`;}

  function closeModal() {
    document.querySelectorAll(".feature-modal-backdrop").forEach((modal) => modal.remove());
  }


  async function insertAnnouncement() {
    if (document.querySelector("[data-nixx-announcement]")) return;
    try {
      const response = await fetch("/api/announcement", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const a = data.announcement;
      if (!a?.enabled || !a.text) return;
      const banner = document.createElement("div");
      banner.dataset.nixxAnnouncement = "true";
      banner.className = `nixx-announcement nixx-announcement-${escapeHtml(a.type || "info")}`;
      banner.innerHTML = `<div class="nixx-announcement-inner"><span class="nixx-announcement-dot"></span><strong>NIXX NEWS</strong><span>${escapeHtml(a.text)}</span></div>`;
      document.body.prepend(banner);
    } catch (_) {}
  }

  function init() {
    addNavLink();
    addScriptStoreLink();
    addObfuscatorLink();
    insertLicenseSection();
    insertRobloxAccessSection();
    insertAnnouncement();
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.(".product-card button");
    if (button) {
      event.preventDefault();
      event.stopPropagation();
      openOrder(productForCard(button.closest(".product-card")));
    }
  }, true);

  const observer = new MutationObserver(init);
  observer.observe(document.body, { childList: true, subtree: true });
  init();
})();
// NIXXTEAM Script Product Store — rendered ABOVE the VVIP Key products.
(function initNixxScriptProductStore(){
  "use strict";
  let items=[]; let section=null; let loading=false;
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const productFingerprint=(p)=>[p.title,p.price,p.badge,p.version,p.category,p.description,p.orderLabel,p.orderUrl,p.featured?"featured":"standard",...(Array.isArray(p.features)?p.features:[])].map(x=>String(x??"").trim().toLowerCase()).join("|");
  const uniqueProducts=(list)=>{const seen=new Set();return (Array.isArray(list)?list:[]).filter(p=>{const key=productFingerprint(p);if(seen.has(key))return false;seen.add(key);return true;});};
  const safeUrl=(v)=>{try{const u=new URL(String(v||""),location.origin);return /^https?:$/.test(u.protocol)?u.href:"";}catch{return "";}};
  const waitForProducts=()=>new Promise(resolve=>{const pick=()=>document.querySelector(".products-section")||document.querySelector('section[id="produk"]');if(pick())return resolve(pick());const observer=new MutationObserver(()=>{const el=pick();if(el){observer.disconnect();resolve(el);}});observer.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>{observer.disconnect();resolve(pick());},12000);});
  async function ensureSection(){if(section?.isConnected)return section;const anchor=await waitForProducts();if(!anchor)return null;section=document.createElement("section");section.id="nixx-script-store";section.className="nixx-script-section nixx-script-products-top";section.dataset.nixxScriptStore="true";section.innerHTML=`<div class="nixx-script-inner"><div class="nixx-script-head"><div><span class="feature-eyebrow">NIXXTEAM SCRIPT PRODUCTS</span><h2>Produk SC.</h2><p>Script yang kamu upload dari Admin tampil otomatis di sini, lengkap dengan cover, harga, versi, dan detail produk.</p></div><span class="nixx-script-count">0 PRODUK</span></div><div class="nixx-script-grid"></div></div>`;anchor.insertAdjacentElement("beforebegin",section);return section;}
  function openDetail(product){document.querySelector("#nixxScriptProductModal")?.remove();const img=safeUrl(product.imageUrl);const features=Array.isArray(product.features)?product.features:[];const modal=document.createElement("div");modal.id="nixxScriptProductModal";modal.className="nixx-script-modal";modal.innerHTML=`<div class="nixx-script-modal-backdrop"></div><div class="nixx-script-modal-box"><button class="nixx-script-close" type="button">×</button>${img?`<img class="nixx-script-modal-cover" src="${esc(img)}" alt="${esc(product.title)}">`:''}<div class="nixx-script-modal-body"><span class="nixx-script-category">${esc(product.badge||product.category||"SCRIPT ROBLOX")}</span><h2>${esc(product.title)}</h2><strong class="nixx-script-modal-price">${esc(product.price)}</strong><p>${esc(product.description||"")}</p>${features.length?`<h3>Isi produk</h3><ul class="nixx-script-detail-list">${features.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:''}<div class="nixx-script-detail-meta"><span>Versi<b>${esc(product.version||"Latest")}</b></span><span>Kategori<b>${esc(product.category||"Script Roblox")}</b></span></div><div class="nixx-script-detail-actions"><a class="button button-primary" href="${esc(safeUrl(product.orderUrl)||`https://wa.me/6283182791150?text=${encodeURIComponent(`Halo Nixx, saya mau order ${product.title} (${product.price}).`)}`)}" target="_blank" rel="noopener noreferrer">${esc(product.orderLabel||"Order Sekarang")} ↗</a>${safeUrl(product.scriptUrl)?`<a class="button" href="${esc(safeUrl(product.scriptUrl))}" target="_blank" rel="noopener noreferrer">Lihat SC ↗</a>`:''}</div></div></div>`;document.body.appendChild(modal);const close=()=>modal.remove();modal.querySelector(".nixx-script-close").onclick=close;modal.querySelector(".nixx-script-modal-backdrop").onclick=close;}
  function render(){if(!section)return;section.hidden=!items.length;if(!items.length)return;section.querySelector(".nixx-script-count").textContent=`${items.length} PRODUK`;const grid=section.querySelector(".nixx-script-grid");grid.innerHTML=items.map((p,i)=>{const img=safeUrl(p.imageUrl);const feats=Array.isArray(p.features)?p.features:[];return `<article class="nixx-script-card ${p.featured?'is-featured':''}" data-index="${i}"><div class="nixx-script-media">${img?`<img class="nixx-script-cover" src="${esc(img)}" alt="${esc(p.title)}" loading="lazy">`:'<div class="nixx-script-cover nixx-script-cover-empty">NIXXTEAM</div>'}${p.featured?'<span class="nixx-featured">UNGGULAN</span>':''}</div><div class="nixx-script-body"><span class="nixx-script-category">${esc(p.badge||p.category||"SCRIPT ROBLOX")}</span><h3>${esc(p.title)}</h3><strong class="nixx-script-price">${esc(p.price)}</strong><p>${esc(p.description||"")}</p><div class="nixx-script-meta"><span>${esc(p.version||"Latest")}</span><span>${feats.length} FITUR</span></div><div class="nixx-script-actions"><button class="button nixx-detail-button" type="button">Lihat Detail</button><a class="button button-primary" href="${esc(safeUrl(p.orderUrl)||`https://wa.me/6283182791150?text=${encodeURIComponent(`Halo Nixx, saya mau order ${p.title} (${p.price}).`)}`)}" target="_blank" rel="noopener noreferrer">${esc(p.orderLabel||"Order Sekarang")} ↗</a></div></div></article>`;}).join("");grid.querySelectorAll(".nixx-detail-button").forEach(btn=>btn.addEventListener("click",()=>openDetail(items[Number(btn.closest(".nixx-script-card").dataset.index)])));}
  async function load(){if(loading)return;loading=true;try{if(!section)await ensureSection();const r=await fetch(`/api/scripts?ts=${Date.now()}`,{cache:"no-store"});if(!r.ok)return;const d=await r.json();items=uniqueProducts(d.scripts);render();}catch(_){}finally{loading=false;}}
  window.addEventListener("nixx:script-published",()=>load());load();setInterval(load,8000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)load();});
})();


// NIXX UI polish — compact reseller + light/dark toggle.
(function initNixxUiPolish(){
  "use strict";
  function compactReseller(){
    const panel=document.querySelector("#reseller .reseller-panel");
    if(!panel || panel.dataset.nixxCompactReady) return;
    const left=panel.children[0];
    if(!left) return;
    left.innerHTML=`<span class="eyebrow">03 / build your circle</span>
      <h2>Reseller Nixx.</h2>
      <p>Bangun store dan versi script kamu sendiri dalam satu paket.</p>
      <div class="nixx-mini-benefits">
        <div><b>🔑 Akses Reseller</b><span>Jual kembali akses Nixx.</span></div>
        <div><b>💻 Source Code</b><span>Edit dan kembangkan script.</span></div>
        <div><b>🛒 Web Store</b><span>Store siap dikembangkan.</span></div>
      </div>
      <div class="hero-actions"><a class="button button-dark" href="https://wa.me/6283182791150?text=${encodeURIComponent("Halo Nixx, saya mau gabung Reseller Nixx (Rp120.000).")}" target="_blank" rel="noopener noreferrer">Gabung Reseller ↗</a></div>`;
    panel.dataset.nixxCompactReady="1";
  }
  function addThemeToggle(){
    if(document.querySelector("[data-nixx-theme-toggle]")) return;
    const actions=document.querySelector(".nav-actions");
    if(!actions) return;
    const button=document.createElement("button");
    button.type="button"; button.className="nixx-theme-toggle"; button.dataset.nixxThemeToggle="1";
    button.setAttribute("aria-label","Ganti tema");
    const saved=localStorage.getItem("nixx-theme");
    const dark=saved === "dark";
    document.documentElement.classList.toggle("dark",dark);
    document.body.classList.toggle("nixx-dark",dark);
    const paint=()=>{ const isDark=document.documentElement.classList.contains("dark"); button.innerHTML=isDark?"☀️":"🌙"; button.title=isDark?"Mode terang":"Mode gelap"; button.setAttribute("aria-pressed",String(isDark)); };
    button.addEventListener("click",()=>{ const isDark=!document.documentElement.classList.contains("dark"); document.documentElement.classList.toggle("dark",isDark); document.body.classList.toggle("nixx-dark",isDark); localStorage.setItem("nixx-theme",isDark?"dark":"light"); paint(); });
    actions.prepend(button); paint();
  }
  function init(){compactReseller();addThemeToggle();}
  const observer=new MutationObserver(init); observer.observe(document.body,{childList:true,subtree:true}); init();
})();
