# Modularizacao do projeto

Este documento explica como o WHATS_AUTO esta modularizado, por que essa divisao existe e como decidir onde colocar novas funcionalidades.

## Objetivo da modularizacao

A modularizacao atual busca reduzir tres riscos:

1. **Misturar regras de negocio com detalhes tecnicos.** Exemplo: regra de atendimento nao deve depender diretamente de Express, Vue ou detalhes de payload da Evolution.
2. **Espalhar integracoes externas pelo codigo.** Evolution, n8n e Typebot mudam com frequencia; por isso devem ficar isolados.
3. **Dificultar manutencao por falta de mapa.** Cada pasta deve deixar claro o tipo de responsabilidade que carrega.

O projeto ainda possui partes legadas em `services/`, mas ja existe uma direcao mais limpa em `application/chatbot/`, com contratos, portas e implementacoes separadas.

## Backend

### Visao em camadas

```text
HTTP / Socket boundary
        ↓
Routes
        ↓
Controllers
        ↓
Application / Services
        ↓
Ports / Providers / Strategies
        ↓
Infrastructure / Sequelize / External APIs
        ↓
Database / Evolution / n8n / Typebot
```

### `backend/src/routes/`

Responsabilidade:

- declarar endpoints;
- aplicar middlewares de autenticacao e perfil;
- encaminhar chamadas para controllers.

Por que existe:

- centraliza a superficie HTTP;
- facilita descobrir quais endpoints existem;
- evita que regras de autorizacao fiquem espalhadas.

Regra pratica:

- nova URL entra em `routes/index.ts`;
- regra de negocio nao entra aqui.

### `backend/src/controllers/`

Responsabilidade:

- adaptar HTTP para chamadas internas;
- ler params, query, body e usuario autenticado;
- validar dados basicos;
- retornar status code e JSON;
- converter erro de dominio em resposta HTTP.

Por que existe:

- Express e uma tecnologia de entrada, nao deve contaminar o dominio;
- controllers deixam claro o contrato entre API e aplicacao.

Regra pratica:

- se o codigo sabe demais sobre `req` e `res`, ele pertence ao controller;
- se o codigo decide regras de negocio, ele deve sair do controller.

### `backend/src/application/`

Responsabilidade:

- concentrar casos de uso importantes do dominio;
- organizar regras com contratos explicitos;
- proteger o dominio de frameworks e provedores externos.

Hoje o principal modulo e:

```text
backend/src/application/chatbot/
```

Esse modulo cobre:

- parse e processamento de mensagem inbound;
- criacao/reuso de ticket;
- persistencia de mensagens;
- despacho para Typebot/n8n;
- envio de mensagem outbound do operador;
- emissao de eventos realtime apos mudancas relevantes.

Por que existe:

- mensagens e conversas sao o nucleo do produto;
- esse fluxo precisa ser testavel e evoluir sem virar um controller gigante;
- trocar Evolution/n8n/Typebot fica mais simples quando ha portas e strategies.

Regra pratica:

- novo fluxo central de negocio deve nascer em `application/<dominio>`;
- use interfaces quando houver persistencia, provedor externo ou estrategia substituivel.

### `backend/src/application/chatbot/persistence/`

Responsabilidade:

- declarar interfaces de repositorio;
- declarar entradas e saidas esperadas pela aplicacao;
- evitar que a aplicacao dependa diretamente de Sequelize.

Por que existe:

- permite testar caso de uso com repositorios fake;
- reduz acoplamento com banco;
- deixa as queries concretas fora do dominio.

### `backend/src/infrastructure/`

Responsabilidade:

- implementar portas tecnicas;
- falar com Sequelize;
- encapsular detalhes de transacao e persistencia.

Exemplo:

```text
backend/src/infrastructure/persistence/sequelize/
```

Por que existe:

- infraestrutura muda mais que regra de negocio;
- separar essa camada permite evoluir o banco ou repositorios com menor impacto.

### `backend/src/services/`

Responsabilidade atual:

- regras gerais ja existentes;
- integracoes externas;
- bootstrap;
- compatibilidade com Evolution API.

Por que ainda existe:

- e uma camada historica do projeto;
- nem tudo precisa ser migrado de uma vez;
- alguns servicos sao utilitarios de aplicacao e continuam aceitaveis ali.

Direcao recomendada:

- manter services para integracoes e regras gerais;
- mover fluxos de dominio mais importantes para `application/` quando forem alterados de forma relevante.

### `backend/src/models/`

Responsabilidade:

- definir modelos Sequelize;
- definir campos, tipos e associacoes;
- representar tabelas persistidas.

Por que existe:

- centraliza estrutura de dados;
- facilita associacoes e includes;
- mantem o mapeamento banco/codigo em um lugar.

Regra pratica:

- model nao deve chamar controller ou service;
- model deve ser estrutura e comportamento minimo de persistencia.

### `backend/src/realtime/`

Responsabilidade:

- autenticar Socket.IO;
- criar salas por empresa, usuario e ticket;
- emitir eventos de dominio para o frontend.

Por que existe:

- realtime e uma camada propria, diferente de HTTP;
- manter eventos centralizados reduz duplicacao e inconsistencia.

Eventos principais:

- `server:ticket.created`
- `server:ticket.updated`
- `server:message.created`

## Frontend

### Visao em camadas

```text
main.ts
  ↓
App.vue + router
  ↓
views
  ↓
stores / services
  ↓
application / infrastructure
  ↓
backend HTTP + Socket.IO
```

### `frontend/src/views/`

Responsabilidade:

- telas completas;
- orquestrar chamadas de tela;
- controlar estado visual local;
- renderizar workflows do usuario.

Por que existe:

- cada arquivo representa uma pagina do produto;
- facilita navegar do menu para a implementacao.

Regra pratica:

- view pode chamar `api.ts`, store e socket;
- view nao deve conter regra de dominio complexa ou cliente HTTP customizado.

### `frontend/src/services/`

Responsabilidade:

- `api.ts`: cliente Axios padrao com token JWT;
- `socket.ts`: conexao Socket.IO e assinaturas realtime.

Por que existe:

- evita espalhar configuracao HTTP/socket pelas telas;
- centraliza tratamento de auth e debug.

### `frontend/src/stores/`

Responsabilidade:

- estado compartilhado da aplicacao;
- autenticacao;
- usuario e empresa atuais;
- conexao/desconexao do Socket.IO apos login/logout.

Por que existe:

- estado global precisa ser previsivel;
- views nao devem duplicar controle de sessao.

### `frontend/src/application/` e `frontend/src/infrastructure/`

Responsabilidade:

- organizar casos de uso e contratos do frontend;
- separar regra de autenticacao de detalhes Axios/storage.

Exemplo atual:

```text
application/auth/AuthService.ts
application/auth/AuthRepository.ts
infrastructure/auth/AuthApiRepository.ts
infrastructure/storage/BrowserTokenStorage.ts
```

Por que existe:

- login/logout e perfil sao regras transversais;
- facilita trocar storage ou cliente HTTP;
- reduz acoplamento entre tela e infraestrutura.

### `frontend/src/components/`

Responsabilidade:

- componentes reutilizaveis;
- layout;
- UI compartilhada.

Regra pratica:

- componente reutilizavel fica em `components/`;
- pagina completa fica em `views/`;
- componente nao deve conhecer endpoint de API quando puder receber dados por props/eventos.

## Regras de dependencia

### Permitido

- `routes` chama `controllers`;
- `controllers` chamam `application` ou `services`;
- `application` depende de contratos/portas;
- `infrastructure` implementa contratos;
- `services` podem chamar models e integracoes externas;
- `views` chamam stores e services frontend.

### Evitar

- controller chamando query complexa diretamente;
- view criando Axios ou Socket.IO manualmente;
- model chamando service;
- provider externo espalhado por varios controllers;
- regra de negocio importante dentro de componente visual.

## Onde colocar codigo novo

| Tipo de mudanca | Local recomendado |
|---|---|
| Novo endpoint | `backend/src/routes/index.ts` + controller |
| Nova regra de atendimento/mensagem | `backend/src/application/chatbot/` |
| Nova integracao externa | `backend/src/services/` ou provider em `application/<dominio>/providers/` |
| Nova query do chatbot | interface em `application/chatbot/persistence/` e implementacao em `infrastructure/persistence/sequelize/` |
| Novo model/tabela | `backend/src/models/` + migration |
| Novo evento realtime | `backend/src/realtime/events.ts` e tipo em `realtime/types.ts` |
| Nova tela | `frontend/src/views/` + rota em `router/index.ts` |
| Estado global | `frontend/src/stores/` |
| Cliente HTTP/realtime | `frontend/src/services/` |
| Componente visual reutilizavel | `frontend/src/components/` |
| Documento tecnico | `docs/` |

## Por que nao colocar tudo em `services/`

`services/` e simples no inicio, mas cresce rapido e mistura responsabilidades:

- regra de negocio;
- integracao externa;
- query de banco;
- orquestracao;
- detalhes de framework.

Para fluxos centrais, como conversa e mensagem, a separacao em `application`, `persistence`, `providers`, `strategies` e `infrastructure` melhora:

- legibilidade;
- testes;
- troca de provedor;
- rastreabilidade de dependencias;
- manutencao por novos desenvolvedores.

## Estado atual e direcao

Estado atual:

- backend ja possui uma modularizacao mais robusta no dominio `chatbot`;
- parte administrativa ainda usa `management.service.ts`;
- frontend mistura views grandes com services centralizados;
- autenticacao frontend ja tem separacao por application/infrastructure.

Direcao recomendada:

1. Manter o dominio de mensagens dentro de `application/chatbot`.
2. Evitar aumentar controllers e views com regra pesada.
3. Ao mexer em um fluxo legado grande, extrair gradualmente para `application/<dominio>`.
4. Criar documentacao junto com cada novo modulo relevante.
5. Atualizar UML quando entidades ou fluxos centrais mudarem.
