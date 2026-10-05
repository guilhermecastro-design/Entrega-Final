// MVP Funcional — Instituto Ebenézer (Desafio A)
// Semana 10 · Trilha de Tecnologia
//
// Esta primeira versão do server.js cuida só da modelagem: cria as 7
// tabelas do banco e popula com dados de exemplo (parte real — os
// indicadores financeiros, que vêm do site institucional — e parte
// sintética, para o restante). As rotas da API e o front-end vêm depois,
// em cima dessa base.
//
// Ajuste (pós-conferência do Fluxo de Navegação, seção 2 do artefato da
// Semana 5): o protótipo validado no Figma permite doar SEM criar conta —
// em checkout-pix/checkout-pix-recorrente/checkout-recorrente o e-mail é
// opcional e "sem navegação", e "Criar minha área do doador" só aparece
// como ação separada e opcional na tela confirmacao. Ou seja, uma doação
// tem que poder existir sem doador_id (doação avulsa/anônima). Corrigido
// abaixo: doador_id deixou de ser NOT NULL e ganhou email_capturado, para
// guardar o e-mail opcional do checkout mesmo quando não há conta.
//
// Tabelas:
//   doadores               — conta criada (opcional, pós-confirmacao)
//   doacoes                — cada doação registrada (fluxo principal;
//                             doador_id pode ser nulo — doação avulsa)
//   indicadores_financeiros — dados reais do Instituto, usados tanto na
//                             transparência do fluxo principal (US04)
//                             quanto no painel interativo do backlog (US-F3)
//   conquistas              — selos de marco de tempo/valor (US-F1, backlog)
//   historias               — perfis fictícios para "Adotar" (US-F2, backlog)
//   indicacoes               — registro de quem indicou qual história (US-F2)
//   relatos                 — feed de atualizações do Instituto (US-F3, backlog)

const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const PASTA_DADOS = path.join(__dirname, "data");
if (!fs.existsSync(PASTA_DADOS)) {
  fs.mkdirSync(PASTA_DADOS);
}

const banco = new DatabaseSync(path.join(PASTA_DADOS, "ebenezer.db"));

banco.exec(`
  CREATE TABLE IF NOT EXISTS doadores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT,
    tipo TEXT NOT NULL CHECK (tipo IN ('PF', 'PJ')),
    cpf_cnpj TEXT,
    senha_hash TEXT
  )
`);

// Migração defensiva (mesmo padrão de "indicacoes" abaixo): bancos criados
// antes do login (US-F4) ganham a coluna senha_hash sem precisar apagar o
// arquivo local. Contas antigas ficam com senha_hash NULL — não conseguem
// logar até serem recriadas via /api/auth/cadastro, o que é esperado: este
// MVP não tinha nenhuma senha cadastrada antes de hoje.
const colunasDoadores = banco.prepare("PRAGMA table_info(doadores)").all();
if (!colunasDoadores.some((c) => c.name === "senha_hash")) {
  banco.exec("ALTER TABLE doadores ADD COLUMN senha_hash TEXT");
}

banco.exec(`
  CREATE TABLE IF NOT EXISTS sessoes (
    token TEXT PRIMARY KEY,
    doador_id INTEGER NOT NULL,
    criado_em TEXT NOT NULL,
    FOREIGN KEY (doador_id) REFERENCES doadores(id)
  )
`);

banco.exec(`
  CREATE TABLE IF NOT EXISTS doacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doador_id INTEGER,
    email_capturado TEXT,
    valor REAL NOT NULL,
    forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('pix', 'pix_recorrente', 'cartao_recorrente')),
    recorrente INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL,
    FOREIGN KEY (doador_id) REFERENCES doadores(id)
  )
`);

banco.exec(`
  CREATE TABLE IF NOT EXISTS indicadores_financeiros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ano INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    valor REAL NOT NULL,
    UNIQUE (ano, tipo)
  )
`);

banco.exec(`
  CREATE TABLE IF NOT EXISTS conquistas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doador_id INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    atingido_em TEXT NOT NULL,
    FOREIGN KEY (doador_id) REFERENCES doadores(id)
  )
`);

banco.exec(`
  CREATE TABLE IF NOT EXISTS historias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    apelido TEXT NOT NULL,
    faixa_etaria TEXT NOT NULL,
    descricao TEXT NOT NULL,
    icone_tema TEXT NOT NULL DEFAULT 'bookOpen'
  )
`);

// Migração defensiva (mesmo padrão de "doadores"/"indicacoes" acima):
// `icone_tema` nasceu depois — bancos criados antes dela ganham a coluna sem
// perder os dados. Usada no lugar de foto nas 3 histórias fictícias (US-F2):
// nunca colocamos rosto real sob uma identidade inventada, nem foto genérica
// de banco de imagens — ver icons.js.
const colunasHistorias = banco.prepare("PRAGMA table_info(historias)").all();
if (!colunasHistorias.some((c) => c.name === "icone_tema")) {
  banco.exec("ALTER TABLE historias ADD COLUMN icone_tema TEXT NOT NULL DEFAULT 'bookOpen'");
}

banco.exec(`
  CREATE TABLE IF NOT EXISTS indicacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doador_id INTEGER NOT NULL,
    historia_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'encontrou_padrinho')),
    doacao_id INTEGER,
    criado_em TEXT NOT NULL,
    FOREIGN KEY (doador_id) REFERENCES doadores(id),
    FOREIGN KEY (historia_id) REFERENCES historias(id),
    FOREIGN KEY (doacao_id) REFERENCES doacoes(id)
  )
`);

// Migração defensiva: se "indicacoes" já existia (criada numa sessão
// anterior, antes do US-F2 ganhar a coluna doacao_id), adiciona a coluna
// sem perder os dados — banco.db de quem já rodou o servidor antes não
// precisa ser apagado pra pegar essa mudança.
const colunasIndicacoes = banco.prepare("PRAGMA table_info(indicacoes)").all();
if (!colunasIndicacoes.some((c) => c.name === "doacao_id")) {
  banco.exec("ALTER TABLE indicacoes ADD COLUMN doacao_id INTEGER REFERENCES doacoes(id)");
}

banco.exec(`
  CREATE TABLE IF NOT EXISTS relatos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    texto TEXT NOT NULL,
    data TEXT NOT NULL
  )
`);

// despesas_categoria — detalhamento de despesas por categoria (US-F3, painel
// financeiro da área do doador). Criada já pensando na substituição futura:
// quando a DRE oficial do Instituto chegar (prevista antes da entrega final),
// basta um UPDATE trocando "fonte" de 'ficticio_pendente' para 'real' e
// ajustando "valor" — nem o schema, nem o front-end, precisam mudar.
banco.exec(`
  CREATE TABLE IF NOT EXISTS despesas_categoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ano INTEGER NOT NULL,
    categoria TEXT NOT NULL,
    valor REAL NOT NULL,
    fonte TEXT NOT NULL CHECK (fonte IN ('real', 'ficticio_pendente')),
    atualizado_em TEXT NOT NULL,
    UNIQUE (ano, categoria)
  )
`);

// --- Seed: indicadores financeiros reais (site institucional, 2025) ---
const inserirIndicador = banco.prepare(`
  INSERT OR IGNORE INTO indicadores_financeiros (ano, tipo, valor) VALUES (?, ?, ?)
`);
inserirIndicador.run(2025, "custo_por_aluno_mes", 93.68);
inserirIndicador.run(2025, "esg_score", 72);
inserirIndicador.run(2025, "receita_pf", 101561.07);
inserirIndicador.run(2025, "receita_pj", 75293.30);
// ESG por dimensão (reais, mesmos números já usados em transparencia.html)
inserirIndicador.run(2025, "esg_governanca", 88);
inserirIndicador.run(2025, "esg_estrutura_organizacional", 100);
inserirIndicador.run(2025, "esg_gestao_riscos", 75);
inserirIndicador.run(2025, "esg_compliance", 75);
inserirIndicador.run(2025, "esg_ambiental", 50);
inserirIndicador.run(2025, "esg_social", 50);
// Totais financeiros 2025 publicados em institutosocialebenezer.com.br/transparencia
// (conferido em 05/10/2026) — usados na seção pública de Transparência, além do
// detalhamento por categoria (despesas_categoria), hoje também real (ver abaixo).
inserirIndicador.run(2025, "despesa_total", 146668.38);
inserirIndicador.run(2025, "superavit", 30186.00);
inserirIndicador.run(2025, "recursos_nao_monetarios", 783964.85);

// Balanço Patrimonial 2025 vs 2024 — mesma fonte oficial acima (seção
// "Balanço" da página de Transparência do site, que mostra os dados direto em
// tabela, não como link externo). Estrutura contábil nova pro MVP: Ativo/
// Passivo/Patrimônio Líquido, diferente da DRE (receita x despesa) já
// modelada. 2024 existe só com essas 3 linhas — propositalmente não
// preenchemos receita/despesa/ESG de 2024, já que o site não publica DRE
// completa daquele ano, só o balanço comparativo.
inserirIndicador.run(2025, "ativo_circulante", 39460.25);
inserirIndicador.run(2025, "passivo_circulante", 1550.00);
inserirIndicador.run(2025, "patrimonio_liquido", 37910.25);
inserirIndicador.run(2024, "ativo_circulante", 7724.25);
inserirIndicador.run(2024, "passivo_circulante", 0);
inserirIndicador.run(2024, "patrimonio_liquido", 7724.25);

// Correção pontual: `receita_pf` tinha sido semeada com um valor desatualizado
// (R$ 87.033,90) numa sessão anterior a esta conferência. Como o INSERT acima
// usa OR IGNORE, bancos já existentes não seriam corrigidos sem este UPDATE —
// guardado pelo valor antigo específico, pra não sobrescrever um ajuste manual
// futuro que alguém faça nesse mesmo campo.
banco
  .prepare("UPDATE indicadores_financeiros SET valor = 101561.07 WHERE ano = 2025 AND tipo = 'receita_pf' AND valor = 87033.90")
  .run();

// --- Seed: despesas por categoria — DRE oficial 2025, publicada em
// institutosocialebenezer.com.br/transparencia (conferido em 05/10/2026).
// Chegou antes da entrega final: a soma das 18 categorias abaixo bate,
// centavo a centavo, com o `despesa_total` já cadastrado acima (R$
// 146.668,38), então substitui o placeholder fictício de 4 categorias usado
// até então — sem quebrar nada que já estava consolidado.
const totalDespesasReais = banco
  .prepare("SELECT COUNT(*) AS total FROM despesas_categoria WHERE ano = 2025 AND fonte = 'real'")
  .get().total;
if (totalDespesasReais === 0) {
  const inserirDespesa = banco.prepare(`
    INSERT INTO despesas_categoria (ano, categoria, valor, fonte, atualizado_em)
    VALUES (?, ?, ?, ?, ?)
  `);
  const agora = new Date().toISOString();
  inserirDespesa.run(2025, "Alimentação", 41099.42, "real", agora);
  inserirDespesa.run(2025, "Aluguel", 47800.00, "real", agora);
  inserirDespesa.run(2025, "Evento Cultural", 15607.79, "real", agora);
  inserirDespesa.run(2025, "Outras Despesas", 12568.70, "real", agora);
  inserirDespesa.run(2025, "Material de Consumo", 9116.93, "real", agora);
  inserirDespesa.run(2025, "Água e Esgoto", 2752.42, "real", agora);
  inserirDespesa.run(2025, "Uniformes", 2909.93, "real", agora);
  inserirDespesa.run(2025, "Energia Elétrica", 2513.89, "real", agora);
  inserirDespesa.run(2025, "Contabilidade", 3720.00, "real", agora);
  inserirDespesa.run(2025, "Material de Manutenção", 1481.48, "real", agora);
  inserirDespesa.run(2025, "Segurança", 1594.69, "real", agora);
  inserirDespesa.run(2025, "Ajuda de Custo Voluntários", 1160.00, "real", agora);
  inserirDespesa.run(2025, "Material Pedagógico", 1100.00, "real", agora);
  inserirDespesa.run(2025, "Material de Limpeza", 946.50, "real", agora);
  inserirDespesa.run(2025, "Marketing", 837.66, "real", agora);
  inserirDespesa.run(2025, "Internet", 932.29, "real", agora);
  inserirDespesa.run(2025, "Prestação de Serviços", 300.00, "real", agora);
  inserirDespesa.run(2025, "Impostos", 226.68, "real", agora);
}

// Correção: bancos já existentes (sessão anterior) tinham as 4 categorias
// fictícias seedadas como placeholder enquanto a DRE oficial não chegava.
// Agora que chegou (acima), removemos as fictícias nominalmente — não um
// DELETE genérico por `fonte`, pra nunca arriscar apagar um ajuste manual
// real que alguém tenha marcado como pendente por outro motivo.
banco
  .prepare(
    `DELETE FROM despesas_categoria
     WHERE ano = 2025 AND fonte = 'ficticio_pendente'
       AND categoria IN ('Pessoal e Equipe', 'Atividades Socioeducacionais', 'Infraestrutura', 'Administrativo')`
  )
  .run();

// ---------------------------------------------------------------------------
// Backlog — US-F1 (conquistas/selos) e US-F3 (painel financeiro, relatos)
// Definidas aqui (antes do seed de doadores) porque o próprio seed já chama
// calcularEGravarConquistas() para os doadores de exemplo.
// ---------------------------------------------------------------------------

const MARCOS_TEMPO_MESES = [3, 6, 12, 24];
const MARCOS_VALOR_MESES_ALUNO = [1, 3, 6, 12];

function custoPorAlunoMaisRecente() {
  const linha = banco
    .prepare("SELECT valor FROM indicadores_financeiros WHERE tipo = 'custo_por_aluno_mes' ORDER BY ano DESC LIMIT 1")
    .get();
  return linha ? linha.valor : 93.68;
}

// Meses distintos (ano-mês) em que o doador teve ao menos uma doação
// recorrente registrada — usado como proxy de "recorrência ininterrupta",
// já que este MVP não simula cobranças mensais automáticas de verdade.
function mesesRecorrentesDoDoador(doadorId) {
  const linhas = banco
    .prepare("SELECT criado_em FROM doacoes WHERE doador_id = ? AND recorrente = 1")
    .all(doadorId);
  const mesesUnicos = new Set(linhas.map((l) => l.criado_em.slice(0, 7))); // "YYYY-MM"
  return mesesUnicos.size;
}

function mesesDeAlunoCusteadosNoAno(doadorId, ano) {
  const soma = banco
    .prepare("SELECT COALESCE(SUM(valor), 0) AS total FROM doacoes WHERE doador_id = ? AND criado_em LIKE ?")
    .get(doadorId, `${ano}-%`).total;
  return Math.floor(soma / custoPorAlunoMaisRecente());
}

// Calcula os selos que o doador já atingiu e grava os que ainda não estavam
// em `conquistas` (idempotente — seguro chamar toda vez que a tela é aberta,
// não só no momento da doação/criação de conta).
function calcularEGravarConquistas(doadorId) {
  const anoAtual = new Date().getFullYear();
  const meses = mesesRecorrentesDoDoador(doadorId);
  const mesesAluno = mesesDeAlunoCusteadosNoAno(doadorId, anoAtual);
  const agora = new Date().toISOString();

  const existentes = banco
    .prepare("SELECT tipo, descricao FROM conquistas WHERE doador_id = ?")
    .all(doadorId);
  const jaConquistou = (tipo, descricao) =>
    existentes.some((e) => e.tipo === tipo && e.descricao === descricao);

  const inserir = banco.prepare(
    "INSERT INTO conquistas (doador_id, tipo, descricao, atingido_em) VALUES (?, ?, ?, ?)"
  );

  for (const marco of MARCOS_TEMPO_MESES) {
    if (meses >= marco) {
      const descricao = `Selo: ${marco} meses ao lado do Instituto`;
      if (!jaConquistou("marco_tempo", descricao)) {
        inserir.run(doadorId, "marco_tempo", descricao, agora);
      }
    }
  }
  for (const marco of MARCOS_VALOR_MESES_ALUNO) {
    if (mesesAluno >= marco) {
      const unidade = marco === 1 ? "mês" : "meses";
      const descricao = `Selo: ${marco} ${unidade} de um aluno custeados`;
      if (!jaConquistou("marco_valor", descricao)) {
        inserir.run(doadorId, "marco_valor", descricao, agora);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Autenticação (US-F4 — login da área do doador). Senha nunca é guardada em
// texto puro: scrypt (nativo do Node, sem dependência extra) com salt
// aleatório por conta, formato armazenado "salt:hash" em hexadecimal.
// Sessão é um token opaco de 32 bytes, guardado em `sessoes` — sem
// expiração automática (fora de escopo para este MVP; suficiente para a
// demonstração e a validação com usuário real).
// ---------------------------------------------------------------------------

function gerarHashSenha(senha) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(senha, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function senhaConfere(senha, senhaHashArmazenada) {
  if (!senhaHashArmazenada || !senhaHashArmazenada.includes(":")) return false;
  const [salt, hashArmazenado] = senhaHashArmazenada.split(":");
  const hashCalculado = crypto.scryptSync(senha, salt, 64).toString("hex");
  const bufArmazenado = Buffer.from(hashArmazenado, "hex");
  const bufCalculado = Buffer.from(hashCalculado, "hex");
  if (bufArmazenado.length !== bufCalculado.length) return false;
  return crypto.timingSafeEqual(bufArmazenado, bufCalculado);
}

function gerarTokenSessao() {
  return crypto.randomBytes(32).toString("hex");
}

function doadorAutenticado(req) {
  const cabecalho = req.headers.authorization || "";
  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : null;
  if (!token) return null;
  const sessao = banco.prepare("SELECT * FROM sessoes WHERE token = ?").get(token);
  if (!sessao) return null;
  const doador = banco.prepare("SELECT id, nome, email, tipo, cpf_cnpj FROM doadores WHERE id = ?").get(sessao.doador_id);
  return doador || null;
}

// Exige sessão válida E que ela pertença ao :id pedido na rota — sem isso,
// o login seria só de fachada (o front-end pediria senha, mas qualquer um
// ainda poderia chamar a API direto pra ver dados de outro doador). Devolve
// o doador autenticado, ou já responde 401/403 e devolve null (o handler da
// rota deve checar `if (!doador) return;` logo depois de chamar isto).
function exigirDonoDaConta(req, res) {
  const doador = doadorAutenticado(req);
  if (!doador) {
    res.status(401).json({ erro: "Não autenticado. Faça login novamente." });
    return null;
  }
  if (doador.id !== Number(req.params.id)) {
    res.status(403).json({ erro: "Sem permissão para acessar dados de outro doador." });
    return null;
  }
  return doador;
}

// --- Seed: doadores e doações sintéticas (para testar o painel) ---
const totalDoadores = banco.prepare("SELECT COUNT(*) AS total FROM doadores").get().total;

if (totalDoadores === 0) {
  const inserirDoador = banco.prepare(
    "INSERT INTO doadores (nome, email, tipo, cpf_cnpj, senha_hash) VALUES (?, ?, ?, ?, ?)"
  );
  // Senha de demonstração para os 2 doadores semeados (documentada no
  // README) — só pra quem for avaliar o protótipo conseguir entrar direto,
  // sem precisar passar pelo cadastro. Contas criadas pelo fluxo real
  // (cadastro.html) usam a senha que a pessoa escolher, com o mesmo hash.
  const senhaDemo = gerarHashSenha("ebenezer123");
  const idRenataExemplo = Number(
    inserirDoador.run("Renata Souza (exemplo)", "renata.exemplo@email.com", "PF", null, senhaDemo)
      .lastInsertRowid
  );
  const idMarcosExemplo = Number(
    inserirDoador.run("Marcos Lima (exemplo)", "marcos.exemplo@empresa.com", "PJ", "12.345.678/0001-90", senhaDemo)
      .lastInsertRowid
  );

  const inserirDoacao = banco.prepare(`
    INSERT INTO doacoes (doador_id, email_capturado, valor, forma_pagamento, recorrente, criado_em)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  inserirDoacao.run(idRenataExemplo, null, 50, "pix_recorrente", 1, "2026-07-05T10:00:00.000Z");
  inserirDoacao.run(idRenataExemplo, null, 50, "pix_recorrente", 1, "2026-08-05T10:00:00.000Z");
  inserirDoacao.run(idRenataExemplo, null, 50, "pix_recorrente", 1, "2026-09-05T10:00:00.000Z");
  inserirDoacao.run(idMarcosExemplo, null, 500, "cartao_recorrente", 1, "2026-09-01T09:00:00.000Z");

  // Doação avulsa (US01/checkout-pix "Doar uma vez"): sem conta, e-mail
  // opcional preenchido; representa o caminho mais comum do fluxo real
  // (checkout sem cadastro, "Doar uma vez" → confirmacao → "Agora não")
  inserirDoacao.run(null, "doador.avulso@email.com", 30, "pix", 0, "2026-09-22T14:30:00.000Z");
  // Doação avulsa sem nem e-mail capturado (caso permitido pelo fluxo)
  inserirDoacao.run(null, null, 20, "pix", 0, "2026-09-24T09:15:00.000Z");

  // As conquistas (selos US-F1) não são semeadas manualmente aqui — são
  // calculadas de forma idempotente por calcularEGravarConquistas(), chamada
  // logo abaixo (após o cadastro dos doadores de exemplo) e também a cada
  // GET /api/doadores/:id/conquistas.
  calcularEGravarConquistas(idRenataExemplo);
  calcularEGravarConquistas(idMarcosExemplo);
}

// --- Seed: histórias fictícias para o US-F2 (nunca dados de criança real) ---
const totalHistorias = banco.prepare("SELECT COUNT(*) AS total FROM historias").get().total;

if (totalHistorias === 0) {
  const inserirHistoria = banco.prepare(
    "INSERT INTO historias (apelido, faixa_etaria, descricao, icone_tema) VALUES (?, ?, ?, ?)"
  );
  inserirHistoria.run(
    "Estrela do Futebol",
    "8-10 anos",
    "Participa das atividades esportivas de sábado e sonha em ser técnico de futebol.",
    "futebol"
  );
  inserirHistoria.run(
    "Pequena Artista",
    "6-8 anos",
    "Adora as aulas de pintura e já ajudou a decorar o mural do Instituto.",
    "paleta"
  );
  inserirHistoria.run(
    "Leitor Curioso",
    "10-12 anos",
    "Sempre o primeiro a pegar um livro novo na sala de reforço escolar.",
    "bookOpen"
  );
}

// Correção pontual (mesmo motivo do UPDATE de receita_pf acima): bancos que já
// tinham essas 3 histórias antes da coluna icone_tema existir ganharam o
// valor padrão 'bookOpen' pra todas via ALTER TABLE — corrige as 2 que não é
// esse o tema, sem mexer em nenhuma linha que já tenha sido ajustada à mão.
banco.prepare("UPDATE historias SET icone_tema = 'futebol' WHERE apelido = 'Estrela do Futebol' AND icone_tema = 'bookOpen'").run();
banco.prepare("UPDATE historias SET icone_tema = 'paleta' WHERE apelido = 'Pequena Artista' AND icone_tema = 'bookOpen'").run();

// --- Seed: relatos de exemplo para o US-F3 (conteúdo semeado, não autoria real) ---
const totalRelatos = banco.prepare("SELECT COUNT(*) AS total FROM relatos").get().total;

if (totalRelatos === 0) {
  const inserirRelato = banco.prepare(
    "INSERT INTO relatos (titulo, texto, data) VALUES (?, ?, ?)"
  );
  inserirRelato.run(
    "Sábado de esportes",
    "A turma de sábado teve uma manhã cheia de atividades esportivas, com direito a torneio de futebol entre as equipes.",
    "2026-09-13T12:00:00.000Z"
  );
  inserirRelato.run(
    "Mural novo na entrada",
    "As crianças da oficina de pintura terminaram o mural que fica na entrada do Instituto — o tema foi 'sonhos para o futuro'.",
    "2026-09-20T12:00:00.000Z"
  );
  inserirRelato.run(
    "Parceria com biblioteca comunitária",
    "Firmamos uma parceria com a biblioteca do bairro: agora as turmas do reforço escolar têm visitas quinzenais e carteirinha gratuita.",
    "2026-09-05T12:00:00.000Z"
  );
}

console.log("Banco criado/atualizado em data/ebenezer.db — 8 tabelas prontas.");

// Mostra uma contagem rápida de cada tabela, só pra conferência visual
for (const tabela of [
  "doadores",
  "doacoes",
  "indicadores_financeiros",
  "conquistas",
  "historias",
  "indicacoes",
  "relatos",
  "despesas_categoria",
]) {
  const total = banco.prepare(`SELECT COUNT(*) AS total FROM ${tabela}`).get().total;
  console.log(`  ${tabela}: ${total} registro(s)`);
}

// ---------------------------------------------------------------------------
// API — fluxo principal (10 telas do protótipo, mapeadas no Fluxo de
// Navegação da Semana 5). O backlog (conquistas/US-F1, histórias e
// indicações/US-F2, relatos/US-F3) fica pra próxima camada, em cima
// dessa mesma base.
// ---------------------------------------------------------------------------

const express = require("express");
const app = express();
const PORTA = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// GET /api/resumo — número de destaque na home (opcional, "prova social")
app.get("/api/resumo", (req, res) => {
  const totalArrecadado = banco.prepare("SELECT COALESCE(SUM(valor), 0) AS total FROM doacoes").get().total;
  const totalDoadores = banco.prepare("SELECT COUNT(*) AS total FROM doadores").get().total;
  res.json({ totalArrecadado, totalDoadores });
});

// GET /api/indicadores — indicadores financeiros reais (transparencia, documentos-empresa).
// Contrato inalterado desde a Semana 5: array plano [{ano,tipo,valor}]. Não
// mexer aqui — quem precisa da visão nova e estruturada (US-F3, painel da
// área do doador) usa /api/painel-financeiro abaixo.
app.get("/api/indicadores", (req, res) => {
  const indicadores = banco.prepare(
    "SELECT ano, tipo, valor FROM indicadores_financeiros ORDER BY ano, tipo"
  ).all();
  res.json(indicadores);
});

// GET /api/doadores/:id/conquistas — selos do US-F1 (aba "Marcos" da área do doador)
app.get("/api/doadores/:id/conquistas", (req, res) => {
  if (!exigirDonoDaConta(req, res)) return;
  const doadorId = Number(req.params.id);

  calcularEGravarConquistas(doadorId);

  const conquistas = banco
    .prepare("SELECT * FROM conquistas WHERE doador_id = ? ORDER BY atingido_em ASC")
    .all(doadorId);
  res.json(conquistas);
});

// GET /api/relatos — feed de atualizações do Instituto (aba "Novidades", US-F3)
app.get("/api/relatos", (req, res) => {
  const relatos = banco.prepare("SELECT * FROM relatos ORDER BY data DESC").all();
  res.json(relatos);
});

// GET /api/painel-financeiro?ano=YYYY — visão de DRE navegável (aba
// "Transparência" da área do doador, US-F3). Junta os indicadores reais já
// existentes com o detalhamento de despesas por categoria — hoje fictício,
// sinalizado explicitamente em `fonteDespesas` para o front-end exibir o
// aviso, e trocado por dado real assim que a DRE oficial chegar.
app.get("/api/painel-financeiro", (req, res) => {
  const ano = Number(req.query.ano) || new Date().getFullYear();
  const anoAnterior = ano - 1;

  const linhasIndicadores = banco
    .prepare("SELECT tipo, valor FROM indicadores_financeiros WHERE ano = ?")
    .all(ano);
  const indicadores = {};
  for (const linha of linhasIndicadores) {
    indicadores[linha.tipo] = linha.valor;
  }

  // Balanço Patrimonial (Ativo/Passivo/Patrimônio Líquido) é sempre
  // comparado com o ano anterior, igual no site oficial — buscado à parte
  // porque o MVP não modela a DRE completa de todo ano anterior, só essas
  // 3 linhas (ver seed em cima).
  const linhasAnoAnterior = banco
    .prepare(
      `SELECT tipo, valor FROM indicadores_financeiros
       WHERE ano = ? AND tipo IN ('ativo_circulante', 'passivo_circulante', 'patrimonio_liquido')`
    )
    .all(anoAnterior);
  const indicadoresAnoAnterior = {};
  for (const linha of linhasAnoAnterior) {
    indicadoresAnoAnterior[linha.tipo] = linha.valor;
  }

  const despesas = banco
    .prepare("SELECT categoria, valor, fonte, atualizado_em FROM despesas_categoria WHERE ano = ? ORDER BY valor DESC")
    .all(ano);

  const receitaTotal = (indicadores.receita_pf || 0) + (indicadores.receita_pj || 0);
  const despesaTotal = despesas.reduce((soma, d) => soma + d.valor, 0);
  const temDadosFicticios = despesas.some((d) => d.fonte === "ficticio_pendente");

  res.json({
    ano,
    anoAnterior,
    indicadores,
    indicadoresAnoAnterior,
    receitaTotal,
    despesas,
    despesaTotal,
    resultado: receitaTotal - despesaTotal,
    temDadosFicticios,
  });
});

// POST /api/doacoes — registra uma doação (checkout-pix / checkout-pix-recorrente /
// checkout-recorrente). Não exige conta: doador_id fica nulo (doação avulsa) a
// não ser que já exista uma sessão de doador (fora do escopo deste MVP).
app.post("/api/doacoes", (req, res) => {
  const { valor, forma_pagamento, recorrente, email_capturado } = req.body;

  const formasValidas = ["pix", "pix_recorrente", "cartao_recorrente"];
  if (typeof valor !== "number" || valor <= 0) {
    return res.status(400).json({ erro: "Informe um valor de doação válido (maior que zero)." });
  }
  if (!formasValidas.includes(forma_pagamento)) {
    return res.status(400).json({ erro: `forma_pagamento precisa ser uma de: ${formasValidas.join(", ")}.` });
  }

  const criadoEm = new Date().toISOString();
  const inserir = banco.prepare(`
    INSERT INTO doacoes (doador_id, email_capturado, valor, forma_pagamento, recorrente, criado_em)
    VALUES (NULL, ?, ?, ?, ?, ?)
  `);
  const resultado = inserir.run(
    email_capturado || null,
    valor,
    forma_pagamento,
    recorrente ? 1 : 0,
    criadoEm
  );

  const doacao = banco.prepare("SELECT * FROM doacoes WHERE id = ?").get(Number(resultado.lastInsertRowid));
  res.status(201).json(doacao);
});

// GET /api/doacoes/:id — busca uma doação específica (tela confirmacao)
app.get("/api/doacoes/:id", (req, res) => {
  const doacao = banco.prepare("SELECT * FROM doacoes WHERE id = ?").get(Number(req.params.id));
  if (!doacao) {
    return res.status(404).json({ erro: "Doação não encontrada." });
  }
  res.json(doacao);
});

// ---------------------------------------------------------------------------
// US-F4 — Login da área do doador. Antes desta versão, a área do doador e
// suas subpáginas (convidar-amigo, comprovante-doacao) identificavam o
// doador só pelo parâmetro ?doador= na URL — sem sessão nenhuma. Bug real
// encontrado ao navegar direto pro link (ou pelo menu) sem esse parâmetro:
// a página não tinha como saber quem era o usuário. Substituído por login
// de verdade (e-mail + senha, com sessão em token) — ver front-end em
// login.html / cadastro.html e o guard exigirLogin() em js/app.js.
// ---------------------------------------------------------------------------

// POST /api/auth/cadastro — cria conta nova. Se vier doacao_id, vincula a
// doação avulsa recém-feita à conta nova (mesma lógica de antes, só que
// agora a conta nasce com senha e já retorna uma sessão ativa).
app.post("/api/auth/cadastro", (req, res) => {
  const { nome, email, senha, tipo, cpf_cnpj, doacao_id } = req.body;

  if (!nome || !email || !senha || !["PF", "PJ"].includes(tipo)) {
    return res.status(400).json({ erro: "Informe nome, e-mail, senha e tipo (PF ou PJ) válidos." });
  }
  if (senha.length < 6) {
    return res.status(400).json({ erro: "A senha precisa ter pelo menos 6 caracteres." });
  }

  const emailNormalizado = email.trim().toLowerCase();
  const existente = banco.prepare("SELECT id FROM doadores WHERE email = ?").get(emailNormalizado);
  if (existente) {
    return res.status(409).json({ erro: "Já existe uma conta com esse e-mail." });
  }

  const inserirDoador = banco.prepare(
    "INSERT INTO doadores (nome, email, tipo, cpf_cnpj, senha_hash) VALUES (?, ?, ?, ?, ?)"
  );
  const novoId = Number(
    inserirDoador.run(nome, emailNormalizado, tipo, cpf_cnpj || null, gerarHashSenha(senha)).lastInsertRowid
  );

  if (doacao_id) {
    banco
      .prepare("UPDATE doacoes SET doador_id = ? WHERE id = ? AND doador_id IS NULL")
      .run(novoId, Number(doacao_id));
    calcularEGravarConquistas(novoId);
  }

  const token = gerarTokenSessao();
  banco
    .prepare("INSERT INTO sessoes (token, doador_id, criado_em) VALUES (?, ?, ?)")
    .run(token, novoId, new Date().toISOString());

  const doador = banco.prepare("SELECT id, nome, email, tipo, cpf_cnpj FROM doadores WHERE id = ?").get(novoId);
  res.status(201).json({ token, doador });
});

// POST /api/auth/login
app.post("/api/auth/login", (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ erro: "Informe e-mail e senha." });
  }

  const doador = banco.prepare("SELECT * FROM doadores WHERE email = ?").get(email.trim().toLowerCase());
  if (!doador || !senhaConfere(senha, doador.senha_hash)) {
    return res.status(401).json({ erro: "E-mail ou senha incorretos." });
  }

  const token = gerarTokenSessao();
  banco
    .prepare("INSERT INTO sessoes (token, doador_id, criado_em) VALUES (?, ?, ?)")
    .run(token, doador.id, new Date().toISOString());

  res.json({
    token,
    doador: { id: doador.id, nome: doador.nome, email: doador.email, tipo: doador.tipo, cpf_cnpj: doador.cpf_cnpj },
  });
});

// POST /api/auth/logout — idempotente: token inexistente/já removido não é
// erro. Responde 200 com um corpo JSON (em vez de 204 sem corpo) porque o
// apiPost() compartilhado sempre tenta ler JSON da resposta.
app.post("/api/auth/logout", (req, res) => {
  const cabecalho = req.headers.authorization || "";
  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : null;
  if (token) {
    banco.prepare("DELETE FROM sessoes WHERE token = ?").run(token);
  }
  res.json({ ok: true });
});

// GET /api/auth/me — valida a sessão atual (usada por exigirLogin() no
// front-end antes de renderizar qualquer tela da área do doador).
app.get("/api/auth/me", (req, res) => {
  const doador = doadorAutenticado(req);
  if (!doador) {
    return res.status(401).json({ erro: "Não autenticado." });
  }
  res.json(doador);
});

// (o antigo POST /api/doadores, que criava conta sem senha nenhuma, foi
// substituído por /api/auth/cadastro acima — nada mais no front-end chamava
// aquela rota além de confirmacao.html, já atualizada.)

// GET /api/doadores/:id — perfil do doador (area-doador, aba Perfil). Nunca
// devolve senha_hash, mesmo com hash+salt — não há motivo pro front-end ver
// esse campo.
app.get("/api/doadores/:id", (req, res) => {
  if (!exigirDonoDaConta(req, res)) return;
  const doador = banco
    .prepare("SELECT id, nome, email, tipo, cpf_cnpj FROM doadores WHERE id = ?")
    .get(Number(req.params.id));
  if (!doador) {
    return res.status(404).json({ erro: "Doador não encontrado." });
  }
  res.json(doador);
});

// GET /api/doadores/:id/doacoes — histórico (area-doador aba Início, e também
// comprovante-doacao no caso do Marcos/PJ)
app.get("/api/doadores/:id/doacoes", (req, res) => {
  if (!exigirDonoDaConta(req, res)) return;
  const doacoes = banco
    .prepare("SELECT * FROM doacoes WHERE doador_id = ? ORDER BY criado_em DESC")
    .all(Number(req.params.id));
  res.json(doacoes);
});

// ---------------------------------------------------------------------------
// US-F2 — "Adote uma criança" (indicação nos moldes do Correios)
// ---------------------------------------------------------------------------

// GET /api/historias — mosaico de histórias disponíveis (tela convidar-amigo).
// Sempre apelido fictício + faixa etária, nunca nome ou foto real de criança
// (ressalva de proteção ECA/LGPD já registrada no documento de user stories).
app.get("/api/historias", (req, res) => {
  const historias = banco.prepare("SELECT * FROM historias ORDER BY id ASC").all();
  res.json(historias);
});

// POST /api/indicacoes — Renata escolhe uma história e gera o link pessoal
// (CR1). Exige login: o doador_id vem da sessão autenticada, não do corpo da
// requisição (antes da US-F4/login, qualquer um podia mandar um doador_id
// diferente do seu e criar uma indicação em nome de outra pessoa).
app.post("/api/indicacoes", (req, res) => {
  const doadorLogado = doadorAutenticado(req);
  if (!doadorLogado) {
    return res.status(401).json({ erro: "Não autenticado. Faça login novamente." });
  }

  const { historia_id } = req.body;
  const historia = banco.prepare("SELECT id FROM historias WHERE id = ?").get(Number(historia_id));
  if (!historia) {
    return res.status(400).json({ erro: "historia_id inválido." });
  }

  const criadoEm = new Date().toISOString();
  const resultado = banco
    .prepare("INSERT INTO indicacoes (doador_id, historia_id, status, criado_em) VALUES (?, ?, 'pendente', ?)")
    .run(doadorLogado.id, Number(historia_id), criadoEm);

  const indicacao = banco.prepare("SELECT * FROM indicacoes WHERE id = ?").get(Number(resultado.lastInsertRowid));
  res.status(201).json(indicacao);
});

// GET /api/indicacoes/:id — usada pela página pública apadrinhar.html (o link
// que o amigo recebe, CR2): devolve só a história daquela indicação específica
// + o primeiro nome de quem indicou, sem expor mais nada sobre o doador.
app.get("/api/indicacoes/:id", (req, res) => {
  const indicacao = banco
    .prepare(
      `SELECT indicacoes.id, indicacoes.status, indicacoes.historia_id,
              historias.apelido, historias.faixa_etaria, historias.descricao, historias.icone_tema,
              doadores.nome AS nome_indicador
       FROM indicacoes
       JOIN historias ON historias.id = indicacoes.historia_id
       JOIN doadores ON doadores.id = indicacoes.doador_id
       WHERE indicacoes.id = ?`
    )
    .get(Number(req.params.id));

  if (!indicacao) {
    return res.status(404).json({ erro: "Indicação não encontrada." });
  }

  const primeiroNomeIndicador = indicacao.nome_indicador.split(" ")[0];
  res.json({ ...indicacao, nome_indicador: undefined, primeiro_nome_indicador: primeiroNomeIndicador });
});

// GET /api/doadores/:id/indicacoes — seção "Minhas indicações" (tela
// convidar-amigo): mostra o status de cada história já compartilhada.
app.get("/api/doadores/:id/indicacoes", (req, res) => {
  if (!exigirDonoDaConta(req, res)) return;
  const indicacoes = banco
    .prepare(
      `SELECT indicacoes.id, indicacoes.status, indicacoes.criado_em, historias.apelido
       FROM indicacoes
       JOIN historias ON historias.id = indicacoes.historia_id
       WHERE indicacoes.doador_id = ?
       ORDER BY indicacoes.criado_em DESC`
    )
    .all(Number(req.params.id));
  res.json(indicacoes);
});

// POST /api/indicacoes/:id/confirmar — chamada pelos checkouts existentes
// (checkout-pix / checkout-pix-recorrente / checkout-recorrente) assim que a
// doação do amigo é criada, se a URL carregava ?indicacao=. Marca a indicação
// como "encontrou um padrinho/madrinha" (CR3). Idempotente: se já estava
// confirmada, só devolve o estado atual sem duplicar nem dar erro.
app.post("/api/indicacoes/:id/confirmar", (req, res) => {
  const { doacao_id } = req.body;
  const indicacaoId = Number(req.params.id);

  const indicacao = banco.prepare("SELECT * FROM indicacoes WHERE id = ?").get(indicacaoId);
  if (!indicacao) {
    return res.status(404).json({ erro: "Indicação não encontrada." });
  }

  if (indicacao.status === "pendente") {
    let doacaoIdValido = null;
    if (doacao_id !== undefined && doacao_id !== null) {
      const doacao = banco.prepare("SELECT id FROM doacoes WHERE id = ?").get(Number(doacao_id));
      if (!doacao) {
        return res.status(400).json({ erro: "doacao_id inválido." });
      }
      doacaoIdValido = Number(doacao_id);
    }
    banco
      .prepare("UPDATE indicacoes SET status = 'encontrou_padrinho', doacao_id = ? WHERE id = ?")
      .run(doacaoIdValido, indicacaoId);
  }

  const atualizada = banco.prepare("SELECT * FROM indicacoes WHERE id = ?").get(indicacaoId);
  res.json(atualizada);
});

app.listen(PORTA, () => {
  console.log(`\nServidor rodando em http://localhost:${PORTA}`);
});
