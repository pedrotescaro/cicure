# Cicure

## Finalidade pretendida

Ferramenta para profissionais de saúde registrarem avaliação e acompanhamento longitudinal de feridas. O profissional mantém a responsabilidade pela avaliação, conduta e assinatura. O Cicure não é um aplicativo para pacientes e não toma decisões terapêuticas autônomas.

## MVP individual pretendido

Conta e perfil profissional; cadastro e prontuário com múltiplas feridas; atendimento offline com autoria, assinatura e adendos; fotos privadas; consentimentos; evolução longitudinal; relatório e agenda básica. Android e iOS são as plataformas de uso profissional. A web serve somente como demonstração de interface com dados sintéticos.

Este é o **escopo alvo**, não uma declaração de que as capacidades já estejam integradas. Consulte [o inventário de rotas](docs/ROUTE_STATUS.md) para o estado atual de cada tela.

## Estado atual e política de ativação

O app mantém rascunhos e cadastros em armazenamento local, mas ainda não vincula esse armazenamento a uma conta autenticada. A autenticação, o isolamento entre usuários, o schema/RLS, o transporte privado de mídia e a sincronização confiável dependem das issues #4–#9. Não use dados de pacientes reais nesta versão. A instalação limpa não deve criar registros clínicos, consentimentos, sessões ou organizações fictícias.

Plano terapêutico, prescrição, consentimentos, documentos, encaminhamentos, auditoria de sessões, clínicas/equipes, estoque e templates mostram indisponibilidade até terem persistência, autorização e validação correspondentes. Suas bases de código e schema permanecem para implementação posterior. O fluxo de atendimento permite rascunho local; a conclusão/assinatura está desativada até #13. A interpretação WIfI e campos de sinais vitais sem persistência estão desativados até #14 e revisão clínica.

## Decisão clínica e regulatória pendente

A finalidade pretendida acima precisa ser aprovada por Pedro e revisada com profissional clínico e especialista regulatório competentes antes de habilitar estratificação de risco, prognóstico, recomendação de conduta ou prescrição. A revisão deve definir versões e fontes dos algoritmos, população de uso, limites, riscos, evidência clínica e eventual enquadramento conforme a [orientação da Anvisa sobre software como dispositivo médico](https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2022/software-como-dispositivo-medico-perguntas-e-respostas). Nenhuma dispensa, regularização ou aprovação é presumida.

## Marca e plataforma

Wordmark `cicure` em Comfortaa Bold e vermelho `#D62828`, sem símbolo acompanhante. React Native, Expo SDK 57, Expo Router, SQLite e Supabase planejado para Auth/Postgres/Storage/RLS. A interface é pt-BR e segue [DESIGN.md](DESIGN.md).
