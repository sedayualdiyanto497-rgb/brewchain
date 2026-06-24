-- Remove overly permissive public SELECT policies. Server functions use the
-- admin/service-role client which bypasses RLS, so these tables remain readable
-- via server fns. Realtime over the publishable/anon key will no longer leak
-- arbitrary rows.

DROP POLICY IF EXISTS "Roles readable" ON public.app_roles;
DROP POLICY IF EXISTS "Loyalty readable" ON public.loyalty_ledger;
DROP POLICY IF EXISTS "Notifications readable" ON public.notifications;
DROP POLICY IF EXISTS "Order items readable" ON public.order_items;
DROP POLICY IF EXISTS "Orders readable" ON public.orders;
DROP POLICY IF EXISTS "Profiles are publicly viewable" ON public.profiles;
DROP POLICY IF EXISTS "Transactions readable" ON public.transactions;
DROP POLICY IF EXISTS "Wishlist readable" ON public.wishlist;
DROP POLICY IF EXISTS "Reviews readable" ON public.reviews;
DROP POLICY IF EXISTS "Active vouchers readable" ON public.vouchers;

-- Public-facing reviews: keep them readable, but only the non-PII columns.
-- We expose a SECURITY DEFINER view-backed pattern via the server fn instead.
-- (No new anon SELECT on reviews / vouchers; both are read via server fns.)

-- Revoke direct anon read on sensitive tables (defensive: GRANTs were never
-- explicitly issued, but make sure).
REVOKE SELECT ON public.app_roles, public.loyalty_ledger, public.notifications,
  public.order_items, public.orders, public.profiles, public.transactions,
  public.wishlist, public.reviews, public.vouchers FROM anon;