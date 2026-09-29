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
    cpf_cnpj TEXT
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
    descricao TEXT NOT NULL
  )
`);

banco.exec(`
  CREATE TABLE IF NOT EXISTS indicacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doador_id INTEGER NOT NULL,
    historia_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'encontrou_padrinho')),
    criado_em TEXT NOT NULL,
    FOREIGN KEY (doador_id) REFERENCES doadores(id),
    FOREIGN KEY (historia_id) REFERENCES historias(id)
  )
`);

banco.exec(`
  CREATE TABLE IF NOT EXISTS relatos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    texto TEXT NOT NULL,
    data TEXT NOT NULL
  )
`);

// --- Seed: indicadores financeiros reais (site institucional, 2025) ---
const inserirIndicador = banco.prepare(`
  INSERT OR IGNORE INTO indicadores_financeiros (ano, tipo, valor) VALUES (?, ?, ?)
`);
inserirIndicador.run(2025, "custo_por_aluno_mes", 93.68);
inserirIndicador.run(2025, "esg_score", 72);
inserirIndicador.run(2025, "receita_pf", 87033.90);
inserirIndicador.run(2025, "receita_pj", 75293.30);

// --- Seed: doadores e doações sintéticas (para testar o painel) ---
const totalDoadores = banco.prepare("SELECT COUNT(*) AS total FROM doadores").get().total;

if (totalDoadores === 0) {
  const inserirDoador = banco.prepare(
    "INSERT INTO doadores (nome, email, tipo, cpf_cnpj) VALUES (?, ?, ?, ?)"
  );
  const idRenataExemplo = Number(
    inserirDoador.run("Renata Souza (exemplo)", "renata.exemplo@email.com", "PF", null)
      .lastInsertRowid
  );
  const idMarcosExemplo = Number(
    inserirDoador.run("Marcos Lima (exemplo)", "marcos.exemplo@empresa.com", "PJ", "12.345.678/0001-90")
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

  // Conquista de exemplo: Renata (exemplo) atingiu o marco de 3 meses recorrente
  const inserirConquista = banco.prepare(`
    INSERT INTO conquistas (doador_id, tipo, descricao, atingido_em) VALUES (?, ?, ?, ?)
  `);
  inserirConquista.run(
    idRenataExemplo,
    "marco_tempo",
    "3 meses de doação recorrente ativa",
    "2026-09-05T10:00:00.000Z"
  );
}

// --- Seed: histórias fictícias para o US-F2 (nunca dados de criança real) ---
const totalHistorias = banco.prepare("SELECT COUNT(*) AS total FROM historias").get().total;

if (totalHistorias === 0) {
  const inserirHistoria = banco.prepare(
    "INSERT INTO historias (apelido, faixa_etaria, descricao) VALUES (?, ?, ?)"
  );
  inserirHistoria.run(
    "Estrela do Futebol",
    "8-10 anos",
    "Participa das atividades esportivas de sábado e sonha em ser técnico de futebol."
  );
  inserirHistoria.run(
    "Pequena Artista",
    "6-8 anos",
    "Adora as aulas de pintura e já ajudou a decorar o mural do Instituto."
  );
  inserirHistoria.run(
    "Leitor Curioso",
    "10-12 anos",
    "Sempre o primeiro a pegar um livro novo na sala de reforço escolar."
  );
}

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
}

console.log("Banco criado/atualizado em data/ebenezer.db — 7 tabelas prontas.");

// Mostra uma contagem rápida de cada tabela, só pra conferência visual
for (const tabela of [
  "doadores",
  "doacoes",
  "indicadores_financeiros",
  "conquistas",
  "historias",
  "indicacoes",
  "relatos",
]) {
  const total = banco.prepare(`SELECT COUNT(*) AS total FROM ${tabela}`).get().total;
  console.log(`  ${tabela}: ${total} registro(s)`);
}
