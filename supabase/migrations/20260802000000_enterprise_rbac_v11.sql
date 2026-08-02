-- Enterprise Commerce OS V11.0 Migration: Additive Enterprise RBAC, Workspaces & Decision Intelligence

-- 1. Create staff_positions table
CREATE TABLE IF NOT EXISTS public.staff_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create position_permissions join table
CREATE TABLE IF NOT EXISTS public.position_permissions (
    position_id UUID REFERENCES public.staff_positions(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (position_id, permission_id)
);

-- 4. Create user_positions table
CREATE TABLE IF NOT EXISTS public.user_positions (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    position_id UUID REFERENCES public.staff_positions(id) ON DELETE CASCADE,
    assigned_by UUID,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, position_id)
);

-- 5. Create approval_requests table
CREATE TABLE IF NOT EXISTS public.approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_type TEXT NOT NULL,
    title TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    requester_id UUID REFERENCES auth.users(id),
    requester_position TEXT,
    approver_id UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 6. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id),
    actor_position TEXT,
    permission_used TEXT,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    approval_id UUID REFERENCES public.approval_requests(id),
    ip_address TEXT,
    device_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create workspace_registry table
CREATE TABLE IF NOT EXISTS public.workspace_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    icon TEXT,
    required_permissions JSONB DEFAULT '[]'::jsonb,
    routes JSONB DEFAULT '[]'::jsonb,
    widgets JSONB DEFAULT '[]'::jsonb,
    navigation JSONB DEFAULT '[]'::jsonb,
    priority INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create widget_registry table
CREATE TABLE IF NOT EXISTS public.widget_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    workspace_code TEXT NOT NULL,
    required_permissions JSONB DEFAULT '[]'::jsonb,
    priority INT DEFAULT 0,
    dependencies JSONB DEFAULT '[]'::jsonb,
    recommendation_provider TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE public.staff_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_registry ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view enterprise schema
CREATE POLICY "Allow authenticated read staff_positions" ON public.staff_positions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read permissions" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read position_permissions" ON public.position_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read user_positions" ON public.user_positions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read workspace_registry" ON public.workspace_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read widget_registry" ON public.widget_registry FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to create/view approvals & audit logs
CREATE POLICY "Allow authenticated read approval_requests" ON public.approval_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert approval_requests" ON public.approval_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id OR requester_id IS NULL);
CREATE POLICY "Allow authenticated update approval_requests" ON public.approval_requests FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Admin full management policies for user_positions and staff_positions
CREATE POLICY "Admin full staff_positions" ON public.staff_positions FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin full user_positions" ON public.user_positions FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Seed Staff Positions
INSERT INTO public.staff_positions (code, name, description) VALUES
('managing_director', 'Managing Director', 'Full executive intelligence, strategic oversight, financial authority, and platform configuration.'),
('operations_manager', 'Operations & Systems Manager', 'Oversight of operational workflows, inventory capacity, logistics, packaging, and vendor coordination.'),
('finance_officer', 'Finance & Administration Officer', 'Oversight of treasury reserves, financial reports, revenue allocation, expenses, debt, and payouts.'),
('fulfillment_officer', 'Fulfillment Officer', 'Direct management of order picking, packing verification, shipping labels, and dispatch status.'),
('biz_dev_manager', 'Business Development Manager', 'Oversight of vendor recruitment, growth pipelines, market expansion, and campaign performance.')
ON CONFLICT (code) DO NOTHING;

-- Seed Granular Permissions
INSERT INTO public.permissions (code, name, category, action, description) VALUES
-- Executive / All Access
('all.manage', 'Full System Management', 'Executive', 'Configure', 'Unrestricted administrative access to all enterprise capabilities'),

-- Orders
('orders.view', 'View Orders', 'Orders', 'View', 'View customer and enterprise order lists'),
('orders.edit', 'Edit Orders', 'Orders', 'Edit', 'Modify order details and dispatch statuses'),
('orders.approve', 'Approve High-Value Orders', 'Orders', 'Approve', 'Approve large or flag-marked orders'),
('orders.override', 'Override Order Rules', 'Orders', 'Override', 'Bypass order constraints or manual overrides'),

-- Products
('products.view', 'View Products', 'Products', 'View', 'Browse full product catalog'),
('products.create', 'Create Products', 'Products', 'Create', 'Add new products to catalog'),
('products.edit', 'Edit Products', 'Products', 'Edit', 'Update product pricing, stock, and descriptions'),
('products.approve', 'Approve Vendor Products', 'Products', 'Approve', 'Authorize vendor submitted products for public shop'),

-- Pricing
('pricing.view', 'View Pricing', 'Pricing', 'View', 'Inspect base cost, markup, and margin tiers'),
('pricing.override', 'Override Pricing', 'Pricing', 'Override', 'Apply manual price discounts or margin overrides'),
('pricing.configure', 'Configure Pricing Engine', 'Pricing', 'Configure', 'Modify profit markup and platform commission rules'),

-- Treasury & Finance
('treasury.view', 'View Treasury', 'Treasury', 'View', 'Inspect cash reserves, liquidity, and bank allocations'),
('treasury.override', 'Treasury Override', 'Treasury', 'Override', 'Execute emergency transfer or reserve withdrawal'),
('finance.view', 'View Financial Reports', 'Finance', 'View', 'Access profit intelligence, P&L, and balance metrics'),
('finance.export', 'Export Financial Data', 'Finance', 'Export', 'Download audit-ready financial ledger exports'),
('payments.approve', 'Approve Payouts', 'Payments', 'Approve', 'Authorize vendor and agent payout disbursements'),

-- Operations & Inventory
('inventory.view', 'View Inventory', 'Inventory', 'View', 'Inspect warehouse stock levels and stock availability'),
('inventory.edit', 'Manage Inventory Stock', 'Inventory', 'Edit', 'Adjust stock quantities and warehouse locations'),
('logistics.view', 'View Logistics & Courier', 'Logistics', 'View', 'Track courier operations and delivery performance'),
('fulfillment.manage', 'Manage Order Fulfillment', 'Fulfillment', 'Edit', 'Generate picking lists, packing slips, and shipping labels'),

-- Vendors & Customers
('vendors.view', 'View Vendors', 'Vendors', 'View', 'Access vendor directory and performance metrics'),
('vendors.approve', 'Approve Vendor Signup', 'Vendors', 'Approve', 'Approve new vendor applications'),
('vendors.exclusivity', 'Manage Vendor Exclusivity', 'Vendors', 'Override', 'Grant or override vendor exclusive product contracts'),
('customers.view', 'View Customers', 'Customers', 'View', 'Access customer profiles and purchase histories'),

-- Business Development & Campaigns
('bizdev.view', 'View Growth Pipeline', 'Campaigns', 'View', 'Track partner recruitment and market expansion targets'),
('campaigns.manage', 'Manage Marketing Campaigns', 'Campaigns', 'Create', 'Create and monitor promotional campaigns'),

-- HR & Staff
('staff.view', 'View Staff Positions', 'Staff', 'View', 'Inspect organizational hierarchy and assigned staff'),
('staff.manage', 'Manage Staff & Permissions', 'Staff', 'Configure', 'Assign positions and customize granular permissions'),

-- Audit & Approvals
('audit.view', 'View Audit Logs', 'Audit', 'View', 'Review immutable enterprise audit records'),
('approvals.manage', 'Manage High-Risk Approvals', 'Decision Engine', 'Approve', 'Review, approve, or reject high-risk enterprise actions'),

-- Decision Engine & AI
('intelligence.view', 'View Decision Intelligence', 'AI Intelligence', 'View', 'Access FSC Document 3 recommendations and predictive metrics')
ON CONFLICT (code) DO NOTHING;

-- Seed Position Permissions
-- Managing Director: Inherits all permissions
INSERT INTO public.position_permissions (position_id, permission_id)
SELECT p.id, perm.id
FROM public.staff_positions p, public.permissions perm
WHERE p.code = 'managing_director'
ON CONFLICT DO NOTHING;

-- Operations Manager
INSERT INTO public.position_permissions (position_id, permission_id)
SELECT p.id, perm.id
FROM public.staff_positions p, public.permissions perm
WHERE p.code = 'operations_manager'
AND perm.code IN ('orders.view', 'orders.edit', 'products.view', 'inventory.view', 'inventory.edit', 'logistics.view', 'fulfillment.manage', 'vendors.view', 'intelligence.view')
ON CONFLICT DO NOTHING;

-- Finance Officer
INSERT INTO public.position_permissions (position_id, permission_id)
SELECT p.id, perm.id
FROM public.staff_positions p, public.permissions perm
WHERE p.code = 'finance_officer'
AND perm.code IN ('treasury.view', 'treasury.override', 'finance.view', 'finance.export', 'payments.approve', 'pricing.view', 'orders.view', 'intelligence.view', 'audit.view')
ON CONFLICT DO NOTHING;

-- Fulfillment Officer
INSERT INTO public.position_permissions (position_id, permission_id)
SELECT p.id, perm.id
FROM public.staff_positions p, public.permissions perm
WHERE p.code = 'fulfillment_officer'
AND perm.code IN ('orders.view', 'fulfillment.manage', 'inventory.view', 'logistics.view')
ON CONFLICT DO NOTHING;

-- Business Development Manager
INSERT INTO public.position_permissions (position_id, permission_id)
SELECT p.id, perm.id
FROM public.staff_positions p, public.permissions perm
WHERE p.code = 'biz_dev_manager'
AND perm.code IN ('vendors.view', 'vendors.approve', 'vendors.exclusivity', 'bizdev.view', 'campaigns.manage', 'customers.view', 'intelligence.view')
ON CONFLICT DO NOTHING;
