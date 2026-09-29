# Supabase do Cicure

O cliente usa `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Copie `.env.example` para `.env.local` e preencha apenas a URL e a chave publicável. Nunca coloque `service_role`, segredo OAuth ou senha em variáveis `EXPO_PUBLIC_*` ou no Git.

`migrations/20260929185350_initial_authenticated_records.sql` é a primeira migração aplicada ao projeto atual. Os arquivos em `docs/legacy-migrations/` são protótipos arquivados e não devem ser reproduzidos neste projeto. Antes de aplicar novas migrações, compare o histórico remoto com `supabase/migrations/`.

Os registros clínicos ficam em `public.app_records`, com `owner_id` definido pela identidade autenticada e acesso limitado por RLS. O aplicativo envia alterações pela RPC `save_record` e lê por `pull_records`. A versão impede gravações silenciosas sobre alterações concorrentes; conflitos continuam na fila local para revisão. Fotos são enviadas ao bucket privado `clinical-files` em pastas iniciadas pelo ID da conta.

Para autenticação, ative Email e Google no painel do Supabase. O OAuth Web do Google usa `https://dbktfowrezwhfabyvfdf.supabase.co/auth/v1/callback` no Google Cloud. As URLs de retorno do app devem incluir `cicure://auth/**` e, para desenvolvimento web, `http://localhost:8081/auth/**`. Antes de distribuir a versão web, inclua sua URL pública exata na lista de retornos.

`tests/owner_isolation.sql` executa as principais verificações de acesso em uma única transação e faz `ROLLBACK` no final. Execute em banco descartável ou por uma conexão que mantenha toda a transação. O arquivo verifica leitura e edição por outra conta, vínculo a paciente de outra conta e acesso anônimo. A validação nativa e o fluxo de e-mail ainda exigem testes em Android/iOS e caixas de entrada reais.
