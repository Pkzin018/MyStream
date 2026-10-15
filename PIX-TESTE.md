# MyStream Pro: Pix por período de 30 dias

## Experiência
Pagamento confirmado libera o Pro e exibe a tela animada “Agora você é Pro!”, benefícios, validade e armazenamento. Enquanto ativo, a tela principal de plano não mostra simulação, teste, QR antigo ou nova compra. A renovação abre nos últimos três dias do período. Um Pix novo confirmado estende a validade em 30 dias, preservando dias restantes.

O teste administrativo de R$1 usa a tabela mystream_pix_tests. Clientes usam /api/billing/renew e o valor PRO_PRICE_BRL (R$14,90 na configuração atual), registrado na cobrança no servidor. Não há débito automático. A geração e a confirmação são automáticas; o cliente autoriza cada pagamento no banco.

As cobranças usam Orders API, valor fixado pelo servidor e chave de idempotência. Pix expirados podem ser substituídos por uma nova cobrança sem apagar o histórico. Ativação usa funções transacionais e granted_at para impedir dias extras por consulta repetida.

## Notificações
O sino do aplicativo mostra aviso três dias antes de vencer e depois do vencimento. Os dados são atualizados ao voltar à aba e a cada minuto. O benefício Pro expira no servidor na data indicada; os arquivos existentes são preservados.

## E-mails
O Worker possui rotina diária às 11:00 UTC (08h em Brasília). Envia um lembrete próximo do vencimento e outro após vencer; registra envio por usuário, período e tipo. O serviço permanece desativado se RESEND_API_KEY ou EMAIL_FROM não estiverem configurados.

Para ativar: criar uma chave de envio no Resend, verificar o domínio do remetente e cadastrar RESEND_API_KEY como Secret e EMAIL_FROM como remetente verificado na Cloudflare. A entrega real de e-mail ainda não foi validada.

## Configuração e validação
MP_ACCESS_TOKEN e MP_WEBHOOK_SECRET são Secrets do Worker. Sem MP_WEBHOOK_SECRET, o Webhook retorna 503; consultas autenticadas e periódicas verificam a order diretamente. BILLING_MODE continua test para manter desativada a antiga integração de assinatura por cartão. Isso não bloqueia o Pix avulso, explicitamente apresentado como pagamento real.

Aplicar supabase-pix-test.sql, supabase-pix-activation.sql, supabase-pix-renewals.sql e supabase-renewals.sql. As tabelas de pagamentos são privadas, e apenas o servidor pode liberar benefícios. A ativação de 30 dias e a proteção contra repetição foram verificadas no banco; testes de renovação foram revertidos ao terminar.
