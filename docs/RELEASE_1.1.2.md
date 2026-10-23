# Cicure 1.1.2 — marca e abertura animada

A marca agora combina o monograma C com ponto do ícone e o sufixo `icure` na Comfortaa Bold original. Os cabeçalhos, a entrada, o tutorial e o atendimento usam a mesma composição vetorial. A imagem de referência não é usada como marca no aplicativo; o ícone e o favicon mantêm o monograma original.

Na abertura, o C se desenha e completa um giro, o ponto aparece e as letras entram em sequência até formar Cicure. A sequência dura aproximadamente 2,2 segundos, seguida da saída de 240 ms. Ela aguarda o aplicativo estar pronto. A configuração de redução de movimento mostra a marca final, sem giro.

A bolha de navegação tem limites para inflação e deslocamento, evitando cortes nas bordas. O tema escuro usa reflexos suaves e um único contorno, sem a faixa opaca inferior. O desfoque permanece montado durante a troca de abas. No Início, espaço de trabalho e status de envio passam a usar linhas estáveis em telas compactas, sem quebra imprevisível conforme a mensagem muda.

Instale `cicure-v1.1.2-release.apk` por cima da versão anterior, **sem desinstalar nem limpar os dados**. Versão 1.1.2, código 5, pacote `com.pedrotescaro.cicura`.

O [CI do código da versão](https://github.com/pedrotescaro/cicure/actions/runs/40017700042) passou com verificação de tipos, lint, **60 verificações automatizadas**, compatibilidade Expo e exportação web. Os testes adicionais cobrem ordem e limites da animação, espera pelos recursos, composição do nome e contenção da bolha durante reversões rápidas e inflação. A análise mecânica de UI não apontou problemas nos componentes alterados.

O APK final foi instalado por atualização no emulador Android 16/API 36, preservando a sessão. A abertura foi gravada e os quadros foram inspecionados: traçado/giro do C e composição final da marca apareceram. A navegação repetida entre abas e a tela inicial foram verificadas nos temas claro e escuro, em 360 dp e em 320 dp com fonte a 150%. Espaço de trabalho e envio de dados mantiveram linhas separadas e legíveis. A reabertura também foi testada com as animações do sistema removidas. Os logs da sequência não registraram exceções JavaScript nem encerramentos fatais.

As capturas e a gravação ficam em `.artifacts/android-qa/`, fora do Git. A prévia GIF da release é extraída da gravação nativa. Ela demonstra a sequência visual e não mede a fluidez em aparelho físico. Consulte os [metadados e checksum do APK](APK_1.1.2.json); o arquivo publicado foi comparado com a cópia local e o certificado anterior foi mantido.

Esta atualização altera apresentação e animação. Os [limites funcionais e clínicos documentados](RELEASE_1.1.0.md) continuam aplicáveis; testes técnicos com dados sintéticos não constituem homologação clínica.
