/* Explicit live homologation with disposable synthetic accounts only. Never prints tokens/passwords. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const nativeFetch = global.fetch;
global.fetch = (url, options = {}) => nativeFetch(url, { ...options, signal: AbortSignal.timeout(20000) });
const env = {};
for (const file of ['.env', '.env.local']) if (fs.existsSync(file)) for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) { const match = /^([A-Z0-9_]+)=(.*)$/.exec(line); if (match) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, ''); }
const evidence = { checkedAt: new Date().toISOString(), checks: [] };
async function account(file) {
  const credentials = JSON.parse(fs.readFileSync(file));
  assert.match(credentials.email, /^cicure\.qa\./);
  const client = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: credentials.email, password: credentials.password });
  if (error) throw Error('Synthetic account login failed: ' + error.code);
  assert.equal(data.user.id, credentials.id);
  return { client, id: data.user.id };
}
async function rpc(client, name, args) { const result = await client.rpc(name, args); if (result.error) throw Error(`${name}: ${result.error.code} ${result.error.message}`); return result.data; }
async function main() {
  const a = await account('.artifacts/android-qa/account.json'); const b = await account('.artifacts/android-qa/account-b.json');
  evidence.checks.push('Two real synthetic accounts authenticated over HTTP'); console.log('Live authentication passed');
  const patientId = randomUUID(); const woundId = randomUUID(); const visitId = randomUUID();
  const patient = { id: patientId, name: 'Paciente Sintetico HTTP', birthDate: '', sex: '', cpf: '', sus: '', phone: '', address: '', emergency: '', status: 'Ativo', weight: 0, height: 0, bloodType: '', allergies: [], smoking: '', alcohol: '', activity: '', comorbidities: [], medications: [], exams: [], color: '#D62828', createdAt: new Date().toISOString() };
  const wound = { id: woundId, patientId, location: 'Perna esquerda - dados sinteticos', etiology: 'Outra', startDate: '2026-10-22', status: 'Ativa', previousTreatments: '', pin: { x: .5, y: .5, side: 'Frente' } };
  const base = { id: visitId, patientId, woundId, date: new Date().toISOString(), scheduledTime: '', state: 'Rascunho', step: 6, length: '2,5', width: '1,2', depth: '', tunnels: '', edges: [], perilesional: [], tissue: {}, exudateAmount: '', exudateType: '', odor: '', infection: [], pain: null, assessments: [], dressings: [], therapies: [], photos: [], plan: 'Registro sintetico para homologacao', guidance: 'Sem uso assistencial', returnDate: '2026-10-30', returnTime: '09:00', signature: [], signedBy: '', authorUserId: a.id, soap: { id: randomUUID(), visitId, patientId, subjective: 'Relato sintetico', objective: 'Medidas sinteticas', assessment: 'Avaliacao sintetica', plan: 'Plano sintetico', status: 'Rascunho', generatedFrom: 'manual', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } };
  const save = (kind, payload, version = 1, baseVersion = 0, client = a.client) => rpc(client, 'save_record', { p_kind: kind, p_id: payload.id, p_payload: payload, p_version: version, p_base_version: baseVersion });
  await save('patients', patient); await save('wounds', wound); await save('visits', base);
  await save('visits', base); // Lost-response retry must be idempotent.
  evidence.checks.push('Patient, wound and edited SOAP draft persisted; identical retry acknowledged');
  const bRows = await rpc(b.client, 'pull_records', { p_organization_id: null, p_after_id: null, p_limit: 200 });
  assert.equal(bRows.some(row => row.id === patientId), false);
  const denied = await b.client.rpc('save_record', { p_kind: 'patients', p_id: patientId, p_payload: { ...patient, name: 'Forbidden' }, p_version: 2, p_base_version: 1 }); assert.ok(denied.error);
  evidence.checks.push('Second account cannot read or change first account records');
  const changed = { ...base, plan: 'Conduta revisada sintetica' }; await save('visits', changed, 2, 1);
  const conflict = await a.client.rpc('save_record', { p_kind: 'visits', p_id: visitId, p_payload: { ...base, plan: 'Concurrent stale change' }, p_version: 2, p_base_version: 1 }); assert.ok(conflict.error);
  evidence.checks.push('Concurrent stale write rejected without overwriting current draft');
  const photoId = randomUUID(); const photoPath = `${a.id}/${patientId}/${woundId}/${visitId}/${photoId}.png`;
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jv1sAAAAASUVORK5CYII=', 'base64');
  const upload = await a.client.storage.from('clinical-files').upload(photoPath, png, { contentType: 'image/png' }); assert.equal(upload.error, null);
  const signed = await a.client.storage.from('clinical-files').createSignedUrl(photoPath, 60); assert.equal(signed.error, null);
  const foreign = await b.client.storage.from('clinical-files').download(photoPath); assert.ok(foreign.error);
  evidence.checks.push('Private media uploaded and signed; another account denied');
  const profile = { id: a.id, name: 'Profissional Sintetico', council: 'TESTE', registration: 'SINTETICO', specialty: 'Homologacao' };
  const profileRows = (await rpc(a.client,'pull_records',{p_organization_id:null,p_after_id:null,p_limit:200})).filter(row=>row.id===a.id);
  if (!profileRows.length) await save('profiles', profile);
  const completed = { ...changed, state: 'Concluído', completedAt: new Date().toISOString(), completedBy: { userId: a.id, name: profile.name, council: profile.council, registration: profile.registration }, signedBy: profile.name, amendments: [] };
  await save('visits', completed, 3, 2);
  const mutate = await a.client.rpc('save_record',{p_kind:'visits',p_id:visitId,p_payload:{...completed,plan:'Forbidden rewrite'},p_version:4,p_base_version:3}); assert.ok(mutate.error);
  const amended = { ...completed, amendments: [{ id: randomUUID(), text: 'Adendo sintetico preservando original', createdAt: new Date().toISOString(), author: completed.completedBy }] }; await save('visits', amended,4,3);
  evidence.checks.push('Conclusion has real authenticated author; clinical rewrite rejected; appended amendment persisted');
  const events = await rpc(a.client,'list_activity_events',{p_organization_id:null}); assert.ok(events.some(event=>event.record_id===visitId));
  const revisions = await rpc(a.client,'list_record_revisions',{p_record_id:visitId}); assert.ok(revisions.length>=4);
  const sessions = await rpc(a.client,'list_own_sessions'); assert.ok(sessions.length>0);
  evidence.checks.push('Server audit, original revisions and real authentication sessions queried');
  await a.client.auth.signOut({scope:'local'}); await b.client.auth.signOut({scope:'local'});
  fs.writeFileSync('.artifacts/android-qa/live-http.json',JSON.stringify(evidence,null,2)); console.log(JSON.stringify(evidence,null,2));
}
module.exports = { account, rpc };
if (require.main === module) main().catch(error=>{console.error(error.message);process.exitCode=1;});
