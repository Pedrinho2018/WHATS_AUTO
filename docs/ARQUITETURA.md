# Arquitetura

## Visao geral

```mermaid
flowchart LR
  user[Usuario no navegador] --> frontend[Frontend Vue/Nginx]
  frontend -->|HTTP /api| backend[Backend Express]
  frontend <-->|Socket.IO /socket.io| realtime[Socket.IO Backend]
  realtime --- backend
  backend --> mariadb[(MariaDB)]
  backend --> evolution[Evolution API]
  evolution --> postgres[(PostgreSQL Evolution)]
  evolution -->|webhook inbound| backend
  backend --> n8n[n8n opcional]
  backend --> typebot[Typebot opcional]
```

## Camadas do backend

```mermaid
flowchart TB
  routes[Routes] --> controllers[Controllers]
  controllers --> services[Services]
  controllers --> application[Application chatbot]
  application --> ports[Ports e contratos]
  ports --> sequelizeRepos[Sequelize repositories]
  services --> models[Sequelize models]
  sequelizeRepos --> models
  models --> db[(MariaDB)]
  application --> realtime[Realtime events]
  services --> external[Evolution / n8n / Typebot]
```

### Rotas

Arquivo: `backend/src/routes/index.ts`

Responsabilidades:

- separar rotas publicas e protegidas
- aplicar `authMiddleware`, `roleMiddleware` e `webhookAuthMiddleware`
- encaminhar chamadas para controllers

### Controllers

Pasta: `backend/src/controllers/`

Responsabilidades:

- ler `req.params`, `req.query`, `req.body` e usuario autenticado
- validar dados basicos
- chamar service/application
- transformar erro em resposta HTTP

### Services

Pasta: `backend/src/services/`

Responsabilidades:

- regras de negocio gerais
- integracoes externas
- bootstrap da aplicacao
- compatibilidade com Evolution API

### Application chatbot

Pasta: `backend/src/application/chatbot/`

Essa camada organiza o dominio de mensagens e conversa.

Principais arquivos:

- `chatbot-orchestrator.service.ts`: processa inbound vindo do webhook.
- `conversation-message.application.ts`: lista mensagens e envia mensagem outbound.
- `inbound-message.parser.ts`: normaliza payload da Evolution.
- `contracts.ts`: tipos do fluxo de despacho.
- `persistence/repositories.ts`: portas de persistencia.
- `providers/message-provider.port.ts`: porta de envio de mensagem.
- `strategies/typebot-dispatcher.strategy.ts`: despacho Typebot.
- `strategies/n8n-dispatcher.strategy.ts`: fallback n8n.

### Infrastructure

Pasta: `backend/src/infrastructure/`

Contem implementacoes concretas das portas, hoje usando Sequelize.

## Frontend

```mermaid
flowchart TB
  main[main.ts] --> app[App.vue]
  main --> router[Vue Router]
  main --> pinia[Pinia]
  app --> views[Views]
  views --> api[services/api.ts]
  views --> socket[services/socket.ts]
  router --> authStore[stores/auth.ts]
  authStore --> authService[application/auth/AuthService.ts]
  authService --> authRepo[infrastructure/auth/AuthApiRepository.ts]
  authRepo --> api
  api --> backend[Backend API]
  socket --> realtime[Socket.IO]
```

### Views principais

| Rota | View | Perfis |
|---|---|---|
| `/login` | `Login.vue` | publico |
| `/` | `Dashboard.vue` | admin, manager |
| `/tickets` | `Tickets.vue` | admin, manager |
| `/operator/queue` | `OperatorQueue.vue` | agent, viewer |
| `/instances` | `Instances.vue` | admin, manager |
| `/settings` | `Settings.vue` | admin, manager |
| `/builder` | `TypebotBuilder.vue` | admin, manager |
| `/admin/users` | `AdminUsers.vue` | admin, manager |

## Banco de dados

Models principais:

- `Company`
- `User`
- `Instance`
- `Ticket`
- `Message`
- `Flow`
- `FlowWorkspace`
- `MessageTemplate`
- `BotConfig`

As associacoes estao centralizadas em `backend/src/models/index.ts`.

## Realtime

Eventos emitidos pelo backend:

- `server:ticket.created`
- `server:ticket.updated`
- `server:message.created`
- `server:welcome`
- `server:pong`

Salas:

- `company:{companyId}`
- `user:{userId}`
- `ticket:{ticketId}`

O frontend conecta automaticamente apos login ou carregamento do usuario autenticado.

## Deploy

O caminho recomendado para deploy simples esta em:

- `docker-compose.simple.yml`
- `.env.simple.example`
- `DEPLOY_SIMPLES.md`
- `.github/workflows/cd.yml`

O compose simples usa:

- frontend
- backend
- mariadb
- evolution
- postgres

Ele evita Traefik, GHCR, Slack, Redis, Typebot e n8n para reduzir pontos de falha.
