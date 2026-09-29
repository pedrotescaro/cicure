# Estado das rotas

Inventário do checkout desta PR. **Parcial** significa que a tela usa dados locais ou mostra somente uma parte do fluxo; não significa que está pronta para dados reais, nuvem ou uso assistencial. **Indisponível** significa que a rota apresenta uma explicação e não executa a ação. As rotas de layout e o redirecionamento de URL desconhecida não são telas de produto.

| Rota | Estado | Evidência e limite |
| --- | --- | --- |
| `/` | Parcial | Início mostra registros locais; agenda e indicadores de produção ainda não são integrados. |
| `/patients` | Parcial | Lista lê o armazenamento local; conta e isolamento ainda pendentes. |
| `/care` | Parcial | Agenda lê visitas locais; lembrete nativo informa indisponibilidade. |
| `/reports` | Indisponível | Apresenta apenas o planejamento dos formatos, sem PDF gerado. |
| `/more` | Parcial | Preferências locais funcionam; PIN/biometria e serviços pendentes explicam indisponibilidade. |
| `/patient/:id` | Parcial | Ficha lê dados locais; ações não integradas levam a estado indisponível. Alertas automáticos permanecem em revisão clínica. |
| `/patient/:id/body-map` | Parcial | Visualização local da ferida; sem prova de sincronização entre aparelhos. |
| `/patient/:id/timeline` | Parcial | Linha do tempo deriva de registros locais. |
| `/care/new` | Parcial | Cria rascunho local; conclusão, assinatura e WIfI ficam indisponíveis. |
| `/care/:id` | Parcial | Resumo lê visita local; autoria e assinatura confiáveis pendentes. |
| `/pending` | Parcial | Pendências derivadas dos registros locais. |
| `/sync` | Parcial | Mostra fila local e informa quando não há configuração cloud; contrato/RLS ainda não homologados. |
| `/patient/:id/care-plan` | Indisponível | Plano ainda não é persistido no prontuário. |
| `/patient/:id/prescription/new` | Indisponível | Assinatura e salvamento da prescrição ainda não integrados. |
| `/patient/:id/prescription/:prescId` | Indisponível | Edição de prescrição ainda não integrada. |
| `/patient/:id/consents` | Indisponível | Termos e revogações ainda não têm persistência/auditoria. |
| `/patient/:id/documents` | Indisponível | Anexos ainda não têm transporte privado e persistência. |
| `/patient/:id/referrals` | Indisponível | Encaminhamento ainda não é salvo/entregue. |
| `/indicators` | Indisponível | Métricas e filtros ainda não validados. |
| `/security/audit` | Indisponível | Log temporário não é trilha de auditoria confiável. |
| `/security/sessions` | Indisponível | Sem lista/revogação de sessões reais. |
| `/organization` | Indisponível | Convites e RBAC ainda não integrados. |
| `/organization/members` | Indisponível | Membros e permissões demonstrativos removidos do fluxo. |
| `/inventory` | Indisponível | Estoque/consumo ainda não integrado. |
| `/templates` | Indisponível | Templates/protocolos ainda não persistidos nem revisados. |

## Critérios para alterar o estado

Uma rota só passa a **integrada** após teste de reinício, dados sintéticos em ambiente de homologação autorizado, erros, acesso negado, isolamento por conta, offline/sync quando aplicável e dispositivo nativo. Uma tela, tabela SQL, mock ou exportação web isolados não provam integração.
