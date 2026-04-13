# Guia: Gerenciamento de Usuários e Empresas

## Visão Geral

A partir dessa versão, o registro público foi desabilitado. Apenas o administrador master da plataforma (com acesso via `ADMIN_PASSWORD` da ENV) pode:

1. **Criar novas empresas** com dados mínimos (CNPJ, nome, subdomain, etc)
2. **Cadastrar usuários** nas empresas
3. **Resetar senhas** de usuários

## Fluxo de Onboarding

### 1. Admin acessa a plataforma
O admin usa as credenciais bootstrap:
- Email: `ADMIN_EMAIL` (variável de ambiente)
- Senha: `ADMIN_PASSWORD` (variável de ambiente)

### 2. Admin cria nova empresa
**Endpoint:** `POST /api/admin/companies`

**Autenticação:** JWT token do admin

**Payload:**
```json
{
  "name": "Empresa XYZ",
  "subdomain": "empresa-xyz",
  "email": "contato@empresaxyz.com",
  "phone": "11999999999",
  "cnpj": "12.345.678/0001-99",
  "plan": "professional"
}
```

**Resposta (201 Created):**
```json
{
  "id": 1,
  "name": "Empresa XYZ",
  "subdomain": "empresa-xyz",
  "email": "contato@empresaxyz.com",
  "phone": "11999999999",
  "cnpj": "12.345.678/0001-99",
  "status": "active",
  "plan": "professional"
}
```

### 3. Admin cria primeiro usuário da empresa
**Endpoint:** `POST /api/admin/users`

**Autenticação:** JWT token do admin

**Payload:**
```json
{
  "name": "João Silva",
  "email": "joao@empresaxyz.com",
  "password": "SenhaSegura123!",
  "company_id": 1,
  "role": "admin"
}
```

**Resposta (201 Created):**
```json
{
  "id": 2,
  "name": "João Silva",
  "email": "joao@empresaxyz.com",
  "role": "admin",
  "company_id": 1,
  "is_active": true
}
```

### 4. Usuário faz login
O novo usuário acessa o portal usando suas credenciais:
- Email: `joao@empresaxyz.com`
- Senha: `SenhaSegura123!`

**Endpoint:** `POST /api/auth/login`

Após login bem-sucedido, recebe um token JWT válido por 7 dias.

### 5. Admin cria mais usuários na empresa (opcional)
**Endpoint:** `POST /api/admin/users`

Repita o passo 3 com diferentes emails, nomes e roles.

## Endpoints Administrativos

### Listar todas as empresas
**Endpoint:** `GET /api/admin/companies`

**Autenticação:** JWT token do admin (role=admin)

**Resposta:**
```json
[
  {
    "id": 1,
    "name": "Empresa XYZ",
    "subdomain": "empresa-xyz",
    "email": "contato@empresaxyz.com",
    "status": "active",
    "plan": "professional",
    "cnpj": "12.345.678/0001-99"
  }
]
```

### Listar usuários por empresa
**Endpoint:** `GET /api/admin/companies/:companyId/users`

**Autenticação:** JWT token do admin

**Resposta:**
```json
[
  {
    "id": 2,
    "company_id": 1,
    "name": "João Silva",
    "email": "joao@empresaxyz.com",
    "role": "admin",
    "is_active": true,
    "last_login_at": "2026-04-13T10:30:00Z"
  }
]
```

### Resetar senha de usuário
**Endpoint:** `PATCH /api/admin/users/:userId/reset-password`

**Autenticação:** JWT token do admin

**Payload:**
```json
{
  "newPassword": "NovaSenhaSegura456!"
}
```

**Resposta:**
```json
{
  "message": "Senha resetada com sucesso"
}
```

## Mudanças Implementadas

### Backend
- ✅ Adicionado campo `cnpj` ao modelo `Company`
- ✅ Desabilitado endpoint `/api/auth/register` (registro público)
- ✅ Criado controlador `AdminController` com funções:
  - `createCompany()` - criar nova empresa
  - `listCompanies()` - listar empresas
  - `createUser()` - criar usuário em empresa
  - `listUsersByCompany()` - listar usuários
  - `resetUserPassword()` - resetar senha
- ✅ Adicionadas rotas protegidas sob `/api/admin/*`
- ✅ Schema SQL atualizado com coluna `cnpj`

### Frontend
- ✅ Removida rota `/register` do router
- ✅ Removida página `Register.vue`
- ✅ Removido link "Criar conta" da página de Login
- ✅ Removido método `register()` do auth store
- ✅ Removido método `register()` do auth service
- ✅ Removido método `register()` da API repository

## Variáveis de Ambiente Necessárias

```env
# Admin master para bootstrap
ADMIN_NAME=Administrador
ADMIN_EMAIL=admin@principal.local
ADMIN_PASSWORD=SenhaSeguraDoAdmin123!
ADMIN_RESET_PASSWORD=false
```

## Notas Importantes

1. **Segurança**: O `ADMIN_PASSWORD` é crítico e deve ser armazenado seguramente
2. **Subdomain**: O subdomain é único por empresa e não pode ser alterado após criação
3. **CNPJ**: O CNPJ deve estar no formato `XX.XXX.XXX/XXXX-XX`
4. **Roles**: Usuários podem ter os roles: `admin`, `manager`, `agent`, `viewer`
5. **Autenticação**: Todos os endpoints de admin requerem token JWT com `role=admin`

## Próximos Passos Recomendados

1. Criar interface no admin para gerenciar empresas e usuários
2. Implementar testes para novos endpoints
3. Adicionar logs de auditoria para criação de empresas/usuários
4. Implementar soft delete para empresas
5. Adicionar validação de CNPJ mais robusta (digitos verificadores)
