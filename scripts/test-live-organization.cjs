const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { account, rpc } = require('./test-live-sync.cjs');
async function main() {
  const a = await account('.artifacts/android-qa/account.json'); const b = await account('.artifacts/android-qa/account-b.json');
  const emailB = JSON.parse(fs.readFileSync('.artifacts/android-qa/account-b.json')).email;
  const org = await rpc(a.client,'create_organization',{p_name:'Clinica Sintetica HTTP',p_cnpj:null,p_phone:null});
  const invitation = await rpc(a.client,'create_organization_invitation',{p_organization_id:org.id,p_name:'Profissional B de teste',p_email:emailB,p_role:'Profissional'});
  const accepted = await rpc(b.client,'accept_organization_invitation',{p_token:invitation.token}); assert.equal(accepted.id,org.id);
  const reused = await b.client.rpc('accept_organization_invitation',{p_token:invitation.token}); assert.ok(reused.error);
  const patientId=randomUUID(),woundId=randomUUID(),visitId=randomUUID();
  const save = (client,kind,payload) => rpc(client,'save_record',{p_kind:kind,p_id:payload.id,p_payload:{...payload,organizationId:org.id},p_version:1,p_base_version:0});
  await save(a.client,'patients',{id:patientId,name:'Paciente de Equipe Sintetico'}); await save(a.client,'wounds',{id:woundId,patientId,location:'Local sintetico'});
  await save(b.client,'visits',{id:visitId,patientId,woundId,state:'Rascunho',date:'2026-10-22',authorUserId:b.id,photos:[]});
  const bRows = await rpc(b.client,'pull_records',{p_organization_id:org.id,p_after_id:null,p_limit:200}); assert.ok(bRows.some(row=>row.id===patientId)); assert.ok(bRows.some(row=>row.id===visitId));
  const individual = await rpc(b.client,'pull_records',{p_organization_id:null,p_after_id:null,p_limit:200}); assert.equal(individual.some(row=>row.id===patientId),false);
  await rpc(a.client,'set_organization_member',{p_organization_id:org.id,p_user_id:b.id,p_role:'Profissional',p_status:'suspended'});
  const denied = await b.client.rpc('get_organization_access',{p_organization_id:org.id}); assert.ok(denied.error);
  const raw = await b.client.from('app_records').select('id').eq('id',patientId); assert.equal(raw.data.length,0);
  const result={checkedAt:new Date().toISOString(),checks:['Real email-bound invitation accepted by second confirmed account','Single-use invitation cannot be reused','Second professional writes a visit linked to another professional patient in same clinic','Group data excluded from individual space','Suspension denies access RPC and direct table read immediately']};
  await a.client.auth.signOut({scope:'local'});await b.client.auth.signOut({scope:'local'});
  fs.writeFileSync('.artifacts/android-qa/live-organization.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
