# MyStream

Player web de músicas e vídeos com React, busca pela API oficial do YouTube, contas e biblioteca privada no Supabase e hospedagem no Cloudflare Workers.

Site: https://mystream-eopkzin.eopkzin.workers.dev/

## Desenvolvimento

Node.js 24 e pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @workspace/mystream typecheck
pnpm --filter @workspace/mystream dev
```

Para gerar o site: `pnpm --filter @workspace/mystream build`.

## Publicação

O Worker é configurado em `wrangler.jsonc`. A chave `YOUTUBE_API_KEY` fica como secret no Cloudflare, nunca no código. O workflow valida o projeto; o deploy só executa quando `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` estiverem configurados como secrets do repositório.

Consulte `README-MIGRACAO.md` e `supabase-schema.sql` para configuração e limitações. O modo fone muda a apresentação; não habilita reprodução em segundo plano para o player do YouTube.
