# MVP Instituto Ebenézer — Desafio A

Protótipo funcional (Node.js + Express + SQLite) do fluxo de doação, área do doador
com login (US-F4) e indicação "Adotar uma criança" (US-F2), construído para a
entrega de Tecnologia do Módulo 3 (MBA em IA e Dados para Negócios — Inteli).

## Login — credenciais de teste

A área do doador (histórico, marcos, painel de transparência, indicações) agora
exige login de verdade (e-mail + senha, com sessão em token; senha nunca é
guardada em texto puro — hash com salt via `node:crypto`). Pra testar sem passar
pelo cadastro, os 2 doadores de exemplo já semeados no banco têm uma senha
fixa:

| E-mail | Senha |
|---|---|
| `renata.exemplo@email.com` | `ebenezer123` |
| `marcos.exemplo@empresa.com` | `ebenezer123` |

Qualquer outra pessoa pode criar a própria conta em `cadastro.html` (ou pelo
botão "Criar minha área do doador" que aparece depois de uma doação).

## Painel administrativo (equipe do Instituto)

Visão somente-leitura de doações e contas de doador, pensada pra equipe do
Instituto acompanhar o funcionamento do MVP sem precisar consultar o banco de
dados diretamente. Fica visível no menu principal ("Painel administrativo"),
mas atrás de um login próprio — **separado do login de doador** acima, numa
tabela e numa sessão independentes (`admin.html` → `admin-login.html`, API em
`/api/admin/*` com o cabeçalho `X-Admin-Token`) — pra um doador comum nunca
conseguir abrir o painel interno, nem por acidente.

Credencial de demonstração (mesmo padrão das credenciais de doador acima —
documentada aqui pra quem for avaliar o protótipo conseguir entrar direto):

| E-mail | Senha |
|---|---|
| `equipe@institutoebenezer.org.br` | `ebenezer-admin-2026` |

Isso resolve a demonstração e a validação com usuário real deste MVP, mas não
é um sistema de gestão de acesso de equipe de verdade (convite, múltiplos
perfis, recuperação de senha) — essa é uma decisão organizacional do
Instituto sobre quem administra o quê, não uma lacuna técnica; fica registrada
como item em aberto no plano de sustentação do Business Case.

## Integração de pagamento (Pix avulso via Asaas) — modo de operação

O checkout de Pix avulso (`checkout-pix.html`) é capaz de gerar uma cobrança
real no ambiente sandbox do Asaas (QR code e código copia-e-cola verdadeiros,
com confirmação verificada por consulta de status/webhook) — mas **esta
entrega roda deliberadamente em modo de fallback**, sem a variável de
ambiente `ASAAS_API_KEY` configurada. Decisão do grupo: o ganho de ter uma
chave sandbox ativa não compensava, neste momento, o tempo de configurar e
manter uma conta Asaas só para demonstração — o modo de fallback já resolve o
que importava para esta entrega (preservar o fluxo existente e eliminar o
risco de duplicar doações).

Nesse modo, o comportamento é idêntico ao do MVP antes desta integração: QR
decorativo, código de exemplo, e o botão "Já realizei o Pix" marca a doação
como confirmada por autodeclaração (sem verificação real de pagamento) — a
única mudança interna é que a doação é criada uma única vez, assim que a tela
abre, em vez de só no clique do botão (ver `/api/pix/cobranca` e
`/api/pix/:id/confirmar-autodeclarado` em `server.js`).

Pra ativar o modo real (opcional, caso o grupo crie uma conta em
[sandbox.asaas.com](https://sandbox.asaas.com)): defina `ASAAS_API_KEY` (e,
opcionalmente, `ASAAS_WEBHOOK_TOKEN`) como variável de ambiente antes de
`npm start`. Nenhuma credencial de produção é aceita — a base da API é sempre
a de sandbox, fixa no código.

## Rodando localmente

Pré-requisito: Node.js 22.5 ou mais recente (o projeto usa `node:sqlite`, nativo do
Node, sem precisar instalar nenhum banco separado).

```bash
npm install
npm start
```

O servidor sobe em `http://localhost:3000`. O banco (`data/ebenezer.db`) é criado
e populado automaticamente com dados de exemplo na primeira execução — não precisa
rodar nenhum script de setup à parte.

## Publicando para o time (link público)

Este repositório está pronto para deploy no [Render](https://render.com) (plano
gratuito):

1. Crie uma conta gratuita no Render e conecte sua conta do GitHub.
2. "New +" → "Web Service" → selecione este repositório.
3. O Render detecta o `render.yaml` automaticamente (build: `npm install`,
   start: `npm start`). Só confirmar.
4. Em alguns minutos você recebe uma URL pública (`https://mvp-ebenezer-xxxx.onrender.com`)
   para compartilhar com o time.

**Importante — armazenamento não é persistente no plano gratuito:** o Render
free tier usa disco efêmero. Isso significa que o banco `data/ebenezer.db` é
recriado do zero (voltando aos dados de exemplo) toda vez que o serviço reinicia
— o que acontece automaticamente após ~15 minutos de inatividade, ou a cada novo
deploy. Na prática: ótimo para o time navegar e testar o fluxo repetidamente
(sempre parte de um estado limpo e previsível), mas doações/indicações criadas
durante uma sessão de teste não ficam salvas permanentemente. Se depois for
necessário persistir dados de verdade entre sessões, é preciso migrar para um
banco externo (ex: Postgres do próprio Render, ou um SQLite hospedado como
Turso/libSQL) — fora do escopo desta entrega.

## Estrutura

- `server.js` — API (Express) + modelagem/seed do banco SQLite.
- `public/` — front-end estático (HTML + CSS + JS vanilla, mobile-first).
- `data/` — banco SQLite local (gerado automaticamente; não versionado).
