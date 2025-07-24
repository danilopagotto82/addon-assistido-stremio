# HandyCard - Trakt Assistido

Este é um addon público para Stremio que exibe um quadro lateral ("handy card") mostrando se um determinado filme ou episódio já foi assistido por você no Trakt. O objetivo é mostrar rapidamente o status "✔️ Assistido." ou "❌ Não Assistido.", igual ao Ratings Aggregator.

- **URL do Manifest:**  
  [https://addon-assistido-stremio-production.up.railway.app/manifest.json](https://addon-assistido-stremio-production.up.railway.app/manifest.json)

## Como instalar no Stremio

1. No Stremio Desktop, vá em **Add-ons** → **Adicionar Add-on por URL**.
2. Cole: 
https://addon-assistido-stremio-production.up.railway.app/manifest.json

text
3. Faça login no Trakt clicando no link de login fornecido pelo addon.
4. Clique em qualquer filme ou episódio: o quadro lateral exibirá se é "✔️ Assistido." ou "❌ Não Assistido."

## Exemplo de resposta `/meta/...`

{
"meta": {
"id": "tt1375666",
"type": "movie",
"videos": [
{
"id": "trakt-status",
"title": "✔️ Assistido.",
"url": "",
"quality": "",
"externalUrl": "",
"isVisited": false
}
],
"streams": [
{
"name": "Trakt Status",
"description": "✔️ Assistido.",
"url": "",
"behaviorHints": { "notWebReady": true }
}
]
}
}

text

## 🆕 Modo Multiusuário

Agora é possível realizar login com múltiplos perfis Trakt!

- Acesse `/config` para adicionar/remover usuários.
- Use o campo "Nome do usuário" para separar tokens (ex: "danilo", "julia", etc)
- Cada usuário pode autenticar via Trakt separadamente (ideal para famílias/shares).
- O Stremio pode ser configurado para acessar /meta/:type/:id?user=SEU_USUARIO caso queira integração avançada.

Todos os tokens ficam apenas no arquivo `src/storage/users.json`.

## Tecnologias usadas

- Node.js
- Express
- Axios
- Simple-OAuth2
- Railway (deploy)

## Contato

Feito por [danilopagotto82](https://github.com/danilopagotto82).

---

Add-on open-source, contribuições e sugestões são bem-vindas!
