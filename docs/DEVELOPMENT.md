# Desenvolvimento e entrega

## Ambiente

Use Node `24.14.0` (`.nvmrc`), npm e o lockfile versionado. O SDK 57 requer pelo menos Node 22.13. Faça a instalação limpa com `npm ci`.

O app só cria um cliente Supabase quando **ambas** as variáveis públicas estão preenchidas com URL válida e chave pública explícita:

```powershell
Copy-Item .env.example .env.local
# Edite .env.local com os valores do projeto de desenvolvimento.
```

`EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ficam dentro do bundle e nunca podem conter `service_role`, senha ou outro segredo. A antiga variável `EXPO_PUBLIC_SUPABASE_ANON_KEY` ainda é aceita como alternativa durante a migração. Guarde credenciais privadas somente no gerenciador seguro do serviço. Use projetos e chaves distintos para desenvolvimento, homologação e produção; configure o ambiente de build correspondente antes de distribuir. Sem variáveis, o app mostra a configuração pendente e não abre registros clínicos. A configuração cloud por si só não comprova todos os fluxos de autenticação e sincronização; veja as issues #4–#9.

A versão web serve para verificar a interface e os fluxos de desenvolvimento, não para atendimento clínico. Não coloque dados reais em ambiente de demonstração.

## Checks locais e CI

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run expo:check
npm run export:web
```

`npm test` executa persistência, recuperação da base antiga, configuração cloud, cadastro/agenda, módulos de apoio, relatórios/lembretes, ciclo do atendimento e algoritmos clínicos; qualquer falha retorna código diferente de zero. O CI repete esses comandos em cada PR para `main` e em pushes a `main`. A exportação web verifica o bundle, mas não publica a aplicação. A entrega 1.1.0 tem **46 verificações aprovadas**, lint sem avisos e [CI aprovado no código final](https://github.com/pedrotescaro/cicure/actions/runs/39893099923).

`supabase/tests/owner_isolation.sql`, `android_workflows.sql` e `organization_access.sql` verificam isolamento, ciclo clínico e permissões em transações com `ROLLBACK`. Execute-os em banco de teste antes de cada mudança de RLS. Os roteiros HTTP `scripts/test-live-sync.cjs` e `scripts/test-live-organization.cjs` usam duas contas sintéticas preparadas fora do Git; nunca aponte esses testes para contas ou pacientes reais. O CI ainda não inicia banco Supabase e não valida acesso remoto, dispositivo nativo nem exatidão clínica. As evidências remotas e Android desta versão estão em [RELEASE_1.1.0.md](RELEASE_1.1.0.md).

Nesta entrega, os testes no servidor real aprovaram **11 grupos SQL de fluxos individuais e 9 de permissões de clínica**, com reversão dos dados de teste, além de **7 verificações HTTP individuais e 5 de clínica**. Essas execuções remotas são evidências separadas do CI.

No emulador Android, foram comprovados atualização por `adb install -r` com sessão preservada, acesso Supabase, navegação em português, cadastro de paciente e ferida, salvamento de rascunho, geração real de PDF de atendimento concluído, prévia de impressão de duas páginas e abertura do seletor de compartilhamento sem envio. Essa sequência usou o APK anterior à última correção do teclado do modal. No APK final, foram repetidos instalação, abertura com sessão preservada e navegação de pacientes; o teste de regressão confirmou que Voltar fecha o teclado sem descartar o cadastro nem apagar o nome preenchido. Isso não comprova persistência nativa das medidas, ciclo completo de câmera, operação sem internet, recuperação de dados antigos no Android ou uso em aparelho físico. Os testes técnicos não equivalem a aprovação clínica do aplicativo.

O diagnóstico de dependências registra **20 alertas altos, 3 moderados e 0 críticos**. O CI aprovado não significa ausência de vulnerabilidades; os alertas transitivos restantes exigem acompanhamento de correções compatíveis com o SDK 57.

## GitHub Flow solo

1. Crie uma branch curta com o nome da feature/issue a partir de `main` atualizado.
2. Faça commits atômicos em inglês no formato Conventional Commits.
3. Abra PR em português para `main` com o template, referência à issue, evidência dos checks e limites da validação.
4. Revise o diff e os resultados do CI; não presuma uma aprovação de segundo desenvolvedor.
5. Use `Closes #N` somente quando todo o aceite da issue estiver cumprido. Depois do merge, apague a branch remota.

Nunca inclua `.env.local`, credenciais ou dados de pacientes em commits, prints, logs, issues e PRs.
