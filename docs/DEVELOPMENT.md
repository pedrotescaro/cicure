# Desenvolvimento e entrega

## Ambiente

Use Node `24.14.0` (`.nvmrc`), npm e o lockfile versionado. O SDK 57 requer pelo menos Node 22.13. Faça a instalação limpa com `npm ci`.

O app só cria um cliente Supabase quando **ambas** as variáveis públicas estão preenchidas com URL válida e chave pública explícita:

```powershell
Copy-Item .env.example .env.local
# Edite .env.local com os valores do projeto de desenvolvimento.
```

`EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` ficam dentro do bundle e nunca podem conter `service_role`, senha ou outro segredo. Guarde credenciais privadas somente no gerenciador seguro do serviço. Use projetos e chaves distintos para desenvolvimento, homologação e produção; configure o ambiente de build correspondente antes de distribuir. Sem variáveis, o app permanece local. A configuração cloud por si só ainda não comprova autenticação, RLS ou sincronização segura; veja as issues #4–#9.

A versão web serve para demonstração da interface com dados sintéticos e não para atendimento clínico. Não coloque dados reais em ambiente de demonstração.

## Checks locais e CI

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run expo:check
npm run export:web
```

`npm test` executa os testes de persistência, configuração cloud e algoritmos clínicos; qualquer falha retorna código diferente de zero. O CI repete esses comandos em cada PR para `main` e em pushes a `main`. A exportação web verifica o bundle, mas não publica a aplicação. Os avisos existentes do lint sobre fluxos antigos de animação e inicialização continuam visíveis; erros das demais regras reprovam o CI.

Um banco Supabase descartável e testes de schema/RLS serão adicionados quando os contratos da issue #4 estiverem reconciliados. Até lá, a CI não valida acesso remoto, políticas, dispositivo nativo nem exatidão clínica.

## GitHub Flow solo

1. Crie uma branch curta com o nome da feature/issue a partir de `main` atualizado.
2. Faça commits atômicos em inglês no formato Conventional Commits.
3. Abra PR em português para `main` com o template, referência à issue, evidência dos checks e limites da validação.
4. Revise o diff e os resultados do CI; não presuma uma aprovação de segundo desenvolvedor.
5. Use `Closes #N` somente quando todo o aceite da issue estiver cumprido. Depois do merge, apague a branch remota.

Nunca inclua `.env.local`, credenciais ou dados de pacientes em commits, prints, logs, issues e PRs.
