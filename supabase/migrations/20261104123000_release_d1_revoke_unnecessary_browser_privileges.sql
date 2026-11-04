-- Ale Coach release security hardening (D1).
-- TRUNCATE is not protected by RLS: no frontend role needs it.
-- REFERENCES and TRIGGER are DDL-adjacent privileges that browser sessions
-- also do not need. Preserve approved SELECT/DML and service_role access.
revoke truncate, references, trigger on all tables in schema public
from public, anon, authenticated;

-- Public catalog is read-only to visitors. Coaches use authenticated RLS policies.
revoke insert, update, delete on public.services, public.packages,
  public.venues, public.availability_windows, public.profiles
from public, anon;

-- Neither visitors nor ordinary authenticated accounts may write to
-- payment checkout records directly; Edge Functions use service_role RPCs.
revoke insert, update, delete, truncate on public.package_checkout_orders
from public, anon, authenticated;
