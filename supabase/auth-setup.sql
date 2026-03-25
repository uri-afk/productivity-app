-- ============================================================
-- Taskflow – Auth & Invite Setup
-- Run once in Supabase Dashboard → SQL Editor
-- BEFORE running: replace REPLACE_WITH_YOUR_EMAIL with your
-- actual admin email address (the one you log in with).
-- ============================================================

-- ── 1. Profiles ──────────────────────────────────────────────
-- One row per approved user. Created by the app after invite
-- validation. Users without a profile are denied access.

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  is_disabled BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles_read_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Users create their own profile (during invite acceptance)
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Admin can read and update all profiles
CREATE POLICY "profiles_admin_all" ON public.profiles
  TO authenticated
  USING     (auth.jwt() ->> 'email' = 'REPLACE_WITH_YOUR_EMAIL')
  WITH CHECK(auth.jwt() ->> 'email' = 'REPLACE_WITH_YOUR_EMAIL');


-- ── 2. Invites ───────────────────────────────────────────────
-- Admin creates invites; invited users click the link to register.

CREATE TABLE IF NOT EXISTS public.invites (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email       TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  revoked     BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Admin can do everything with invites
CREATE POLICY "invites_admin_all" ON public.invites
  TO authenticated
  USING     (auth.jwt() ->> 'email' = 'REPLACE_WITH_YOUR_EMAIL')
  WITH CHECK(auth.jwt() ->> 'email' = 'REPLACE_WITH_YOUR_EMAIL');

-- Authenticated users can read their own pending invite (for post-signup check)
CREATE POLICY "invites_read_own" ON public.invites
  FOR SELECT TO authenticated
  USING (email = auth.jwt() ->> 'email');


-- ── 3. validate_invite_token RPC ─────────────────────────────
-- Called from the invite page BEFORE the user has an account,
-- so it runs as SECURITY DEFINER and is granted to anon.
-- Returns the invite's email and whether it is still valid.

CREATE OR REPLACE FUNCTION public.validate_invite_token(p_token TEXT)
RETURNS TABLE(invite_email TEXT, invite_valid BOOLEAN)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT
    email                                                           AS invite_email,
    (expires_at > now() AND revoked = false AND accepted_at IS NULL) AS invite_valid
  FROM public.invites
  WHERE token = p_token;
$$;

GRANT EXECUTE ON FUNCTION public.validate_invite_token TO anon, authenticated;


-- ── 4. accept_invite RPC ─────────────────────────────────────
-- Marks an invite as accepted and creates the user's profile
-- in a single atomic transaction.  Called right after sign-up
-- or first OAuth login.

CREATE OR REPLACE FUNCTION public.accept_invite(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_invite public.invites%ROWTYPE;
BEGIN
  SELECT * INTO v_invite
  FROM public.invites
  WHERE token = p_token
    AND revoked = false
    AND accepted_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Mark invite accepted
  UPDATE public.invites
  SET accepted_at = now(), accepted_by = auth.uid()
  WHERE id = v_invite.id;

  -- Create profile (idempotent)
  INSERT INTO public.profiles (id, email)
  VALUES (auth.uid(), v_invite.email)
  ON CONFLICT (id) DO NOTHING;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invite TO authenticated;


-- ── Done ─────────────────────────────────────────────────────
-- Next steps (see README / instructions):
-- 1. Enable Google OAuth in Supabase Dashboard → Auth → Providers
-- 2. Add your Vercel URL to Supabase Auth → URL Configuration → Redirect URLs
-- 3. Set VITE_ADMIN_EMAIL in your Vercel environment variables
