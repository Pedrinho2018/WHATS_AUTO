# Guia da Aplicação e do Código

## ATENÇÃO: REPOSITÓRIO PRIVADO

Este documento é de uso interno. Não compartilhe conteúdo técnico, credenciais, endpoints internos ou dados operacionais fora dos canais autorizados.

## Headlines Importantes

- Todo acesso e desenvolvimento deve seguir o modelo multi-tenant com isolamento por empresa.
- Antes de deploy, valide variáveis críticas de ambiente, autenticação JWT e integrações externas.
- Mudanças em regras de negócio devem priorizar services e manter controllers enxutos.

Este documento descreve como a aplicação está organizada, o papel de cada módulo e o fluxo principal entre frontend, backend e banco de dados.

## 1. Arquitetura Geral

O projeto segue uma divisão simples de monorepo:

- Backend em `backend/` para API, domínio, autenticação, persistência e documentação da API.
- Frontend em `frontend/` para a experiência operacional do usuário.
- Infraestrutura e apoio em `infrastructure/`, `bot_data/` e `prompts/`.

Fluxo principal:

1. O usuário acessa o frontend Vue.
2. O frontend autentica via `/api/auth/login` ou `/api/auth/register`.
3. O token JWT é salvo no navegador e reenviado nas próximas requisições.
4. O backend valida o token, carrega usuário e empresa e aplica regras de acesso por papel.
5. As telas consomem os endpoints de dashboard, tickets, fluxos, usuários e instâncias.

## 2. Backend

### 2.1 Entrada da aplicação

- `backend/src/index.ts`: ponto de inicialização.
- `backend/src/server.ts`: servidor HTTP e bootstrap.
- `backend/src/app.ts`: configura middleware global, Swagger e rotas.

### 2.2 Middlewares

- `backend/src/middlewares/index.ts`
  - `authMiddleware`: valida JWT, carrega usuário e empresa.
  - `roleMiddleware`: restringe endpoints por perfil.
  - `errorHandler`: resposta padrão para erros não tratados.

### 2.3 Rotas

- `backend/src/routes/index.ts` concentra as rotas da API.
- Rotas públicas:
  - `GET /api/health`
  - `POST /api/auth/login`
  - `POST /api/auth/register`
- Rotas protegidas principais:
  - `GET /api/auth/me`
  - `GET /api/dashboard/summary`
  - `GET|POST|PATCH /api/tickets`
  - `GET|POST|PATCH /api/flows`
  - `GET|POST|PATCH /api/users`
  - `GET|POST|PATCH /api/instances`
  - Rotas de Revolution API mock em `/api/revolution/*`

### 2.4 Controllers

- `backend/src/controllers/index.ts`: autenticação.
- `backend/src/controllers/management.controller.ts`: dashboard, usuários, instâncias, tickets e fluxos.
- `backend/src/controllers/revolution.controller.ts`: fachada HTTP para integração com Revolution API (real e mock).

### 2.5 Serviços

- `backend/src/services/index.ts`: login, registro e emissão de JWT.
- `backend/src/services/revolution.service.ts`: integração com Revolution API via HTTP quando `REVOLUTION_API_MODE=real`, com fallback para mock em memória.
- O modo padrão continua `mock` para ambiente local/testes, e pode ser trocado para `real` sem alterar rotas.

### 2.8 Revolution API (real)

As rotas abaixo já estão ativas no backend e funcionam em `mock` ou `real`:

- `GET /api/revolution/instances`
- `POST /api/revolution/instances`
- `POST /api/revolution/instances/:instanceName/connect`
- `POST /api/revolution/instances/:instanceName/disconnect`
- `GET /api/revolution/instances/:instanceName/status`
- `GET /api/revolution/instances/:instanceName/qrcode`
- `POST /api/revolution/messages/text`

Variáveis de ambiente relevantes:

- `REVOLUTION_API_MODE=mock|real`
- `REVOLUTION_API_URL` (opcional; se vazio usa `EVOLUTION_SERVER_URL`)
- `REVOLUTION_API_KEY` (opcional; se vazio usa `EVOLUTION_API_KEY`)
- `REVOLUTION_ENDPOINT_*` para customizar paths da API externa sem mudar código.

### 2.6 Modelos de Domínio

Os modelos usam Sequelize com `underscored`, `timestamps` e `paranoid`.

#### Company

- Representa a empresa multi-tenant.
- Campos principais: `name`, `subdomain`, `email`, `phone`, `status`, `plan`, `trial_ends_at`, `settings`.

#### User

- Representa usuários internos da operação.
- Papéis suportados: `admin`, `manager`, `agent`, `viewer`.
- A senha é hashada com bcrypt nos hooks de criação e atualização.

#### Instance

- Representa uma instância/número WhatsApp vinculado à empresa.
- Campos principais: `name`, `evolution_instance`, `phone`, `status`, `webhook_url`, `last_connected_at`.

#### Ticket

- Representa a conversa/atendimento.
- Campos principais: `contact_phone`, `contact_name`, `status`, `priority`, `channel`, `tags`, `last_message_at`.

#### Message

- Representa mensagens trocadas em um ticket.
- Suporta diferentes tipos de conteúdo, status de entrega e metadados.

#### Flow

- Representa um fluxo de automação da empresa.
- Guarda trigger, configuração, ID do workflow n8n e settings adicionais.

### 2.7 Associações

- Empresa possui usuários, instâncias, tickets, mensagens e fluxos.
- Instância possui tickets e mensagens.
- Ticket pertence a uma instância e a um agente responsável.
- Flow pertence a uma empresa.

## 3. Frontend

### 3.1 Estrutura

- `frontend/src/main.ts`: bootstrap da aplicação Vue.
- `frontend/src/App.vue`: layout global, carregamento do usuário e alternância de tema.
- `frontend/src/router/index.ts`: rotas e guardas de navegação.
- `frontend/src/stores/auth.ts`: store de autenticação com Pinia.
- `frontend/src/services/api.ts`: cliente Axios com token automático e debug opcional.

### 3.2 Telas Principais

- `frontend/src/views/Login.vue`: autenticação.
- `frontend/src/views/Register.vue`: criação de conta e empresa.
- `frontend/src/views/Dashboard.vue`: indicadores operacionais.
- `frontend/src/views/Tickets.vue`: lista e atualização de tickets.
- `frontend/src/views/Instances.vue`: gestão de instâncias WhatsApp.
- `frontend/src/views/Flows.vue`: gestão de fluxos e workspace visual.
- `frontend/src/views/AdminUsers.vue`: administração de usuários.
- `frontend/src/views/Settings.vue`: visão de conta e preferências.

### 3.3 Controle de Acesso no Frontend

- Rotas privadas exigem autenticação.
- A rota de usuários administrativos exige `admin` ou `manager`.
- Se já houver sessão válida, o usuário é redirecionado para a aplicação principal.

### 3.4 Comunicação com a API

- O Axios injeta `Authorization: Bearer <token>` automaticamente quando há token salvo.
- Em caso de `401`, o token é removido e o usuário é levado para `/login`.
- Há suporte a log de API via `VITE_DEBUG_API=true`.

## 4. Workflow Visual

O builder visual fica em `frontend/src/components/workflow/`.

### Componentes

- `WorkflowBuilder.vue`: coordena palette, canvas e painel de propriedades.
- `WorkflowBlockPalette.vue`: lista os blocos disponíveis.
- `WorkflowCanvas.vue`: desenha nós, conexões e interação por arrastar e soltar.
- `types.ts`: tipos, blocos padrão e utilitários para criar nós e IDs.

### Como o modelo funciona

- O workflow é um objeto com `nodes` e `connections`.
- Cada nó tem `id`, `type`, `label`, `x` e `y`.
- As conexões ligam `fromNodeId` a `toNodeId`.
- O modelo visual agora é persistido em tabela dedicada `flow_workspaces`, vinculada ao fluxo via `flow_id`.

### Endpoints de Workspace

- `GET /api/flows/:id/workspace`: retorna o modelo visual do fluxo.
- `PUT /api/flows/:id/workspace`: salva ou atualiza o modelo visual do fluxo.

### Limitações atuais

- O builder ainda não possui versionamento de alterações por histórico.
- Ainda não há validação semântica de grafos (ex.: ciclos inválidos ou nós órfãos).

## 5. API e Documentação Automática

- Swagger UI: `/api/docs`
- OpenAPI JSON: `/api/docs.json`
- A especificação OpenAPI está em `backend/src/docs/openapi.ts`.

## 6. Regras de Negócio Já Implementadas

- Cadastro cria empresa e usuário admin dentro da mesma transação.
- O login atualiza `last_login_at`.
- Usuários e tickets são filtrados por `company_id`.
- Agentes veem apenas tickets atribuídos a eles ou sem responsável.
- Fluxos podem ser criados e atualizados por `admin` ou `manager`.
- Instâncias podem ser conectadas no backend e na tela de gestão.

## 7. Pontos de Atenção

- Em `REVOLUTION_API_MODE=real`, o backend depende da disponibilidade da API externa e das credenciais corretas.
- O código do frontend usa visual/UX mais completa do que o backend atual oferece em persistência para o builder.
- A suíte do frontend cobre utilitários e regras do builder; ainda falta ampliar testes de componentes e telas.

## 8. Leitura Rápida por Arquivo

- `backend/src/app.ts`: pipeline HTTP principal.
- `backend/src/routes/index.ts`: mapa de endpoints.
- `backend/src/services/index.ts`: autenticação e token.
- `backend/src/models/*.ts`: schema do domínio.
- `frontend/src/router/index.ts`: navegação e restrições.
- `frontend/src/stores/auth.ts`: sessão e login.
- `frontend/src/components/workflow/*`: editor visual de fluxo.