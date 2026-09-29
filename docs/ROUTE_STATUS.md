# Estado das rotas

Inventário do checkout desta PR. **Parcial** significa que a tela usa dados locais ou mostra somente uma parte do fluxo; não significa que está pronta para dados reais, nuvem ou uso assistencial. **Indisponível** significa que a rota apresenta uma explicação e não executa a ação. As rotas de layout e o redirecionamento de URL desconhecida não são telas de produto.

| Rota | Estado | Evidência e limite |
| --- | --- | --- |
| `/` | Parcial | Início mostra registros locais; agenda e indicadores de produção ainda não são integrados. |
| `/patients` | Parcial | Lista lê registros locais separados pelo ID da conta; proteção física do armazenamento e teste nativo ainda pendentes. |
| `/care` | Parcial | Agenda lê visitas locais; lembrete nativo informa indisponibilidade. |
| `/reports` | Indisponível | Apresenta apenas o planejamento dos formatos, sem PDF gerado. |
| `/more` | Parcial | Perfil profissional e saída da conta estão disponíveis; PIN/biometria e serviços pendentes explicam indisponibilidade. |
| `/profile` | Parcial | Edita perfil vinculado ao ID autenticado e enfileira sincronização; falta homologação em dispositivo e checagem externa do conselho. |
| `/auth/callback` | Parcial | Troca código PKCE por sessão após confirmação de e-mail ou login Google; retorno nativo ainda não homologado. |
| `/auth/reset-password` | Parcial | Troca o código de recuperação e permite nova senha; entrega do e-mail e retorno nativo ainda não homologados. |
| `/patient/:id` | Parcial | Ficha lê dados locais; ações não integradas levam a estado indisponível. Alertas automáticos permanecem em revisão clínica. |
| `/patient/:id/body-map` | Parcial | Visualização local da ferida; sem prova de sincronização entre aparelhos. |
| `/patient/:id/timeline` | Parcial | Linha do tempo deriva de registros locais. |
| `/care/new` | Parcial | Cria rascunho local; conclusão, assinatura e WIfI ficam indisponíveis. |
| `/care/:id` | Parcial | Resumo lê visita local; autoria e assinatura confiáveis pendentes. |
| `/pending` | Parcial | Pendências derivadas dos registros locais. |
| `/sync` | Parcial | Usa RPC de gravação/leitura e fila local; isolamento entre duas identidades passou em transação SQL, mas conflitos e dispositivos ainda precisam de homologação. |
| `/patient/:id/care-plan` | Parcial | Plano, metas e versões são salvos localmente e enfileirados para sincronização; falta homologação clínica e nativa. |
| `/patient/:id/prescription/new` | Indisponível | Assinatura e salvamento da prescrição ainda não integrados. |
| `/patient/:id/prescription/:prescId` | Indisponível | Edição de prescrição ainda não integrada. |
| `/patient/:id/consents` | Indisponível | Termos e revogações ainda não têm persistência/auditoria. |
| `/patient/:id/documents` | Parcial | Anexa PDF/JPG/PNG ao bucket privado e salva metadados no prontuário; exige conexão, falta homologação em dispositivo. |
| `/patient/:id/referrals` | Parcial | Encaminhamento é registrado localmente e enfileirado para sincronização; não há envio ao destino. |
| `/indicators` | Indisponível | Métricas e filtros ainda não validados. |
| `/security/audit` | Indisponível | Log temporário não é trilha de auditoria confiável. |
| `/security/sessions` | Indisponível | Sem lista/revogação de sessões reais. |
| `/organization` | Indisponível | Convites e RBAC ainda não integrados. |
| `/organization/members` | Indisponível | Membros e permissões demonstrativos removidos do fluxo. |
| `/inventory` | Indisponível | Estoque/consumo ainda não integrado. |
| `/templates` | Indisponível | Templates/protocolos ainda não persistidos nem revisados. |

## Critérios para alterar o estado

Uma rota só passa a **integrada** após teste de reinício, dados sintéticos em ambiente de homologação autorizado, erros, acesso negado, isolamento por conta, offline/sync quando aplicável e dispositivo nativo. Uma tela, tabela SQL, mock ou exportação web isolados não provam integração.
