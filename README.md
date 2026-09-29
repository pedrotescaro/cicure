# Cicure

Aplicativo Expo SDK 57 para avaliação e acompanhamento longitudinal de feridas por profissionais de saúde. **Esta versão é um protótipo com rascunhos locais e não deve receber dados reais de pacientes.** A integração de conta, nuvem, segurança e assinatura ainda está em andamento.

## Executar

```powershell
npm ci
npx expo start
```

Comandos de validação, configuração de ambientes e fluxo de PR: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

Use Node 22.13 ou superior, compatível com [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/). Para um projeto Supabase de desenvolvimento, configure `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` em um `.env.local` local, sem credenciais privadas. Sem essas variáveis, o app permanece no armazenamento local e informa que a nuvem está indisponível. Configurar variáveis não comprova autenticação, RLS ou sincronização. A migração inicial está em `supabase/migrations/0001_cicura.sql`.

## Estado das funcionalidades

- Cadastro, prontuário, agenda, atendimento e histórico operam parcialmente sobre dados locais.
- O atendimento salva rascunho; conclusão e assinatura estão indisponíveis.
- Plano terapêutico, prescrição, consentimentos, documentos, encaminhamentos, auditoria, indicadores, clínicas, estoque e templates exibem o motivo da indisponibilidade.
- A interpretação WIfI está suspensa até revisão clínica e regulatória.
- A web é somente demonstração de interface com dados sintéticos.

Veja [PRODUCT.md](PRODUCT.md) para o MVP pretendido e os limites de ativação, [docs/ROUTE_STATUS.md](docs/ROUTE_STATUS.md) para o estado de cada rota e [as issues](https://github.com/pedrotescaro/cicure/issues) para dependências e critérios de aceite.
