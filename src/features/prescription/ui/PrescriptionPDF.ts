import type { Patient, Wound, Profile } from '../../../domain/types';
import type { Prescription } from '../domain/types';
import { dateLabel } from '../../../domain/clinical';

export function generatePrescriptionHTML(
  prescription: Prescription,
  patient: Patient,
  wound: Wound,
  profile?: Profile
): string {
  const profName = prescription.professional.name || profile?.name || 'Profissional Responsável';
  const profCouncil = prescription.professional.council || profile?.council || 'COREN/CRM/CREFITO';
  const profReg = prescription.professional.registration || profile?.registration || 'Registro';
  const formattedDate = dateLabel(prescription.date, "dd 'de' MMMM 'de' yyyy");

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Prescrição de Curativo - Cicure</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #141414;
      line-height: 1.5;
      margin: 0;
      padding: 0;
    }
    .header {
      border-bottom: 2px solid #D62828;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .brand {
      font-size: 26px;
      font-weight: bold;
      color: #D62828;
      letter-spacing: -0.5px;
    }
    .doc-type {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #626262;
      font-weight: 600;
    }
    .patient-box {
      background: #FAFAFA;
      border: 1px solid #E6E6E6;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 24px;
    }
    .patient-box table { width: 100%; border-collapse: collapse; }
    .patient-box td { padding: 4px 0; font-size: 14px; }
    .patient-box td.label { width: 120px; color: #626262; font-weight: 500; }
    .section-title {
      font-size: 13px;
      font-weight: bold;
      letter-spacing: 1px;
      color: #626262;
      text-transform: uppercase;
      border-bottom: 1px solid #E6E6E6;
      padding-bottom: 4px;
      margin-top: 18px;
      margin-bottom: 12px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .items-table th, .items-table td {
      border: 1px solid #E6E6E6;
      padding: 10px 12px;
      text-align: left;
      font-size: 13px;
    }
    .items-table th {
      background: #F5F5F5;
      font-weight: 600;
      color: #333;
      width: 30%;
    }
    .items-table td {
      color: #141414;
    }
    .signature-area {
      margin-top: 50px;
      display: flex;
      flex-direction: column;
      align-items: center;
      page-break-inside: avoid;
    }
    .signature-line {
      width: 280px;
      border-top: 1px solid #141414;
      margin-bottom: 6px;
    }
    .prof-name { font-size: 14px; font-weight: bold; }
    .prof-reg { font-size: 12px; color: #626262; }
    .footer-note {
      font-size: 11px;
      color: #8A8A8A;
      margin-top: 30px;
      text-align: center;
      border-top: 1px solid #EAEAEA;
      padding-top: 10px;
    }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <div class="brand">cicure</div>
      <div style="font-size: 12px; color: #626262;">Plataforma Clínica de Tratamento de Feridas</div>
    </div>
    <div class="doc-type">Prescrição de Curativo</div>
  </div>

  <div class="patient-box">
    <table>
      <tr>
        <td class="label">Paciente:</td>
        <td><strong>${patient.name}</strong></td>
      </tr>
      <tr>
        <td class="label">Ferida / Lesão:</td>
        <td>${wound.location} (Etiologia: ${wound.etiology})</td>
      </tr>
      <tr>
        <td class="label">Data de Emissão:</td>
        <td>${formattedDate}</td>
      </tr>
    </table>
  </div>

  <div class="section-title">Protocolo de Limpeza e Preparo do Leito</div>
  <table class="items-table">
    <tr>
      <th>Técnica de Limpeza</th>
      <td>${prescription.cleaning || 'Irrigação suave com SF 0,9% sem fricção agressiva'}</td>
    </tr>
    <tr>
      <th>Solução Utilizada</th>
      <td>${prescription.solution || 'Soro Fisiológico 0,9% ou PHMB conforme indicação'}</td>
    </tr>
  </table>

  <div class="section-title">Coberturas e Fixação</div>
  <table class="items-table">
    <tr>
      <th>Cobertura Primária</th>
      <td><strong>${prescription.primaryCoverage || 'Conforme avaliação do leito'}</strong></td>
    </tr>
    <tr>
      <th>Cobertura Secundária</th>
      <td>${prescription.secondaryCoverage || 'Gaze estéril / Compressa absorvente'}</td>
    </tr>
    <tr>
      <th>Fixação</th>
      <td>${prescription.fixation || 'Fita microporosa hipoalergênica / Malha tubular'}</td>
    </tr>
    <tr>
      <th>Proteção Perilesional</th>
      <td>${prescription.perilesionalProtection || 'Creme barreira ou película protetora sem ardor'}</td>
    </tr>
  </table>

  <div class="section-title">Posologia e Tempo de Uso</div>
  <table class="items-table">
    <tr>
      <th>Frequência de Troca</th>
      <td><strong>${prescription.changeFrequency || 'A cada 48 a 72 horas'}</strong></td>
    </tr>
    <tr>
      <th>Duração Prevista</th>
      <td>${prescription.expectedDuration || 'Até próxima consulta de reavaliação'}</td>
    </tr>
    <tr>
      <th>Observações / Alertas</th>
      <td>${prescription.observations || 'Em caso de saturação precoce, odor fétido ou dor súbita, procurar a clínica imediatamente.'}</td>
    </tr>
  </table>

  <div class="signature-area">
    <div class="signature-line"></div>
    <div class="prof-name">${profName}</div>
    <div class="prof-reg">${profCouncil} ${profReg}</div>
    <div style="font-size: 11px; color: #8A8A8A; margin-top: 2px;">Assinatura Digital Registrada · Cicure ID: ${prescription.id.slice(0, 8)}</div>
  </div>

  <div class="footer-note">
    Documento emitido eletronicamente pelo aplicativo Cicure. Validade técnica restrita ao plano terapêutico prescrito.
  </div>

</body>
</html>
  `.trim();
}
