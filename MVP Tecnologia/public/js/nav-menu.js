// Overlay do menu (painel estilo dropdown, ancorado abaixo do header —
// como no Figma) + comportamento do botão voltar. Compartilhado por todas
// as telas: qualquer botão com classe "botao-menu" abre o painel, e um
// elemento com id "botao-voltar" volta ao histórico de navegação (BACK),
// exatamente como descrito na seção "Fluxo de navegação" do artefato da
// Semana 5.
//
// Cada link carrega um ícone (span[data-icon]) além do texto — antes era só
// texto, mas agora que esse mesmo painel também vira sidebar fixa em telas
// largas (ver css/style.css, .pagina-piloto-desktop), o ícone é o que fica
// visível quando a sidebar é minimizada (botão de minimizar/maximizar
// abaixo, referência: produto interno do usuário, "UniOps").

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
    ? `<a href="#" id="item-sair" title="Sair"><span class="icone-link" data-icon="log-out"></span><span class="rotulo-link">Sair</span></a>`
    : `<a href="login.html" title="Entrar"><span class="icone-link" data-icon="lock"></span><span class="rotulo-link">Entrar</span></a>`;

  fundo.innerHTML = `
    <div class="painel-menu">
      <div class="cabecalho-menu">
        <span class="rotulo-cabecalho-menu">Menu</span>
        <button type="button" class="botao-colapsar-menu" aria-label="Minimizar menu" title="Minimizar menu">
          <span data-icon="chevron-left"></span>
        </button>
        <button type="button" class="fechar-menu" aria-label="Fechar menu">&times;</button>
      </div>
      <hr class="divisor-menu" />
      <a href="index.html" title="Início"><span class="icone-link" data-icon="home"></span><span class="rotulo-link">Início</span></a>
      <a href="sobre-nos.html" title="Sobre nós"><span class="icone-link" data-icon="book-open"></span><span class="rotulo-link">Sobre nós</span></a>
      <a href="nossas-iniciativas.html" title="Nossas iniciativas"><span class="icone-link" data-icon="award"></span><span class="rotulo-link">Nossas iniciativas</span></a>
      <a href="nosso-time.html" title="Nosso time"><span class="icone-link" data-icon="users"></span><span class="rotulo-link">Nosso time</span></a>
      <a href="transparencia.html" title="Transparência"><span class="icone-link" data-icon="bar-chart-2"></span><span class="rotulo-link">Transparência</span></a>
      <a href="escolha-doacao.html" title="Fazer uma doação"><span class="icone-link" data-icon="plus-circle"></span><span class="rotulo-link">Fazer uma doação</span></a>
      <a href="area-doador.html" title="Área do doador"><span class="icone-link" data-icon="user"></span><span class="rotulo-link">Área do doador</span></a>
      <a href="documentos-empresa.html" title="Sou uma empresa parceira"><span class="icone-link" data-icon="building"></span><span class="rotulo-link">Sou uma empresa parceira</span></a>
      <hr class="divisor-menu" />
      <a href="admin.html" title="Painel administrativo (acesso restrito à equipe)"><span class="icone-link" data-icon="shield-check"></span><span class="rotulo-link">Painel administrativo</span></a>
      <hr class="divisor-menu" />
      ${itemSessao}
    </div>
  `;
  document.body.appendChild(fundo);

  // Minimizar/maximizar a sidebar (só tem efeito visual no piloto desktop —
  // ver .pagina-piloto-desktop no CSS; nas outras páginas/larguras o botão
  // fica escondido). Estado persistido, então a escolha sobrevive a troca
  // de página e a reload, igual a uma sessão.
  const CHAVE_SIDEBAR_COLAPSADA = "ebenezer_sidebar_colapsada";
  const botaoColapsar = fundo.querySelector(".botao-colapsar-menu");
  function aplicarEstadoColapso() {
    const colapsada = localStorage.getItem(CHAVE_SIDEBAR_COLAPSADA) === "1";
    document.body.classList.toggle("sidebar-colapsada", colapsada);
    botaoColapsar.setAttribute("aria-label", colapsada ? "Maximizar menu" : "Minimizar menu");
    botaoColapsar.title = colapsada ? "Maximizar menu" : "Minimizar menu";
  }
  botaoColapsar.addEventListener("click", () => {
    const colapsadaAgora = document.body.classList.contains("sidebar-colapsada");
    localStorage.setItem(CHAVE_SIDEBAR_COLAPSADA, colapsadaAgora ? "0" : "1");
    aplicarEstadoColapso();
  });
  aplicarEstadoColapso();

  // Marca o link da página atual (classe "ativo") — mais necessário agora
  // que o menu também vira sidebar fixa em telas largas (US desktop,
  // 05/10/2026): numa sidebar sempre visível, sem destaque fica impossível
  // saber em que página você está. Funciona igual no overlay mobile.
  const caminhoAtual = window.location.pathname.split("/").pop() || "index.html";
  fundo.querySelectorAll(".painel-menu a[href]").forEach((link) => {
    if (link.getAttribute("href") === caminhoAtual) link.classList.add("ativo");
  });

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
