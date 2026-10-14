# MyStream — contas individuais

Site: https://mystream-eopkzin.eopkzin.workers.dev/

Interface React/Vite e busca YouTube na Cloudflare. Supabase MyStream: xrspxandleztuatjgvcx.

## Contas
Cadastro e login com e-mail/senha. Confirmação de e-mail permanece habilitada. No dashboard Supabase, Authentication > URL Configuration: Site URL e Redirect URL devem permitir https://mystream-eopkzin.eopkzin.workers.dev/ para o retorno dos e-mails.
Cada conta possui biblioteca, favoritos, histórico, playlists e configurações privadas, salvos em mystream_user_state. RLS autoriza somente o dono. Logout salva alterações pendentes, desmonta o player e remove os dados da tela. O indicador mostra falhas de sincronização e oferece nova tentativa.
Arquivos privados em mystream-media, até 50 MB; URLs assinadas duram 24 horas e são renovadas ao carregar a conta. A fila é temporária. Uso em vários dispositivos segue a última versão salva; não há mesclagem de edições simultâneas.
Dados antigos de modo local não são migrados automaticamente para contas.

## Layout e busca
Cards com largura mínima de 180 px. Curtos até 60 s; Longos acima de 60 s. 50 resultados por página; Carregar mais; cache de seis horas.
Busca utiliza segredo YOUTUBE_API_KEY na Cloudflare. A chave pública Supabase no frontend é publishable e depende de RLS; nenhuma chave administrativa foi incluída.

## Desenvolvimento
Node 24, pnpm 11.25.0.
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @workspace/mystream typecheck
pnpm --filter @workspace/mystream build

O workflow GitHub está preparado para a branch main com CLOUDFLARE_API_TOKEN e CLOUDFLARE_ACCOUNT_ID configurados como secrets.

## Verificação
Build e TypeScript passaram. Testes reais de RLS, feitos com registros temporários e rollback: isolamento entre dois usuários, bloqueio de alteração de dono, bloqueio de acesso anônimo, isolamento de arquivos e rejeição de upload em pasta de outro usuário. Cadastro por e-mail está habilitado e exige confirmação.

## Recuperação, perfil e mobile
Esqueci minha senha e Reenviar confirmação estão na tela de entrada. O link de recuperação abre a tela Definir nova senha via PASSWORD_RECOVERY. Mensagem de cadastro inclui a possibilidade de conta existente sem expor confirmação de existência. Perfil no botão do cabeçalho: nome, foto privada JPG/PNG/WebP até 2 MB e nova senha com confirmação.

Mobile: cards em duas colunas, perfil no cabeçalho, painel de vídeo acessível e reaberto pela capa do player, fila pelo player, controles com nomes acessíveis. Player preservado quando o painel fecha. Vídeos enviados têm controles nativos; volume e mute também controlam esses vídeos.

Testes adicionais passaram com duas contas temporárias removidas após execução: login real pela API, salvamento de favoritos/playlists e leitura em um segundo cliente, bloqueio de leitura/escrita entre contas, atualização de nome, upload privado, logout, troca de senha e login com a nova senha. Build e TypeScript passaram. O envio real de confirmação/recuperação não foi realizado; configure URL Configuration no Supabase e teste com sua conta.

Atualização de perfil: página com abas Perfil/Senha; tema claro/escuro salvo na conta; troca de senha por link no e-mail cadastrado, seguida de formulário na sessão de recuperação. Miniaturas exibem somente duração. Build e typecheck passaram; entrega real do e-mail depende de Auth URL Configuration/SMTP e não foi testada.

Atualização mobile: largura mínima corrigida na busca/conteúdo, altura 100dvh, mini player compacto com controles expandidos, ocultação sem mídia selecionada, cards 16:9 com título em duas linhas e ações em menu; vídeo em tela opaca com retorno à navegação; safe areas e posição da navegação ajustadas. Typecheck/build passaram. Sem teste em aparelho físico.

Player mobile unificado: seleção abre vídeo; fone/câmera alterna apresentação com disco animado e mantém o elemento de mídia; removidos botões Continuar navegando/Assistir vídeo; controles na mesma tela. Nova seleção retorna ao vídeo. Media Session para arquivos de áudio com ações de reprodução, pausa, busca e faixas e estado sincronizado; suporte depende do navegador, sem validação física da tela bloqueada. YouTube incorporado não oferece reprodução de fundo suportada. Typecheck/build passaram.

Fila restaurada no mini player e no cabeçalho do player vídeo/áudio; fila sobrepõe o player no mobile e fecha sem desmontar a mídia. Typecheck/build passaram. Segundo plano de YouTube continua sem suporte; controles Media Session para áudios enviados não equivalem a garantir execução de fundo em todos os dispositivos.
