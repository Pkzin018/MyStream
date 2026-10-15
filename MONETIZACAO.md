# Versão de teste com administrador

BILLING_MODE=test bloqueia checkout, cancelamento de cobrança e webhooks reais.
Em Configurações > Plano, somente administradores podem alternar a própria conta entre Gratuito e Pro de teste (7 dias). A autorização é verificada pelo servidor em app_metadata.mystream_role. Não há senha administrativa no código.

Conta selecionada: andrekraitos55@gmail.com. A permissão já foi aplicada no Supabase; use a senha existente e faça logout/login para atualizar a sessão.

## Ativação pendente
Esta versão ainda não foi publicada na Cloudflare. Antes de publicar:
1. Configure SUPABASE_SERVICE_ROLE_KEY como segredo do Worker (nunca no frontend ou no GitHub).
2. Aplique supabase-billing.sql e publique esta versão na mesma janela. O SQL remove o upload direto; aplicá-lo isoladamente quebra uploads na versão antiga.
3. Mantenha BILLING_MODE=test. Não são necessárias credenciais do Mercado Pago para a simulação.
4. Entre com a conta administradora e abra Configurações > Plano > Testar Pro por 7 dias; depois Testar Gratuito.
5. Confira o bloqueio de novas playlists acima de cinco e faça o teste de armazenamento com vários arquivos menores que 50 MB.

## Escopo desta entrega
Permite testar planos sem dinheiro real. Não simula a aprovação de um pagamento no Mercado Pago. O fluxo original de cobrança real não foi homologado nem corrigido integralmente. Antes de ativar cobrança: confirmar pagamentos aprovados, impedir assinaturas duplicadas e reforçar cotas de uploads (tamanho real e concorrência). Não disponibilize uploads ao público com a expectativa de uma cota rígida antes dessa revisão.

Validações: testes automatizados de autenticação, autorização de administrador, troca do próprio plano e bloqueio de cobrança real. Consulte a entrega para o resultado do build. Nenhuma migração de cobrança foi aplicada ao banco nesta etapa.

---
## Documentação original (referência; não ativar cobrança real nesta etapa)

# MyStream Pro — como ativar a cobrança

O que o Pro vende (somente o que é seu, nada do YouTube):

| | Gratuito | Pro |
|---|---|---|
| Armazenamento de arquivos próprios | 200 MB | 2 GB |
| Playlists | até 5 | ilimitadas |
| Arquivo individual | 50 MB | 50 MB |
| Busca e player do YouTube | sim | sim (igual) |

Preço e cotas ficam em `wrangler.jsonc` → `vars` (`PRO_PRICE_BRL`, `FREE_STORAGE_MB`, `PRO_STORAGE_MB`).

## Passo a passo
1. **Banco.** No Supabase → SQL Editor, rode `supabase-billing.sql` (depois do `supabase-schema.sql`). Ele cria a tabela de assinaturas, a cota de armazenamento e o limite de playlists, e remove o upload direto (agora o envio passa por um ticket do servidor que confere a cota).
2. **Mercado Pago.** Em mercadopago.com.br/developers crie uma aplicação.
   - Copie o **Access Token** (use o de teste primeiro).
   - Em *Webhooks*, URL: `https://mystream-eopkzin.eopkzin.workers.dev/api/billing/webhook`, evento **Planos e assinaturas** (assinaturas e pagamentos de assinatura). Copie a **assinatura secreta**.
3. **Segredos na Cloudflare** (Workers → mystream-eopkzin → Settings → Variables and Secrets, ou `wrangler secret put NOME`):
   - `MP_ACCESS_TOKEN` — token do passo 2
   - `MP_WEBHOOK_SECRET` — assinatura secreta do passo 2
   - `SUPABASE_SERVICE_ROLE_KEY` — chave secreta do Supabase (Project Settings → API Keys). **Nunca** vai para o frontend.
4. **Publicar** (push na `main`, o workflow já existente faz o deploy).
5. **Testar** com usuários de teste do Mercado Pago: assinar, ver o plano virar Pro, enviar arquivo acima de 200 MB, cancelar e ver que o Pro continua até o fim do período pago. Só depois troque para as credenciais de produção.

## Como funciona
- `Assinar o Pro` cria uma assinatura mensal no Mercado Pago e leva o usuário ao checkout deles. O app nunca toca em dados de cartão.
- O webhook (assinatura HMAC verificada) e a consulta ao voltar do checkout atualizam `mystream_subscriptions`. Pro vale até a próxima cobrança + 2 dias de tolerância.
- A cota é verificada no servidor antes de cada upload. O limite de playlists também é imposto no banco (trigger), não só na tela.

## Pontos de atenção
- **Custo do Supabase:** o plano gratuito do Supabase tem 1 GB de armazenamento no total e arquivos de até 50 MB. Com vários usuários, você vai precisar do plano Pro do Supabase; confira se o preço do Pro cobre isso.
- **Cobrança recorrente do Mercado Pago é no cartão.** Pix recorrente não está nessa integração.
- **Termos do YouTube:** mantenha a busca e o player do YouTube gratuitos, sem esconder o vídeo, sem tocar em segundo plano e sem anúncios sobre o player. O "modo áudio" atual esconde o vídeo do YouTube e deve ser revisto antes de divulgar o app (ver resposta no chat).
- **Conteúdo enviado por usuários:** antes de abrir ao público, publique Termos de Uso e Política de Privacidade (o Mercado Pago também costuma pedir) e deixe claro que só se envia conteúdo próprio ou licenciado.
