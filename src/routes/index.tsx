import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Coffee,
  Zap,
  Shield,
  Sparkles,
  Globe,
  Wallet,
  Receipt,
  ChevronRight,
  Star,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ConnectWalletButton } from "@/components/brewchain/ConnectWalletButton";
import { ClientOnly } from "@/components/brewchain/ClientOnly";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BrewChain — Pesan kopi, bayar dengan Solana" },
      { name: "description", content: "Web3 coffee shop di Indonesia. Bayar dengan SOL, lacak transaksi on-chain, dan kumpulkan loyalty point yang transparan." },
      { property: "og:title", content: "BrewChain — Premium Coffee on Solana" },
      { property: "og:description", content: "Hubungkan Phantom / Solflare / Backpack, pilih kopi favorit, bayar instan di Solana Devnet." },
      { property: "og:image", content: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200" },
    ],
  }),
  component: LandingPage,
});

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
};

function LandingPage() {
  return (
    <AppShell>
      <Hero />
      <Stats />
      <Explain />
      <HowItWorks />
      <Advantages />
      <Testimonials />
      <FaqSection />
      <CTASection />
    </AppShell>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden hero-grid-bg">
      <div className="container mx-auto grid gap-12 px-4 pt-20 pb-28 md:grid-cols-2 md:items-center md:pt-28 md:pb-36">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Badge className="rounded-full px-3 py-1 gap-1.5 gradient-solana text-white border-0 shadow-glow-sol">
            <Sparkles className="size-3" /> Built on Solana
          </Badge>
          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            Kopi premium,
            <br />
            <span className="text-gradient-solana">bayar dengan SOL.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            BrewChain menggabungkan ritual ngopi dengan transparansi blockchain. Hubungkan wallet, pilih kopi, bayar instan di Solana Devnet — semuanya tercatat dan bisa dilacak siapa saja.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ClientOnly fallback={<div className="h-11 w-48 rounded-full bg-secondary/60" />}>
              <ConnectWalletButton size="lg" />
            </ClientOnly>
            <Button asChild size="lg" variant="outline" className="rounded-full">
              <Link to="/menu">Lihat Menu <ArrowRight className="ml-1.5 size-4" /></Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-600" /> Phantom · Solflare · Backpack</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-600" /> Sign-in dengan signature</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-600" /> Tanpa email / password</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative"
        >
          <div className="relative mx-auto aspect-[4/5] max-w-md overflow-hidden rounded-[2rem] shadow-elevated">
            <img
              src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&auto=format&fit=crop"
              alt="Latte art premium"
              className="size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute -left-6 top-10 glass rounded-2xl p-4 shadow-soft animate-float w-56"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="size-2 rounded-full bg-emerald-500" /> Tx confirmed · Devnet
            </div>
            <div className="mt-1 font-mono text-sm font-semibold">0.061 SOL</div>
            <div className="mt-0.5 text-xs text-muted-foreground">BrewChain Signature ×1</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="absolute -right-4 bottom-12 glass rounded-2xl p-4 shadow-soft animate-float w-56"
            style={{ animationDelay: "1.5s" }}
          >
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-full gradient-solana"><Star className="size-4 text-white" /></div>
              <div>
                <div className="text-xs text-muted-foreground">Loyalty Earned</div>
                <div className="text-sm font-semibold">+52 Points</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { label: "Transaksi on-chain", value: "12.4K+" },
    { label: "Customer aktif", value: "3.2K" },
    { label: "Avg confirm time", value: "0.8s" },
    { label: "Network", value: "Solana" },
  ];
  return (
    <section className="container mx-auto px-4 -mt-12">
      <motion.div {...fadeUp} className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl glass-strong shadow-soft md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card/40 p-6 text-center">
            <div className="font-display text-3xl font-bold text-gradient-solana">{s.value}</div>
            <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}

function Explain() {
  return (
    <section className="container mx-auto grid gap-12 px-4 py-28 md:grid-cols-2 md:items-center">
      <motion.div {...fadeUp}>
        <Badge variant="secondary" className="rounded-full">Apa itu BrewChain</Badge>
        <h2 className="mt-4 font-display text-4xl font-bold md:text-5xl">Kafe yang berbicara bahasa blockchain.</h2>
        <p className="mt-5 text-lg text-muted-foreground">
          BrewChain adalah toko kopi yang menerima pembayaran Solana. Setiap transaksi tercatat di blockchain sebagai bukti yang tidak bisa diubah, dan pengguna tetap pegang kendali penuh atas dana mereka — tanpa middleman, tanpa biaya kartu.
        </p>
        <ul className="mt-6 space-y-3">
          {[
            "Data sensitif transaksi tersimpan on-chain, data katalog tersimpan rapi di database",
            "Login lewat tanda tangan wallet, bukan password",
            "Sistem siap untuk integrasi Anchor smart contract",
          ].map((t) => (
            <li key={t} className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> <span>{t}</span></li>
          ))}
        </ul>
      </motion.div>
      <motion.div {...fadeUp} className="relative aspect-square overflow-hidden rounded-[2rem] shadow-elevated">
        <img src="https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=900" alt="Barista" className="size-full object-cover" />
      </motion.div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: Wallet, title: "Hubungkan Wallet", desc: "Pilih Phantom, Solflare, atau Backpack. Sign message untuk autentikasi." },
    { icon: Coffee, title: "Pilih Kopi", desc: "Pesan dari menu signature, manual brew, atau cold brew. Tambah ke cart." },
    { icon: Zap, title: "Bayar dengan SOL", desc: "Approve transaksi di wallet. Konfirmasi tercatat di Solana Devnet." },
    { icon: Receipt, title: "Tracking Realtime", desc: "Pantau status pesanan & lihat transaksi di Solana Explorer." },
  ];
  return (
    <section className="bg-secondary/30 py-28">
      <div className="container mx-auto px-4">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="rounded-full">Cara kerja</Badge>
          <h2 className="mt-4 font-display text-4xl font-bold md:text-5xl">Dari wallet ke gelas kopi dalam 4 langkah.</h2>
        </motion.div>
        <div className="mt-14 grid gap-6 md:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div key={s.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }} className="group relative rounded-3xl bg-card p-6 shadow-soft transition hover:shadow-elevated">
              <div className="mb-4 grid size-12 place-items-center rounded-2xl gradient-coffee text-cream">
                <s.icon className="size-5" />
              </div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Step {i + 1}</div>
              <h3 className="mt-1 font-display text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Advantages() {
  const items = [
    { icon: Shield, title: "Self custody", desc: "Tidak ada saldo yang dititipkan ke kafe. Dana tetap di wallet Anda." },
    { icon: Zap, title: "Konfirmasi cepat", desc: "Solana memproses transaksi dalam hitungan detik." },
    { icon: Globe, title: "Transparan publik", desc: "Setiap pembayaran bisa diaudit di Solana Explorer oleh siapa saja." },
    { icon: Sparkles, title: "Loyalty on-chain ready", desc: "Sistem poin & membership siap dimigrasikan ke smart contract Anchor." },
  ];
  return (
    <section className="container mx-auto px-4 py-28">
      <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
        <Badge variant="secondary" className="rounded-full">Kenapa Web3</Badge>
        <h2 className="mt-4 font-display text-4xl font-bold md:text-5xl">Empat alasan kafe kami jalan di Solana.</h2>
      </motion.div>
      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {items.map((i, idx) => (
          <motion.div key={i.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: idx * 0.06 }} className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft">
            <div className="grid size-11 place-items-center rounded-2xl gradient-solana text-white shadow-glow-sol">
              <i.icon className="size-5" />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold">{i.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{i.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  const t = [
    { name: "Raka P.", role: "Solana Developer", quote: "Akhirnya bisa bayar latte tanpa swap dulu ke fiat. Smooth banget di Phantom." },
    { name: "Diandra M.", role: "NFT Artist", quote: "Tampilan kafenya premium, dan ngeliat transaksi sendiri di explorer tuh keren." },
    { name: "Bayu A.", role: "Quant Trader", quote: "Setelan loyalty point yang bisa diaudit jadi nilai tambah besar." },
  ];
  return (
    <section className="bg-secondary/30 py-28">
      <div className="container mx-auto px-4">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="rounded-full">Testimoni</Badge>
          <h2 className="mt-4 font-display text-4xl font-bold md:text-5xl">Cerita dari komunitas pertama kami.</h2>
        </motion.div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {t.map((x, i) => (
            <motion.div key={x.name} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.07 }} className="rounded-3xl bg-card p-6 shadow-soft">
              <div className="flex gap-0.5 text-amber-500">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className="size-4 fill-current" />)}</div>
              <p className="mt-4 text-base">{`“${x.quote}”`}</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full gradient-solana font-display font-bold text-white">{x.name[0]}</div>
                <div>
                  <div className="font-semibold">{x.name}</div>
                  <div className="text-xs text-muted-foreground">{x.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const faqs = [
    { q: "Wallet apa saja yang didukung?", a: "Phantom, Solflare, dan Backpack. Selama wallet kompatibel Solana Wallet Adapter, BrewChain bisa terhubung." },
    { q: "Apakah ini mainnet?", a: "Versi ini berjalan di Solana Devnet untuk demonstrasi. Transaksi nyata tidak menggunakan dana mainnet Anda." },
    { q: "Bagaimana data saya disimpan?", a: "Data katalog (menu, profil, voucher) di database PostgreSQL. Data transaksi penting (signature, block time, total SOL) tersimpan on-chain." },
    { q: "Apakah saya butuh email?", a: "Tidak. Autentikasi sepenuhnya berbasis tanda tangan wallet." },
    { q: "Bisa pakai QRIS atau transfer bank?", a: "Bisa. Checkout mendukung Solana, QRIS, dan Transfer Bank — verifikasi dilakukan oleh kasir." },
  ];
  return (
    <section className="container mx-auto px-4 py-28">
      <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
        <Badge variant="secondary" className="rounded-full">FAQ</Badge>
        <h2 className="mt-4 font-display text-4xl font-bold md:text-5xl">Pertanyaan yang sering muncul.</h2>
      </motion.div>
      <motion.div {...fadeUp} className="mx-auto mt-10 max-w-3xl rounded-3xl bg-card p-2 shadow-soft">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`f${i}`} className="border-b last:border-0">
              <AccordionTrigger className="px-4 py-5 text-left text-base">{f.q}</AccordionTrigger>
              <AccordionContent className="px-4 pb-5 text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="container mx-auto px-4 pb-28">
      <motion.div {...fadeUp} className="relative overflow-hidden rounded-[2.5rem] gradient-coffee p-10 text-cream shadow-elevated md:p-16">
        <div className="absolute -right-20 -top-20 size-72 rounded-full gradient-solana opacity-50 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 size-72 rounded-full bg-[oklch(0.82_0.20_160)] opacity-30 blur-3xl" />
        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-bold md:text-5xl">Siap mencicipi kopi Web3 pertamamu?</h2>
            <p className="mt-3 text-cream/80">Hubungkan wallet sekarang dan dapatkan loyalty point dari transaksi pertama.</p>
          </div>
          <div className="flex gap-3">
            <ClientOnly fallback={<div className="h-11 w-44 rounded-full bg-white/20" />}>
              <ConnectWalletButton size="lg" />
            </ClientOnly>
            <Button asChild size="lg" variant="outline" className="rounded-full border-cream/40 bg-transparent text-cream hover:bg-cream/10 hover:text-cream">
              <Link to="/menu">Lihat Menu <ChevronRight className="ml-1 size-4" /></Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
