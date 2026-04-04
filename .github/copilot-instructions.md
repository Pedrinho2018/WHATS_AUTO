# Project Guidelines

## Contexto do Projeto
Este workspace e uma plataforma multi-tenant de atendimento WhatsApp com backend em Node.js + Express + TypeScript e frontend em Vue 3 + Vite.

Antes de alterar regras de negocio, modelos ou fluxos de integracao, consulte:
- `README.md`
- `docs/guia-da-aplicacao-e-do-codigo.md`

## Build e Test (Comandos Canonicos)
Prefira sempre os scripts oficiais do `package.json`.

### Raiz
- `npm run lint`
- `npm run test`
- `npm run docker:up`
- `npm run docker:down`

### Backend (`backend/`)
- `npm run dev`
- `npm run build`
- `npm test`
- `npm run lint`

### Frontend (`frontend/`)
- `npm run dev`
- `npm run build`
- `npm run test`
- `npm run lint`

## Arquitetura e Boundaries
- `backend/src/controllers/`: camada HTTP (request/response).
- `backend/src/services/`: regras de negocio e integracoes.
- `backend/src/models/`: modelos Sequelize multi-tenant.
- `backend/src/realtime/`: autenticacao e eventos Socket.IO.
- `frontend/src/views/` e `frontend/src/components/`: UI.
- `frontend/src/services/`: API HTTP e Socket client.

Evite acoplamento entre camadas: controllers nao devem conter regra de negocio complexa; mantenha logica em services.

## Convencoes Importantes
- TypeScript com `strict: true` no backend e frontend; nao introduza `any` sem necessidade real.
- Preserve o padrao de tratamento de erro com `DomainError` e `sendControllerError` no backend.
- Em Vue, prefira `<script setup>` e mova logica para o script (evite complexidade no template).
- Para novos endpoints, mantenha padrao de middlewares de autenticacao/autorizacao ja usado em `backend/src/routes/index.ts`.

## Pitfalls Criticos
- O backend exige `JWT_SECRET` valido no startup.
- Em ambiente local com Docker, verifique variaveis obrigatorias em `.env.example` e em `docker-compose.local.yml`.
- Em testes de integracao do backend, ao mockar middlewares/controller, faça isso antes de importar o app para evitar inicializacao do Sequelize.
- Socket.IO depende de token JWT no handshake (`auth.token`).

## Documentacao de Referencia (Link, nao duplicar)
- Visao geral, setup e operacao: `README.md`
- Arquitetura detalhada do sistema: `docs/guia-da-aplicacao-e-do-codigo.md`
- Variaveis de ambiente: `.env.example`
- Checklist de release/deploy: `.github/skills/verificacao-producao-critica/SKILL.md`

## Como o Agente Deve Trabalhar Neste Repo
- Priorize mudancas pequenas e localizadas.
- Ao editar backend e frontend no mesmo task, valide pelo menos build/test da area alterada.
- Nao altere convencoes de stack (Express/Vue/Sequelize/Socket.IO) sem necessidade explicita.
- Quando houver documentacao existente, atualize com link em vez de copiar grandes blocos para respostas ou novos arquivos.
