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
