# Cicure

Aplicativo Expo SDK 57 para avaliação e acompanhamento longitudinal de feridas por profissionais de saúde. **Esta versão ainda não foi homologada para receber dados reais de pacientes.** Os fluxos clínicos e a segurança no dispositivo ainda têm etapas pendentes.

## Executar

```powershell
npm ci
npx expo start
```

Comandos de validação, configuração de ambientes e fluxo de PR: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

Use Node 22.13 ou superior, compatível com [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/). Configure `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` em `.env.local`, usando somente a chave publicável. Sem essas variáveis, a tela de entrada explica que o serviço precisa ser configurado e não abre prontuários. O contrato atual e a migração aplicada estão em [supabase/README.md](supabase/README.md).

## Estado das funcionalidades

- Cadastro, login por e-mail, recuperação de senha e login Google estão conectados ao Supabase Auth; links, provedores e experiência nativa ainda exigem homologação ponta a ponta.
- Os registros locais são separados por conta e sincronizados por RPC com políticas RLS no projeto configurado. A proteção do armazenamento no aparelho e os conflitos continuam em revisão.
- Prontuário, agenda, atendimento e histórico operam parcialmente sobre registros da conta.
- O atendimento salva rascunho; conclusão e assinatura estão indisponíveis.
- Plano terapêutico, prescrição, consentimentos, documentos, encaminhamentos, auditoria, indicadores, clínicas, estoque e templates exibem o motivo da indisponibilidade.
- A interpretação WIfI está suspensa até revisão clínica e regulatória.
- O build web pode ser usado para verificar a interface e os fluxos de autenticação em desenvolvimento; isso não substitui a validação em dispositivos.

Veja [PRODUCT.md](PRODUCT.md) para o MVP pretendido e os limites de ativação, [docs/ROUTE_STATUS.md](docs/ROUTE_STATUS.md) para o estado de cada rota e [as issues](https://github.com/pedrotescaro/cicure/issues) para dependências e critérios de aceite.
