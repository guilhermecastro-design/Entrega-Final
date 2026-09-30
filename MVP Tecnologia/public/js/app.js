// Funções compartilhadas por todas as telas: chamadas à API, formatação e
// leitura de parâmetros da URL (usados pra passar valor/id entre telas, já
// que este MVP não tem login/sessão — ver nota em server.js).

async function apiGet(caminho) {
  const resposta = await fetch(caminho);
  const dados = await resposta.json();
  if (!resposta.ok) {
    throw new Error(dados.erro || "Erro na requisição.");
  }
  return dados;
}

async function apiPost(caminho, corpo) {
  const resposta = await fetch(caminho, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
