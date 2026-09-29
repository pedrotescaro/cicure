-- Cicura Prompt 2 — Onda 1: Clinical Extensions
-- care_plans, care_plan_goals, prescriptions, prescription_items,
-- clinical_templates, vital_signs, vascular_assessments, soap_notes,
-- patient_timeline_events, record_versions, record_addenda

-- ============================================================
-- CARE PLANS (Plano Terapêutico)
-- ============================================================
CREATE TABLE IF NOT EXISTS care_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id),
  wound_id uuid NOT NULL REFERENCES wounds(id),
  professional_id uuid NOT NULL REFERENCES auth.users(id),
  objectives text NOT NULL DEFAULT '',
  clinical_goal text NOT NULL DEFAULT '',
  dressing_frequency text NOT NULL DEFAULT '',
  planned_products jsonb NOT NULL DEFAULT '[]'::jsonb,
  complementary_therapies jsonb NOT NULL DEFAULT '[]'::jsonb,
  instructions text NOT NULL DEFAULT '',
  follow_up_frequency text NOT NULL DEFAULT '',
  next_review_date date,
  status text NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo','Revisado','Cancelado')),
  version integer NOT NULL DEFAULT 1,
  previous_version_id uuid REFERENCES care_plans(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS care_plan_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  care_plan_id uuid NOT NULL REFERENCES care_plans(id),
  description text NOT NULL,
  target_date date,
  status text NOT NULL DEFAULT 'Ativa' CHECK (status IN ('Ativa','Atingida','Substituída','Cancelada')),
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- ============================================================
-- PRESCRIPTIONS (Prescrição de Curativos)
-- ============================================================
CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id),
  wound_id uuid NOT NULL REFERENCES wounds(id),
  professional_id uuid NOT NULL REFERENCES auth.users(id),
  cleaning text NOT NULL DEFAULT '',
  solution text NOT NULL DEFAULT '',
  primary_coverage text NOT NULL DEFAULT '',
  secondary_coverage text NOT NULL DEFAULT '',
  fixation text NOT NULL DEFAULT '',
  perilesional_protection text NOT NULL DEFAULT '',
  change_frequency text NOT NULL DEFAULT '',
  expected_duration text NOT NULL DEFAULT '',
  observations text NOT NULL DEFAULT '',
  professional_name text NOT NULL DEFAULT '',
  professional_council text NOT NULL DEFAULT '',
  professional_registration text NOT NULL DEFAULT '',
  signature_data jsonb,
  template_id uuid,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

-- ============================================================
-- CLINICAL TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS clinical_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('curativo','fotobiomodulação','escalas','orientações','conduta','prescrição')),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  scope text NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal','organization')),
  organization_id uuid,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================================
-- VITAL SIGNS
-- ============================================================
CREATE TABLE IF NOT EXISTS vital_signs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid REFERENCES visits(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  professional_id uuid NOT NULL REFERENCES auth.users(id),
  blood_pressure_sys integer,
  blood_pressure_dia integer,
  heart_rate integer,
  respiratory_rate integer,
  temperature numeric(4,1),
  spo2 integer,
  capillary_glucose integer,
  weight numeric(5,1),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- ============================================================
-- VASCULAR ASSESSMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS vascular_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid REFERENCES visits(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  professional_id uuid NOT NULL REFERENCES auth.users(id),
  peripheral_pulses jsonb NOT NULL DEFAULT '{}'::jsonb,
  perfusion text NOT NULL DEFAULT '',
  capillary_refill text NOT NULL DEFAULT '',
  edema text NOT NULL DEFAULT '',
  limb_temperature text NOT NULL DEFAULT '',
  sensitivity text NOT NULL DEFAULT '',
  monofilament jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- ============================================================
-- SOAP NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS soap_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES visits(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  professional_id uuid NOT NULL REFERENCES auth.users(id),
  subjective text NOT NULL DEFAULT '',
  objective text NOT NULL DEFAULT '',
  assessment text NOT NULL DEFAULT '',
  plan text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Rascunho' CHECK (status IN ('Rascunho','Revisado','Confirmado')),
  generated_from text NOT NULL DEFAULT 'manual' CHECK (generated_from IN ('manual','auto-draft')),
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- ============================================================
-- RECORD VERSIONS & ADDENDA (Versionamento)
-- ============================================================
CREATE TABLE IF NOT EXISTS record_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_kind text NOT NULL,
  entity_id uuid NOT NULL,
  version integer NOT NULL,
  payload jsonb NOT NULL,
  state text NOT NULL DEFAULT 'Rascunho' CHECK (state IN ('Rascunho','Finalizado','Assinado','Com adendo')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS record_addenda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_kind text NOT NULL,
  entity_id uuid NOT NULL,
  reason text NOT NULL,
  content text NOT NULL,
  previous_version integer NOT NULL,
  new_version integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id)
);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE care_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plan_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vascular_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE soap_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_addenda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "care_plans_own" ON care_plans FOR ALL
  USING (professional_id = auth.uid()) WITH CHECK (professional_id = auth.uid());
CREATE POLICY "care_plan_goals_own" ON care_plan_goals FOR ALL
  USING (EXISTS (SELECT 1 FROM care_plans WHERE care_plans.id = care_plan_goals.care_plan_id AND care_plans.professional_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM care_plans WHERE care_plans.id = care_plan_goals.care_plan_id AND care_plans.professional_id = auth.uid()));
CREATE POLICY "prescriptions_own" ON prescriptions FOR ALL
  USING (professional_id = auth.uid()) WITH CHECK (professional_id = auth.uid());
CREATE POLICY "templates_own" ON clinical_templates FOR ALL
  USING (created_by = auth.uid() OR scope = 'organization') WITH CHECK (created_by = auth.uid());
CREATE POLICY "vital_signs_own" ON vital_signs FOR ALL
  USING (professional_id = auth.uid()) WITH CHECK (professional_id = auth.uid());
CREATE POLICY "vascular_assessments_own" ON vascular_assessments FOR ALL
  USING (professional_id = auth.uid()) WITH CHECK (professional_id = auth.uid());
CREATE POLICY "soap_notes_own" ON soap_notes FOR ALL
  USING (professional_id = auth.uid()) WITH CHECK (professional_id = auth.uid());
CREATE POLICY "record_versions_own" ON record_versions FOR ALL
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "record_addenda_own" ON record_addenda FOR ALL
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================
DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['care_plans','care_plan_goals','prescriptions','clinical_templates','soap_notes']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I_touch ON %I; CREATE TRIGGER %I_touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at()',
      t, t, t, t
    );
  END LOOP;
END $$;

-- ============================================================
-- STORAGE: clinical documents bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinical-documents', 'clinical-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "clinical_documents_own" ON storage.objects FOR ALL
  USING (bucket_id = 'clinical-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'clinical-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
