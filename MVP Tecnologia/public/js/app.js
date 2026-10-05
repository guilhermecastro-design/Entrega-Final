// Funções compartilhadas por todas as telas: chamadas à API, formatação,
// leitura de parâmetros da URL e autenticação da área do doador (US-F4).

// --- Sessão (login da área do doador) -------------------------------------
const CHAVE_SESSAO = "ebenezer_sessao";

function tokenSessao() {
  return localStorage.getItem(CHAVE_SESSAO);
}

function salvarSessao(token) {
  localStorage.setItem(CHAVE_SESSAO, token);
}

function limparSessao() {
  localStorage.removeItem(CHAVE_SESSAO);
}

function cabecalhosAutenticados(extra) {
  const token = tokenSessao();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

// Garante que existe sessão válida antes de renderizar uma tela da área do
// doador — chame no topo de toda página protegida (area-doador, convidar-
// amigo, comprovante-doacao): `const doador = await exigirLogin(); if
// (!doador) return;`. Sem isso, cada uma dessas páginas antes só "sabia"
// quem era o doador pelo parâmetro ?doador= na URL, o que quebrava sempre
// que a página era aberta sem esse parâmetro (bug real encontrado ao abrir
// convidar-amigo.html direto, sem vir de dentro da área do doador).
async function exigirLogin() {
  const token = tokenSessao();
  if (!token) {
    window.location.href = "login.html";
    return null;
  }
  try {
    const doador = await apiGet("/api/auth/me");
    return doador;
  } catch (erro) {
    limparSessao();
    window.location.href = "login.html";
    return null;
  }
}

// Encerra a sessão (avisa o servidor pra invalidar o token, best-effort) e
// volta pra home. Chamada pelo item "Sair" do menu (nav-menu.js).
async function sair() {
  try {
    await apiPost("/api/auth/logout", {});
  } catch (erro) {
    // Best-effort: mesmo que o logout no servidor falhe, a sessão local
    // ainda é limpa abaixo — o usuário não fica preso, só a sessão antiga
    // continua válida no banco até expirar (sem impacto de segurança real
    // num protótipo acadêmico com dados fictícios).
  }
  limparSessao();
  window.location.href = "index.html";
}

async function apiGet(caminho) {
  const resposta = await fetch(caminho, { headers: cabecalhosAutenticados() });
  const dados = await resposta.json();
  if (!resposta.ok) {
    throw new Error(dados.erro || "Erro na requisição.");
  }
  return dados;
}

async function apiPost(caminho, corpo) {
  const resposta = await fetch(caminho, {
    method: "POST",
    headers: cabecalhosAutenticados({ "Content-Type": "application/json" }),
    body: JSON.stringify(corpo),
  });
  const dados = await resposta.json();
  if (!resposta.ok) {
    throw new Error(dados.erro || "Erro na requisição.");
  }
  return dados;
}

function formatarMoeda(valor) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Variação percentual entre dois valores, pro texto expandido do Balanço
// Patrimonial (ex: "+406,9% vs ano anterior"). Trata o caso em que o ano
// anterior é zero (ex: Passivo Circulante era R$ 0,00 em 2024) — variação
// percentual não existe matematicamente nesse caso.
function formatarVariacaoPercentual(atual, anterior) {
  if (!anterior) {
    return atual ? "não havia registro no ano anterior" : "sem variação";
  }
  const pct = ((atual - anterior) / Math.abs(anterior)) * 100;
  const sinal = pct > 0 ? "+" : "";
  return `${sinal}${pct.toFixed(1)}% vs ano anterior`;
}

// Ativa o clique-pra-expandir nas linhas de DRE/Balanço (`.dre-linha-
// expandivel`) dentro do escopo dado — usado tanto no painel dinâmico da
// área do doador quanto nas seções estáticas de transparencia.html. Guarda
// contra religar o mesmo elemento duas vezes (ex: se chamado mais de uma
// vez sobre o mesmo container estático).
function ativarLinhasExpandiveis(escopo) {
  (escopo || document).querySelectorAll(".dre-linha-expandivel").forEach((linha) => {
    const nota = linha.querySelector(".dre-nota-expandida");
    if (!nota || linha.dataset.expansivelAtivado) return;
    linha.dataset.expansivelAtivado = "true";
    linha.addEventListener("click", () => {
      nota.hidden = !nota.hidden;
    });
  });
}

function paramUrl(nome) {
  return new URLSearchParams(window.location.search).get(nome);
}

// --- US-F2 ("Adotar uma criança" / indicações) ---------------------------
// Repassa o parâmetro ?indicacao=, se presente na URL atual, para a próxima
// tela do fluxo de doação — assim o link personalizado (apadrinhar.html)
// sobrevive até o checkout, sem exigir nenhuma mudança nas telas em si.
function comIndicacao(url) {
  const indicacaoId = paramUrl("indicacao");
  if (!indicacaoId) return url;
  const separador = url.includes("?") ? "&" : "?";
  return `${url}${separador}indicacao=${indicacaoId}`;
}

// Se a doação recém-criada veio de um link de indicação, avisa o back-end
// pra marcar aquela indicação como "encontrou um padrinho". Best-effort:
// nunca deve travar ou quebrar o fluxo de doação em si (já validado).
async function confirmarIndicacaoSeNecessario(doacaoId) {
  const indicacaoId = paramUrl("indicacao");
  if (!indicacaoId) return;
  try {
    await apiPost(`/api/indicacoes/${indicacaoId}/confirmar`, { doacao_id: doacaoId });
  } catch (erro) {
    console.error("Não foi possível confirmar a indicação:", erro);
  }
}
