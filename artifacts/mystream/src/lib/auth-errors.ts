export function authMessage(error:unknown):string {
 const message=error instanceof Error?error.message:'';
 if(message.includes('Invalid login')) return 'E-mail ou senha incorretos.';
 if(message.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar. Você pode reenviar a confirmação abaixo.';
 if(message.toLowerCase().includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
 if(message.includes('Password') || message.includes('password')) return 'Confira a senha. A nova senha deve ter pelo menos 8 caracteres.';
 return 'Não foi possível concluir. Confira os dados e tente novamente.';
}
