-- ============================================================
-- MIGRATION: Order-Level Attribution & Commission System
-- Date: 2026-05-21
-- Replaces: "customer ownership forever" model
-- New model: Commission is earned per ORDER that carries valid
--            agent referral attribution, not per customer.
-- ============================================================

-- ============================================================
-- SECTION 1: Extend `orders` table with attribution columns
-- ============================================================

-- The agent who is credited for THIS specific order (nullable = direct FSC sale)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS attributed_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL;

-- How the attribution was established for this order
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS attribution_source TEXT
    CHECK (attribution_source IN ('link', 'code', 'whatsapp', 'assisted_checkout', 'direct'));

-- When the attribution was established
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS attribution_timestamp TIMESTAMPTZ;

-- Which channel the order came through
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_source_type TEXT
    CHECK (order_source_type IN ('web', 'whatsapp', 'agent'));

-- First-touch attribution snapshot (who first brought this customer to FSC)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS first_touch_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS first_touch_source TEXT;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS first_touch_timestamp TIMESTAMPTZ;

-- Latest-touch attribution snapshot (most recent referral before this order)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS latest_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS latest_source TEXT;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS latest_timestamp TIMESTAMPTZ;

-- Indexes for efficient attribution queries
CREATE INDEX IF NOT EXISTS idx_orders_attributed_agent ON public.orders(attributed_agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_attribution_source ON public.orders(attribution_source);
CREATE INDEX IF NOT EXISTS idx_orders_order_source_type ON public.orders(order_source_type);

-- ============================================================
-- SECTION 2: Extend `customers` table with touch tracking
-- ============================================================

-- Lifetime first-touch (set once, never overwritten)
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS first_touch_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL;
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS first_touch_source TEXT;
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS first_touch_timestamp TIMESTAMPTZ;

-- Rolling latest-touch (always updated on each new referral interaction)
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS latest_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL;
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS latest_source TEXT;
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS latest_timestamp TIMESTAMPTZ;

-- ============================================================
-- SECTION 3: Rewrite handle_order_customer_logic (BEFORE INSERT)
-- ============================================================
-- KEY CHANGES vs old version:
--   1. REMOVED: `NEW.agent_id := NULL` for non-first orders (this was the old ownership model)
--   2. REMOVED: Blocking commission on repeat purchases
--   3. ADDED: Full attribution field resolution (attributed_agent_id, source, timestamp)
--   4. ADDED: First-touch and latest-touch capture on both orders and customers
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_order_customer_logic()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id          UUID;
  v_first_order          BOOLEAN := false;
  v_cust_first_touch_agent UUID;
  v_cust_first_touch_src   TEXT;
  v_cust_first_touch_ts    TIMESTAMPTZ;
  v_cust_latest_agent      UUID;
  v_cust_latest_src        TEXT;
  v_cust_latest_ts         TIMESTAMPTZ;
BEGIN
  -- ── 1. Find or create customer ──────────────────────────────
  SELECT
    id,
    first_touch_agent_id,
    first_touch_source,
    first_touch_timestamp,
    latest_agent_id,
    latest_source,
    latest_timestamp
  INTO
    v_customer_id,
    v_cust_first_touch_agent,
    v_cust_first_touch_src,
    v_cust_first_touch_ts,
    v_cust_latest_agent,
    v_cust_latest_src,
    v_cust_latest_ts
  FROM public.customers
  WHERE phone = NEW.customer_phone;

  IF v_customer_id IS NULL THEN
    -- Brand new customer — insert and capture first-touch
    INSERT INTO public.customers (
      name, phone, email,
      first_agent_id,
      first_touch_agent_id, first_touch_source, first_touch_timestamp,
      latest_agent_id,      latest_source,      latest_timestamp
    ) VALUES (
      NEW.customer_name, NEW.customer_phone, NEW.customer_email,
      NEW.agent_id,
      -- First-touch mirrors the current order's agent if present
      COALESCE(NEW.attributed_agent_id, NEW.agent_id),
      COALESCE(NEW.attribution_source, 'direct'),
      COALESCE(NEW.attribution_timestamp, now()),
      -- Latest-touch same as first-touch for brand-new customers
      COALESCE(NEW.attributed_agent_id, NEW.agent_id),
      COALESCE(NEW.attribution_source, 'direct'),
      COALESCE(NEW.attribution_timestamp, now())
    )
    RETURNING id,
      first_touch_agent_id, first_touch_source, first_touch_timestamp,
      latest_agent_id, latest_source, latest_timestamp
    INTO v_customer_id,
      v_cust_first_touch_agent, v_cust_first_touch_src, v_cust_first_touch_ts,
      v_cust_latest_agent, v_cust_latest_src, v_cust_latest_ts;

    v_first_order := true;
  ELSE
    -- Existing customer — update touch records

    -- Update first_agent_id (legacy column) if still null
    UPDATE public.customers
    SET first_agent_id = COALESCE(first_agent_id, NEW.agent_id)
    WHERE id = v_customer_id AND first_agent_id IS NULL AND NEW.agent_id IS NOT NULL;

    -- Update first-touch only if never set before
    IF v_cust_first_touch_agent IS NULL AND NEW.agent_id IS NOT NULL THEN
      UPDATE public.customers
      SET
        first_touch_agent_id  = COALESCE(NEW.attributed_agent_id, NEW.agent_id),
        first_touch_source    = COALESCE(NEW.attribution_source, 'direct'),
        first_touch_timestamp = COALESCE(NEW.attribution_timestamp, now())
      WHERE id = v_customer_id;
      v_cust_first_touch_agent := COALESCE(NEW.attributed_agent_id, NEW.agent_id);
      v_cust_first_touch_src   := COALESCE(NEW.attribution_source, 'direct');
      v_cust_first_touch_ts    := COALESCE(NEW.attribution_timestamp, now());
    END IF;

    -- Always update latest-touch when a new referral is present
    IF NEW.agent_id IS NOT NULL OR NEW.attributed_agent_id IS NOT NULL THEN
      UPDATE public.customers
      SET
        latest_agent_id  = COALESCE(NEW.attributed_agent_id, NEW.agent_id),
        latest_source    = COALESCE(NEW.attribution_source, 'direct'),
        latest_timestamp = COALESCE(NEW.attribution_timestamp, now())
      WHERE id = v_customer_id;
      v_cust_latest_agent := COALESCE(NEW.attributed_agent_id, NEW.agent_id);
      v_cust_latest_src   := COALESCE(NEW.attribution_source, 'direct');
      v_cust_latest_ts    := COALESCE(NEW.attribution_timestamp, now());
    END IF;

    -- Determine first-order status (informational flag only — no longer gates commission)
    IF NOT EXISTS (
      SELECT 1 FROM public.orders
      WHERE customer_id = v_customer_id
        AND status NOT IN ('cancelled', 'pending')
    ) THEN
      v_first_order := true;
    END IF;
  END IF;

  -- ── 2. Link order to customer ────────────────────────────────
  NEW.customer_id   := v_customer_id;
  NEW.is_first_order := v_first_order;

  -- ── 3. Resolve attributed_agent_id ──────────────────────────
  -- Priority: explicit attributed_agent_id > agent_id on order
  -- NOTE: We NO LONGER nullify agent_id on repeat orders (old ownership model removed).
  IF NEW.attributed_agent_id IS NULL AND NEW.agent_id IS NOT NULL THEN
    NEW.attributed_agent_id    := NEW.agent_id;
    NEW.attribution_source     := COALESCE(NEW.attribution_source, 'direct');
    NEW.attribution_timestamp  := COALESCE(NEW.attribution_timestamp, now());
  END IF;

  -- ── 4. Populate order-level touch snapshots ──────────────────
  NEW.first_touch_agent_id  := v_cust_first_touch_agent;
  NEW.first_touch_source    := v_cust_first_touch_src;
  NEW.first_touch_timestamp := v_cust_first_touch_ts;

  -- Latest-touch: if this order itself has agent attribution, use it;
  -- otherwise carry forward what's on the customer record
  IF NEW.attributed_agent_id IS NOT NULL THEN
    NEW.latest_agent_id  := NEW.attributed_agent_id;
    NEW.latest_source    := NEW.attribution_source;
    NEW.latest_timestamp := NEW.attribution_timestamp;
  ELSE
    NEW.latest_agent_id  := v_cust_latest_agent;
    NEW.latest_source    := v_cust_latest_src;
    NEW.latest_timestamp := v_cust_latest_ts;
  END IF;

  -- ── 5. Set order_source_type default if missing ──────────────
  IF NEW.order_source_type IS NULL THEN
    NEW.order_source_type := CASE
      WHEN NEW.channel = 'whatsapp' THEN 'whatsapp'
      WHEN NEW.channel = 'agent'    THEN 'agent'
      ELSE 'web'
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Ensure trigger is wired correctly
DROP TRIGGER IF EXISTS trigger_handle_order_customer_logic ON public.orders;
CREATE TRIGGER trigger_handle_order_customer_logic
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_order_customer_logic();

-- ============================================================
-- SECTION 4: Rewrite create_pending_commission (AFTER INSERT)
-- ============================================================
-- KEY CHANGES vs old version:
--   1. REMOVED: `is_first_order` gate — commissions now fire on
--      EVERY order where attributed_agent_id IS NOT NULL
--   2. PRESERVED: Full profit intelligence (base_profit, surplus_profit, gross_margin)
--   3. Uses attributed_agent_id (new column) with fallback to agent_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_pending_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_agent_id         UUID;
  v_agent_rate       NUMERIC;
  v_commission_amount NUMERIC;
  v_max_commission   NUMERIC;
  v_base_profit      NUMERIC;
BEGIN
  -- ── Profit Intelligence (always calculated) ──────────────────
  v_base_profit    := NEW.total * 0.30;
  v_max_commission := NEW.total * 0.15;

  -- Resolve which agent (prefer the new attributed_agent_id, fallback to legacy agent_id)
  v_agent_id := COALESCE(NEW.attributed_agent_id, NEW.agent_id);

  IF v_agent_id IS NOT NULL THEN
    -- ── AGENT-ATTRIBUTED ORDER ────────────────────────────────
    -- Get current agent commission rate (tier-based, default Tier 1 = 8%)
    SELECT COALESCE(commission_rate, 8)
    INTO v_agent_rate
    FROM public.agents
    WHERE id = v_agent_id;

    -- Default to Tier 1 if agent not found (safety guard)
    IF v_agent_rate IS NULL THEN
      v_agent_rate := 8;
    END IF;

    v_commission_amount := NEW.total * (v_agent_rate / 100);

    -- Insert pending commission record for this specific order
    INSERT INTO public.commissions (agent_id, order_id, amount, status)
    VALUES (v_agent_id, NEW.id, v_commission_amount, 'pending');

    -- Profit intelligence: surplus = difference between max buffer and agent's rate
    UPDATE public.orders
    SET
      base_profit   = v_base_profit,
      surplus_profit = v_max_commission - v_commission_amount,
      surplus_type   = 'agent',
      gross_margin   = v_base_profit + (v_max_commission - v_commission_amount)
    WHERE id = NEW.id;

  ELSE
    -- ── DIRECT FSC SALE (no attribution) ─────────────────────
    -- Full 15% buffer stays as surplus since no commission is paid out
    UPDATE public.orders
    SET
      base_profit    = v_base_profit,
      surplus_profit = v_max_commission,
      surplus_type   = 'direct',
      gross_margin   = v_base_profit + v_max_commission
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger is wired correctly (AFTER INSERT so order row exists for FK)
DROP TRIGGER IF EXISTS trigger_create_pending_commission ON public.orders;
CREATE TRIGGER trigger_create_pending_commission
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.create_pending_commission();

-- ============================================================
-- SECTION 5: Backfill existing orders with attribution data
-- ============================================================
-- For all existing orders that have agent_id set, populate the
-- new attributed_agent_id column so historical data is consistent.
-- We do NOT create retroactive commissions — only schema alignment.
-- ============================================================

UPDATE public.orders
SET
  attributed_agent_id   = agent_id,
  attribution_source    = CASE
    WHEN channel = 'whatsapp' THEN 'whatsapp'
    WHEN channel = 'agent'    THEN 'assisted_checkout'
    ELSE 'link'
  END,
  attribution_timestamp = created_at,
  order_source_type     = CASE
    WHEN channel = 'whatsapp' THEN 'whatsapp'
    WHEN channel = 'agent'    THEN 'agent'
    ELSE 'web'
  END,
  first_touch_agent_id  = agent_id,
  first_touch_source    = CASE
    WHEN channel = 'whatsapp' THEN 'whatsapp'
    WHEN channel = 'agent'    THEN 'assisted_checkout'
    ELSE 'link'
  END,
  first_touch_timestamp = created_at,
  latest_agent_id       = agent_id,
  latest_source         = CASE
    WHEN channel = 'whatsapp' THEN 'whatsapp'
    WHEN channel = 'agent'    THEN 'assisted_checkout'
    ELSE 'link'
  END,
  latest_timestamp      = created_at
WHERE agent_id IS NOT NULL
  AND attributed_agent_id IS NULL;

-- Backfill direct FSC orders (no agent) with 'direct' source
UPDATE public.orders
SET
  attribution_source  = 'direct',
  order_source_type   = CASE
    WHEN channel = 'whatsapp' THEN 'whatsapp'
    ELSE 'web'
  END
WHERE agent_id IS NULL
  AND attribution_source IS NULL;

-- Backfill customer touch records from existing first_agent_id
UPDATE public.customers c
SET
  first_touch_agent_id  = c.first_agent_id,
  first_touch_source    = 'link',
  first_touch_timestamp = c.created_at,
  latest_agent_id       = c.first_agent_id,
  latest_source         = 'link',
  latest_timestamp      = c.created_at
WHERE c.first_agent_id IS NOT NULL
  AND c.first_touch_agent_id IS NULL;

-- ============================================================
-- SECTION 6: Verification notice
-- ============================================================
DO $$
DECLARE
  v_attributed_orders  INTEGER;
  v_direct_orders      INTEGER;
  v_touched_customers  INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_attributed_orders  FROM public.orders WHERE attributed_agent_id IS NOT NULL;
  SELECT COUNT(*) INTO v_direct_orders      FROM public.orders WHERE attributed_agent_id IS NULL;
  SELECT COUNT(*) INTO v_touched_customers  FROM public.customers WHERE first_touch_agent_id IS NOT NULL;

  RAISE NOTICE '✅ Order Attribution Migration Complete';
  RAISE NOTICE '   Agent-attributed orders : %', v_attributed_orders;
  RAISE NOTICE '   Direct FSC orders       : %', v_direct_orders;
  RAISE NOTICE '   Customers with touch    : %', v_touched_customers;
  RAISE NOTICE '   Commission model        : PER-ORDER (not per-customer)';
END;
$$;
