# Cicure 1.1.1 — correções de navegação

Versão Android 1.1.1, código 4, pacote `com.pedrotescaro.cicura`. Instale por cima da versão anterior, sem desinstalar ou limpar os dados.

## Correções

- O reflexo superior da bolha da barra de navegação usa uma curva suave, sem a faixa horizontal que achatava o topo. Cores, dimensões e movimento foram preservados.
- O botão **Continuar com Google** inclui o ícone oficial colorido, distribuído junto do aplicativo para aparecer mesmo sem conexão. Fonte do arquivo: [Google Identity](https://developers.google.com/static/identity/images/g-logo.png).
- O navegador principal permanece montado durante a entrada na conta, inicialização dos registros e mudanças de acesso à clínica. Um controle por tela aguarda a autenticação e o armazenamento antes de montar conteúdo privado; as rotas de retorno de autenticação continuam acessíveis.
- Mapa corporal e histórico deixaram de criar arrays novos dentro dos seletores do armazenamento. Isso corrige snapshots instáveis que podem causar `Maximum update depth exceeded` no Zustand/React.

## Evidência e alcance

A pilha fornecida foi rastreada com o mapa de fontes do APK 1.1.0 até a atualização de estado do navegador raiz do Expo Router. O encerramento informado após o primeiro login não se repetiu na tentativa com instalação limpa no emulador da versão anterior; por isso, essa correção de ciclo de navegação não é apresentada como reprodução exata do incidente. Os quatro seletores instáveis foram identificados diretamente e as regressões automatizadas rejeitam sua implementação anterior.

Os testes exercitam o navegador real do aplicativo com valores de hooks controlados durante login, inicialização, saída e perda de acesso à clínica; verificam também que conteúdo privado não é liberado antes da hora. Os testes dos seletores verificam snapshots estáveis e atualização dos dados por paciente.

O [CI do código final](https://github.com/pedrotescaro/cicure/actions/runs/39987629001) passou: verificação de tipos, lint, **52 verificações automatizadas**, compatibilidade de dependências Expo e exportação web. O APK é compilado separadamente para Android.

No APK final, instalado no emulador Android 16/API 36:

- A atualização por `adb install -r` preservou a sessão autenticada e permitiu navegar e reabrir o aplicativo.
- Após limpar apenas os dados do emulador de testes, a primeira entrada por e-mail e senha chegou ao tutorial e ao Início. A troca repetida entre as cinco abas, a mudança de tema e a reabertura funcionaram.
- Os logs dessas duas sequências não registraram `Maximum update depth exceeded`, `JavascriptException` ou `FATAL EXCEPTION`.
- O ícone do Google foi conferido na tela de entrada; a curva da bolha foi conferida nos temas claro e escuro. O fluxo OAuth do Google não foi acionado nessa verificação visual.

A compilação Android terminou com sucesso. O certificado foi preservado e o checksum do arquivo enviado ao GitHub foi comparado com a cópia local. Consulte os [metadados do APK](APK_1.1.1.json). As evidências locais usam contas e registros sintéticos e ficam em `.artifacts/android-qa/`, fora do Git.

Esta atualização mantém os [limites de validação da versão 1.1.0](RELEASE_1.1.0.md). Testes técnicos com dados sintéticos não equivalem à homologação clínica ou em aparelho físico.
