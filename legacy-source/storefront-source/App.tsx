import { type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  ArrowDownRight,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  CircleHelp,
  Gem,
  Headphones,
  KeyRound,
  Menu,
  MessageCircle,
  Minus,
  MoveUpRight,
  Package,
  ShieldCheck,
  Sparkles,
  Terminal,
  UserRound,
  X,
  Zap,
} from 'lucide-react';

const queryClient = new QueryClient();

// Change this one value when the owner's contact number changes.
const OWNER_WHATSAPP = '6281234567890';

type Product = {
  id: string;
  title: string;
  price: string;
  description: string;
  eyebrow: string;
  icon: typeof KeyRound;
  accent: 'violet' | 'cyan' | 'coral';
  featured?: boolean;
  detail?: string;
};

const keyProducts: Product[] = [
  {
    id: 'key-10',
    title: 'Akses Key Basic',
    price: 'Rp10.000',
    description: 'Pilihan ringkas buat kamu yang baru mulai pakai ekosistem Nixx.',
    eyebrow: 'STARTER',
    icon: KeyRound,
    accent: 'cyan',
  },
  {
    id: 'key-15',
    title: 'Akses Key Plus',
    price: 'Rp15.000',
    description: 'Akses lebih nyaman dengan value yang pas untuk pemakaian rutin.',
    eyebrow: 'MOST PICKED',
    icon: Zap,
    accent: 'violet',
    featured: true,
  },
  {
    id: 'key-25',
    title: 'Akses Key Pro',
    price: 'Rp25.000',
    description: 'Untuk kebutuhan yang lebih serius. Praktis, cepat, dan siap dipakai.',
    eyebrow: 'POWER USER',
    icon: Gem,
    accent: 'coral',
  },
  {
    id: 'key-50',
    title: 'Akses Key Max',
    price: 'Rp50.000',
    description: 'Paket akses paling lengkap untuk kamu yang tidak mau setengah-setengah.',
    eyebrow: 'FULL ACCESS',
    icon: Sparkles,
    accent: 'violet',
  },
];

const faqs = [
  {
    question: 'Cara order di Nixx VVIP gimana?',
    answer: 'Pilih produk yang kamu mau, lalu klik tombol order. WhatsApp akan terbuka dengan pesan yang sudah berisi produk pilihanmu. Tinggal kirim dan lanjutkan detailnya bersama owner Nixx.',
  },
  {
    question: 'Pembayarannya lewat apa?',
    answer: 'Detail pembayaran akan dikirim langsung oleh owner Nixx lewat WhatsApp. Pastikan kamu hanya mengikuti instruksi dari kontak resmi di halaman ini.',
  },
  {
    question: 'Berapa lama akses dikirim?',
    answer: 'Setelah pembayaran terkonfirmasi, akses diproses secara manual. Waktu respons bisa berubah mengikuti antrean, tapi Nixx akan mengabari progresnya di chat.',
  },
  {
    question: 'Bisa tanya dulu sebelum beli?',
    answer: 'Bisa. Klik chat owner untuk menjelaskan kebutuhanmu. Tidak perlu bingung memilih paket—Nixx akan bantu mengarahkan ke opsi yang paling masuk akal.',
  },
];

function whatsappUrl(product?: string) {
  const message = product
    ? `Halo Nixx, saya mau order ${product}. Boleh info detail dan cara pembayarannya?`
    : 'Halo Nixx, saya mau tanya tentang produk Nixx VVIP.';
  return `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

function ButtonLink({
  children,
  href,
  variant = 'primary',
  onClick,
  testId,
}: {
  children: ReactNode;
  href: string;
  variant?: 'primary' | 'outline' | 'text';
  onClick?: () => void;
  testId: string;
}) {
  const classes = {
    primary:
      'inline-flex items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-[0_10px_24px_rgba(117,58,209,.22)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(117,58,209,.3)] active:translate-y-0',
    outline:
      'inline-flex items-center justify-center gap-2 rounded-full border border-[hsl(var(--foreground)/.18)] bg-[hsl(var(--card)/.55)] px-5 py-3 text-sm font-bold text-[hsl(var(--foreground))] transition-colors duration-200 hover:border-[hsl(var(--primary)/.6)] hover:bg-[hsl(var(--primary)/.08)]',
    text: 'inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--primary))]',
  };
  return (
    <a data-testid={testId} href={href} onClick={onClick} className={classes[variant]}>
      {children}
    </a>
  );
}

function BrandMark() {
  return (
    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] shadow-[3px_3px_0_hsl(var(--accent))]">
      <span className="font-display text-sm font-bold tracking-[-.08em]">N/</span>
    </span>
  );
}

function Header({ onOrder }: { onOrder: (product?: string) => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = [
    { href: '#produk', label: 'Produk' },
    { href: '#reseller', label: 'Reseller' },
    { href: '#tentang', label: 'Kenapa Nixx?' },
    { href: '#faq', label: 'FAQ' },
  ];
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-[hsl(var(--foreground)/.1)] bg-[hsl(var(--card)/.82)] px-3 py-2.5 shadow-[0_14px_35px_rgba(39,31,75,.08)] backdrop-blur-xl sm:px-4">
        <a data-testid="link-brand" href="#top" className="group flex items-center gap-3">
          <BrandMark />
          <span className="font-display text-[15px] font-bold tracking-[-.04em]">
            nixx<span className="text-[hsl(var(--primary))]">vvip</span>
          </span>
        </a>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Navigasi utama">
          {navItems.map((item) => (
            <a
              data-testid={`link-nav-${item.label.toLowerCase().replace(/\W/g, '-')}`}
              key={item.href}
              href={item.href}
              className="text-xs font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <a data-testid="link-license-nav" href="/#license" className="text-xs font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]">
            Cek lisensi
          </a>
          <button data-testid="button-header-order" onClick={() => onOrder()} className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--foreground))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--background))] transition-transform hover:-translate-y-0.5">
            Chat owner <ArrowRight size={14} />
          </button>
        </div>
        <button
          data-testid="button-mobile-menu"
          aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
          onClick={() => setMobileOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--muted)/.7)] md:hidden"
        >
          {mobileOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>
      {mobileOpen && (
        <div className="mx-auto mt-2 max-w-7xl rounded-2xl border border-[hsl(var(--foreground)/.1)] bg-[hsl(var(--card))] p-3 shadow-xl md:hidden">
          {navItems.map((item) => (
            <a
              data-testid={`link-mobile-${item.label.toLowerCase().replace(/\W/g, '-')}`}
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/.7)]"
            >
              {item.label} <ArrowDownRight size={15} className="text-[hsl(var(--primary))]" />
            </a>
          ))}
          <a data-testid="link-mobile-license" href="/#license" onClick={() => setMobileOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/.7)]">
            Cek lisensi <ShieldCheck size={15} className="text-[hsl(var(--secondary))]" />
          </a>
          <button data-testid="button-mobile-order" onClick={() => { setMobileOpen(false); onOrder(); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-3 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]">
            Chat owner <MessageCircle size={16} />
          </button>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="hero-grid relative overflow-hidden px-5 pb-20 pt-36 sm:px-8 lg:min-h-[760px] lg:px-12 lg:pb-28 lg:pt-48">
      <div className="absolute -right-36 top-20 h-80 w-80 rounded-full bg-[hsl(var(--primary)/.2)] blur-3xl" />
      <div className="absolute -left-36 bottom-0 h-72 w-72 rounded-full bg-[hsl(var(--secondary)/.16)] blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-16">
        <div className="animate-rise-in">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--primary)/.26)] bg-[hsl(var(--primary)/.08)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--secondary))] shadow-[0_0_0_4px_hsl(var(--secondary)/.16)]" />
            Digital shop by Nixx
          </div>
          <h1 data-testid="text-hero-title" className="max-w-3xl font-display text-[clamp(3.3rem,10vw,7rem)] font-bold leading-[.91] tracking-[-.08em] text-[hsl(var(--foreground))]">
            Buy Akses Key <span className="text-[hsl(var(--primary))]">VVIP Nix</span>
          </h1>
          <p data-testid="text-hero-description" className="mt-7 max-w-lg text-base leading-7 text-[hsl(var(--muted-foreground))] sm:text-lg">
            Akses digital yang jelas, cepat, dan langsung dari owner. Pilih paketmu, chat Nixx, lalu lanjut tanpa drama.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink testId="link-hero-products" href="#produk">
              Lihat pilihan akses <ArrowDownRight size={17} />
            </ButtonLink>
            <ButtonLink testId="link-hero-chat" href={whatsappUrl()} variant="outline">
              <MessageCircle size={16} /> Tanya Nixx
            </ButtonLink>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-[hsl(var(--muted-foreground))]">
            <span className="inline-flex items-center gap-2"><BadgeCheck size={16} className="text-[hsl(var(--secondary))]" /> Owner langsung</span>
            <span className="inline-flex items-center gap-2"><Zap size={15} className="text-[hsl(var(--accent))]" /> Proses simpel</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-[hsl(var(--primary))]" /> Info transparan</span>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[490px] animate-rise-in [animation-delay:140ms]">
          <div className="animate-float-soft relative z-10 rotate-[-3deg] rounded-[2rem] border border-[hsl(var(--foreground)/.12)] bg-[hsl(var(--foreground))] p-3 shadow-[20px_25px_0_hsl(var(--secondary)/.25)]">
            <div className="rounded-[1.55rem] bg-[hsl(230_35%_20%)] p-6 text-[hsl(var(--background))] sm:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <div className="mb-7 flex items-center gap-2 text-xs font-bold tracking-[.16em] text-[hsl(var(--background)/.65)]"><span className="h-2 w-2 rounded-full bg-[hsl(var(--secondary))]" /> NIXX VVIP</div>
                  <p className="text-xs font-medium text-[hsl(var(--background)/.62)]">ACCESS PASS</p>
                  <p className="mt-1 font-display text-3xl font-bold tracking-[-.06em]">Akses Key</p>
                </div>
                <div className="rounded-2xl bg-[hsl(var(--accent))] p-3 text-[hsl(var(--foreground))]"><KeyRound size={24} /></div>
              </div>
              <div className="mt-14 flex items-end justify-between border-t border-[hsl(var(--background)/.15)] pt-5">
                <div><p className="text-[10px] uppercase tracking-[.16em] text-[hsl(var(--background)/.5)]">Mulai dari</p><p className="mt-1 font-display text-2xl font-bold">Rp10.000</p></div>
                <p className="font-mono text-[10px] tracking-[.16em] text-[hsl(var(--background)/.55)]">NXX-2024</p>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-9 -left-6 z-20 rounded-2xl border border-[hsl(var(--foreground)/.1)] bg-[hsl(var(--card))] p-4 shadow-[0_15px_30px_rgba(39,31,75,.12)] sm:-left-10">
            <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--secondary)/.14)] text-[hsl(var(--secondary))]"><Headphones size={18} /></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Butuh bantuan?</p><p className="text-sm font-bold">Chat langsung Nixx</p></div></div>
          </div>
          <div className="absolute -right-2 -top-9 flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-[hsl(var(--accent)/.55)] text-[hsl(var(--accent))] sm:-right-8"><span className="text-center text-[10px] font-bold uppercase leading-3 tracking-wider">Ready<br />to use</span></div>
        </div>
      </div>
    </section>
  );
}

function SectionIntro({ kicker, title, copy, dark = false }: { kicker: string; title: ReactNode; copy: string; dark?: boolean }) {
  return (
    <div className={`mb-11 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between ${dark ? 'text-[hsl(var(--background))]' : ''}`}>
      <div>
        <p className={`mb-3 text-[10px] font-bold uppercase tracking-[.2em] ${dark ? 'text-[hsl(var(--secondary))]' : 'text-[hsl(var(--primary))]'}`}>{kicker}</p>
        <h2 className="max-w-2xl font-display text-4xl font-bold leading-[.96] tracking-[-.065em] sm:text-5xl">{title}</h2>
      </div>
      <p className={`max-w-sm text-sm leading-6 ${dark ? 'text-[hsl(var(--background)/.62)]' : 'text-[hsl(var(--muted-foreground))]'}`}>{copy}</p>
    </div>
  );
}

function ProductCard({ product, onOrder }: { product: Product; onOrder: (product: string) => void }) {
  const Icon = product.icon;
  const accentClass = product.accent === 'cyan' ? 'text-[hsl(var(--secondary))] bg-[hsl(var(--secondary)/.12)]' : product.accent === 'coral' ? 'text-[hsl(var(--accent))] bg-[hsl(var(--accent)/.12)]' : 'text-[hsl(var(--primary))] bg-[hsl(var(--primary)/.12)]';
  return (
    <article data-testid={`card-product-${product.id}`} className={`group relative flex min-h-[310px] flex-col overflow-hidden rounded-[1.4rem] border p-6 transition-transform duration-300 hover:-translate-y-1.5 ${product.featured ? 'border-[hsl(var(--primary)/.5)] bg-[hsl(var(--primary)/.07)] shadow-[0_20px_45px_rgba(117,58,209,.12)]' : 'border-[hsl(var(--foreground)/.1)] bg-[hsl(var(--card))]'}`}>
      {product.featured && <span className="absolute right-5 top-5 rounded-full bg-[hsl(var(--primary))] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--primary-foreground))]">Favorit</span>}
      <div className="flex items-start justify-between"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accentClass}`}><Icon size={21} /></div><span className="font-mono text-[9px] font-bold tracking-wider text-[hsl(var(--muted-foreground))]">0{Number(product.id.slice(-2)) || 1}</span></div>
      <p className="mt-8 text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]">{product.eyebrow}</p>
      <h3 className="mt-2 font-display text-2xl font-bold tracking-[-.05em]">{product.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{product.description}</p>
      <div className="mt-auto flex items-end justify-between gap-3 pt-7"><p data-testid={`text-price-${product.id}`} className="font-display text-2xl font-bold tracking-[-.06em]">{product.price}</p><button data-testid={`button-order-${product.id}`} onClick={() => onOrder(product.title)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] transition-all duration-200 group-hover:rotate-[-45deg] group-hover:bg-[hsl(var(--primary))]"><ArrowRight size={17} /></button></div>
    </article>
  );
}

function Products({ onOrder }: { onOrder: (product?: string) => void }) {
  return (
    <section id="produk" className="px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionIntro kicker="01 / Pilih akses" title={<>Akses yang kamu cari.<br /><span className="text-[hsl(var(--primary))]">Tanpa muter-muter.</span></>} copy="Empat level akses untuk kebutuhan yang berbeda. Semua dimulai dari satu chat yang jelas bersama Nixx." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {keyProducts.map((product) => <ProductCard key={product.id} product={product} onOrder={onOrder} />)}
        </div>
        <div className="mt-5 flex flex-col items-start justify-between gap-4 rounded-2xl border border-dashed border-[hsl(var(--foreground)/.2)] px-5 py-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--secondary)/.12)] text-[hsl(var(--secondary))]"><CircleHelp size={17} /></div><p className="text-sm text-[hsl(var(--muted-foreground))]">Belum tahu paket yang cocok? <span className="font-bold text-[hsl(var(--foreground))]">Tanya dulu juga boleh.</span></p></div>
          <button data-testid="button-product-help" onClick={() => onOrder()} className="inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]">Chat Nixx <ArrowRight size={15} /></button>
        </div>
      </div>
    </section>
  );
}

function ResellerSection({ onOrder }: { onOrder: (product: string) => void }) {
  return (
    <section id="reseller" className="bg-[hsl(var(--foreground))] px-5 py-24 text-[hsl(var(--background))] sm:px-8 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionIntro dark kicker="02 / Buat jadi penghasilan" title={<>Naik level dengan<br /><span className="text-[hsl(var(--accent))]">Nixx Reseller.</span></>} copy="Masuk ke **Reseller Circle Nixx** dengan paket lengkap untuk menjual kembali, mengembangkan, dan mengkreasikan Script Nixx sesuai kebutuhanmu." />
        <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
          <div className="relative overflow-hidden rounded-[1.7rem] bg-[hsl(var(--primary))] p-7 sm:p-10">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border-[28px] border-[hsl(var(--secondary)/.28)]" />
            <div className="relative max-w-xl">
              <div className="mb-12 flex items-center justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--background)/.16)]"><Package size={23} /></div><p className="font-mono text-[10px] tracking-[.18em] text-[hsl(var(--background)/.65)]">NXX-RESELLER-01</p></div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--background)/.65)]">Member reseller</p>
              <h3 className="mt-3 font-display text-4xl font-bold leading-none tracking-[-.07em] sm:text-5xl">Jual akses.<br />Bangun circle.</h3>
              <div className="mt-9 grid gap-3 sm:grid-cols-2">
                {['Akses khusus reseller', 'Source code Script Nixx', 'Web Store siap dikembangkan', 'Bebas kreasikan branding & fitur', 'Dukungan onboarding owner'].map((item) => <div key={item} className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--background)/.84)]"><Check size={16} /> {item}</div>)}
              </div>
              <div className="mt-11 flex flex-col items-start justify-between gap-5 border-t border-[hsl(var(--background)/.16)] pt-6 sm:flex-row sm:items-end"><div><p className="text-[10px] uppercase tracking-[.16em] text-[hsl(var(--background)/.58)]">One time access</p><p data-testid="text-reseller-price" className="mt-1 font-display text-4xl font-bold tracking-[-.07em]">Rp120.000</p></div><button data-testid="button-order-reseller" onClick={() => onOrder('Membership Reseller Nixx (Rp120.000)')} className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--background))] px-5 py-3 text-sm font-bold text-[hsl(var(--foreground))] transition-transform hover:-translate-y-0.5">Gabung Reseller <ArrowRight size={16} /></button></div>
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-[1.7rem] border border-[hsl(var(--background)/.14)] bg-[hsl(var(--background)/.06)] p-7 sm:p-9">
            <div><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--accent)/.16)] text-[hsl(var(--accent))]"><Terminal size={21} /></div><h3 className="mt-7 font-display text-3xl font-bold tracking-[-.06em]">Open Roblox Lua Script</h3><p className="mt-3 text-sm leading-6 text-[hsl(var(--background)/.62)]">Butuh script yang open dan fleksibel? Tanyakan detail script Roblox Lua langsung ke Nixx.</p></div>
            <button data-testid="button-order-roblox-script" onClick={() => onOrder('Open Roblox Lua Script (harga via DM)')} className="mt-12 flex w-full items-center justify-between rounded-xl border border-[hsl(var(--background)/.2)] px-4 py-3 text-left text-sm font-bold transition-colors hover:border-[hsl(var(--secondary))] hover:bg-[hsl(var(--background)/.06)]"><span>Harga tersedia via DM owner Nixx</span><MoveUpRight size={17} className="text-[hsl(var(--secondary))]" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}

function AboutSection({ onOrder }: { onOrder: (product?: string) => void }) {
  return (
    <section id="tentang" className="px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionIntro kicker="03 / Kenapa Nixx?" title={<>Beli digital product,<br /><span className="text-[hsl(var(--secondary))]">rasanya tetap personal.</span></>} copy="Karena kepercayaan tidak dibangun dari banner besar. Dibangun dari komunikasi yang tepat, produk yang jelas, dan owner yang bisa dihubungi." />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: UserRound, n: '01', title: 'Langsung ke owner', copy: 'Tidak ada chatbot berlapis. Kamu bicara langsung dengan Nixx untuk pilih dan proses order.' },
            { icon: ShieldCheck, n: '02', title: 'Detail apa adanya', copy: 'Harga dan benefit ditulis jelas sejak awal. Tidak ada biaya kejutan di tengah jalan.' },
            { icon: Headphones, n: '03', title: 'Ada yang bantu', copy: 'Kalau kamu ragu, ceritakan kebutuhanmu. Rekomendasi terbaik kadang bukan paket paling mahal.' },
          ].map((item) => { const Icon = item.icon; return <div key={item.n} className="rounded-[1.4rem] border border-[hsl(var(--foreground)/.1)] bg-[hsl(var(--card))] p-6 sm:p-7"><div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--secondary)/.12)] text-[hsl(var(--secondary))]"><Icon size={20} /></div><span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">{item.n}</span></div><h3 className="mt-9 font-display text-xl font-bold tracking-[-.04em]">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{item.copy}</p></div>; })}
        </div>
        <div id="license" className="mt-5 flex flex-col items-start justify-between gap-5 rounded-[1.4rem] bg-[hsl(var(--secondary)/.1)] p-6 sm:flex-row sm:items-center sm:p-8"><div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]"><ShieldCheck size={21} /></div><div><h3 className="font-display text-xl font-bold tracking-[-.04em]">Sudah punya key?</h3><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Fitur cek lisensi akan hadir di sini. Untuk sekarang, hubungi Nixx jika ingin konfirmasi akses.</p></div></div><a data-testid="link-license-check" href="/#license" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[hsl(var(--foreground)/.15)] bg-[hsl(var(--card))] px-4 py-2.5 text-sm font-bold transition-colors hover:border-[hsl(var(--secondary))]">Cek lisensi <ArrowRight size={15} /></a></div>
        <div className="mt-20 border-y border-[hsl(var(--foreground)/.1)] py-7"><div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5 text-sm font-medium text-[hsl(var(--muted-foreground))]"><span className="font-display text-lg font-bold tracking-[-.05em] text-[hsl(var(--foreground))]">nixx<span className="text-[hsl(var(--primary))]">vvip</span></span><span>Trusted by digital buyers</span><span>Simple checkout via WhatsApp</span><span>Personal support by Nixx</span></div></div>
      </div>
    </section>
  );
}

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <section id="faq" className="bg-[hsl(var(--muted)/.48)] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr]">
        <div><p className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--primary))]">04 / Yang sering ditanya</p><h2 className="font-display text-4xl font-bold leading-[.96] tracking-[-.065em] sm:text-5xl">Biar jelas<br /><span className="text-[hsl(var(--primary))]">dari awal.</span></h2><p className="mt-6 max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">Masih ada yang belum terjawab? Satu chat ke Nixx bisa jadi jalan paling cepat.</p><a data-testid="link-faq-chat" href={whatsappUrl()} className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--foreground))] transition-colors hover:text-[hsl(var(--primary))]">Tanya pertanyaan lain <ArrowRight size={16} /></a></div>
        <div className="divide-y divide-[hsl(var(--foreground)/.12)] rounded-[1.5rem] border border-[hsl(var(--foreground)/.1)] bg-[hsl(var(--card))] px-5 sm:px-7">{faqs.map((faq, index) => <div key={faq.question}><button data-testid={`button-faq-${index}`} onClick={() => setOpenIndex(openIndex === index ? null : index)} className="flex w-full items-center justify-between gap-5 py-5 text-left text-sm font-bold sm:py-6">{faq.question}{openIndex === index ? <Minus size={17} className="shrink-0 text-[hsl(var(--primary))]" /> : <ChevronDown size={17} className="shrink-0 text-[hsl(var(--muted-foreground))]" />}</button>{openIndex === index && <p data-testid={`text-faq-answer-${index}`} className="max-w-2xl pb-5 pr-6 text-sm leading-6 text-[hsl(var(--muted-foreground))] sm:pb-6">{faq.answer}</p>}</div>)}</div>
      </div>
    </section>
  );
}

function Footer({ onOrder }: { onOrder: () => void }) {
  return (
    <footer className="bg-[hsl(var(--foreground))] px-5 pb-8 pt-16 text-[hsl(var(--background))] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl"><div className="grid gap-12 border-b border-[hsl(var(--background)/.13)] pb-14 md:grid-cols-[1.2fr_.8fr_.8fr]"><div><div className="flex items-center gap-3"><BrandMark /><span className="font-display text-xl font-bold tracking-[-.06em]">nixx<span className="text-[hsl(var(--accent))]">vvip</span></span></div><p className="mt-5 max-w-xs text-sm leading-6 text-[hsl(var(--background)/.6)]">Akses digital yang cepat, jelas, dan personal. Dibuat untuk kamu yang mau langsung jalan.</p><button data-testid="button-footer-chat" onClick={onOrder} className="mt-7 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--background))] px-5 py-3 text-sm font-bold text-[hsl(var(--foreground))] transition-transform hover:-translate-y-0.5">Chat owner Nixx <MessageCircle size={16} /></button></div><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--background)/.45)]">Explore</p><div className="mt-5 flex flex-col gap-3 text-sm text-[hsl(var(--background)/.7)]"><a data-testid="link-footer-products" href="#produk" className="transition-colors hover:text-[hsl(var(--background))]">Produk akses</a><a data-testid="link-footer-reseller" href="#reseller" className="transition-colors hover:text-[hsl(var(--background))]">Reseller</a><a data-testid="link-footer-faq" href="#faq" className="transition-colors hover:text-[hsl(var(--background))]">FAQ</a></div></div><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--background)/.45)]">Important</p><div className="mt-5 flex flex-col gap-3 text-sm text-[hsl(var(--background)/.7)]"><a data-testid="link-footer-license" href="/#license" className="transition-colors hover:text-[hsl(var(--background))]">Cek lisensi</a><a data-testid="link-footer-wa" href={whatsappUrl()} className="transition-colors hover:text-[hsl(var(--background))]">WhatsApp owner</a><span>Owner: Nixx</span></div></div></div><div className="flex flex-col justify-between gap-3 pt-6 text-xs text-[hsl(var(--background)/.45)] sm:flex-row"><span>© {new Date().getFullYear()} Nixx VVIP Store.</span><span>Digital access, made personal.</span></div></div>
    </footer>
  );
}

function OrderModal({ product, onClose }: { product: string | undefined; onClose: () => void }) {
  if (!product) return null;
  return (
    <div role="presentation" className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(var(--foreground)/.48)] p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="order-title" className="w-full max-w-lg rounded-t-[1.8rem] border border-[hsl(var(--foreground)/.12)] bg-[hsl(var(--card))] p-6 shadow-2xl sm:rounded-[1.8rem] sm:p-8">
        <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--primary))]">Ready to order</p><h2 id="order-title" className="mt-2 font-display text-3xl font-bold tracking-[-.06em]">Lanjut ke WhatsApp</h2></div><button data-testid="button-close-order-modal" aria-label="Tutup order" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--muted))] transition-colors hover:bg-[hsl(var(--muted-border))]"><X size={17} /></button></div>
        <div className="mt-7 rounded-2xl border border-[hsl(var(--primary)/.22)] bg-[hsl(var(--primary)/.07)] p-4"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Produk pilihanmu</p><p data-testid="text-selected-product" className="mt-1 font-display text-xl font-bold">{product}</p></div>
        <p className="mt-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Pesan chat sudah disiapkan. Klik tombol di bawah untuk membuka WhatsApp dan kirim pertanyaan ke owner Nixx.</p>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button data-testid="button-cancel-order" onClick={onClose} className="rounded-full px-5 py-3 text-sm font-bold text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))]">Nanti dulu</button><a data-testid="link-confirm-order" href={whatsappUrl(product)} target="_blank" rel="noreferrer" onClick={onClose} className="inline-flex items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5">Buka WhatsApp <ArrowRight size={16} /></a></div>
      </div>
    </div>
  );
}

function Home() {
  const [selectedProduct, setSelectedProduct] = useState<string>();
  const openOrder = (product?: string) => setSelectedProduct(product ?? 'Bantuan memilih produk Nixx VVIP');
  useEffect(() => {
    document.body.classList.add('noise');
    return () => document.body.classList.remove('noise');
  }, []);
  return (
    <div className="min-h-[100dvh] overflow-hidden">
      <Header onOrder={openOrder} />
      <main><Hero /><Products onOrder={openOrder} /><ResellerSection onOrder={openOrder} /><AboutSection onOrder={openOrder} /><FaqSection /></main>
      <Footer onOrder={() => openOrder()} />
      <OrderModal product={selectedProduct} onClose={() => setSelectedProduct(undefined)} />
    </div>
  );
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Home} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;