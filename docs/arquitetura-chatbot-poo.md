# Arquitetura Chatbot POO (Refatoracao Incremental)

Este documento descreve a nova base arquitetural aplicada no backend para o fluxo de chatbot.

## Objetivos

- Reduzir acoplamento entre controllers e integracoes externas.
- Melhorar testabilidade com injecao de dependencias.
- Padronizar pontos de extensao para novos canais/provedores.

## Padroes aplicados

- Application Service: coordena casos de uso.
- Strategy: escolhe o dispatcher por tipo de fluxo (Typebot, N8N).
- Port/Adapter: desacopla envio de mensagens do provider especifico.
- Controller fino: valida entrada e delega regras de negocio.

## Estrutura

- `backend/src/application/chatbot/inbound-message.parser.ts`
  - Parser de payload inbound da Evolution.
- `backend/src/application/chatbot/chatbot-orchestrator.service.ts`
  - Orquestra ciclo inbound: ticket, mensagem, roteamento e fallback.
- `backend/src/application/chatbot/strategies/typebot-dispatcher.strategy.ts`
  - Strategy para fluxos Typebot.
- `backend/src/application/chatbot/strategies/n8n-dispatcher.strategy.ts`
  - Strategy de fallback para N8N.
- `backend/src/application/chatbot/providers/message-provider.port.ts`
  - Contrato de provider de envio outbound.
- `backend/src/application/chatbot/providers/revolution-message.provider.ts`
  - Adapter para Revolution API.
- `backend/src/application/chatbot/conversation-message.application.ts`
  - Caso de uso de mensagens de conversa (listar/enviar).

## Como evoluir sem quebrar

1. Criar novos providers (ex.: WhatsApp oficial, Telegram) implementando `MessageProviderPort`.
2. Adicionar novas strategies de roteamento sem alterar controller.
3. Introduzir repositorios (DAO) para reduzir dependencia direta de ORM no application service.
4. Cobrir parser, orchestrator e providers com testes unitarios por componente.
