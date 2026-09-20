# Abertura e navegação do cicure

Os dois efeitos estão no fluxo real do Expo Router. A abertura aparece uma vez
por inicialização do JavaScript; trocar abas, voltar à tela inicial e trocar de
workspace não a repetem. Um reload completo do app ou da página web a executa
novamente.

## Visualizar

- Web: `npm run web -- --clear`, abra a URL indicada pelo Expo e recarregue a página
  para ver a abertura. Toque nas cinco abas, incluindo sequências rápidas e saltos
  entre a primeira e a última.
- Android: `npm run android`. Após instalar uma compilação com a nova configuração
  da splash, feche e abra o app para verificar a passagem da tela nativa para o SVG.
- iOS: `npm run ios` em um Mac com Xcode. A experiência completa da splash deve
  ser conferida numa build release; Expo Go e builds de desenvolvimento podem
  mostrar a marca/ícone do ambiente antes da camada React Native.
- Ative a preferência de redução de movimento do dispositivo/navegador: o logo
  aparece completo e a seleção das abas muda sem deslocamento nem deformação.

## Arquivos

- `src/ui/brand/AnimatedLogo.tsx`: SVG com desenho real via dash offset e preenchimento.
- `src/ui/brand/cicurePaths.ts`: geometria por letra, extraída da Comfortaa Bold instalada.
- `scripts/generate-cicure-logo.py`: geração reproduzível e validação `--check` da fonte.
- `src/ui/brand/AnimatedSplash.tsx` e `app/_layout.tsx`: sequência, recursos iniciais e saída da splash.
- `app.json`, `assets/splash-blank.png`, `package.json` e `package-lock.json`: módulo
  `expo-splash-screen` compatível com SDK 57 e fundo nativo branco.
- `src/ui/navigation/LiquidTabBar.tsx` e `app/(tabs)/_layout.tsx`: lente compartilhada,
  medidas dos itens, rotas, ícones existentes e alvo de blur por tela.
- `src/ui/motion.ts`: cores derivadas do tema, durações, molas e dimensões.
- `src/ui/useMotionPreferences.ts`: preferências de acessibilidade atualizadas em execução.
- `src/ui/navigation/useTabContentInset.ts`, as quatro telas diretas de abas e
  `src/features/agenda/ui/AdvancedAgenda.tsx`: reserva inferior calculada pela área
  segura, altura da barra e botão de novo atendimento.

## Movimento e material

Os quadros dos vídeos fornecidos foram examinados. O logo de referência desenha
até cerca de 1,4 s, preenche por volta de 1,6 s e permanece até aproximadamente
2,07 s. Aqui os tokens usam desenho de 1400 ms, preenchimento de 250 ms, permanência
de 250 ms e saída de 180 ms. Todas as letras compartilham o mesmo viewBox fixo;
contornos, curvas internas, ponto do i, avanços e kerning vêm do TTF real.

A bolha do segundo vídeo cresce perto da origem, alonga na direção do destino e
contrai. A implementação anima bordas dianteira e traseira com molas defasadas,
inflação vertical e transparência. Ao redirecionar, cancela também os atrasos e
continua dos valores correntes. Os ícones ficam acima da lente, sem desfoque.

No Android 12/API 31 ou superior, a barra usa `BlurTargetView` da tela ativa e
`blurMethod="dimezisBlurViewSdk31Plus"`. Em versões anteriores, usa uma superfície
translúcida. A preferência iOS de reduzir transparência também evita o blur.
O projeto tem um único tema claro; a navegação reutiliza seus tokens e a splash
mantém branco também quando o sistema está em modo escuro.

O vidro é composto de blur, cor translúcida, contorno e reflexos: não implementa
refração óptica por shader. O custo do blur é limitado à cápsula, e os valores da
animação são geridos por Reanimated, sem estado React por quadro.

## Verificações

`npx tsc --noEmit`, `npx expo install --check`, `npx expo-doctor` e
`npx expo export --platform all --max-workers 2` verificam tipos, compatibilidade,
configuração e bundles. `python scripts/generate-cicure-logo.py --check` compara os
paths com o TTF. As evidências locais de comparação e QA ficam em `.artifacts/`,
fora do controle de versão.

Referências técnicas: [Expo 57 BlurView](https://docs.expo.dev/versions/v57.0.0/sdk/blur-view/),
[Expo 57 SplashScreen](https://docs.expo.dev/versions/v57.0.0/sdk/splash-screen/) e
[Reanimated withSpring](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/).
