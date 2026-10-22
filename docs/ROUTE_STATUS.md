# Inventário de telas — Cicure 1.1.0

Inventário conferido no código em 22/10/2026. **Implementado** indica interface, validação e persistência conectadas; a coluna de evidência delimita a validação, sem equivaler a homologação assistencial. Os testes usam exclusivamente dados sintéticos. A versão não habilita interpretações WIfI nem decisões terapêuticas automáticas.

| Tela ou ação | Implementação e armazenamento | Evidência e limite |
| --- | --- | --- |
| Início | Agenda de hoje, próximo atendimento, rascunhos, retornos e atalhos derivados dos registros | Testes de agenda; sem indicadores fictícios |
| Pacientes | Cadastro, edição, pesquisa por nome sem depender de acentos; dados desconhecidos em branco | Validação de CPF, telefone e datas; testes de preservação do histórico |
| Prontuário | Dados, múltiplas feridas, seleção da lesão, atendimentos, evolução e documentos | Registros separados por conta e clínica; mapa corporal é localização aproximada |
| Atendimento | Sete etapas, salvamento automático e explícito, retomada da etapa, sinais vitais, modelos e consumo de estoque confirmado | Testes de ciclo de vida, rascunho, validação e baixa idempotente |
| Evolução clínica | Os quatro campos SOAP editados ficam dentro do atendimento | Testes de recuperação do conteúdo; confirmação aguarda gravação |
| Conclusão e correção | Identidade autenticada, perfil, data e adendos; original preservado no aparelho e servidor | SQL real verifica imutabilidade inclusive por acesso direto; confirmação não é assinatura digital certificada |
| Fotos | Câmera/galeria, arquivo durável privado, envio pendente visível, referência por dois pontos e comprimento informado | Teste de cálculo e Storage real com acesso negado à outra conta; limitações de perspectiva e profundidade explícitas |
| Fotos e comparação | Histórico por ferida, datas, seleção de duas imagens e acesso ao atendimento original | Implementação nativa; aparência não determina diagnóstico ou melhora clínica |
| Agenda | Marcar, reagendar, cancelar, retornos, início de atendimento e lembrete via Android | Estado de lembrete depende da resposta nativa; permissões negadas e falhas não simulam agendamento |
| Relatórios | Escolha de atendimento concluído, PDF, cópia dos dados na geração, prévia, histórico, regeneração e compartilhamento | O arquivo é gerado no Android com Expo Print; fotos ficam referenciadas no prontuário privado e não são incluídas automaticamente no PDF |
| Perfil e autenticação | Cadastro, entrada por e-mail, recuperação, retorno PKCE, perfil e saída | Duas contas sintéticas reais autenticadas por HTTP; entrega de e-mail e OAuth Google dependem dos provedores/configuração |
| Envio de dados | Fila durável, confirmação de versão, fotos privadas, páginas de 200 registros, retomada de conexão e primeiro plano | HTTP real verifica reenvio idempotente, conflito e isolamento; testes cobrem erro/edição durante envio |
| Conflitos | Consulta de versão autorizada, comparação, escolha explícita e preservação das duas cópias no histórico local | Atendimento já concluído exige adendo; escolha local prepara novo envio sem declarar sucesso antes da confirmação |
| Plano de cuidado | Metas, revisão profissional e versões por paciente/ferida | Persistência e testes de contratos; sem recomendação automática |
| Prescrições | Rascunho, revisão profissional explícita, versões preservadas e PDF | Não afirma assinatura digital; revisão e limites de atuação profissional permanecem necessários |
| Consentimentos | Finalidades independentes, responsável, evidência, versão do termo e revogação preservada | SQL real nega alteração do original e revogação por outro autor |
| Documentos | PDF/JPG/PNG privados até 10 MB e metadados vinculados ao paciente | Acesso com RLS; formatos externos e destinatários não são integrados automaticamente |
| Encaminhamentos | Registro, prioridade escolhida, histórico e fila de envio | O app registra o documento; não envia ao serviço de destino |
| Modelos de atendimento | Criação, edição, duplicação e arquivamento; aplicação explícita no atendimento | Modelos pessoais, sem conteúdo clínico padrão fictício |
| Estoque | Catálogo, lotes, validade, entradas, descarte, consumo vinculado e saldo derivado de movimentos | Testes locais e SQL de saldo, validade, concorrência e idempotência |
| Resumo de atendimentos | Filtros por período e contagens/medidas derivadas dos registros | Testes de períodos e ausência de medida; não é indicador de eficácia clínica |
| Histórico de atividades | Histórico local persistente e eventos/revisões do servidor com identidade e data do serviço | SQL real nega falsificação e alteração de eventos |
| Acesso e dispositivos | Sessões reais da própria conta, encerramento de outras sessões e bloqueio do Android | Token de acesso já emitido pode durar até expirar; revogação não apaga dados guardados sem internet |
| Recuperação da versão anterior | Vinculação explícita dos antigos dados sem conta a uma conta individual, mantendo originais e fila | Testes SQLite e web impedem importação por segunda conta e preservam IDs e conteúdo |
| Clínicas e equipes | Clínica vazia, convites vinculados ao e-mail confirmado/validade, papéis, suspensão, revogação e último administrador protegido | Testes SQL com múltiplas identidades; acesso compartilhado exige conexão e verificação atual da associação |

Consulte [a evidência da entrega](RELEASE_1.1.0.md) para distinguir verificações locais, servidor, APK e equipamento físico. Uma exportação web ou teste SQL não substitui o teste instalado no Android nem a revisão clínica/regulatória.
