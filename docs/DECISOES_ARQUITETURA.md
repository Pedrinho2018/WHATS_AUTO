# Decisoes arquiteturais

Este documento registra as principais decisoes tecnicas do projeto e o motivo de cada uma. Ele serve como memoria arquitetural para evitar discussoes repetidas e orientar novas mudancas.

## Resumo das decisoes

| Decisao | Motivo | Impacto |
|---|---|---|
| Separar backend e frontend em pastas independentes | Cada aplicacao tem build, dependencias e runtime proprios | Deploy e manutencao ficam mais claros |
| Centralizar rotas em `backend/src/routes/index.ts` | Facilita auditoria da API e middlewares | Mais simples localizar endpoints |
| Usar controllers como adaptadores HTTP | Evita que regra de negocio dependa de Express | Codigo de dominio fica mais testavel |
| Criar `application/chatbot` para mensagens/conversas | Conversa e o dominio central do produto | Fluxo critico fica mais organizado |
| Usar contracts/ports no chatbot | Persistencia e provedores podem mudar | Reduz acoplamento com Sequelize/Evolution |
| Manter `services/` para legado e integracoes gerais | Evita refatoracao grande e arriscada | Evolucao incremental |
| Usar Sequelize models centralizados | Mapeia entidades e relacionamentos do banco | Facilita includes e associacoes |
| Usar Socket.IO para realtime | Conversas precisam atualizar sem recarregar | Melhor experiencia operacional |
| Usar salas por empresa/ticket | Isolamento multi-tenant e atualizacao segmentada | Menos vazamento e menos broadcast desnecessario |
| Simplificar deploy com Compose direto | Menos dependencias operacionais | Menos pontos de falha no GitHub Actions |
| Manter SVG dos diagramas | Permite importar em ferramentas externas | Facilita apresentacao e reorganizacao visual |

## Decisao 1: backend e frontend separados

O frontend e uma SPA Vue servida por Nginx. O backend e uma API Node.js/Express. Separar as pastas evita misturar dependencias, scripts e runtime.

Consequencias:

- o frontend pode ser buildado e servido estaticamente;
- o backend pode evoluir com regras e integracoes sem afetar o build da UI;
- Dockerfiles ficam especificos e menores.

## Decisao 2: controllers finos

Controllers devem ser adaptadores entre HTTP e aplicacao. Eles podem validar entrada simples e montar resposta, mas nao devem concentrar regra de negocio.

Consequencias:

- teste de regra fica mais facil;
- controllers ficam previsiveis;
- mudanca em Express impacta menos o dominio.

## Decisao 3: dominio chatbot separado

O fluxo de conversa/mensagem e o coracao do sistema. Ele foi colocado em `backend/src/application/chatbot/` para ficar mais organizado que um service generico.

Consequencias:

- inbound e outbound ficam no mesmo contexto;
- parser, repositories, providers e strategies ficam explicitos;
- trocar provedor ou automacao fica menos arriscado.

## Decisao 4: portas e infraestrutura

O dominio chatbot declara interfaces de repositorio e provider. A implementacao concreta com Sequelize fica em `infrastructure`.

Consequencias:

- dominio nao precisa conhecer query Sequelize;
- testes podem substituir repositorios;
- transacoes ficam encapsuladas.

## Decisao 5: services ainda existem

O projeto ja tinha uma camada de services. Ela continua valida para regras gerais, bootstrap, compatibilidade e integracoes. A direcao nao e apagar tudo, e extrair gradualmente dominios importantes.

Consequencias:

- menor risco de regressao;
- menos refatoracao grande;
- arquitetura evolui por partes.

## Decisao 6: Socket.IO

Socket.IO foi escolhido para realtime porque o produto depende de atualizacao imediata de tickets e mensagens.

Consequencias:

- operadores veem novas mensagens sem refresh;
- backend emite eventos de dominio apos persistir dados;
- frontend assina eventos e atualiza estado local.

## Decisao 7: deploy simples

O pipeline anterior tinha muitas partes: GHCR, Slack, rollback automatico e Traefik. O fluxo foi simplificado para deploy manual via SSH usando `docker-compose.simple.yml`.

Consequencias:

- menos secrets obrigatorios;
- menor chance de falha no pipeline;
- mais facil operar e depurar;
- rollback continua possivel manualmente via Git/Docker, mas sem automacao complexa.

## Como decidir novas mudancas

Use esta regra:

- se for **entrada HTTP**, comece em `routes` e `controllers`;
- se for **regra importante do dominio**, crie/edite `application/<dominio>`;
- se for **integracao externa**, isole em service/provider/strategy;
- se for **query concreta**, coloque em infrastructure/repository;
- se for **estado visual**, mantenha no frontend;
- se for **estado compartilhado**, use store;
- se for **documentacao de decisao**, registre aqui.
