# Testes Automatizados - Backend

## Visão Geral

Este documento descreve os testes automatizados criados para o backend da aplicação WhatsApp Chatbot Multi-tenant. Os testes utilizam **Jest** como framework de testes e **Supertest** para testes de integração HTTP.

## Estrutura de Testes

```
backend/src/__tests__/
├── integration/
│   ├── app.routes.test.ts
│   └── api.routes.test.ts          (NOVO)
└── unit/
    ├── controllers/
    │   ├── auth.controller.test.ts
    │   ├── bot-config.controller.test.ts    (NOVO)
    │   ├── webhook.controller.test.ts
    │   └── messages.controller.test.ts      (NOVO)
    ├── middlewares/
    │   └── auth.middleware.test.ts
    ├── services/
    │   ├── auth.service.test.ts             (NOVO)
    │   ├── management.service.test.ts       (NOVO)
    │   ├── revolution.service.test.ts
    │   └── management.service.typebot.test.ts
    └── utils/
        └── validation.test.ts               (NOVO)
```

## Testes Criados

### 1. Bot Config Controller Tests (`bot-config.controller.test.ts`)

**Cobertura:**
- ✅ Criar configuração de bot
- ✅ Atualizar configuração existente
- ✅ Obter configuração por ID
- ✅ Listar configurações da empresa
- ✅ Deletar configuração
- ✅ Validações de payload

**Casos Testados:**
```typescript
- Criação bem-sucedida
- Retorno 400 para nome vazio
- Atualização de bot
- Busca por ID
- Retorno 404 quando bot não existe
- Listagem paginada
- Exclusão bem-sucedida
```

### 2. Messages Controller Tests (`messages.controller.test.ts`)

**Cobertura:**
- ✅ Enviar mensagem
- ✅ Obter histórico de mensagens
- ✅ Marcar mensagem como lida
- ✅ Deletar mensagem
- ✅ Validação de entrada

**Casos Testados:**
```typescript
- Envio bem-sucedido
- Validação de contactId
- Validação de texto
- Histórico com paginação
- Marcar como lido
- Exclusão com tratamento de erro 404
```

### 3. Auth Service Tests (`auth.service.test.ts`)

**Cobertura:**
- ✅ Login com credenciais válidas
- ✅ Tratamento de usuário inexistente
- ✅ Validação de senha
- ✅ Registro de novo usuário
- ✅ Validação de email duplicado
- ✅ Validação de subdomínio único
- ✅ Validação de token JWT

**Casos Testados:**
```typescript
- Login bem-sucedido retorna token e dados
- Erro 401 para usário inexistente
- Erro 401 para senha incorreta
- Registro bem-sucedido cria usuário e empresa
- Negar registro com email duplicado
- Negar registro com subdomínio duplicado
- Validar token JWT válido
- Rejeitar token inválido
```

### 4. Management Service Tests (`management.service.test.ts`)

**Cobertura:**
- ✅ CRUD de contatos
- ✅ Busca e filtros
- ✅ Paginação
- ✅ Estatísticas da empresa
- ✅ Atualização de dados da empresa

**Casos Testados:**
```typescript
- Criar contato com validação
- Listar contatos com paginação
- Atualizar contato existente
- Deletar contato
- Buscar por nome/email
- Estatísticas da empresa
- Atualização de dados da empresa
```

### 5. Integration Tests - API Routes (`api.routes.test.ts`)

**Cobertura:**
- ✅ Autenticação (Login/Register)
- ✅ Rotas de Bot Config
- ✅ Rotas de Mensagens
- ✅ Tratamento de erros HTTP

**Casos Testados:**
```typescript
// Auth
- POST /auth/login com sucesso
- POST /auth/login com email inválido
- POST /auth/login com senha curta
- POST /auth/login com credenciais erradas
- POST /auth/register bem-sucedido
- POST /auth/register com email duplicado
- POST /auth/logout

// Bot Configs
- POST /bot-configs sem autenticação (401)
- GET /bot-configs com autenticação
- GET /bot-configs/:id

// Messages
- POST /messages/send sem token (401)
- GET /messages/history/:contactId
- Paginação

// Errors
- 404 para rotas inexistentes
- 400 para payload inválido
- Content-Type application/json
```

### 6. Validation Tests (`validation.test.ts`)

**Cobertura:**
- ✅ Validação de email
- ✅ Validação de telefone
- ✅ Validação de subdomínio
- ✅ Validação de senha
- ✅ Validação de UUID
- ✅ Sanitização de strings
- ✅ Formatação de datas
- ✅ Paginação
- ✅ Tratamento de erros
- ✅ Promises e timeouts

**Padrões Testados:**
```typescript
- Email: usuario@empresa.com
- Phone: 5566989898989
- Subdomain: empresa-teste (2-60 chars, alfa-numérico + hífen)
- Password: mínimo 8 caracteres
- UUID: formato padrão v4
```

## Executando os Testes

### Testes Unitários
```bash
cd backend
npm test
```

### Testes com Watch (desenvolvimento)
```bash
cd backend
npm run test:watch
```

### Testes com Coverage
```bash
cd backend
npm run test:coverage
```

### Testes de Integração
```bash
cd backend
npm test -- integration
```

### Teste Específico
```bash
npm test -- auth.controller.test.ts
```

## Mocks Utilizados

### Services
```typescript
jest.mock('../../../services', () => ({
  __esModule: true,
  default: {
    login: jest.fn(),
    register: jest.fn(),
    // ...
  },
}));
```

### Models
```typescript
jest.mock('../../../models', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  // ...
}));
```

### Dependências Externas
```typescript
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('jwt-token'),
  verify: jest.fn(),
}));
```

## Padrões de Teste

### Unit Tests - Controllers
```typescript
describe('ControllerName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve fazer algo com sucesso', async () => {
    // Arrange
    const mockData = { /* ... */ };
    
    // Act
    const result = await controller.method(request, response);
    
    // Assert
    expect(result).toBeDefined();
  });
});
```

### Integration Tests
```typescript
describe('Integration Tests - Route', () => {
  it('deve retornar 200 com dados válidos', async () => {
    const response = await request(app)
      .post('/endpoint')
      .set('Authorization', 'Bearer token')
      .send({ /* data */ });

    expect(response.status).toBe(200);
  });
});
```

## Cobertura de Testes

### Controllers
- `auth.controller.test.ts` ✅
- `bot-config.controller.test.ts` ✅
- `messages.controller.test.ts` ✅
- `webhook.controller.test.ts` ✅

### Services
- `auth.service.test.ts` ✅
- `management.service.test.ts` ✅
- `revolution.service.test.ts` ✅
- `management.service.typebot.test.ts` ✅

### Middlewares
- `auth.middleware.test.ts` ✅

### Utilidades
- `validation.test.ts` ✅

### Integration
- `app.routes.test.ts` ✅
- `api.routes.test.ts` ✅

## Próximos Passos

### Testes Adicionais Sugeridos

1. **Bot Config Service** - Lógica de negócio
   - Criar teste para validações de configuração
   - Testes de integração com banco de dados

2. **Revolution Service** - Integração com Evolution API
   - Testes de chamadas HTTP
   - Mock de webhook

3. **Retail Service** - Funcionalidades de varejo
   - Testes de transações
   - Validação de produtos

4. **N8N Service** - Integração com n8n
   - Testes de trigger
   - Validação de workflows

5. **Typebot Service** - Integração com Typebot
   - Testes de scripts
   - Validação de fluxos

6. **Database Tests** - Migrations e seeds
   - Testes de migrations
   - Dados de teste (fixtures)

7. **Socket.IO Tests** - Real-time
   - Testes de conexão
   - Testes de eventos
   - Broadcast tests

## Configuração de CI/CD

### GitHub Actions Sugerido
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: cd backend && npm ci
      
      - name: Run tests
        run: cd backend && npm test
      
      - name: Generate coverage
        run: cd backend && npm run test:coverage
```

## Boas Práticas Implementadas

✅ **Isolamento** - Cada teste é independente  
✅ **Mocking** - Dependências externas mockadas  
✅ **Nomes Descritivos** - Fácil entender o que testa  
✅ **Arrange-Act-Assert** - Padrão AAA em testes  
✅ **Cobertura** - Controllers, services, middlewares  
✅ **Testes de Integração** - Fluxos completos  
✅ **Validações** - Entrada e saída  
✅ **Error Handling** - Testes de erro também cobertos  

## Troubleshooting

### Problema: "Cannot find module"
**Solução:** Verificar paths em `jest.config.js` e `tsconfig.test.json`

### Problema: "Jest timeout"
**Solução:** Aumentar timeout no teste:
```typescript
jest.setTimeout(10000);
```

### Problema: Mocks não funcionam
**Solução:** Fazer mock ANTES de importar o módulo:
```typescript
jest.mock('../service');
import service from '../service';
```

## Referências

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)
- [Node.js Testing Guide](https://nodejs.org/api/test.html)

---

**Data:** 25 de abril de 2026  
**Branch:** `feature/automated-tests`  
**Status:** ✅ Testes Implementados
