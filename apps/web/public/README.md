# public/ — assets estáticos servidos pelo Vite

Arquivos aqui são copiados como estão para a raiz do build (`/`).

## Como adicionar a imagem de fundo do tema Barsotti

1. Coloque uma foto **horizontal**, em alta resolução (≥ 1920×1080),
   neste diretório com o nome **`auth-bg.jpg`**.
   - Sugestão: foto da fachada/box da Barsotti Brothers, ou foto interna
     de treino (levantamento de peso, halteres, atletas em ação).
   - Pode ser PNG também — basta usar `auth-bg.png` e ajustar a URL em
     `apps/web/src/styles/globals.css`.

2. Faça commit + push. No próximo deploy do Render a imagem aparece
   automaticamente em `/auth-bg.jpg`.

3. O CSS aplica um overlay azul semi-transparente em cima (definido em
   `globals.css → .themed-auth-bg`), então a foto deve ter contraste
   suficiente para o overlay funcionar. Foto muito clara pode ficar
   "lavada" — escolha algo com elementos escuros ou dramáticos.

Se a imagem não existir, a tela cai no gradiente azul puro (já bonito).
