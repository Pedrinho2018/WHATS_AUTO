# Seguranca, privacidade e LGPD

Este documento organiza as frentes minimas para operar o WHATS_AUTO com dados pessoais de conversas de WhatsApp.

> Este material e um guia tecnico-operacional. Politica, termos e contrato devem ser revisados por assessoria juridica antes de uso comercial.

## Referencias oficiais

- LGPD, Lei nº 13.709/2018.
- ANPD: perguntas frequentes sobre dados pessoais e tratamento de dados: https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes/perguntas-frequentes/2-dados-pessoais
- ANPD: prazo de tratamento e termino do tratamento: https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes/perguntas-frequentes/5-adequacao-a-lgpd/5-5-por-quanto-tempo
- ANPD: Guia Orientativo de Seguranca da Informacao para Agentes de Tratamento de Pequeno Porte: https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-publica-guia-de-seguranca-para-agentes-de-tratamento-de-pequeno-porte
- ANPD: Comunicacao de Incidente de Seguranca: https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis

## Papeis de dados

| Papel | No produto |
|---|---|
| Titular | Contato final que conversa pelo WhatsApp |
| Controlador | Cliente que decide finalidade, base legal, prazo e uso das conversas |
| Operador | Plataforma WHATS_AUTO/Norte MT Sistemas quando processa dados em nome do cliente |
| Suboperador | Provedores usados para executar o servico, como hospedagem, Evolution API, n8n, backup e monitoramento |
| Encarregado/DPO | Canal definido pelo controlador e, internamente, pela operacao da plataforma |

## Dados tratados

- Identificacao do contato: telefone, nome exibido e metadados do canal.
- Conteudo da conversa: mensagens enviadas e recebidas, anexos, status e timestamps.
- Dados operacionais: ticket, operador responsavel, status, fila, historico e auditoria.
- Dados de usuario interno: nome, email, perfil, login, alteracoes administrativas.
- Dados tecnicos: logs, IPs, eventos de webhook, erros e metricas de saude.

## Controles implementados

| Controle | Implementacao |
|---|---|
| Auditoria de login | Eventos `login_success` e `login_failed` em `operational_events` |
| Auditoria administrativa | Eventos `admin_action` para criacao/alteracao de usuarios |
| Exportacao por contato | `GET /api/privacy/contacts/:contactPhone/export` |
| Remocao/anonimizacao por contato | `DELETE /api/privacy/contacts/:contactPhone` |
| Retencao de mensagens | `POST /api/privacy/retention/apply` com `retentionDays` |
| Rate limit sensivel | `sensitiveActionRateLimit` em diagnostico e rotas de privacidade |
| Segregacao por tenant | Consultas filtradas por `company_id` |
| Logs estruturados | Logs e eventos com `company_id`, `ticket_id` e `message_id` quando aplicavel |

## Matriz de acesso recomendada

| Funcao | Admin | Manager | Agent | Viewer |
|---|---:|---:|---:|---:|
| Ver dashboard | Sim | Sim | Sim | Sim |
| Atender tickets | Sim | Sim | Sim | Nao |
| Ver instancias | Sim | Sim | Sim | Sim |
| Criar/alterar instancias | Sim | Sim | Nao | Nao |
| Criar/alterar usuarios | Sim | Nao | Nao | Nao |
| Ver diagnostico | Sim | Sim | Nao | Nao |
| Exportar dados de contato | Sim | Sim | Nao | Nao |
| Remover dados de contato | Sim | Nao | Nao | Nao |
| Aplicar retencao | Sim | Nao | Nao | Nao |

## Retencao configuravel por cliente

O prazo deve ser definido em contrato ou configuracao operacional do cliente. Como ponto de partida:

- 90 dias para operacoes de teste/homologacao.
- 180 dias para atendimento simples.
- 365 dias quando houver justificativa comercial, suporte ou obrigacao contratual.

Aplicacao tecnica:

```http
POST /api/privacy/retention/apply
Content-Type: application/json

{
  "retentionDays": 180
}
```

O endpoint anonimiza conteudo e midia de mensagens antigas e registra `retention_applied`.

## Exportacao e remocao por contato

Exportar:

```http
GET /api/privacy/contacts/5565999999999/export
```

Remover/anonimizar:

```http
DELETE /api/privacy/contacts/5565999999999
```

A remocao preserva o minimo operacional do ticket e substitui dados pessoais por marcadores de remocao para manter integridade de auditoria.

## Secrets e credenciais

- Nunca versionar `.env` real, tokens da Evolution, senha de banco, JWT ou chaves SSH.
- `JWT_SECRET` deve ter pelo menos 32 caracteres aleatorios.
- Usar GitHub Secrets para deploy e CI.
- Rotacionar credenciais quando houver saida de colaborador, suspeita de vazamento ou troca de fornecedor.
- Em producao, preferir secret manager do provedor ou variaveis protegidas no orquestrador.

## Endpoints sensiveis

Aplicar sempre:

- autenticacao JWT;
- autorizacao por papel;
- rate limit por usuario/empresa;
- auditoria em `operational_events`;
- resposta sem expor stack trace, token, senha, payload bruto sensivel ou segredo.

## Rotina mensal

1. Revisar usuarios ativos e perfis.
2. Validar backups e restauracao de teste.
3. Conferir eventos de erro no diagnostico.
4. Aplicar politica de retencao dos clientes.
5. Revisar secrets e acessos do GitHub Actions.
6. Verificar containers reiniciando, disco, CPU e memoria.

## Antes de vender

- Publicar politica de privacidade e termos.
- Assinar contrato com clausulas de controlador/operador.
- Definir canal para requisicoes de titulares.
- Formalizar procedimento de incidente.
- Mapear suboperadores e regioes de hospedagem.
- Definir SLA, suporte, backup e retencao por plano.
