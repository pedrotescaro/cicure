# Cicure

Aplicativo profissional de avaliação e acompanhamento longitudinal de feridas, construído com Expo SDK 57, Expo Router, Supabase, SQLite e interface pt-BR.

## Executar

```powershell
npm install
npx expo start
```

Para usar a sincronização, copie `.env.example` para `.env.local` e informe `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`. A migração inicial está em `supabase/migrations/0001_cicura.sql`. Sem essas variáveis, o app abre dados fictícios em modo local e exibe essa condição na ficha do paciente.

## Entregue nesta etapa

- Navegação por abas flutuantes com FAB e wordmark `cicure` em Comfortaa Bold vermelho.
- Dashboard com agenda, strip semanal, acompanhamento, cronômetro e atendimentos recentes.
- Busca e filtros de pacientes, estado clínico e destaque para atendimento do dia.
- Ficha do paciente com identificação, dados clínicos, comorbidades, medicamentos, exames, feridas e histórico.
- Atendimento em sete etapas com rascunho SQLite/localStorage, mensuração, tecidos, WIfI versionado, produtos, terapias, fotos calibráveis e conduta.
- Fila de sincronização, RLS, soft delete, controle de versão e bucket privado no Supabase.

Os pacientes exibidos inicialmente são fictícios. A matriz WIfI é registrada com versão e respostas; a interpretação apresentada é uma triagem de risco e não substitui a decisão clínica. O relatório PDF, o comparativo avançado e a integração real com o projeto Supabase entram nas próximas etapas.
