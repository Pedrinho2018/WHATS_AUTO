# Documentacao tecnica do WHATS_AUTO

Este e o ponto de entrada para entender, manter e evoluir o projeto.

O objetivo desta documentacao e responder rapidamente:

- o que o sistema faz;
- como o codigo esta dividido;
- onde cada responsabilidade deve ficar;
- quais fluxos sao criticos;
- como visualizar a arquitetura em UML/vetores;
- como fazer deploy e troubleshooting sem depender de conhecimento informal.

## Visao executiva

O WHATS_AUTO e uma plataforma multi-tenant de atendimento via WhatsApp. O sistema centraliza conversas, instancias WhatsApp, operadores, automacoes e mensagens em tempo real.

Principais blocos:

- **Frontend**: SPA Vue 3 para painel administrativo e fila do operador.
- **Backend**: API Express/TypeScript com autenticacao, tickets, mensagens, instancias e automacoes.
- **Realtime**: Socket.IO para atualizar conversas e mensagens sem recarregar a tela.
- **Persistencia**: MariaDB via Sequelize.
- **WhatsApp**: Evolution API como provedor de conexao e envio/recebimento.
- **Automacoes**: Typebot e n8n como integracoes opcionais.
- **Deploy**: Docker Compose simples e GitHub Actions manual via SSH.

## Indice recomendado

| Documento | Para que serve |
|---|---|
| [Modularizacao](./MODULARIZACAO.md) | Explica como o projeto esta dividido, por que foi dividido assim e onde colocar codigo novo |
| [Arquitetura](./ARQUITETURA.md) | Descreve camadas, dependencias, frontend, backend, banco, realtime e deploy |
| [Decisoes arquiteturais](./DECISOES_ARQUITETURA.md) | Registra as principais decisoes tecnicas, motivos e impactos |
| [UML e diagramas](./UML.md) | Diagramas Mermaid do sistema, fluxos e entidades |
| [Diagramas vetoriais SVG](./vetores/README.md) | Versoes vetoriais para Figma, Illustrator, Inkscape e diagrams.net |
| [Deploy simples](../DEPLOY_SIMPLES.md) | Como subir a stack reduzida com Docker Compose |
| [Operacao e confiabilidade](./OPERACAO.md) | Logs, diagnostico, retry, backup, health checks, monitoramento e staging |
| [Seguranca e LGPD](./SEGURANCA_LGPD.md) | Controles de privacidade, retencao, exportacao/remocao por contato, perfis e incidentes |
| [Politica de privacidade - modelo](./POLITICA_PRIVACIDADE_MODELO.md) | Texto base para revisao juridica e publicacao |
| [Termos de uso - modelo](./TERMOS_USO_MODELO.md) | Texto base para regras de uso comercial |
| [DPA controlador/operador - modelo](./DPA_OPERADOR_CONTROLADOR_MODELO.md) | Clausulas base para contrato com clientes |
| [Procedimento de incidente](./PROCEDIMENTO_INCIDENTE_SEGURANCA.md) | Passo a passo para conter, avaliar e comunicar incidentes |
| [GitHub Actions](../.github/WORKFLOWS.md) | Como funcionam CI e deploy manual |
| [Migracoes de banco](./migracao-banco-dados.md) | Como criar, executar e reverter migracoes |

## Guia rapido: onde procurar

| Necessidade | Local |
|---|---|
| Rotas HTTP | `backend/src/routes/index.ts` |
| Configuracao do Express | `backend/src/app.ts` |
| Inicializacao HTTP + Socket.IO | `backend/src/server.ts` |
| Models e relacionamentos | `backend/src/models/` e `backend/src/models/index.ts` |
| Controllers | `backend/src/controllers/` |
| Services gerais | `backend/src/services/` |
| Dominio de mensagens/conversas | `backend/src/application/chatbot/` |
| Repositorios Sequelize do chatbot | `backend/src/infrastructure/persistence/sequelize/` |
| Eventos realtime | `backend/src/realtime/` |
| Rotas do frontend | `frontend/src/router/index.ts` |
| Shell/layout do app | `frontend/src/App.vue` |
| Tela admin de conversas | `frontend/src/views/Tickets.vue` |
| Fila de atendimento | `frontend/src/views/OperatorQueue.vue` |
| Cliente HTTP frontend | `frontend/src/services/api.ts` |
| Cliente Socket.IO frontend | `frontend/src/services/socket.ts` |
| Autenticacao frontend | `frontend/src/stores/auth.ts` |
| Compose simples | `docker-compose.simple.yml` |
| Pipeline CI | `.github/workflows/ci.yml` |
| Pipeline de deploy | `.github/workflows/cd.yml` |

## Organizacao macro do repositorio

```text
.
├── backend/                 API Express, dominio, persistencia e testes
├── frontend/                SPA Vue 3
├── docs/                    Documentacao tecnica, arquitetura e operacao
├── infrastructure/          SQL e scripts auxiliares de banco
├── design-tokens/           Tokens e referencias visuais
├── .github/                 Workflows, scripts e docs de CI/CD
├── docker-compose.yml       Stack completa/legada com Traefik e servicos extras
├── docker-compose.simple.yml Stack simplificada recomendada
└── DEPLOY_SIMPLES.md        Guia direto de deploy
```

## Fluxos criticos

### Recebimento de mensagem

1. Evolution API recebe mensagem do WhatsApp.
2. Evolution chama `POST /api/webhooks/evolution`.
3. `WebhookController` valida e delega o payload.
4. `InboundMessageParser` normaliza os campos recebidos.
5. `ChatbotOrchestratorService` localiza a instancia e o ticket.
6. A mensagem inbound e salva em `messages`.
7. Eventos realtime sao emitidos para a empresa/ticket.
8. Frontend atualiza fila e conversa.

### Resposta do operador

1. Operador envia texto pelo frontend.
2. Frontend chama `POST /api/messages/tickets/:ticketId/text`.
3. `MessagesController` delega para `ConversationMessageApplication`.
4. Backend envia a mensagem pela Evolution API.
5. Mensagem outbound e persistida.
6. Socket.IO notifica as telas conectadas.

### Deploy

1. CI valida build backend/frontend e compose simples.
2. Deploy e acionado manualmente no GitHub Actions.
3. Workflow acessa o servidor via SSH.
4. Servidor executa `git pull` e `docker compose ... up -d --build`.
5. Smoke test valida `/health` e `/api/health`.

## Principios de manutencao

- **Controller nao deve carregar regra de negocio pesada.** Controller deve validar entrada, chamar aplicacao/service e retornar HTTP.
- **Dominio novo deve ir para `application/`.** A pasta `services/` ainda existe para regras gerais e legado, mas fluxos novos mais importantes devem nascer com contratos claros.
- **Integracao externa deve ser isolada.** Evolution, n8n, Typebot e qualquer outro provedor devem ficar atras de services, providers ou strategies.
- **Persistencia deve ficar substituivel.** O chatbot ja usa portas e implementacoes Sequelize; esse padrao deve ser reaproveitado quando o dominio justificar.
- **Frontend deve falar com backend por services.** Views nao devem espalhar detalhes de URL ou socket sem necessidade.
- **Realtime deve ser evento de dominio.** Tela nao deve depender de detalhes internos do banco; deve reagir a `server:ticket.*` e `server:message.created`.

## Glossario

| Termo | Significado |
|---|---|
| Company | Empresa/tenant dona dos dados |
| User | Usuario do sistema, como admin, manager, agent ou viewer |
| Instance | Instancia WhatsApp/Evolution vinculada a uma empresa |
| Ticket | Conversa ou atendimento com um contato |
| Message | Mensagem inbound ou outbound associada a um ticket |
| Flow | Automacao ativa ou configurada |
| FlowWorkspace | Estado visual/editorial do fluxo |
| MessageTemplate | Modelo de mensagem usado no atendimento |
| BotConfig | Configuracoes de comportamento do bot |
