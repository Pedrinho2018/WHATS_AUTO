import { describe, expect, it } from 'vitest'
import {
  EMPTY_WORKFLOW_MODEL,
  createNodeFromType,
  getActionDefinition,
  getBlockDefinition,
} from './types'

describe('workflow types', () => {
  it('cria um no valido para um tipo conhecido', () => {
    const node = createNodeFromType('message', 120, 240)

    expect(node.type).toBe('message')
    expect(node.x).toBe(120)
    expect(node.y).toBe(240)
    expect(node.id).toBeTruthy()

    const definition = getBlockDefinition('message')
    expect(definition).toBeTruthy()
    expect(node.actionId).toBe(definition?.actions[0]?.id ?? null)
  })

  it('retorna acao null para actionId inexistente', () => {
    const action = getActionDefinition('condition', 'acao-inexistente')
    expect(action).toBeNull()
  })

  it('mantem modelo vazio com nodes e connections', () => {
    expect(Array.isArray(EMPTY_WORKFLOW_MODEL.nodes)).toBe(true)
    expect(Array.isArray(EMPTY_WORKFLOW_MODEL.connections)).toBe(true)
    expect(EMPTY_WORKFLOW_MODEL.nodes.length).toBe(0)
    expect(EMPTY_WORKFLOW_MODEL.connections.length).toBe(0)
  })
})
