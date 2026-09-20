-- Cicura Prompt 2: Inventory, Referrals, Documents, Consents, Protocols, Alerts, Appointments & Sync
-- inventory_items, inventory_lots, inventory_movements, referrals, documents, consents,
-- clinical_alerts, clinical_protocols, protocol_versions, appointments, sync_operations, sync_conflicts

-- ============================================================
-- INVENTORY (Controle de Estoque & Rastreabilidade de Lote)
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  professional_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  manufacturer text,
  presentation text,
  unit text NOT NULL DEFAULT 'un',
  min_stock numeric NOT NULL DEFAULT 5,
  cost numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS inventory_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  lot_number text NOT NULL,
  expiry_date date NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES inventory_items(id),
  lot_id uuid REFERENCES inventory_lots(id),
  type text NOT NULL CHECK (type IN ('entrada', 'saida_atendimento', 'saida_descarte', 'ajuste')),
  quantity numeric NOT NULL,
  visit_id uuid REFERENCES visits(id), -- baixa automática em atendimento
  patient_id uuid REFERENCES patients(id),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
  -- Regra: Movimentações vinculadas a atendimento clínico nunca devem ser apagadas fisicamente
);

-- ============================================================
-- REFERRALS (Encaminhamentos)
-- ============================================================
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  wound_id uuid REFERENCES wounds(id),
  professional_id uuid NOT NULL REFERENCES auth.users(id),
  specialty text NOT NULL, -- 'Cirurgia vascular', 'Angiologia', 'Infectologia', etc.
  destination_service text NOT NULL,
  reason text NOT NULL,
  observations text,
  priority text NOT NULL DEFAULT 'Rotina' CHECK (priority IN ('Rotina', 'Prioritário', 'Urgente')),
  status text NOT NULL DEFAULT 'solicitado' CHECK (status IN ('solicitado', 'agendado', 'realizado', 'cancelado')),
  date date NOT NULL DEFAULT CURRENT_DATE,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================================
-- DOCUMENTS (Central de Documentos & Laudos)
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  wound_id uuid REFERENCES wounds(id),
  visit_id uuid REFERENCES visits(id),
  professional_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('pdf', 'imagem', 'exame', 'laudo', 'receita', 'encaminhamento', 'outro')),
  file_path text NOT NULL, -- bucket privado clinical-documents
  file_size integer,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================================
-- CONSENTS (Consentimentos Granulares com Histórico)
-- ============================================================
CREATE TABLE IF NOT EXISTS consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES auth.users(id),
  type text NOT NULL CHECK (type IN ('atendimento', 'registro_fotografico', 'compartilhamento_profissionais', 'ensino_anonimizado', 'pesquisa_anonimizada')),
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'revogado')),
  term_version text NOT NULL DEFAULT '1.0',
  signature_data jsonb,
  signed_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- CLINICAL ALERTS (Alertas de Suporte à Decisão)
-- ============================================================
CREATE TABLE IF NOT EXISTS clinical_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  wound_id uuid REFERENCES wounds(id),
  type text NOT NULL, -- 'alergia_produto', 'alteracao_area', 'retorno_atrasado', 'sem_melhora', 'sinais_infeccao', 'reavaliacao_escala'
  severity text NOT NULL DEFAULT 'aviso' CHECK (severity IN ('info', 'aviso', 'urgente')),
  message text NOT NULL,
  acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- CLINICAL PROTOCOLS & PROTOCOL VERSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS clinical_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  name text NOT NULL, -- 'Protocolo Pé Diabético', 'Protocolo Lesão por Pressão', etc.
  description text,
  target_etiology text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS protocol_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid NOT NULL REFERENCES clinical_protocols(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  rules jsonb NOT NULL DEFAULT '{
    "requiredFields": ["length", "width", "tissue", "pain"],
    "requiredScales": ["WIfI"],
    "photoRequirement": "obrigatoria",
    "evaluationIntervalDays": 7
  }'::jsonb,
  changelog text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- APPOINTMENTS (Agenda Avançada & Retornos)
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  wound_id uuid REFERENCES wounds(id),
  professional_id uuid NOT NULL REFERENCES auth.users(id),
  scheduled_for timestamptz NOT NULL,
  duration_minutes integer DEFAULT 45,
  type text NOT NULL DEFAULT 'curativo' CHECK (type IN ('primeira_consulta', 'curativo', 'reavaliacao', 'domiciliar')),
  status text NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado', 'confirmado', 'realizado', 'cancelado', 'atrasado')),
  reminder_set boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SYNC OPERATIONS & SYNC CONFLICTS
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  entity_kind text NOT NULL,
  entity_id uuid NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'conflict')),
  attempts integer DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  entity_kind text NOT NULL,
  entity_id uuid NOT NULL,
  local_payload jsonb NOT NULL,
  remote_payload jsonb NOT NULL,
  resolved boolean DEFAULT false,
  resolution_type text, -- 'use_local', 'use_remote', 'reconciled'
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_items_own" ON inventory_items FOR ALL USING (professional_id = auth.uid());
CREATE POLICY "inventory_lots_own" ON inventory_lots FOR ALL USING (EXISTS (SELECT 1 FROM inventory_items WHERE inventory_items.id = inventory_lots.item_id AND inventory_items.professional_id = auth.uid()));
CREATE POLICY "inventory_movements_own" ON inventory_movements FOR ALL USING (created_by = auth.uid());
CREATE POLICY "referrals_own" ON referrals FOR ALL USING (professional_id = auth.uid());
CREATE POLICY "documents_own" ON documents FOR ALL USING (professional_id = auth.uid());
CREATE POLICY "consents_own" ON consents FOR ALL USING (professional_id = auth.uid());
CREATE POLICY "clinical_alerts_own" ON clinical_alerts FOR ALL USING (EXISTS (SELECT 1 FROM patients WHERE patients.id = clinical_alerts.patient_id AND patients.professional_id = auth.uid()));
CREATE POLICY "clinical_protocols_own" ON clinical_protocols FOR ALL USING (true);
CREATE POLICY "protocol_versions_own" ON protocol_versions FOR ALL USING (true);
CREATE POLICY "appointments_own" ON appointments FOR ALL USING (professional_id = auth.uid());
CREATE POLICY "sync_operations_own" ON sync_operations FOR ALL USING (user_id = auth.uid());
CREATE POLICY "sync_conflicts_own" ON sync_conflicts FOR ALL USING (user_id = auth.uid());
