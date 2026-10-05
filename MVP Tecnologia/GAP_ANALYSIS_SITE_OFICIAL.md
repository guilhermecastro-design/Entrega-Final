# Gap Analysis — MVP (As-Is) vs. site oficial do Instituto Ebenézer

**Fontes consultadas (05/10/2026):**
- https://www.institutosocialebenezer.com.br/ (Início)
- https://www.institutosocialebenezer.com.br/transparencia
- https://www.institutosocialebenezer.com.br/sobre-nos
- https://www.institutosocialebenezer.com.br/nossas-iniciativas
- https://www.institutosocialebenezer.com.br/nosso-time

Comparação direta: o que o site real tem e o nosso MVP ainda não.

## 1. Transparência — o maior gap

O que já bate com o site real (bom sinal de que o MVP não é fantasioso): o ring de ESG (72%) e o detalhamento por dimensão (Governança 88%, Estrutura 100%, Riscos 75%, Compliance 75%, Ambiental e Social 50% cada) são idênticos aos publicados. O Conselho Diretor (Ueliton Moreira Rocha, André Pereira, Helena Guardiano de Sá) também bate.

O que falta ou está desatualizado:

- **Dados financeiros públicos 2025 não aparecem na tela de Transparência.** O site mostra Receita total R$176.854,37 (+35,8% vs 2024), Despesas R$146.668,38 (+15,0%), Superávit R$30.186,00, e Recursos não-monetários R$783.964,85 (voluntariado + bens/serviços). No MVP, esse detalhamento só existe — com dado marcado como `ficticio_pendente` — dentro do painel financeiro da área do doador logada, não na tela pública `transparencia.html`.
- **`indicadores_financeiros` está com número desatualizado**: temos seedado `receita_pf = R$ 87.033,90`, mas o site hoje publica R$ 101.561,07 (PF) + R$ 75.293,30 (PJ). Esse segundo bate, o primeiro não — precisa atualizar.
- **Custo por aluno**: o site mostra R$1.136,96/ano (≈R$94,75/mês), nosso MVP mostra R$93,68/mês — bem próximo, mas vale confirmar se é a mesma fonte/período antes de apresentar como "dado real".
- **Documentos reais inexistentes no MVP.** `documentos-empresa.html` hoje é só uma lista de cards com nomes e datas fictícios, sem link nenhum por trás do botão "Baixar". O site real tem, com link direto: Relatório Anual de Impacto 2025 (PDF, 51 páginas, `drive.google.com/file/d/1H3MYl8UXlKWcxlp4Ccw1rnYxAonDhRdL/view`), Relatório Anual 2024 e 2023, Balanço Patrimonial 2025, DRE 2025/2024/2023, e uma versão em inglês (Annual Report 2024) — todos dentro da pasta pública do Drive: `drive.google.com/drive/u/0/folders/1_3cL6q9gJtdw89bERhNE_bgVD1migfWt`.
- **Planejamento Estratégico 2026–2030** não existe em lugar nenhum do MVP.

## 2. Sobre Nós / Nosso Time — não existe no MVP

Hoje não existe nenhuma tela institucional. Falta: missão ("transformar perspectivas infantis... Se mudarmos o começo da história, mudamos a história toda"), visão de impacto, os 6 valores (Foco na Solução, Colaboração, Proatividade, Trabalho Inteligente, Escuta Atenta, Construção de Autonomia), contexto/história (atuação no Jardim Ângela, +200 alunos beneficiados), e alinhamento com os ODS.

E falta também o "Nosso Time" completo — hoje só o Conselho Diretor aparece (dentro de Transparência); Conselho Fiscal (Murilo Passos, Renata Amorim, Juliano Barreto Silva) e Conselho Consultivo (Paulo Pedote, Elis Tolosa, Leandro Silveira, Felippe Kanashiro) existem no MVP só como "+3 membros" e "+4 membros" genéricos, sem nome, cargo ou formação.

## 3. Nossas Iniciativas — não confundir com "Adotar uma criança"

O site lista 5 programas reais: Primeira Infância (0–5 anos), Laboratório de Sonhos (6–11 anos), Apoio Psicossocial e Saúde Mental, Reforço Escolar (parceria Alicerce Educação), e Favela Developers Academy. Nenhum existe no MVP hoje.

Ponto de atenção de escopo: o que já temos (`historias.html` / mosaico em `convidar-amigo.html`) é uma feature **diferente e deliberadamente fictícia** — apelidos inventados, por proteção ECA/LGPD, para a dinâmica de indicação/apadrinhamento simbólico. "Nossas Iniciativas" é institucional (os programas reais que o Instituto oferece), não tem relação com indicação de doação, e não deveria reaproveitar a lógica fictícia — é conteúdo real do próprio site.

## 4. Imagens — hoje é 100% placeholder de texto

Todo slot de imagem no MVP hoje é um texto tipo `[Foto: ... não pôde ser baixada do Figma neste ambiente]`. O site real tem fotos de verdade: carrossel da home (crianças em diferentes contextos), fotos de cada iniciativa, fotos da equipe em "Sobre Nós", e foto de cada membro dos 3 conselhos em "Nosso Time".

Ponto de atenção: fotos de equipe/conselho (adultos, em papel institucional, já publicadas pelo próprio Instituto) não têm a mesma restrição que fotos de criança. O projeto já tem uma postura definida pra isso (ver comentário no `server.js`: "por proteção ECA/LGPD, usamos apelidos fictícios — nunca nome ou foto real" para a feature de indicação). Pra "Nossas Iniciativas", a pergunta é diferente: são fotos que o próprio Instituto já optou por publicar publicamente no site institucional dele, em contexto de atividade (não vinculadas a uma indicação/doação específica) — mas ainda vale confirmar com você antes de reaproveitar, em vez de presumir.

## Resumo — o que fazer, por ordem de dependência

1. Atualizar os indicadores financeiros reais (`receita_pf` e o restante do painel público de Transparência) e linkar os documentos reais do Drive.
2. Criar as páginas "Sobre Nós" e "Nosso Time".
3. Criar a página "Nossas Iniciativas" (institucional, separada da feature de indicação).
4. Trocar os placeholders de imagem pelas fotos reais, nos pontos onde fizer sentido.
