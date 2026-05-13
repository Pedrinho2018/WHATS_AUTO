# UML e diagramas

Os diagramas abaixo usam Mermaid. Eles renderizam no GitHub e em extensoes comuns do VS Code.

Versoes vetoriais em SVG para importar em Figma, Illustrator, Inkscape ou diagrams.net estao em [docs/vetores](./vetores/README.md).

## Componentes

```mermaid
flowchart LR
  subgraph Browser[Navegador]
    Vue[Vue SPA]
    Pinia[Pinia Auth Store]
    SocketClient[Socket.IO client]
  end

  subgraph Backend[Backend Node.js]
    Express[Express App]
    Routes[Routes]
    Controllers[Controllers]
    Services[Services]
    ChatbotApp[Chatbot Application]
    SocketServer[Socket.IO Server]
    Sequelize[Sequelize]
  end

  subgraph Data[Dados]
    MariaDB[(MariaDB)]
    Postgres[(PostgreSQL Evolution)]
  end

  subgraph External[Integracoes]
    Evolution[Evolution API]
    N8N[n8n opcional]
    Typebot[Typebot opcional]
  end

  Vue --> Pinia
  Vue -->|HTTP /api| Express
  SocketClient <-->|/socket.io| SocketServer
  Express --> Routes --> Controllers
  Controllers --> Services
  Controllers --> ChatbotApp
  Services --> Sequelize
  ChatbotApp --> Sequelize
  Sequelize --> MariaDB
  ChatbotApp --> SocketServer
  Services --> Evolution
  ChatbotApp --> N8N
  ChatbotApp --> Typebot
  Evolution --> Postgres
  Evolution -->|webhook| Express
```

## Classes do dominio de dados

```mermaid
classDiagram
  class Company {
    +number id
    +string name
    +string subdomain
  }

  class User {
    +number id
    +number company_id
    +string name
    +string email
    +string role
    +boolean is_active
  }

  class Instance {
    +number id
    +number company_id
    +string name
    +string evolution_instance
    +string status
    +string phone
  }

  class Ticket {
    +number id
    +number company_id
    +number instance_id
    +number user_id
    +string contact_phone
    +string contact_name
    +string status
    +string priority
    +string channel
    +Date last_message_at
  }

  class Message {
    +number id
    +number company_id
    +number ticket_id
    +number instance_id
    +string message_id
    +string direction
    +string type
    +string content
    +string status
    +Date sent_at
  }

  class Flow {
    +number id
    +number company_id
    +string name
    +string trigger_type
    +boolean is_active
  }

  class FlowWorkspace {
    +number id
    +number company_id
    +number flow_id
    +object nodes
    +object edges
  }

  class MessageTemplate {
    +number id
    +number company_id
    +string name
    +string content
    +string category
  }

  class BotConfig {
    +number id
    +number company_id
    +object settings
  }

  Company "1" --> "*" User
  Company "1" --> "*" Instance
  Company "1" --> "*" Ticket
  Company "1" --> "*" Message
  Company "1" --> "*" Flow
  Company "1" --> "*" FlowWorkspace
  Company "1" --> "*" MessageTemplate
  Company "1" --> "*" BotConfig
  Instance "1" --> "*" Ticket
  Instance "1" --> "*" Message
  User "1" --> "*" Ticket : agent
  Ticket "1" --> "*" Message
  Flow "1" --> "0..1" FlowWorkspace
```

## Classes do fluxo chatbot

```mermaid
classDiagram
  class WebhookController {
    -InboundMessageParser parser
    -ChatbotOrchestratorService chatbotOrchestrator
    +evolutionInbound(req, res)
  }

  class InboundMessageParser {
    +parse(body) ParsedInbound
  }

  class ChatbotOrchestratorService {
    -findOrCreateTicket(instance, parsed, tx)
    -persistInboundMessage(instance, ticket, parsed, rawPayload, tx)
    +processInbound(parsed, rawPayload)
  }

  class ConversationMessageApplication {
    +listTicketMessages(companyId, ticketId, limit, offset)
    +sendTextToTicket(companyId, ticketId, operatorName, text)
  }

  class InstanceRepository {
    <<interface>>
    +findByEvolutionInstance(instanceName)
    +findByIdAndCompany(instanceId, companyId)
  }

  class TicketRepository {
    <<interface>>
    +findByIdAndCompany(ticketId, companyId)
    +findLatestOpenByContact(companyId, instanceId, contactPhone)
    +createInboundTicket(input)
    +touchLastMessage(ticket, contactName)
  }

  class MessageRepository {
    <<interface>>
    +listByTicket(companyId, ticketId, options)
    +createInbound(input)
    +createOutbound(input)
  }

  class FlowRepository {
    <<interface>>
    +listActiveWebhookFlows(companyId)
  }

  class UnitOfWork {
    <<interface>>
    +runInTransaction(callback)
  }

  class MessageProviderPort {
    <<interface>>
    +sendText(input)
  }

  class TypebotDispatcherStrategy {
    +canHandle(flow)
    +dispatch(context)
  }

  class N8nDispatcherStrategy {
    +canHandle(flow)
    +dispatch(context)
  }

  WebhookController --> InboundMessageParser
  WebhookController --> ChatbotOrchestratorService
  ChatbotOrchestratorService --> InstanceRepository
  ChatbotOrchestratorService --> TicketRepository
  ChatbotOrchestratorService --> MessageRepository
  ChatbotOrchestratorService --> FlowRepository
  ChatbotOrchestratorService --> UnitOfWork
  ChatbotOrchestratorService --> TypebotDispatcherStrategy
  ChatbotOrchestratorService --> N8nDispatcherStrategy
  ConversationMessageApplication --> MessageProviderPort
  ConversationMessageApplication --> TicketRepository
  ConversationMessageApplication --> InstanceRepository
  ConversationMessageApplication --> MessageRepository
  ConversationMessageApplication --> UnitOfWork
```

## Sequencia: login

```mermaid
sequenceDiagram
  participant U as Usuario
  participant F as Frontend
  participant API as Backend API
  participant DB as MariaDB
  participant S as Socket.IO

  U->>F: informa email e senha
  F->>API: POST /api/auth/login
  API->>DB: busca usuario e empresa
  DB-->>API: usuario valido
  API-->>F: token, user, company
  F->>F: salva token no storage
  F->>S: conecta com auth.token
  S-->>F: server:welcome
```

## Sequencia: mensagem inbound do WhatsApp

```mermaid
sequenceDiagram
  participant W as WhatsApp Usuario
  participant E as Evolution API
  participant API as Backend
  participant Parser as InboundMessageParser
  participant Orq as ChatbotOrchestratorService
  participant DB as MariaDB
  participant RT as Socket.IO
  participant FE as Frontend
  participant Bot as Typebot/n8n

  W->>E: envia mensagem
  E->>API: POST /api/webhooks/evolution
  API->>Parser: parse(payload)
  Parser-->>API: ParsedInbound
  API->>Orq: processInbound(parsed, payload)
  Orq->>DB: busca instancia
  Orq->>DB: busca ou cria ticket
  Orq->>DB: salva Message inbound
  Orq->>RT: emitTicketCreated/Updated
  Orq->>RT: emitMessageCreated
  RT-->>FE: server:message.created
  Orq->>Bot: dispatch opcional
  API-->>E: 202 accepted
```

## Sequencia: resposta do operador

```mermaid
sequenceDiagram
  participant O as Operador
  participant FE as Frontend
  participant API as Backend
  participant App as ConversationMessageApplication
  participant E as Evolution API
  participant DB as MariaDB
  participant RT as Socket.IO
  participant C as Cliente WhatsApp

  O->>FE: digita resposta
  FE->>API: POST /api/messages/tickets/:id/text
  API->>App: sendTextToTicket(companyId, ticketId, operatorName, text)
  App->>DB: busca ticket e instancia
  App->>E: sendText(instance, phone, text)
  E-->>C: entrega mensagem
  E-->>App: messageId/status
  App->>DB: salva Message outbound
  App->>RT: emitMessageCreated
  RT-->>FE: server:message.created
  API-->>FE: 201
```

## Estado do ticket

```mermaid
stateDiagram-v2
  [*] --> open: criado por inbound ou manual
  open --> pending: aguardando atendimento
  pending --> in_progress: agente assume
  open --> in_progress: atendimento direto
  in_progress --> resolved: resolvido
  pending --> resolved: resolvido sem atendimento
  resolved --> closed: encerrado
  open --> closed: encerrado
  pending --> closed: encerrado
  in_progress --> closed: encerrado
  resolved --> open: reabertura manual
  closed --> open: nova conversa/reabertura
```

## Fluxo de dependencias do frontend

```mermaid
flowchart TB
  View[View Vue] --> ApiService[services/api.ts]
  View --> SocketService[services/socket.ts]
  View --> AuthStore[stores/auth.ts]
  AuthStore --> AuthService[application/auth/AuthService.ts]
  AuthService --> AuthRepository[application/auth/AuthRepository.ts]
  AuthRepository --> AuthApiRepository[infrastructure/auth/AuthApiRepository.ts]
  AuthApiRepository --> HttpClient[core/http/HttpClient.ts]
  HttpClient --> AxiosHttpClient[infrastructure/http/AxiosHttpClient.ts]
  AuthService --> TokenStorage[infrastructure/storage/BrowserTokenStorage.ts]
```
