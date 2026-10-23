# Cicure

## Finalidade pretendida

Ferramenta para profissionais de saúde registrarem avaliação e acompanhamento longitudinal de feridas. O profissional mantém a responsabilidade pela avaliação, conduta e assinatura. O Cicure não é um aplicativo para pacientes e não toma decisões terapêuticas autônomas.

## MVP individual pretendido

Conta e perfil profissional; cadastro e prontuário com múltiplas feridas; atendimento offline com autoria, assinatura e adendos; fotos privadas; consentimentos; evolução longitudinal; relatório e agenda básica. Android e iOS são as plataformas de uso profissional. A web serve somente como demonstração de interface com dados sintéticos.

Este é o **escopo alvo**, não uma declaração de que as capacidades já estejam integradas. Consulte [o inventário de rotas](docs/ROUTE_STATUS.md) para o estado atual de cada tela.

## Estado atual e política de ativação

A versão 1.1.0 vincula os registros à conta autenticada, com SQLite no Android, fila persistente, RPCs e autorização no Supabase. O atendimento salva evolução e sinais vitais, recupera rascunhos e permite conclusão com autoria e adendos preservados. A confirmação do registro não equivale a assinatura digital certificada. A instalação limpa não cria dados clínicos ou equipes fictícios.

Planos de cuidado, prescrições revisadas, consentimentos, documentos privados, encaminhamentos, histórico, sessões reais, clínicas/equipes, estoque e modelos possuem interface e persistência. O acesso a uma clínica exige conexão e verificação atual da associação; o espaço individual pode continuar sem internet. Consulte o inventário e a evidência da entrega para os limites dos testes. A interpretação WIfI continua suspensa. Não há homologação clínica/regulatória ou piloto assistencial comprovados; utilize dados sintéticos na validação.

## Decisão clínica e regulatória pendente

A finalidade pretendida acima precisa ser aprovada por Pedro e revisada com profissional clínico e especialista regulatório competentes antes de habilitar estratificação de risco, prognóstico, recomendação de conduta ou prescrição. A revisão deve definir versões e fontes dos algoritmos, população de uso, limites, riscos, evidência clínica e eventual enquadramento conforme a [orientação da Anvisa sobre software como dispositivo médico](https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2022/software-como-dispositivo-medico-perguntas-e-respostas). Nenhuma dispensa, regularização ou aprovação é presumida.

## Marca e plataforma

Marca formada pelo monograma vetorial C com ponto, do ícone fornecido, seguido de `icure` nos contornos originais da Comfortaa Bold. Vermelho `#D62828`, adaptado ao tema escuro. A abertura desenha e gira o C uma vez, revela o ponto e completa o nome. React Native, Expo SDK 57, Expo Router, SQLite e Supabase Auth/Postgres/Storage/RLS. A interface é pt-BR e segue [DESIGN.md](DESIGN.md).

## Platform

android

A web é uma prévia de desenvolvimento; a distribuição iOS continua sem homologação de dispositivo ou assinatura.
