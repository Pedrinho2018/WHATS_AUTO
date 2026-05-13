# Guia de localizacao do projeto

Este documento e o ponto de entrada para se orientar no WHATS_AUTO.

## Resumo

O projeto e uma plataforma multi-tenant de atendimento WhatsApp.

- Frontend: Vue 3, Vite, Pinia, Vue Router, Vuetify e Socket.IO client.
- Backend: Node.js, Express, TypeScript, Sequelize, JWT e Socket.IO.
- Banco principal: MariaDB.
- WhatsApp: Evolution API, acessada pelo backend via `revolution.service.ts`.
- Deploy simples: `docker-compose.simple.yml`.

## Onde olhar primeiro

| Necessidade | Arquivo ou pasta |
|---|---|
| Rotas HTTP da API | `backend/src/routes/index.ts` |
| Entrada principal Express | `backend/src/app.ts` |
| Inicializacao do servidor e Socket.IO | `backend/src/server.ts` |
| Models e associacoes | `backend/src/models/index.ts` |
| Controllers HTTP | `backend/src/controllers/` |
| Regras de negocio antigas/gerais | `backend/src/services/` |
| Fluxo de mensagens inbound/outbound | `backend/src/application/chatbot/` |
| Persistencia do chatbot | `backend/src/infrastructure/persistence/sequelize/` |
| Eventos realtime | `backend/src/realtime/` |
| Rotas do frontend | `frontend/src/router/index.ts` |
| Layout principal | `frontend/src/App.vue` |
| Tela administrativa de conversas | `frontend/src/views/Tickets.vue` |
| Fila do operador | `frontend/src/views/OperatorQueue.vue` |
| Cliente HTTP | `frontend/src/services/api.ts` |
| Cliente Socket.IO | `frontend/src/services/socket.ts` |
| Store de autenticacao | `frontend/src/stores/auth.ts` |
| Deploy simples | `DEPLOY_SIMPLES.md` |
| GitHub Actions | `.github/WORKFLOWS.md` |

## Mapas e UML

- [Arquitetura](./ARQUITETURA.md)
- [UML e diagramas](./UML.md)
- [Diagramas vetoriais SVG](./vetores/README.md)

## Modulos principais

### Backend

`backend/src/app.ts` configura middlewares, CORS, JSON parser, Swagger e monta as rotas.

`backend/src/server.ts` cria o servidor HTTP, inicializa Socket.IO e roda o bootstrap.

`backend/src/routes/index.ts` centraliza as rotas. As rotas publicas ficam antes de `authMiddleware`; as rotas protegidas ficam depois.

`backend/src/application/chatbot/` concentra o fluxo mais importante do dominio de atendimento:

- parse do webhook de entrada
- criacao ou reaproveitamento de ticket
- persistencia de mensagem
- despacho para Typebot ou n8n
- envio de mensagem do operador para o WhatsApp

`backend/src/realtime/` cuida de autenticacao Socket.IO, salas por empresa/ticket e emissao de eventos.

### Frontend

`frontend/src/router/index.ts` define as telas e regras de acesso por papel.

`frontend/src/stores/auth.ts` controla login, usuario atual, empresa atual e conexao Socket.IO.

`frontend/src/services/api.ts` injeta o token JWT nas chamadas HTTP.

`frontend/src/services/socket.ts` conecta no Socket.IO e expoe assinaturas para eventos realtime.

`frontend/src/views/Tickets.vue` e a tela administrativa de conversas.

`frontend/src/views/OperatorQueue.vue` e a tela operacional dos agentes.

## Fluxos de trabalho frequentes

### Receber mensagem do usuario

1. Evolution envia webhook para `POST /api/webhooks/evolution`.
2. `WebhookController` chama `InboundMessageParser`.
3. `ChatbotOrchestratorService` localiza a instancia.
4. O backend cria ou reutiliza um ticket aberto.
5. A mensagem inbound e salva na tabela `messages`.
6. Eventos `server:ticket.*` e `server:message.created` sao emitidos.
7. Frontend atualiza a lista e a conversa aberta.

### Operador responder conversa

1. Frontend chama `POST /api/messages/tickets/:ticketId/text` com `{ text }`.
2. `MessagesController` chama `ConversationMessageApplication`.
3. A aplicacao envia texto pela Evolution API.
4. A resposta outbound e salva em `messages`.
5. Backend emite `server:message.created`.
6. Frontend adiciona a mensagem na conversa.

### Adicionar rota nova

1. Crie ou ajuste um controller em `backend/src/controllers/`.
2. Se houver regra de negocio, coloque em `backend/src/services/` ou em `backend/src/application/` se for dominio novo.
3. Registre a rota em `backend/src/routes/index.ts`.
4. Adicione teste em `backend/src/__tests__/`.
5. Consuma no frontend via `frontend/src/services/api.ts`.

### Adicionar tela nova

1. Crie a view em `frontend/src/views/`.
2. Registre em `frontend/src/router/index.ts`.
3. Ajuste menu em `frontend/src/App.vue`.
4. Use `api.ts` para HTTP e `socket.ts` para realtime.

## Glossario rapido

- Company: empresa/tenant.
- Instance: instancia WhatsApp/Evolution vinculada a uma empresa.
- Ticket: conversa/atendimento de um contato.
- Message: mensagem inbound ou outbound de um ticket.
- Flow: automacao configurada para despacho.
- FlowWorkspace: estado visual/editorial do fluxo.
- MessageTemplate: mensagens prontas para operadores.
- BotConfig: configuracoes de comportamento do bot.
