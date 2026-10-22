# Supabase do Cicure

## Contrato 1.1.0

As migrações `android_workflows`, `account_sessions`, `organization_membership_access` e `invitation_deny_policy` estão versionadas junto da entrega. A primeira mantém a RPC de gravação, amplia os tipos persistidos, aplica validações/imutabilidade por trigger e registra revisões e atividades com autoria do servidor. A última migração declara a negação de leitura direta dos convites; os tokens são emitidos e consumidos por funções autorizadas.

`pull_records(p_organization_id, p_after_id, p_limit)` consulta páginas por ID (200 registros por padrão). O espaço individual filtra a conta; o compartilhado exige associação ativa e papéis. As funções de equipe verificam convites de uso único, expiração e e-mail confirmado. O app não transfere automaticamente registros individuais para clínicas.

`list_activity_events(p_organization_id)`, `list_record_revisions(p_record_id)` e `list_own_sessions()` retornam apenas dados autorizados. Os eventos e versões do servidor não aceitam alterações do cliente. A função interna de sessões usa privilégios elevados somente para consultar sessões do próprio `auth.uid()`, sem expor credenciais. A revogação de sessões é feita pelo Supabase Auth; access tokens já emitidos continuam válidos até expirar.

Testes transacionais em `tests/android_workflows.sql` e `tests/organization_access.sql` exercitam múltiplas identidades e fazem `ROLLBACK`. `scripts/test-live-sync.cjs` é um teste HTTP manual que exige duas contas sintéticas locais em `.artifacts/android-qa/`; nunca execute com credenciais ou registros reais.

O cliente usa `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Copie `.env.example` para `.env.local` e preencha apenas a URL e a chave publicável. Nunca coloque `service_role`, segredo OAuth ou senha em variáveis `EXPO_PUBLIC_*` ou no Git.

`migrations/20260929185350_initial_authenticated_records.sql` é a primeira migração aplicada ao projeto atual. Os arquivos em `docs/legacy-migrations/` são protótipos arquivados e não devem ser reproduzidos neste projeto. Antes de aplicar novas migrações, compare o histórico remoto com `supabase/migrations/`.

Os registros clínicos ficam em `public.app_records`, com `owner_id` definido pela identidade autenticada e acesso limitado por RLS. O aplicativo envia alterações pela RPC `save_record` e lê por `pull_records`. A versão impede gravações silenciosas sobre alterações concorrentes; conflitos continuam na fila local para revisão. Fotos são enviadas ao bucket privado `clinical-files` em pastas iniciadas pelo ID da conta.

Para autenticação, ative Email e Google no painel do Supabase. O OAuth Web do Google usa `https://dbktfowrezwhfabyvfdf.supabase.co/auth/v1/callback` no Google Cloud. As URLs de retorno do app devem incluir `cicure://auth/**` e, para desenvolvimento web, `http://localhost:8081/auth/**`. Antes de distribuir a versão web, inclua sua URL pública exata na lista de retornos.

`tests/owner_isolation.sql` executa as principais verificações de acesso em uma única transação e faz `ROLLBACK` no final. Execute em banco descartável ou por uma conexão que mantenha toda a transação. O arquivo verifica leitura e edição por outra conta, vínculo a paciente de outra conta e acesso anônimo. A validação nativa e o fluxo de e-mail ainda exigem testes em Android/iOS e caixas de entrada reais.
