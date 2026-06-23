
-- ===== ENUMS =====
CREATE TYPE public.order_status AS ENUM ('pending','paid','preparing','ready','completed','cancelled');
CREATE TYPE public.payment_method AS ENUM ('solana','qris','bank_transfer');
CREATE TYPE public.tx_status AS ENUM ('pending','confirmed','failed');
CREATE TYPE public.membership_level AS ENUM ('bronze','silver','gold','platinum');
CREATE TYPE public.app_role AS ENUM ('customer','cashier','admin');
CREATE TYPE public.notif_type AS ENUM ('wallet_connected','payment_success','order_accepted','preparing','ready','completed','promo');

-- ===== PROFILES (wallet identity) =====
CREATE TABLE public.profiles (
  wallet_address TEXT PRIMARY KEY,
  nickname TEXT,
  avatar_url TEXT,
  membership_level public.membership_level NOT NULL DEFAULT 'bronze',
  total_points INTEGER NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent_idr BIGINT NOT NULL DEFAULT 0,
  last_signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are publicly viewable" ON public.profiles FOR SELECT USING (true);
-- writes go through server functions using service_role

-- ===== APP ROLES =====
CREATE TABLE public.app_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES public.profiles(wallet_address) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(wallet_address, role)
);
GRANT SELECT ON public.app_roles TO anon, authenticated;
GRANT ALL ON public.app_roles TO service_role;
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Roles readable" ON public.app_roles FOR SELECT USING (true);

-- ===== MEMBERSHIPS (reference) =====
CREATE TABLE public.memberships (
  level public.membership_level PRIMARY KEY,
  display_name TEXT NOT NULL,
  min_spend_idr BIGINT NOT NULL,
  perks JSONB NOT NULL DEFAULT '[]'::jsonb,
  color TEXT NOT NULL
);
GRANT SELECT ON public.memberships TO anon, authenticated;
GRANT ALL ON public.memberships TO service_role;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Memberships readable" ON public.memberships FOR SELECT USING (true);

-- ===== CATEGORIES =====
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories readable" ON public.categories FOR SELECT USING (true);

-- ===== PRODUCTS =====
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  composition TEXT,
  nutrition JSONB DEFAULT '{}'::jsonb,
  origin TEXT,
  image_url TEXT,
  price_idr INTEGER NOT NULL,
  price_sol NUMERIC(12,6) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  is_bestseller BOOLEAN NOT NULL DEFAULT false,
  promo_pct INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products readable" ON public.products FOR SELECT USING (is_active = true);

-- ===== VOUCHERS =====
CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_pct INTEGER NOT NULL,
  min_order_idr INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER NOT NULL DEFAULT 100,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vouchers TO anon, authenticated;
GRANT ALL ON public.vouchers TO service_role;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active vouchers readable" ON public.vouchers FOR SELECT USING (is_active = true);

-- ===== ORDERS =====
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL,
  subtotal_idr INTEGER NOT NULL,
  discount_idr INTEGER NOT NULL DEFAULT 0,
  tax_idr INTEGER NOT NULL DEFAULT 0,
  total_idr INTEGER NOT NULL,
  total_sol NUMERIC(12,6) NOT NULL,
  voucher_code TEXT,
  payment_method public.payment_method NOT NULL DEFAULT 'solana',
  status public.order_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_wallet ON public.orders(wallet_address);
CREATE INDEX idx_orders_status ON public.orders(status);
GRANT SELECT ON public.orders TO anon, authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Orders readable" ON public.orders FOR SELECT USING (true);

-- ===== ORDER ITEMS =====
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  unit_price_idr INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  subtotal_idr INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
GRANT SELECT ON public.order_items TO anon, authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order items readable" ON public.order_items FOR SELECT USING (true);

-- ===== TRANSACTIONS (blockchain) =====
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  wallet_address TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  tx_signature TEXT UNIQUE,
  block_time BIGINT,
  total_sol NUMERIC(12,6) NOT NULL,
  status public.tx_status NOT NULL DEFAULT 'pending',
  explorer_url TEXT,
  network TEXT NOT NULL DEFAULT 'devnet',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tx_wallet ON public.transactions(wallet_address);
CREATE INDEX idx_tx_sig ON public.transactions(tx_signature);
GRANT SELECT ON public.transactions TO anon, authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transactions readable" ON public.transactions FOR SELECT USING (true);

-- ===== REVIEWS =====
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  wallet_address TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_product ON public.reviews(product_id);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews readable" ON public.reviews FOR SELECT USING (true);

-- ===== WISHLIST =====
CREATE TABLE public.wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(wallet_address, product_id)
);
CREATE INDEX idx_wishlist_wallet ON public.wishlist(wallet_address);
GRANT SELECT ON public.wishlist TO anon, authenticated;
GRANT ALL ON public.wishlist TO service_role;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Wishlist readable" ON public.wishlist FOR SELECT USING (true);

-- ===== NOTIFICATIONS =====
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  type public.notif_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_wallet ON public.notifications(wallet_address);
GRANT SELECT ON public.notifications TO anon, authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notifications readable" ON public.notifications FOR SELECT USING (true);

-- ===== LOYALTY LEDGER =====
CREATE TABLE public.loyalty_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_loyalty_wallet ON public.loyalty_ledger(wallet_address);
GRANT SELECT ON public.loyalty_ledger TO anon, authenticated;
GRANT ALL ON public.loyalty_ledger TO service_role;
ALTER TABLE public.loyalty_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Loyalty readable" ON public.loyalty_ledger FOR SELECT USING (true);

-- ===== updated_at trigger =====
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== SEED DATA =====
INSERT INTO public.memberships(level, display_name, min_spend_idr, color, perks) VALUES
  ('bronze','Bronze',0,'#C4A484','["1 point per Rp 10.000","Akses promo mingguan"]'::jsonb),
  ('silver','Silver',500000,'#9CA3AF','["1.5x point","Free upsize 1x/bulan"]'::jsonb),
  ('gold','Gold',1500000,'#F59E0B','["2x point","Priority brewing","Voucher ulang tahun"]'::jsonb),
  ('platinum','Platinum',5000000,'#9945FF','["3x point","Exclusive single-origin drop","Concierge barista"]'::jsonb);

INSERT INTO public.categories(name, slug, icon, sort_order) VALUES
  ('Espresso Based','espresso','☕',1),
  ('Manual Brew','manual-brew','🫖',2),
  ('Signature','signature','✨',3),
  ('Cold Brew','cold-brew','🧊',4);

WITH c AS (SELECT id, slug FROM public.categories)
INSERT INTO public.products(category_id, name, slug, description, composition, origin, image_url, price_idr, price_sol, stock, rating_avg, rating_count, is_bestseller, promo_pct, nutrition) VALUES
  ((SELECT id FROM c WHERE slug='espresso'),'Caffè Latte','caffe-latte','Espresso lembut berpadu steamed milk dengan microfoam tipis.','Espresso, susu segar, microfoam','Aceh Gayo','https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=800',38000,0.045,42,4.8,128,true,0,'{"calories":180,"caffeine_mg":75}'),
  ((SELECT id FROM c WHERE slug='espresso'),'Cappuccino','cappuccino','Komposisi sempurna espresso, susu, dan foam tebal.','Espresso, susu, foam','Toraja Sapan','https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800',36000,0.042,35,4.7,96,false,10,'{"calories":150,"caffeine_mg":75}'),
  ((SELECT id FROM c WHERE slug='espresso'),'Americano','americano','Espresso shot bold ditambah air panas, clean & punchy.','Double espresso, air panas','Bali Kintamani','https://images.unsplash.com/photo-1494314671902-399b18174975?w=800',32000,0.038,60,4.6,210,true,0,'{"calories":15,"caffeine_mg":150}'),
  ((SELECT id FROM c WHERE slug='manual-brew'),'V60 Single Origin','v60-single-origin','Pour over dengan rasio 1:15, body clean dengan note floral.','Biji single origin, air mineral','Java Preanger','https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800',45000,0.053,18,4.9,74,true,0,'{"calories":5,"caffeine_mg":120}'),
  ((SELECT id FROM c WHERE slug='manual-brew'),'Japanese Iced','japanese-iced','Brewed langsung di atas es, flavor preserved sempurna.','Biji washed, es batu, air','Flores Bajawa','https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800',48000,0.057,22,4.8,52,false,0,'{"calories":10,"caffeine_mg":130}'),
  ((SELECT id FROM c WHERE slug='signature'),'BrewChain Signature','brewchain-signature','House blend dengan touch palm sugar dan oat milk.','Espresso, oat milk, palm sugar','House Blend','https://images.unsplash.com/photo-1542990253-0b8be3f9d2cb?w=800',52000,0.061,28,4.9,189,true,15,'{"calories":210,"caffeine_mg":90}'),
  ((SELECT id FROM c WHERE slug='signature'),'Solana Sunset','solana-sunset','Espresso, raspberry syrup, dan splash sparkling water.','Espresso, raspberry, sparkling water','Papua Wamena','https://images.unsplash.com/photo-1568649929103-28ffbefaca1e?w=800',55000,0.065,15,4.7,67,false,0,'{"calories":140,"caffeine_mg":80}'),
  ((SELECT id FROM c WHERE slug='cold-brew'),'24h Cold Brew','cold-brew-24h','Slow steeped 24 jam, smooth chocolatey finish.','Coarse ground beans, cold water','Sumatra Mandheling','https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800',42000,0.049,30,4.8,143,true,0,'{"calories":5,"caffeine_mg":200}');

INSERT INTO public.vouchers(code, description, discount_pct, min_order_idr, max_uses, expires_at) VALUES
  ('BREW10','Diskon 10% untuk pesanan pertama',10,30000,500,now() + interval '60 days'),
  ('SOLANA20','Bayar pakai SOL hemat 20%',20,50000,200,now() + interval '30 days');
