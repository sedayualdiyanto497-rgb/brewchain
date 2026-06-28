-- Admin audit log: catat semua aksi sensitif admin/kasir
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_wallet text NOT NULL,
  actor_role text,
  action text NOT NULL,
  target_type text,
  target_id text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_audit_log_actor_idx ON public.admin_audit_log (actor_wallet, created_at DESC);
CREATE INDEX admin_audit_log_action_idx ON public.admin_audit_log (action, created_at DESC);

-- No anon access; reads happen via service role (admin server functions).
GRANT ALL ON public.admin_audit_log TO service_role;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Lock down: no client can read/write directly. Service role bypasses RLS.
CREATE POLICY "no client access" ON public.admin_audit_log
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
