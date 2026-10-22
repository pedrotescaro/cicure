# Cicure

Aplicativo Expo SDK 57 para avaliação e acompanhamento longitudinal de feridas por profissionais de saúde. **Esta versão ainda não foi homologada para receber dados reais de pacientes.** Os fluxos clínicos e a segurança no dispositivo ainda têm etapas pendentes.

## Executar

```powershell
npm ci
npx expo start
```

Comandos de validação, configuração de ambientes e fluxo de PR: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

Use Node 22.13 ou superior, compatível com [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/). Configure `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` em `.env.local`, usando somente a chave publicável. Sem essas variáveis, a tela de entrada explica que o serviço precisa ser configurado e não abre prontuários. O contrato atual e a migração aplicada estão em [supabase/README.md](supabase/README.md).

## Versão 1.1.0

- Navegação em português: Início, Pacientes, Agenda, Relatórios e Menu; ação visível “Novo atendimento”.
- Pacientes e múltiplas feridas, avaliação guiada, evolução clínica editável, rascunho recuperável, conclusão com autoria e adendos preservados.
- Fotos privadas com câmera/galeria, referência de escala informada e comparação por ferida; relatórios PDF com prévia e compartilhamento no Android.
- Agenda e retornos com lembretes nativos, planos de cuidado, prescrições revisadas, consentimentos, documentos, encaminhamentos, modelos e estoque por movimentações.
- Contas isoladas, fila durável, confirmação do servidor, conflitos com preservação das cópias, histórico local e auditoria do servidor.
- Clínicas e equipes com convites reais, validade, papéis e revogação verificados no servidor. O espaço compartilhado exige internet para verificar as permissões; o individual pode trabalhar sem conexão.
- Recuperação explícita dos registros sem conta da versão anterior, preservando originais e pendências.

Consulte [a entrega 1.1.0](docs/RELEASE_1.1.0.md) para instalação, evidências e limites. A interpretação WIfI permanece suspensa. Confirmação de registro e autenticação do profissional não equivalem a assinatura digital certificada. Encaminhamentos são registrados, sem envio automático ao destinatário. OAuth Google e e-mails exigem a configuração dos provedores. A versão web serve para desenvolvimento e não substitui a validação nativa ou clínica.

Veja [PRODUCT.md](PRODUCT.md) para o MVP pretendido e os limites de ativação, [docs/ROUTE_STATUS.md](docs/ROUTE_STATUS.md) para o estado de cada rota e [as issues](https://github.com/pedrotescaro/cicure/issues) para dependências e critérios de aceite.
