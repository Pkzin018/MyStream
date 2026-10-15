# Pix real de R$1,00 para administrador

Acesse Perfil > Plano. Informe o e-mail real do pagador, confirme o pagamento real e clique em Gerar Pix de R$1,00. Confira recebedor e valor no banco antes de pagar. O teste é avulso e não altera o plano Pro.

API utilizada: Orders /v1/orders. O valor é fixo no servidor e a criação é idempotente por usuário. Existe uma única cobrança de teste por conta, reutilizada em novas tentativas; não há renovação nem geração de outra cobrança após expirar nesta versão.

A consulta direta autentica o administrador e obtém o status no Mercado Pago; a confirmação exige order e pagamento processed/accredited, valor R$1,00 e referência do registro local. Webhook valida assinatura e consulta a mesma API; só atualiza orders já registradas. Sem MP_WEBHOOK_SECRET, a consulta direta continua disponível, e o webhook retorna 503.

Os segredos MP_ACCESS_TOKEN e MP_WEBHOOK_SECRET ficam somente na Cloudflare. Não altere BILLING_MODE para live: a assinatura original continua desabilitada.

Aplique supabase-pix-test.sql antes de publicar. Após deploy, teste manualmente a transferência: gerar QR não comprova recebimento. Não use este experimento como checkout público.
