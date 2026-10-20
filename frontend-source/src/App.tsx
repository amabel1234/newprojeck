import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, Box, Check,
  Code2, Crown, ExternalLink, KeyRound, Layers3, LockKeyhole,
  LogOut, Map, Package, Pencil, Plus, RefreshCw, Search, ShieldCheck, ShoppingBag,
  Trash2, X, Zap,
} from 'lucide-react';
import {
  getGetProductStatsQueryKey,
  getListManagedProductsQueryKey,
  getListProductsQueryKey,
  useCreateProduct,
  useDeleteProduct,
  useGetProductStats,
  useListManagedProducts,
  useListProducts,
  useUpdateProduct,
} from '@workspace/api-client-react';
import type { Product, ProductCategory, ProductInput } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
const legacyApiEnabled = import.meta.env.PROD || import.meta.env.VITE_ENABLE_LEGACY_API === 'true';
const CATEGORIES: { value: ProductCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'get-key', label: 'Get Key' },
  { value: 'vip-key', label: 'VIP Key' },
  { value: 'license', label: 'License' },
  { value: 'roblox-map-template', label: 'Template Map Roblox' },
  { value: 'ready-map', label: 'Map Siap Pakai' },
  { value: 'ready-system', label: 'Sistem Siap Pakai' },
  { value: 'script', label: 'Script' },
];
const NIXX_WHATSAPP = '6283182791150';
type LegacyScript = {
  id: string;
  title: string;
  price: string;
  description: string;
  category?: string;
  badge?: string;
  version?: string;
  orderLabel?: string;
  orderUrl?: string;
  imageUrl?: string;
  scriptUrl?: string;
  featured?: boolean;
  features?: string[];
};
type StorefrontProduct = Pick<Product, 'id' | 'name' | 'category' | 'price' | 'description' | 'imageUrl' | 'orderUrl' | 'featured'> & {
  scriptUrl?: string;
  orderLabel?: string;
};
const categoryName = (category: ProductCategory) =>
  CATEGORIES.find((item) => item.value === category)?.label ?? category;
const categoryIcon = (category?: ProductCategory) => {
  switch (category) {
    case 'get-key': return KeyRound;
    case 'vip-key': return Crown;
    case 'license': return BadgeCheck;
    case 'roblox-map-template': return Map;
    case 'ready-map': return Layers3;
    case 'ready-system': return Box;
    default: return Code2;
  }
};
const money = (value: string) => {
  if (/^[\d,.]+$/.test(value)) {
    return `Rp ${Number(value.replaceAll(',', '')).toLocaleString('id-ID')}`;
  }
  return value;
};
const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });
const defaultOrderUrl = (product: Pick<StorefrontProduct, 'name' | 'price'>) =>
  `https://wa.me/${NIXX_WHATSAPP}?text=${encodeURIComponent(`Halo Nixx, saya mau order ${product.name} (${product.price}).`)}`;

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Storefront} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/admin.html" component={AdminPage} />
        <Route path="/legacy" component={LegacyPreviewPage} />
        <Route path="/legacy/" component={LegacyPreviewPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <img className={compact ? 'mini-logo' : 'brand-logo'} src="/ncl-logo.png" alt="NIXX, built by nCL" />;
}

function Storefront() {
  const { data, isLoading, isError, refetch } = useListProducts();
  const scriptsQuery = useQuery<{ ok: boolean; scripts: LegacyScript[] }>({
    queryKey: ['legacy-script-products'],
    queryFn: async () => {
      const response = await fetch(`/api/scripts?ts=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Katalog script lama belum tersedia.');
      return response.json();
    },
    staleTime: 60_000,
    retry: false,
    enabled: legacyApiEnabled,
  });
  const legacyProducts = useMemo<StorefrontProduct[]>(() => (
    (scriptsQuery.data?.scripts ?? []).map((script) => ({
      id: `legacy-script-${script.id}`,
      name: script.title,
      category: 'script',
      price: script.price,
      description: script.description,
      imageUrl: script.imageUrl || null,
      orderUrl: script.orderUrl || null,
      featured: Boolean(script.featured),
      scriptUrl: script.scriptUrl || undefined,
      orderLabel: script.orderLabel,
    }))
  ), [scriptsQuery.data]);
  const products: StorefrontProduct[] = [...(data?.products ?? []), ...legacyProducts];
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const visibleProducts = useMemo(() => products.filter((product) => (
    (category === 'all' || product.category === category) &&
    `${product.name} ${product.description}`.toLowerCase().includes(search.toLowerCase())
  )), [products, category, search]);
  return (
    <main className="app-shell">
      <SiteAnnouncement />
      <header className="site-header">
        <a href="/" aria-label="NIXX home"><Brand /></a>
        <nav className="nav-links" aria-label="Navigasi utama">
          <a href="#catalog">Lihat katalog</a>
          <a href="#validation">Cek key</a>
          <a href="#why-nixx">Tentang NIXX</a>
        </nav>
        <div className="nav-actions">
          <a className="button button-quiet" href="#validation">Cek key</a>
          <a className="button button-primary" href="#catalog">Jelajahi toko <ArrowRight size={14} /></a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">Toko kreator NIXX</div>
          <h1>Bangun dunia<br />berikutnya. <span>Mulai di sini.</span></h1>
          <p>Aset Roblox, key, dan sistem siap pakai untuk kreator yang ingin langsung berkarya tanpa harus selalu mulai dari nol.</p>
          <div className="hero-buttons">
            <a className="button button-primary" href="#catalog">Cari kebutuhanmu <ArrowDownRight size={15} /></a>
            <a className="button button-quiet" href="#why-nixx">Kenali NIXX <ArrowRight size={14} /></a>
          </div>
          <div className="trust-row">
            <span><i className="trust-dot" /> Katalog dikelola langsung</span>
            <span><i className="trust-dot" /> Dibuat untuk kreator Roblox</span>
          </div>
        </div>
        <div className="hero-art" aria-label="Pratinjau produk digital unggulan">
          <div className="orbit" />
          <div className="hero-console">
            <div className="console-top">
              <div className="console-brand"><Brand compact /> NIXX / CREATOR SHOP</div>
              <span className="live-chip">PRODUK DIGITAL</span>
            </div>
            <div className="console-content">
              <div className="console-label">Mulai dengan fondasi yang tepat</div>
              <div className="console-feature">
                <div className="feature-icon"><Layers3 /></div>
                <div><h3>Aset siap dikembangkan</h3><p>Sistem, map, script &amp; akses</p></div>
              </div>
              <div className="console-line"><span>Siap untuk proyek berikutnya</span><span className="console-price">Ide besarmu berikutnya</span></div>
              <div className="console-foot"><span>PRODUK KREATOR ROBLOX</span><strong>Kurasi NIXX</strong></div>
            </div>
          </div>
          <div className="float-tag"><b>07</b> kategori pilihan</div>
        </div>
      </section>

      <div className="promise-band" id="why-nixx">
        <div className="promise-inner">
          <div className="promise-item"><ShieldCheck /><div><b>Dikelola langsung</b><span>Katalog diperbarui oleh NIXX</span></div></div>
          <div className="promise-item"><Zap /><div><b>Lebih cepat berkarya</b><span>Kurangi waktu membangun ulang</span></div></div>
          <div className="promise-item"><LockKeyhole /><div><b>Key bisa diverifikasi</b><span>Cek lisensi sebelum mulai</span></div></div>
          <div className="promise-item"><ShoppingBag /><div><b>Pemesanan langsung</b><span>Produk jelas, langkah berikutnya mudah</span></div></div>
        </div>
      </div>

      <section className="section catalog-section" id="catalog">
        <div className="section-head">
          <div>
            <div className="section-kicker">Katalog produk digital</div>
            <h2 className="section-title">Temukan bahan untuk karyamu.</h2>
            <p className="section-subtitle">Pilih tool dan aset yang membantu proyek Roblox-mu bergerak lebih cepat. Temukan kebutuhanmu, lalu kembali berkarya.</p>
          </div>
          <span className="category-label">{products.length} produk tersedia</span>
        </div>
        <div className="catalog-tools" aria-label="Filter produk">
          {CATEGORIES.map((item) => (
            <button key={item.value} type="button" className={`filter-chip ${category === item.value ? 'active' : ''}`} onClick={() => setCategory(item.value)} data-testid={`filter-category-${item.value}`}>
              {item.label}
            </button>
          ))}
          <label className="search-box">
            <Search aria-hidden="true" />
            <input className="field" type="search" placeholder="Cari produk" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Cari produk" data-testid="input-search-products" />
          </label>
        </div>
        {isLoading ? (
          <div className="loading-grid" aria-label="Memuat produk">{[1, 2, 3].map((item) => <div className="skeleton" key={item} />)}</div>
        ) : isError ? (
          <div className="error-state"><strong>Katalog sedang sulit dimuat.</strong>Produk belum dapat ditampilkan. Coba beberapa saat lagi.<br /><button type="button" className="button button-quiet button-small" onClick={() => refetch()} style={{ marginTop: 16 }}><RefreshCw size={13} /> Coba lagi</button></div>
        ) : visibleProducts.length ? (
          <div className="product-grid">
            {visibleProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}
          </div>
        ) : (
          <div className="empty-state"><strong>{products.length ? 'Belum ada produk di kategori ini.' : 'Katalog sedang disiapkan.'}</strong>{products.length ? 'Coba kategori lain atau kata kunci berbeda.' : 'Produk NIXX akan segera tersedia di sini.'}</div>
        )}
        {category === 'script' && scriptsQuery.isError && <div className="catalog-notice" role="status">Katalog script lama belum terhubung. Produk script baru yang dibuat melalui Studio Produk tetap tampil di sini.</div>}
        <KeyValidation />
        <RobloxAccess />
      </section>

      <footer className="footer">
        <a href="/" aria-label="NIXX home"><Brand /></a>
        <span>© {new Date().getFullYear()} NIXX PRODUCTS · UNTUK KREATOR ROBLOX</span>
          <div className="footer-links"><a href="/legacy/">Fitur lama <ArrowUpRight size={12} /></a><a href="/admin.html">Admin key lama <ArrowUpRight size={12} /></a><a href="/admin">Akses katalog <ArrowUpRight size={12} /></a></div>
      </footer>
    </main>
  );
}

function ProductCard({ product, index }: { product: StorefrontProduct; index: number }) {
  const Icon = categoryIcon(product.category);
  return (
    <article className="product-card" style={{ animationDelay: `${Math.min(index * 45, 270)}ms` }} data-testid={`card-product-${product.id}`}>
      <div className="product-visual">
        {product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" /> : <div className="visual-glyph"><Icon /></div>}
        {product.featured && <span className="featured-label">Pilihan NIXX</span>}
      </div>
      <div className="card-content">
        <div className="category-label">{categoryName(product.category)}</div>
        <h3>{product.name}</h3>
        <p className="card-description">{product.description}</p>
        <div className="card-bottom">
          <span className="price">{money(product.price)}</span>
          {product.orderUrl ? (
            <a className="buy-link" href={product.orderUrl} target="_blank" rel="noreferrer">{product.orderLabel || 'Pesan produk'} <ExternalLink /></a>
          ) : <a className="buy-link" href={defaultOrderUrl(product)} target="_blank" rel="noreferrer">Pesan via WhatsApp <ArrowRight /></a>}
          {product.scriptUrl && <a className="product-script-link" href={product.scriptUrl} target="_blank" rel="noreferrer">Lihat script</a>}
        </div>
      </div>
    </article>
  );
}

function KeyValidation() {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ message: string; valid: boolean } | null>(null);
  async function validate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!key.trim() || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch('/api/license/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ key: key.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      const valid = response.ok && payload.valid !== false && payload.isValid !== false && payload.active !== false;
      setResult({ valid, message: payload.message || payload.error || (valid ? 'Key valid dan aktif.' : 'Key tidak dapat diverifikasi.') });
    } catch {
      setResult({ valid: false, message: 'Layanan verifikasi sedang tidak tersedia. Coba lagi sebentar.' });
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="validation" id="validation">
      <div className="validation-copy">
        <div className="validation-icon"><KeyRound size={18} /></div>
          <div><h3>Sudah punya key NIXX?</h3><p>Cek status dan masa aktifnya sebelum mulai. Key hanya dikirim ke layanan verifikasi NIXX.</p></div>
      </div>
      <form className="validation-form" onSubmit={validate}>
        <input className="field" value={key} onChange={(event) => setKey(event.target.value)} placeholder="Masukkan license key" aria-label="License key" autoComplete="off" data-testid="input-license-key" />
        <button type="submit" className="button button-primary" disabled={busy || !key.trim()} data-testid="button-validate-key">{busy ? 'Memeriksa…' : 'Cek key'} <ArrowRight size={14} /></button>
      </form>
      {result && <div className={`validation-result ${result.valid ? 'success' : 'failure'}`} role="status">{result.message}</div>}
    </section>
  );
}

function RobloxAccess() {
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ active: boolean; message: string; username?: string; userId?: number; expiresAt?: string; remainingSeconds?: number } | null>(null);
  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = username.trim();
    if (!normalized || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch('/api/roblox/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ username: normalized }),
      });
      const payload = await response.json().catch(() => ({}));
      setResult({
        active: response.ok && payload.active === true,
        message: payload.message || payload.error || 'Status akses tidak dapat diperiksa.',
        username: payload.username,
        userId: payload.userId,
        expiresAt: payload.expiresAt,
        remainingSeconds: payload.remainingSeconds,
      });
    } catch {
      setResult({ active: false, message: 'Layanan akses Roblox sedang tidak tersedia. Coba lagi sebentar.' });
    } finally {
      setBusy(false);
    }
  }
  const expiry = result?.expiresAt ? new Date(result.expiresAt).toLocaleString('id-ID') : null;
  return (
    <section className="validation roblox-access" id="roblox-access">
      <div className="validation-copy">
        <div className="validation-icon"><Map size={18} /></div>
        <div><h3>Akses Roblox 24 jam</h3><p>Masukkan username Roblox untuk memeriksa atau mengaktifkan akses. Satu akun hanya memiliki satu periode akses aktif.</p></div>
      </div>
      <form className="validation-form" onSubmit={activate}>
        <input className="field" value={username} onChange={(event) => setUsername(event.target.value.replace(/[^A-Za-z0-9_]/g, '').slice(0, 20))} placeholder="Username Roblox" aria-label="Username Roblox" autoComplete="off" minLength={3} maxLength={20} required data-testid="input-roblox-username" />
        <button type="submit" className="button button-primary" disabled={busy || username.trim().length < 3} data-testid="button-activate-roblox">{busy ? 'Memeriksa…' : 'Aktifkan akses'} <ArrowRight size={14} /></button>
      </form>
      {result && <div className={`validation-result ${result.active ? 'success' : 'failure'}`} role="status">
        <strong>{result.message}</strong>
        {result.active && <span>{result.username ? ` @${result.username}` : ''}{result.userId ? ` · ID ${result.userId}` : ''}{expiry ? ` · Berakhir ${expiry}` : ''}{typeof result.remainingSeconds === 'number' ? ` · Sisa ${Math.floor(result.remainingSeconds / 3600)} jam` : ''}</span>}
      </div>}
    </section>
  );
}

function SiteAnnouncement() {
  const { data } = useQuery<{ announcement?: { enabled?: boolean; text?: string; type?: string } }>({
    queryKey: ['legacy-announcement'],
    queryFn: async () => {
      const response = await fetch('/api/announcement', { cache: 'no-store' });
      if (!response.ok) throw new Error('Pengumuman belum tersedia.');
      return response.json();
    },
    staleTime: 60_000,
    retry: false,
    enabled: legacyApiEnabled,
  });
  const announcement = data?.announcement;
  if (!announcement?.enabled || !announcement.text) return null;
  return <div className={`announcement-banner announcement-${announcement.type || 'info'}`} role="status">{announcement.text}</div>;
}

function LegacyPreviewPage() {
  return (
    <main className="admin-page legacy-preview">
      <header className="admin-head">
        <a className="admin-brand" href="/"><Brand /><span>Fitur lama</span></a>
        <a className="button button-quiet button-small" href="/">Kembali ke toko</a>
      </header>
      <section className="legacy-preview-card">
        <div className="admin-eyebrow">NIXX LEGACY STORE</div>
        <h1 className="admin-title">Fitur lama tetap tersedia.</h1>
        <p className="admin-intro">Versi lengkap storefront lama—termasuk obfuscator dan katalog script—ikut disertakan di source Vercel pada halaman ini. Di preview, fitur key dan akses Roblox dapat digunakan langsung dari toko baru.</p>
        <div className="legacy-preview-links">
          <a className="button button-primary" href="/#validation">Cek license key <ArrowRight size={14} /></a>
          <a className="button button-quiet" href="/#roblox-access">Akses Roblox 24 jam <ArrowRight size={14} /></a>
          <a className="button button-quiet" href="/admin.html">Admin key dan script <ArrowRight size={14} /></a>
        </div>
      </section>
    </main>
  );
}

function AdminPage() {
  const [token, setToken] = useState(() => sessionStorage.getItem('nixx-owner-token') ?? '');
  const [tokenInput, setTokenInput] = useState(token);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');
  const [editing, setEditing] = useState<Product | null | 'new'>(null);
  const [toast, setToast] = useState('');
  const queryClient = useQueryClient();
  const headers = useMemo(() => token ? authHeaders(token) : undefined, [token]);
  const manageParams = useMemo(() => search.trim() ? { search: search.trim() } : undefined, [search]);
  const managedKey = getListManagedProductsQueryKey(manageParams);
  const statsKey = getGetProductStatsQueryKey();
  const managedQuery = useListManagedProducts(manageParams, {
    query: { enabled: Boolean(token), queryKey: managedKey, retry: false },
    request: headers ? { headers } : undefined,
  });
  const statsQuery = useGetProductStats({
    query: { enabled: Boolean(token), queryKey: statsKey, retry: false },
    request: headers ? { headers } : undefined,
  });
  const createProduct = useCreateProduct({ request: headers ? { headers } : undefined });
  const updateProduct = useUpdateProduct({ request: headers ? { headers } : undefined });
  const deleteProduct = useDeleteProduct({ request: headers ? { headers } : undefined });
  const allProducts = managedQuery.data?.products ?? [];
  const products = category === 'all' ? allProducts : allProducts.filter((item) => item.category === category);
  const errorText = getErrorMessage(managedQuery.error || statsQuery.error);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  }
  function signOut() {
    sessionStorage.removeItem('nixx-owner-token');
    setToken('');
    setTokenInput('');
    queryClient.removeQueries({ queryKey: getListManagedProductsQueryKey() });
    queryClient.removeQueries({ queryKey: statsKey });
  }
  async function saveToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = tokenInput.trim();
    if (!next) return;
    sessionStorage.setItem('nixx-owner-token', next);
    setToken(next);
  }
  async function refreshAdmin() {
    await Promise.all([managedQuery.refetch(), statsQuery.refetch()]);
  }
  function invalidateProducts() {
    void queryClient.invalidateQueries({ queryKey: getListManagedProductsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetProductStatsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
  }
  async function submitProduct(input: ProductInput, current: Product | null) {
    if (current) {
      await updateProduct.mutateAsync({ id: current.id, data: input });
      invalidateProducts();
      notify('Produk berhasil diperbarui.');
    } else {
      await createProduct.mutateAsync({ data: input });
      invalidateProducts();
      notify('Produk berhasil ditambahkan.');
    }
    setEditing(null);
  }
  async function removeProduct(product: Product) {
    if (!window.confirm(`Hapus “${product.name}” dari katalog? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await deleteProduct.mutateAsync({ id: product.id });
      invalidateProducts();
      notify('Produk berhasil dihapus.');
    } catch (error) {
      notify(getErrorMessage(error) || 'Produk tidak dapat dihapus.');
    }
  }
  async function toggleProduct(product: Product, field: 'active' | 'featured') {
    try {
      await updateProduct.mutateAsync({ id: product.id, data: { [field]: !product[field] } });
      invalidateProducts();
      notify(`${field === 'active' ? 'Status tampil' : 'Status unggulan'} berhasil diperbarui.`);
    } catch (error) {
      notify(getErrorMessage(error) || 'Produk tidak dapat diperbarui.');
    }
  }
  const stats = statsQuery.data;
  const loading = managedQuery.isLoading || statsQuery.isLoading;
  const unauthorized = managedQuery.isError && errorText.toLowerCase().includes('401');

  return (
    <main className="admin-page">
      <header className="admin-head">
        <a className="admin-brand" href="/"><Brand /><span>Panel admin</span></a>
        <div className="admin-head-actions">
          <a className="button button-quiet button-small" href="/">Lihat toko <ArrowUpRight size={13} /></a>
          {token && <button type="button" className="button button-quiet button-small" onClick={signOut} data-testid="button-admin-signout"><LogOut size={13} /> Keluar</button>}
        </div>
      </header>
      {!token ? (
        <section className="login-wrap">
          <form className="login-card" onSubmit={saveToken}>
            <div className="admin-eyebrow">AKSES OWNER · NIXX PRODUCTS</div>
            <h1>Selamat datang.</h1>
            <p>Masukkan token admin untuk mengelola katalog. Token hanya disimpan di sesi browser ini.</p>
            <label htmlFor="admin-token">Token admin</label>
            <input id="admin-token" className="field" type="password" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} placeholder="Tempel token admin" autoComplete="current-password" data-testid="input-admin-token" />
            <button type="submit" className="button button-primary" style={{ width: '100%', marginTop: 14 }} disabled={!tokenInput.trim()} data-testid="button-admin-login">Buka panel admin <ArrowRight size={14} /></button>
            <div className="login-error" role="alert">{managedQuery.isError && errorText ? unauthorized ? 'Token tidak diterima. Periksa token lalu coba lagi.' : errorText : ''}</div>
          </form>
        </section>
      ) : (
        <section className="admin-main">
            <div className="admin-eyebrow">PANEL PENGELOLAAN</div>
            <h1 className="admin-title">Studio produk</h1>
            <p className="admin-intro">Kelola katalog NIXX. Perubahan produk langsung diperbarui di toko. Pengelolaan key dan script lama tetap tersedia melalui <a className="admin-legacy-link" href="/admin.html">admin lama</a>.</p>
          {managedQuery.isError && (
            <div className="error-state" style={{ marginTop: 22, padding: 24 }}>
              <strong>{unauthorized ? 'Token owner perlu diperiksa.' : 'Studio produk tidak dapat dimuat.'}</strong>
              {unauthorized ? 'Token mungkin salah atau sudah tidak berlaku.' : errorText}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 13 }}>
                {unauthorized && <button className="button button-quiet button-small" onClick={signOut} type="button">Ganti token</button>}
                <button className="button button-primary button-small" onClick={refreshAdmin} type="button"><RefreshCw size={13} /> Coba lagi</button>
              </div>
            </div>
          )}
          <div className="stats-grid">
            <StatCard label="Semua produk" value={stats?.total ?? (loading ? '—' : allProducts.length)} />
            <StatCard label="Tampil di toko" value={stats?.active ?? '—'} note="Aktif" />
            <StatCard label="Produk unggulan" value={stats?.featured ?? '—'} note="Pilihan" />
            <StatCard label="Kategori terisi" value={stats?.byCategory?.filter((item) => item.count > 0).length ?? '—'} note="Ada produk" />
          </div>
          <div className="section-head" style={{ marginBottom: 15 }}>
            <div><div className="section-kicker">Pengelolaan katalog</div><h2 className="section-title" style={{ fontSize: 23 }}>Produk kamu</h2></div>
            <button type="button" className="button button-primary" onClick={() => setEditing('new')} data-testid="button-add-product"><Plus size={15} /> Tambah produk</button>
          </div>
          <div className="admin-toolbar">
            <label className="search-box"><Search aria-hidden="true" /><input className="field" type="search" placeholder="Cari produk" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Cari produk" data-testid="input-admin-search" /></label>
            <select className="select-field" value={category} onChange={(event) => setCategory(event.target.value as ProductCategory | 'all')} aria-label="Filter berdasarkan kategori" data-testid="select-admin-category">
              {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <button type="button" className="icon-button" onClick={refreshAdmin} aria-label="Muat ulang produk" data-testid="button-refresh-products"><RefreshCw /></button>
          </div>
          <div className="table-wrap">
            <table className="admin-table">
              <thead><tr><th>Produk</th><th>Kategori</th><th>Harga</th><th>Unggulan</th><th>Status</th><th aria-label="Aksi" /></tr></thead>
              <tbody>
                {loading ? [1, 2, 3].map((item) => <tr key={item}><td colSpan={6}><div className="skeleton" style={{ height: 44 }} /></td></tr>) :
                  products.length ? products.map((product) => <ProductRow key={product.id} product={product} onEdit={() => setEditing(product)} onDelete={() => removeProduct(product)} onToggle={toggleProduct} />) :
                    <tr><td colSpan={6}><div className="admin-empty">{allProducts.length ? 'Tidak ada produk yang cocok dengan filter.' : 'Belum ada produk. Tambahkan produk pertama untuk memulai.'}</div></td></tr>}
              </tbody>
            </table>
          </div>
          {editing !== null && <ProductDialog product={editing === 'new' ? null : editing} pending={createProduct.isPending || updateProduct.isPending} onClose={() => setEditing(null)} onSave={submitProduct} />}
        </section>
      )}
      {toast && <div className="toast-message" role="status">{toast}</div>}
    </main>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '';
}

function StatCard({ label, value, note }: { label: string; value: number | string; note?: string }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}</strong>{note && <span style={{ letterSpacing: 0, textTransform: 'none' }}>{note}</span>}</div>;
}

function ProductRow({ product, onEdit, onDelete, onToggle }: {
  product: Product; onEdit: () => void; onDelete: () => void;
  onToggle: (product: Product, field: 'active' | 'featured') => void;
}) {
  const Icon = categoryIcon(product.category);
  return (
    <tr data-testid={`row-product-${product.id}`}>
      <td><div className="table-product"><div className="table-thumb">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <Icon size={17} />}</div><div><strong>{product.name}</strong><span>{product.id}</span></div></div></td>
      <td>{categoryName(product.category)}</td>
      <td>{money(product.price)}</td>
      <td><button className={`status-pill ${product.featured ? 'status-active' : 'status-off'}`} type="button" onClick={() => onToggle(product, 'featured')} aria-label={`${product.featured ? 'Hapus tanda unggulan' : 'Jadikan unggulan'}: ${product.name}`} data-testid={`toggle-featured-${product.id}`}>{product.featured ? 'Unggulan' : 'Standar'}</button></td>
      <td><button className={`status-pill ${product.active ? 'status-active' : 'status-off'}`} type="button" onClick={() => onToggle(product, 'active')} aria-label={`${product.active ? 'Sembunyikan' : 'Tampilkan'} ${product.name}`} data-testid={`toggle-active-${product.id}`}>{product.active ? 'Tayang' : 'Disembunyikan'}</button></td>
      <td><div className="row-actions"><button className="icon-button" type="button" onClick={onEdit} aria-label={`Edit ${product.name}`} data-testid={`button-edit-${product.id}`}><Pencil /></button><button className="icon-button" type="button" onClick={onDelete} aria-label={`Hapus ${product.name}`} data-testid={`button-delete-${product.id}`}><Trash2 /></button></div></td>
    </tr>
  );
}

function ProductDialog({ product, pending, onClose, onSave }: {
  product: Product | null; pending: boolean; onClose: () => void;
  onSave: (input: ProductInput, current: Product | null) => Promise<void>;
}) {
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState<ProductCategory>(product?.category ?? 'get-key');
  const [price, setPrice] = useState(product?.price ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? '');
  const [orderUrl, setOrderUrl] = useState(product?.orderUrl ?? '');
  const [features, setFeatures] = useState(product?.features.join('\n') ?? '');
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [active, setActive] = useState(product?.active ?? true);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: ProductInput = {
      name: name.trim(), category, price: price.trim(), description: description.trim(),
      imageUrl: imageUrl.trim() || null, orderUrl: orderUrl.trim() || null,
      features: features.split('\n').map((line) => line.trim()).filter(Boolean),
      featured, active,
    };
    try {
      await onSave(payload, product);
    } catch (issue) {
      setError(getErrorMessage(issue) || 'Produk tidak dapat disimpan. Coba lagi.');
    }
  }
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose(); }}>
      <section className="product-dialog" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title">
        <div className="dialog-head"><h2 id="product-dialog-title">{product ? 'Edit produk' : 'Tambah produk'}</h2><button className="icon-button" type="button" onClick={onClose} aria-label="Tutup formulir produk"><X /></button></div>
        <form className="product-form" onSubmit={submit}>
          <div className="form-grid">
            <div className="form-field"><label htmlFor="product-name">Nama produk</label><input id="product-name" className="field" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={100} data-testid="input-product-name" /></div>
            <div className="form-field"><label htmlFor="product-category">Kategori</label><select id="product-category" className="field" value={category} onChange={(event) => setCategory(event.target.value as ProductCategory)} data-testid="select-product-category">{CATEGORIES.filter((item) => item.value !== 'all').map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            <div className="form-field"><label htmlFor="product-price">Harga</label><input id="product-price" className="field" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="contoh: Rp 85.000" required maxLength={60} data-testid="input-product-price" /></div>
            <div className="form-field"><label htmlFor="product-order-url">Link pemesanan</label><input id="product-order-url" className="field" type="url" value={orderUrl} onChange={(event) => setOrderUrl(event.target.value)} placeholder="https://" data-testid="input-product-order-url" /></div>
            <div className="form-field full"><label htmlFor="product-description">Deskripsi</label><textarea id="product-description" className="field" value={description} onChange={(event) => setDescription(event.target.value)} required maxLength={1000} data-testid="input-product-description" /></div>
            <div className="form-field full"><label htmlFor="product-image">Link gambar <span style={{ textTransform: 'none', letterSpacing: 0 }}>(opsional)</span></label><input id="product-image" className="field" type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://" data-testid="input-product-image" /></div>
            <div className="form-field full"><label htmlFor="product-features">Fitur <span style={{ textTransform: 'none', letterSpacing: 0 }}>(satu per baris)</span></label><textarea id="product-features" className="field" value={features} onChange={(event) => setFeatures(event.target.value)} placeholder={'Siap dikonfigurasi\nMudah dikembangkan'} data-testid="input-product-features" /></div>
            <label className="checkbox-line"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} data-testid="checkbox-product-active" /> Tampilkan di toko</label>
            <label className="checkbox-line"><input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} data-testid="checkbox-product-featured" /> Tandai sebagai unggulan</label>
          </div>
          {error && <div className="login-error" role="alert">{error}</div>}
          <div className="form-actions"><button type="button" className="button button-quiet" onClick={onClose} disabled={pending}>Batal</button><button type="submit" className="button button-primary" disabled={pending} data-testid="button-save-product">{pending ? 'Menyimpan…' : product ? 'Simpan perubahan' : 'Buat produk'} <Check size={14} /></button></div>
        </form>
      </section>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
