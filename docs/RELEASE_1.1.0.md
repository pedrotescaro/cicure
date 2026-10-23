# Cicure 1.1.0 — entrega Android

Data: 23/10/2026. Identificador: `com.pedrotescaro.cicura`. `versionCode`: **3** (anterior: 2, versão 1.0.1).

## Instalar e começar

1. Baixe `cicure-v1.1.0-release.apk` na release do repositório. Para atualizar, instale por cima da versão anterior; **não desinstale nem limpe os dados**.
2. Entre ou crie sua conta. Na criação e recuperação, abra o link de e-mail no mesmo aparelho em que iniciou o pedido.
3. No Menu, abra **Perfil profissional** e preencha nome, conselho e registro. Eles identificam os atendimentos concluídos.
4. Se usava a versão anterior sem conta, abra **Menu → Segurança → Acesso e dispositivos → Recuperar registros da versão anterior**. Confirme a vinculação apenas à sua conta correta. Os originais e as pendências antigas permanecem no aparelho; a mesma base antiga não é vinculada a outra conta.
5. Em **Pacientes**, cadastre o paciente e uma ou mais feridas. Escolha a ferida antes de iniciar **Novo atendimento**.
6. O rascunho é salvo durante o preenchimento e ao avançar/sair. Aguarde **Salvo neste aparelho**. Retome pelo Início, Agenda, Pacientes ou Pendências.
7. Revise os dados e conclua o atendimento. Correções posteriores usam **Adicionar adendo** e preservam o conteúdo anterior.
8. Em **Relatórios → Novo relatório**, escolha o atendimento concluído e gere o PDF. Confira a prévia antes de escolher um destinatário no Android.

O arquivo usa a mesma identidade e o certificado interno da distribuição anterior, para atualização direta. Não é uma publicação no Google Play, nem uma assinatura digital certificada de registros clínicos.

## Funcionalidades

Navegação em português, campos com rótulos, datas brasileiras/calendário, decimais com vírgula, fontes adaptáveis e ações com texto. O Início prioriza agenda e pendências, com uma ação principal para iniciar atendimento; o Menu agrupa conta, segurança, materiais, equipe e ajuda.

O ícone Android e o favicon usam o monograma vermelho fornecido pelo responsável do projeto. O original está preservado em `assets/cicure-monogram-source.png`; as versões coloridas mantêm o desenho e a cor, com margens para os recortes do Android.

O atendimento agora persiste a evolução SOAP editada, sinais vitais, fotos, plano e etapa atual. Conclusão registra identidade e data, sem fingir assinatura certificada. A calibração usa os extremos de uma referência e seu comprimento informado. O histórico de fotos mantém o contexto da mesma ferida e permite comparação.

Planos, prescrições revisadas, consentimentos com revogação, documentos, encaminhamentos, modelos, estoque/lotes e resumos usam os registros da conta. Clínicas têm convites vinculados ao e-mail confirmado, papéis e revogação no servidor. Convites são compartilhados manualmente pelo administrador; o aplicativo não afirma ter enviado um e-mail.

O servidor mantém versões e eventos de atividade com identidade/data próprias. A fila só é confirmada após resposta da RPC. Falhas de mídia continuam pendentes. Conflitos preservam as duas cópias e exigem escolha; um atendimento concluído só aceita adendos.

## Evidências

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run expo:check` e `npm run export:web` compõem os critérios da entrega e do CI.
- CI aprovado no código final: [execução 39893099923](https://github.com/pedrotescaro/cicure/actions/runs/39893099923). A suíte soma **46 verificações**, incluindo a invalidação de geração, prévia e compartilhamento de PDF quando a conta muda ou o modo apresentação é ativado.
- Testes de persistência executam o schema SQLite e o armazenamento web, reinício lógico, troca de conta, fila, recuperação da base 1.0.1 e respostas atrasadas.
- `scripts/test-visit-lifecycle.ts` cobre evolução, sinais vitais, conclusão, imutabilidade, adendos e referência fotográfica calculada.
- `scripts/test-support-workflows.cjs`, `test-patient-agenda.cjs` e `test-reports-reminders.cjs` cobrem cadastro, agenda, saldo/validade/idempotência de estoque, consentimentos, revisão de prescrições, HTML seguro dos relatórios e respostas dos lembretes.
- `supabase/tests/android_workflows.sql`: **11 grupos aprovados** no servidor real, com `ROLLBACK`.
- `supabase/tests/organization_access.sql`: **9 grupos aprovados** no servidor real, com `ROLLBACK`.
- `scripts/test-live-sync.cjs`: **7 verificações HTTP aprovadas**, usando duas contas sintéticas reais: gravação/leitura, evolução recuperada, reenvio idempotente, conflito, proteção do registro concluído, adendo, mídia privada negada à outra conta, revisões/auditoria e sessões reais. Evidência sanitizada em `.artifacts/android-qa/live-http.json`.
- `scripts/test-live-organization.cjs`: **5 verificações HTTP aprovadas**, com convite aceito pela segunda conta confirmada, rejeição de reuso, atendimento do segundo profissional vinculado ao paciente do primeiro e bloqueio de RPC/leitura direta após suspensão. Evidência em `.artifacts/android-qa/live-organization.json`.
- No emulador Android, a atualização por `adb install -r` preservou a sessão. Foram verificados acesso com a conta sintética A do Supabase, Início e abas em português, uma única ação principal no Início, cadastro de paciente e ferida e salvamento de rascunho.
- Também no Android, um atendimento concluído gerou um PDF real, abriu a prévia de impressão de **duas páginas** e abriu o seletor de compartilhamento. Nenhum documento foi enviado a um destinatário.

A sequência nativa acima foi executada no APK anterior à última correção do teclado do modal. No APK final (`a704efa`), a atualização foi instalada novamente com sucesso, a sessão autenticada permaneceu disponível e a navegação de pacientes abriu normalmente. O teste de regressão confirmou que **Voltar** fecha o teclado, preserva o nome preenchido e mantém o cadastro aberto sem pedir descarte. Os demais fluxos nativos não foram repetidos integralmente nesse último binário. O bundle foi conferido contra os fontes finais de navegação, mídia, relatórios e formulários; versão, certificado e checksum constam em [APK_1.1.0.json](APK_1.1.0.json).

## Limites e dependências

- Os testes são técnicos e usam dados sintéticos. Não constituem aprovação clínica de todos os fluxos, revisão clínica/regulatória, piloto assistencial ou homologação em aparelho físico. WIfI permanece suspenso.
- A persistência das medidas ainda não foi comprovada em execução nativa. O ciclo completo de câmera, funcionamento sem internet e recuperação de dados antigos também não foi comprovado no Android; há cobertura automatizada para partes desses fluxos. Nenhum aparelho físico foi validado nesta entrega.
- A referência fotográfica não corrige perspectiva, curvatura, profundidade ou iluminação. As fotos não são incluídas automaticamente no PDF compartilhável; permanecem vinculadas ao prontuário privado.
- Conclusão, aceite registrado de consentimento e revisão de prescrição não equivalem a assinatura digital com certificado. O profissional responde pela indicação, revisão e seus limites de atuação.
- Consentimentos registram finalidade, evidência e revogação. A revogação não aplica um bloqueio automático de captura ou compartilhamento de fotografias; o profissional deve consultar e respeitar o consentimento antes dessas ações.
- O espaço individual pode continuar sem internet após autenticação; clínicas exigem conexão para confirmar permissões. O app não transfere automaticamente registros individuais para equipes.
- O SQLite e os arquivos usam o espaço privado do aplicativo Android; não foi adicionada criptografia própria de banco/arquivos. O bloqueio local usa a proteção real do sistema operacional.
- Documentos privados precisam de conexão para envio e obtenção de links; encaminhamentos não são automaticamente enviados ao destino. OAuth Google e recebimento/retorno dos e-mails dependem dos provedores configurados e de validação com uma caixa de entrada real.
- Encerrar sessões impede renovação; access tokens já emitidos podem durar até expirar. Isso não apaga registros guardados em aparelhos sem conexão.
- O diagnóstico de dependências registra **0 alertas críticos, 20 altos e 3 moderados** após as correções compatíveis. Os alertas restantes são transitivos e não tiveram correção compatível automática no SDK 57. Não foi feito downgrade incompatível de Expo/React Native.
- O Supabase ainda informa proteção contra senhas vazadas desativada na configuração de autenticação. Essa configuração não foi alterada nesta entrega.

Consulte [o inventário](ROUTE_STATUS.md) para o contrato de cada tela e [o desenvolvimento](DEVELOPMENT.md) para reproduzir os checks. Os artefatos locais de validação não contêm dados de pacientes reais e ficam fora do Git.
