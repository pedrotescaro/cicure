-- Cicura Prompt 2: Organizations, Teams, Roles, Permissions, Security & Audit
-- organizations, organization_members, roles, patient_access, device_sessions, audit_events

-- ============================================================
-- ORGANIZATIONS (Workspaces / Clínicas)
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cnpj text,
  logo_url text,
  address jsonb DEFAULT '{}'::jsonb,
  phone text,
  contact_info jsonb DEFAULT '{}'::jsonb,
  settings jsonb DEFAULT '{"autoLockMinutes": 15, "requireMfa": false}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

-- ============================================================
-- ROLES & PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL, -- 'Administrador' | 'Profissional' | 'Assistente' | 'Somente leitura'
  permissions jsonb NOT NULL DEFAULT '{
    "canViewAllPatients": false,
    "canEditPatients": true,
    "canSignVisits": true,
    "canManageMembers": false,
    "canViewAudit": false,
    "canManageInventory": false,
    "canExport": true
  }'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ORGANIZATION MEMBERS & INVITATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','suspended')),
  invite_email text,
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- ============================================================
-- PATIENT ACCESS (Granular patient-level permissions)
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'write' CHECK (access_level IN ('read','write','admin')),
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, user_id, organization_id)
);

-- ============================================================
-- DEVICE SESSIONS & ACTIVE SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS device_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  device_name text,
  platform text,
  ip_address text,
  last_active timestamptz NOT NULL DEFAULT now(),
  is_current boolean DEFAULT false,
  revoked boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIT EVENTS (Trilha visual de auditoria para admins)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  user_name text,
  action text NOT NULL, -- 'login' | 'logout' | 'prontuario_view' | 'record_create' | 'record_edit' | 'record_sign' | 'doc_export' | 'doc_share' | 'conflict_resolve'
  entity_kind text,
  entity_id uuid,
  patient_id uuid REFERENCES patients(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_member_read" ON organizations FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM organization_members WHERE organization_id = organizations.id AND user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "org_admin_manage" ON organizations FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "roles_read" ON roles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM organization_members WHERE organization_id = roles.organization_id AND user_id = auth.uid())
  );

CREATE POLICY "members_read" ON organization_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid())
  );

CREATE POLICY "patient_access_read" ON patient_access FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "device_sessions_own" ON device_sessions FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "audit_events_insert" ON audit_events FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "audit_events_admin_read" ON audit_events FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN roles r ON r.id = om.role_id
      WHERE om.user_id = auth.uid() AND (r.permissions->>'canViewAudit')::boolean = true
    )
  );
