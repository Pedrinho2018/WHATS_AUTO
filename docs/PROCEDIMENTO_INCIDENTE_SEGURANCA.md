# Procedimento de incidente de seguranca

## Objetivo

Definir como identificar, conter, registrar, avaliar e comunicar incidentes envolvendo dados pessoais ou ativos criticos do WHATS_AUTO.

## Exemplos de incidente

- Acesso indevido a conversas, banco, logs ou backups.
- Vazamento de token, senha, chave SSH, JWT secret ou credencial da Evolution.
- Envio de mensagens para destinatario incorreto por falha tecnica.
- Exposicao publica de endpoint, dump, print ou arquivo `.env`.
- Alteracao indevida de usuario, perfil, ticket ou configuracao.

## Papeis

| Papel | Responsabilidade |
|---|---|
| Responsavel tecnico | Contencao, evidencias, correcao e relatorio |
| Responsavel comercial/suporte | Comunicacao com cliente e abertura de chamado |
| Encarregado/DPO | Avaliacao LGPD e suporte a comunicacoes formais |
| Controlador cliente | Decisao sobre comunicacao a titulares e ANPD quando aplicavel |

## Fluxo de resposta

1. Registrar horario, origem, ambiente, empresa afetada e pessoa que identificou.
2. Preservar evidencias: logs, eventos, commits, payloads relevantes e prints internos.
3. Conter: bloquear usuario, rotacionar segredo, isolar container, suspender integracao ou restringir rota.
4. Avaliar escopo: empresas, titulares, dados, periodo, causa provavel e impacto.
5. Corrigir a causa raiz e validar que a falha cessou.
6. Notificar responsaveis internos e cliente controlador.
7. Apoiar decisao de comunicacao formal a ANPD/titulares quando houver risco ou dano relevante.
8. Registrar pos-incidente: linha do tempo, causa, impacto, medidas e preventivas.

## Prazos de referencia

A pagina oficial da ANPD sobre comunicacao de incidente informa que, conforme a Resolucao CD/ANPD nº 15/2024, a comunicacao a ANPD e aos titulares deve ocorrer pelo controlador em ate 3 dias uteis quando aplicavel. Confirmar sempre a regra vigente e as particularidades do caso.

## Checklist tecnico

- [ ] Identificar `company_id`, `ticket_id`, `message_id` ou usuario afetado.
- [ ] Consultar `/api/diagnostics/events`.
- [ ] Checar logs do backend, Evolution, banco e proxy.
- [ ] Verificar ultimos deploys e alteracoes de secrets.
- [ ] Rotacionar credenciais afetadas.
- [ ] Validar backup e integridade do banco.
- [ ] Aplicar hotfix ou rollback controlado.
- [ ] Registrar evento e decisao final.
