const API_BASE = "";
const TOKEN_KEY = "nixx_admin_token";
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
let currentRole = null;
let scriptItems = [];
let editingScriptId = "";

function getToken(){ return sessionStorage.getItem(TOKEN_KEY) || ""; }
function setToken(token){ sessionStorage.setItem(TOKEN_KEY, token); }
function clearToken(){ sessionStorage.removeItem(TOKEN_KEY); }
function escapeHtml(value){ return String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function formatDate(value){ const d = new Date(value); return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"}); }
async function apiJson(response){ const text = await response.text(); let data; try{ data = JSON.parse(text); }catch{ throw new Error(`API bukan JSON (HTTP ${response.status})`); } if(!response.ok) throw new Error(data.message || data.error || `HTTP ${response.status}`); return data; }
async function apiFetch(path, options={}){ const headers = new Headers(options.headers || {}); const token = getToken(); if(token) headers.set("Authorization", `Bearer ${token}`); return fetch(`${API_BASE}${path}`, {...options, headers, cache: options.cache || "no-store"}); }
function showLogin(show=true){ $("#loginScreen").classList.toggle("hidden", !show); $("#adminApp").classList.toggle("hidden", show); }
async function verifyAdmin(token){ const r = await fetch(`${API_BASE}/api/role`, {headers:{Authorization:`Bearer ${token}`},cache:"no-store"}); const data = await apiJson(r); if(data.role !== "admin") throw new Error("Token bukan ADMIN_TOKEN."); return data; }

async function boot(){ const token=getToken(); if(!token){showLogin(true);return;} try{ const data=await verifyAdmin(token); enterAdmin(data.role); }catch(error){ clearToken(); showLogin(true); $("#loginError").textContent=error.message || "Token tidak valid."; } }
function enterAdmin(role){ currentRole=role; showLogin(false); $("#roleBadge").textContent=String(role).toUpperCase(); $("#settingsRole").textContent=String(role).toUpperCase(); loadDashboard(); loadLicenses(); loadScripts(); loadAnnouncement(); }

$("#loginForm")?.addEventListener("submit", async e=>{ e.preventDefault(); const token=$("#loginToken").value.trim(); if(!token) return; const btn=e.currentTarget.querySelector("button"); $("#loginError").textContent="Memeriksa token..."; btn.disabled=true; try{ const data=await verifyAdmin(token); setToken(token); $("#loginToken").value=""; $("#loginError").textContent=""; enterAdmin(data.role); }catch(error){ $("#loginError").textContent=error.message || "Token invalid."; }finally{btn.disabled=false;} });
$("#logoutBtn")?.addEventListener("click",()=>{clearToken();currentRole=null;showLogin(true);$("#loginToken").value="";$("#loginError").textContent="";});

const pageInfo={dashboard:["Dashboard","Kontrol utama NIXX VIP."],licenses:["License Database","Generate, lihat, dan hapus license key."],scripts:["Script Products","Upload dan kelola produk SC yang tampil di storefront."],announcement:["Announcement","Atur banner pengumuman storefront."],settings:["Settings","Info session dan konfigurasi panel."]};
function goPage(page){ const info=pageInfo[page]||pageInfo.dashboard; $$(".admin-nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===page)); $$(".admin-page").forEach(p=>p.classList.toggle("active",p.id===`page-${page}`)); $("#pageTitle").textContent=info[0];$("#pageSubtitle").textContent=info[1];$("#adminSidebar").classList.remove("open"); }
$$(".admin-nav button").forEach(b=>b.addEventListener("click",()=>goPage(b.dataset.page)));
$$("[data-goto]").forEach(b=>b.addEventListener("click",()=>goPage(b.dataset.goto)));
$("#mobileToggle")?.addEventListener("click",()=>$("#adminSidebar").classList.toggle("open"));

function renderLicenses(items){ const list=$("#licenseList"); if(!items.length){list.innerHTML='<div class="item-card">Belum ada license.</div>';return;} list.innerHTML=items.map(x=>`<article class="item-card"><div class="item-head"><strong>${escapeHtml(x.key)}</strong><span class="tag">${escapeHtml(String(x.status||"unknown").toUpperCase())}</span></div><div class="item-meta"><span>Pembeli<b>${escapeHtml(x.customer||"-")}</b></span><span>Paket<b>${escapeHtml(x.planDays||"-")} Hari</b></span><span>Dibuat<b>${escapeHtml(formatDate(x.createdAt))}</b></span><span>Expired<b>${escapeHtml(formatDate(x.expiresAt))}</b></span></div><div class="form-actions">${currentRole==="admin"?`<button class="button button-danger delete-license" data-key="${escapeHtml(x.key)}" type="button">Delete</button>`:""}</div></article>`).join(""); list.querySelectorAll(".delete-license").forEach(b=>b.addEventListener("click",()=>deleteLicense(b.dataset.key,b))); }
async function loadLicenses(){ const list=$("#licenseList"); if(!list)return; list.innerHTML='<div class="item-card">Mengambil license...</div>'; try{const data=await apiJson(await apiFetch(`/api/licenses/list?ts=${Date.now()}`)); renderLicenses(Array.isArray(data.licenses)?data.licenses:[]); $("#statLicenses").textContent=Array.isArray(data.licenses)?data.licenses.length:0; $("#statActive").textContent=(data.licenses||[]).filter(x=>String(x.status).toLowerCase()==="active").length;}catch(e){list.innerHTML=`<div class="item-card">${escapeHtml(e.message)}</div>`;}}
async function deleteLicense(key,button){ if(!confirm(`Hapus key ${key}?`))return;button.disabled=true; try{await apiJson(await apiFetch("/api/licenses/delete",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({key})}));loadLicenses();}catch(e){alert(e.message);}finally{button.disabled=false;} }
$("#refreshKeys")?.addEventListener("click",loadLicenses);

$("#issueForm")?.addEventListener("submit",async e=>{e.preventDefault();const btn=e.currentTarget.querySelector("button[type=submit]");btn.disabled=true;btn.textContent="Generating...";try{const data=await apiJson(await apiFetch("/api/licenses/issue",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customer:$("#customer").value.trim(),days:Number($("#days").value)})}));$("#generatedKey").textContent=data.key;$("#result").hidden=false;$("#sendWhatsapp").href=`https://wa.me/6283182791150?text=${encodeURIComponent(`Halo, ini license key NIXX VIP kamu: ${data.key}. Paket: ${data.planDays} hari.`)}`;$("#customer").value="";loadLicenses();loadDashboard();}catch(e){alert(e.message);}finally{btn.disabled=false;btn.textContent="Generate Key ↗";}});
$("#copyKey")?.addEventListener("click",async()=>{try{await navigator.clipboard.writeText($("#generatedKey").textContent.trim());$("#copyKey").textContent="Copied ✓";setTimeout(()=>$("#copyKey").textContent="Copy Key",1500);}catch{alert("Clipboard tidak tersedia.");}});

function fileToDataUrl(file){ return new Promise((resolve,reject)=>{ if(!file)return resolve("");const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(file);}); }
function imageToDataUrl(file){
  return new Promise((resolve,reject)=>{
    if(!file)return resolve("");
    if(file.size>8_000_000)return reject(new Error("Cover maksimal 8 MB sebelum dikompres."));
    const reader=new FileReader();
    reader.onerror=reject;
    reader.onload=()=>{
      const image=new Image();
      image.onerror=()=>reject(new Error("Cover tidak bisa dibaca."));
      image.onload=()=>{
        const maxSide=1600, scale=Math.min(1,maxSide/Math.max(image.naturalWidth,image.naturalHeight));
        const canvas=document.createElement("canvas");
        canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
        canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
        canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL("image/jpeg",.82));
      };
      image.src=String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
function uniqueScriptProducts(items){
  const seen=new Set();
  return (Array.isArray(items)?items:[]).filter(item=>{
    const key=[item.title,item.price,item.badge,item.version,item.category,item.description,item.orderLabel,item.orderUrl,item.featured?"featured":"standard",...(Array.isArray(item.features)?item.features:[])].map(value=>String(value??"").trim().toLowerCase()).join("|");
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  });
}
function resetScriptForm(keepStatus=false){
  const form=$("#scriptUploadForm");
  form?.reset();
  editingScriptId="";
  $("#scriptEditId").value="";
  $("#scriptFormTitle").textContent="Upload Produk SC";
  $("#scriptSubmitButton").textContent="Publish Produk SC ↗";
  $("#cancelScriptEdit").classList.add("hidden");
  $("#scriptCoverPreview").classList.add("hidden");
  $("#scriptCoverPreview").removeAttribute("src");
  if(!keepStatus)$("#scriptUploadStatus").textContent="";
}
function startEditScript(id){
  const item=scriptItems.find(x=>x.id===id);
  if(!item)return;
  editingScriptId=id;
  $("#scriptEditId").value=id;
  $("#scriptTitle").value=item.title||"";
  $("#scriptPrice").value=item.price||"";
  $("#scriptBadge").value=item.badge||"";
  $("#scriptVersion").value=item.version||"";
  $("#scriptCategory").value=item.category||"";
  $("#scriptOrderLabel").value=item.orderLabel||"Order Sekarang";
  $("#scriptOrderUrl").value=item.orderUrl||"";
  $("#scriptDescription").value=item.description||"";
  $("#scriptFeatures").value=Array.isArray(item.features)?item.features.join("\n"):"";
  $("#scriptFeatured").checked=Boolean(item.featured);
  $("#scriptFile").value="";
  $("#scriptCover").value="";
  if(item.imageUrl){$("#scriptCoverPreview").src=item.imageUrl;$("#scriptCoverPreview").classList.remove("hidden");}
  $("#scriptFormTitle").textContent=`Edit Produk: ${item.title||"SC"}`;
  $("#scriptSubmitButton").textContent="Simpan Perubahan ↗";
  $("#cancelScriptEdit").classList.remove("hidden");
  $("#scriptUploadStatus").textContent="Mode edit aktif. File boleh dikosongkan jika tidak ingin menggantinya.";
  goPage("scripts");
  $("#scriptTitle").focus();
  window.scrollTo({top:0,behavior:"smooth"});
}
function renderScripts(items){
  scriptItems=uniqueScriptProducts(items);
  items=scriptItems;
  const list=$("#scriptAdminList");
  $("#statScripts").textContent=items.length;
  if(!items.length){list.innerHTML='<div class="item-card">Belum ada produk SC.</div>';return;}
  list.innerHTML=items.map(x=>`<article class="item-card"><div class="item-head"><div style="display:flex;gap:12px;align-items:center"><img class="admin-product-thumb" src="${escapeHtml(x.imageUrl||"")}" alt="" loading="lazy" onerror="this.classList.add('hidden')"><strong>${escapeHtml(x.title)}</strong></div><span class="tag">${escapeHtml(x.price||"HARGA")}</span></div><div class="item-meta"><span>Badge<b>${escapeHtml(x.badge||"-")}</b></span><span>Versi<b>${escapeHtml(x.version||"Latest")}</b></span><span>Kategori<b>${escapeHtml(x.category||"Script Roblox")}</b></span><span>Diperbarui<b>${escapeHtml(formatDate(x.updatedAt||x.createdAt))}</b></span></div><p class="admin-muted" style="margin-top:10px">${escapeHtml(x.description||"")}</p><div class="form-actions"><button class="button button-secondary edit-script" data-id="${escapeHtml(x.id)}" type="button">Edit Produk</button><button class="button button-danger delete-script" data-id="${escapeHtml(x.id)}" type="button">Hapus Produk</button></div></article>`).join("");
  list.querySelectorAll(".edit-script").forEach(button=>button.addEventListener("click",()=>startEditScript(button.dataset.id)));
  list.querySelectorAll(".delete-script").forEach(button=>button.addEventListener("click",()=>deleteScript(button.dataset.id,button)));
}
async function loadScripts(){const list=$("#scriptAdminList");if(!list)return;list.innerHTML='<div class="item-card">Mengambil produk SC...</div>';try{const data=await apiJson(await apiFetch(`/api/scripts?ts=${Date.now()}`));renderScripts(Array.isArray(data.scripts)?data.scripts:[]);}catch(e){list.innerHTML=`<div class="item-card">${escapeHtml(e.message)}</div>`;}}
async function deleteScript(id,button){if(!confirm("Hapus produk SC dari storefront?"))return;button.disabled=true;try{await apiJson(await apiFetch("/api/scripts",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})}));if(editingScriptId===id)resetScriptForm();await loadScripts();}catch(e){alert(e.message);}finally{button.disabled=false;}}
$("#scriptCover")?.addEventListener("change",e=>{const f=e.target.files?.[0],img=$("#scriptCoverPreview");if(!f){img.classList.add("hidden");img.removeAttribute("src");return;}if(!/^image\/(?:jpeg|png|webp)$/i.test(f.type))return alert("Cover harus JPG, PNG, atau WebP.");img.src=URL.createObjectURL(f);img.classList.remove("hidden");});
$("#refreshScripts")?.addEventListener("click",loadScripts);
$("#cancelScriptEdit")?.addEventListener("click",resetScriptForm);
$("#scriptUploadForm")?.addEventListener("submit",async e=>{
  e.preventDefault();
  const form=e.currentTarget,btn=$("#scriptSubmitButton"),script=$("#scriptFile").files?.[0],cover=$("#scriptCover").files?.[0],isEdit=Boolean(editingScriptId);
  if(!isEdit&&(!script||!cover))return alert("Produk baru wajib memilih cover dan file SC.");
  if(script&&!/\.(lua|txt)$/i.test(script.name))return alert("File script harus .lua atau .txt.");
  btn.disabled=true;btn.textContent=isEdit?"Menyimpan...":"Publishing...";$("#scriptUploadStatus").textContent=isEdit?"Menyimpan perubahan produk...":"Mengupload produk SC...";
  try{
    const [scriptBase64,imageBase64]=await Promise.all([fileToDataUrl(script),imageToDataUrl(cover)]);
    const features=$("#scriptFeatures").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    const payload={id:editingScriptId,title:$("#scriptTitle").value.trim(),price:$("#scriptPrice").value.trim(),badge:$("#scriptBadge").value.trim(),version:$("#scriptVersion").value.trim(),category:$("#scriptCategory").value.trim(),description:$("#scriptDescription").value.trim(),features,orderLabel:$("#scriptOrderLabel").value.trim(),orderUrl:$("#scriptOrderUrl").value.trim(),featured:$("#scriptFeatured").checked,scriptBase64,scriptName:script?.name||"",imageBase64,imageName:cover?.name||"cover.jpg"};
    const data=await apiJson(await apiFetch("/api/scripts",{method:isEdit?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}));
    const message=`✓ ${data.message||"Produk berhasil disimpan."}`;
    resetScriptForm(true);$("#scriptUploadStatus").textContent=message;await loadScripts();loadDashboard();window.dispatchEvent(new CustomEvent("nixx:script-published",{detail:data.script||null}));
  }catch(error){$("#scriptUploadStatus").textContent=error.message||"Gagal menyimpan produk.";}finally{btn.disabled=false;btn.textContent=editingScriptId?"Simpan Perubahan ↗":"Publish Produk SC ↗";}
});

async function loadAnnouncement(){try{const data=await apiJson(await fetch(`/api/announcement?ts=${Date.now()}`,{cache:"no-store"}));const a=data.announcement||{};$("#announcementText").value=a.text||"";$("#announcementType").value=a.type||"info";$("#announcementEnabled").checked=Boolean(a.enabled);$("#statAnnouncement").textContent=a.enabled?"ON":"OFF";}catch{}}
$("#announcementForm")?.addEventListener("submit",async e=>{e.preventDefault();const status=$("#announcementStatus");status.textContent="Menyimpan...";try{await apiJson(await apiFetch("/api/announcement",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:$("#announcementText").value.trim(),type:$("#announcementType").value,enabled:$("#announcementEnabled").checked})}));status.textContent="✓ Announcement tersimpan.";$("#statAnnouncement").textContent=$("#announcementEnabled").checked?"ON":"OFF";}catch(e){status.textContent=e.message;}});

async function loadDashboard(){await Promise.allSettled([loadLicenses(),loadScripts(),loadAnnouncement()]);}
boot();
