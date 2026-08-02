-- Enterprise Commerce OS — Content & UGC Permission Families
-- Addendum to V11 Enterprise RBAC

-- ─── Content Studio permissions ───────────────────────────────────────────────

INSERT INTO public.permissions (code, name, category, action, description) VALUES
  ('content.view',      'View Content Studio',        'Content', 'View',      'Browse and read published and draft content assets'),
  ('content.create',    'Create Content',             'Content', 'Create',    'Author new articles, banners, product descriptions, and media assets'),
  ('content.edit',      'Edit Content',               'Content', 'Edit',      'Modify existing content, titles, copy, and metadata'),
  ('content.delete',    'Delete Content',             'Content', 'Delete',    'Permanently remove draft or archived content assets'),
  ('content.approve',   'Approve Content',            'Content', 'Approve',   'Review and greenlight content for the publishing pipeline'),
  ('content.publish',   'Publish Content',            'Content', 'Configure', 'Push approved content live to the storefront and campaigns'),
  ('content.override',  'Override Content Rules',     'Content', 'Override',  'Bypass content review gates or scheduling constraints'),
  ('content.configure', 'Configure Content Studio',   'Content', 'Configure', 'Manage content templates, approval workflows, and integrations')
ON CONFLICT (code) DO NOTHING;

-- ─── UGC Studio permissions ───────────────────────────────────────────────────

INSERT INTO public.permissions (code, name, category, action, description) VALUES
  ('ugc.view',          'View UGC Studio',            'UGC', 'View',      'Browse customer-generated videos, reviews, and photo submissions'),
  ('ugc.generate',      'Generate UGC',               'UGC', 'Generate',  'Initiate AI-generated UGC campaigns and content requests'),
  ('ugc.edit',          'Edit UGC',                   'UGC', 'Edit',      'Modify UGC metadata, captions, and asset configurations'),
  ('ugc.approve',       'Approve UGC',                'UGC', 'Approve',   'Review and approve or reject UGC submissions for storefront display'),
  ('ugc.publish',       'Publish UGC',                'UGC', 'Configure', 'Push approved UGC assets live to product pages and campaigns'),
  ('ugc.delete',        'Delete UGC',                 'UGC', 'Delete',    'Remove UGC submissions, generated assets, or actor profiles'),
  ('ugc.configure',     'Configure UGC Studio',       'UGC', 'Configure', 'Manage UGC studio settings, actor database, and generation templates')
ON CONFLICT (code) DO NOTHING;

-- ─── Position assignments ─────────────────────────────────────────────────────

-- Managing Director: full content.* + ugc.* (all 15 permissions)
INSERT INTO public.position_permissions (position_id, permission_id)
SELECT p.id, perm.id
FROM public.staff_positions p, public.permissions perm
WHERE p.code = 'managing_director'
  AND perm.code IN (
    'content.view',    'content.create', 'content.edit',   'content.delete',
    'content.approve', 'content.publish','content.override','content.configure',
    'ugc.view',        'ugc.generate',   'ugc.edit',        'ugc.approve',
    'ugc.publish',     'ugc.delete',     'ugc.configure'
  )
ON CONFLICT DO NOTHING;

-- Business Development Manager: content creation + UGC generation
-- Rationale: BizDev runs campaigns and creative briefs; approvals stay with MD.
INSERT INTO public.position_permissions (position_id, permission_id)
SELECT p.id, perm.id
FROM public.staff_positions p, public.permissions perm
WHERE p.code = 'biz_dev_manager'
  AND perm.code IN (
    'content.view', 'content.create', 'content.edit',
    'ugc.view',     'ugc.generate'
  )
ON CONFLICT DO NOTHING;

-- Operations Manager: content.view only (product description read context)
-- Rationale: Ops reads content for product/logistics descriptions; no authoring rights.
INSERT INTO public.position_permissions (position_id, permission_id)
SELECT p.id, perm.id
FROM public.staff_positions p, public.permissions perm
WHERE p.code = 'operations_manager'
  AND perm.code IN ('content.view')
ON CONFLICT DO NOTHING;

-- Finance Officer: no content or UGC access (financial data only)
-- Fulfillment Officer: no content or UGC access (operational data only)
