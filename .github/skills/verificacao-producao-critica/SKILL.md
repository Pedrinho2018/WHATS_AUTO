---
name: verificacao-producao-critica
description: 'Verifica componentes criticos para finalizar uma entrega em producao. Use antes de deploy/release para checar backend, frontend, integracoes, seguranca, ambiente e criterios de bloqueio.'
argument-hint: 'Informe ambiente, release e escopo (backend/frontend/infra/integracoes). Ex.: "release 2.3.0, producao, foco em auth e webhooks"'
---

# Verificacao de Componentes Criticos para Finalizar Producao

## Quando Usar
- Antes de concluir um deploy para producao.
- Antes de aprovar uma release candidate.
- Quando houver mudancas em autenticacao, webhooks, integracoes externas ou configuracoes de ambiente.

## Objetivo
Executar uma validacao final, orientada a risco, para decidir entre:
- `APROVAR`: pronto para producao.
- `APROVAR COM RISCO`: pode subir com plano de mitigacao claro.
- `BLOQUEAR`: nao subir ate corrigir falhas criticas.

Configuracao definida para este workspace:
- Modo: workflow completo (20-40 min).
- Gate obrigatorio de bloqueio: falha em build (`frontend` ou `backend`, quando houver build no backend).

## Entradas Minimas
- Ambiente alvo (`staging` ou `producao`).
- Escopo da release (arquivos/componentes alterados).
- Janela de deploy e estrategia de rollback.
- Variaveis de ambiente obrigatorias disponiveis.

## Fluxo de Verificacao
1. Mapear escopo e criticidade
- Liste os componentes alterados: backend, frontend, banco, webhooks, sockets, integracoes.
- Classifique o risco por impacto: `alto`, `medio`, `baixo`.
- Se houver impacto em auth, pagamento, dados sensiveis ou disponibilidade, trate como `alto`.

2. Validar backend
- Garantir que segredos obrigatorios existem e estao consistentes entre ambientes.
- Confirmar regras de seguranca e limites de requisicao das rotas criticas.
- Rodar testes do backend:
```bash
cd backend && npm test
```
- Se houver falha de teste em fluxo critico, marcar `BLOQUEAR`.

3. Validar frontend
- Confirmar compilacao tipada e build de producao:
```bash
cd frontend && npm run build
```
- Verificar paginas criticas (login, dashboard, fluxos e tickets).
- Se a build falhar, marcar `BLOQUEAR`.

4. Validar integracoes externas
- Checar contratos de payload e autenticacao para Evolution API, N8N e Typebot (quando no escopo).
- Validar webhooks e eventos essenciais (mensagens, status, QR/instancia).
- Se contrato quebrar ou autenticacao falhar, marcar `BLOQUEAR`.

5. Validar infraestrutura e configuracao
- Validar compose e variaveis obrigatorias:
```bash
docker compose -f docker-compose.local.yml config
```
- Conferir disponibilidade de servicos dependentes (DB, API externa, websocket).
- Se faltar variavel obrigatoria de runtime, marcar `BLOQUEAR`.

6. Verificar observabilidade e operacao
- Confirmar logs, healthchecks e sinais minimos para monitorar o deploy.
- Registrar plano de rollback com gatilhos objetivos (erro 5xx, fila acumulando, falha de auth).

7. Emitir decisao
- Gere uma decisao final com evidencias por item (`OK`, `RISCO`, `FALHA`).
- Explique bloqueios, mitigacoes e proximo passo recomendado.

## Regras de Decisao
- Falha de build no escopo da release: `BLOQUEAR`.
- Demais falhas viram `APROVAR COM RISCO` ou `BLOQUEAR` conforme impacto e plano de mitigacao.
- `APROVAR` somente com build aprovado e sem risco alto aberto sem mitigacao.

## Checklist de Saida
- Escopo e risco documentados.
- Backend validado (testes + seguranca).
- Frontend validado (build + telas criticas).
- Integracoes validadas (contrato + auth).
- Infra e env validados.
- Plano de rollback registrado.
- Decisao final emitida com justificativa.

## Formato de Resposta Esperado
Use este formato ao executar a skill:

```md
Status final: APROVAR | APROVAR COM RISCO | BLOQUEAR

Resumo executivo:
- ...

Resultados por componente:
- Backend: OK/RISCO/FALHA - evidencia
- Frontend: OK/RISCO/FALHA - evidencia
- Integracoes: OK/RISCO/FALHA - evidencia
- Infra/Env: OK/RISCO/FALHA - evidencia

Bloqueios:
- ...

Mitigacoes e rollback:
- ...

Proximo passo recomendado:
- ...
```
