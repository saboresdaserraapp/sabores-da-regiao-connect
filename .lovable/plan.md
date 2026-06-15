## Objetivo
Usuários que criaram a conta via Google passam a poder definir uma senha local na página **Minha Conta → Perfil**, e depois alterá-la livremente. Isso garante login alternativo caso o Google falhe.

## Mudanças

### 1. Nova seção "Senha de acesso" na aba Perfil
Arquivo: `src/pages/MinhaConta.tsx` (dentro do `PerfilTab`)

- Detectar se o usuário já tem senha consultando `user.identities` (do `supabase.auth.getUser()`):
  - Se existe identidade com `provider === 'email'` → usuário **já tem senha** → mostrar formulário "Alterar senha" (nova senha + confirmação).
  - Caso contrário (apenas Google) → mostrar formulário "Definir senha de acesso" (nova senha + confirmação) com aviso explicando que servirá como login reserva via e-mail + senha.

### 2. Lógica de definição/alteração
- Usar `supabase.auth.updateUser({ password })` em ambos os casos — o Supabase aceita definir senha mesmo para contas criadas só com OAuth (passa a existir identidade `email`).
- Validações no cliente: mínimo 8 caracteres, confirmação igual, feedback via `toast`.
- Após sucesso ao **definir pela 1ª vez**, recarregar `getUser()` para atualizar o estado e trocar o card para "Alterar senha".

### 3. Sem alterações de backend
Não há migration nem mudança em RLS — tudo via `supabase.auth`. Sem novas dependências.

## Fora de escopo
- Página `/reset-password` já existe e continua intacta.
- Fluxo "esqueci a senha" no login não muda.
