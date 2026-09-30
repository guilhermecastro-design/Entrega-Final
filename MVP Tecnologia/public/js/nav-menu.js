// Overlay do menu (painel estilo dropdown, ancorado abaixo do header —
// como no Figma) + comportamento do botão voltar. Compartilhado por todas
// as telas: qualquer botão com classe "botao-menu" abre o painel, e um
// elemento com id "botao-voltar" volta ao histórico de navegação (BACK),
// exatamente como descrito na seção "Fluxo de navegação" do artefato da
// Semana 5.

(function () {
  const fundo = document.createElement("div");
  fundo.className = "fundo-overlay";
  fundo.hidden = true;
  // Item de sessão (Entrar / Sair) — US-F4. localStorage é lido direto aqui
  // (em vez de depender de app.js) porque nav-menu.js já rodava em toda
  // página antes da autenticação existir; manter os dois independentes
  // evita acoplar a ordem de carregamento dos scripts.
  const temSessao = Boolean(localStorage.getItem("ebenezer_sessao"));
  const itemSessao = temSessao
    ? `<a href="#" id="item-sair">Sair</a>`
    : `<a href="login.html">Entrar</a>`;

  fundo.innerHTML = `
    <div class="painel-menu">
      <div class="cabecalho-menu">
        <span>Menu</span>
        <button type="button" class="fechar-menu" aria-label="Fechar menu">&times;</button>
      </div>
      <hr class="divisor-menu" />
      <a href="index.html">Início</a>
      <a href="transparencia.html">Transparência</a>
      <a href="escolha-doacao.html">Fazer uma doação</a>
      <a href="area-doador.html">Área do doador</a>
      <a href="documentos-empresa.html">Sou uma empresa parceira</a>
      <hr class="divisor-menu" />
      ${itemSessao}
    </div>
  `;
  document.body.appendChild(fundo);

  function abrirMenu() {
    fundo.hidden = false;
  }
  function fecharMenu() {
    fundo.hidden = true;
  }

  fundo.addEventListener("click", (evento) => {
    if (evento.target === fundo) fecharMenu();
  });
  fundo.querySelector(".fechar-menu").addEventListener("click", fecharMenu);

  if (temSessao) {
    fundo.querySelector("#item-sair").addEventListener("click", (evento) => {
      evento.preventDefault();
      // sair() é definida em app.js, carregado antes deste script em toda
      // página; se por algum motivo não existir, evita quebrar o menu.
      if (typeof sair === "function") sair();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".botao-menu").forEach((botao) => {
      botao.addEventListener("click", abrirMenu);
    });
    const botaoVoltar = document.getElementById("botao-voltar");
    if (botaoVoltar) {
      botaoVoltar.addEventListener("click", () => history.back());
    }
  });
})();
