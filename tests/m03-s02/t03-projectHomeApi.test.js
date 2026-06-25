import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  listTodos,
  createTodo,
  patchTodo,
  deleteTodo,
  reorderTodos,
  addTodoLink,
  removeTodoLink,
  LINK_TYPES,
  TODO_STATUSES,
} from '../../apps/frontend/src/lib/projectHomeApi.js'

const okJson = (data) => ({ ok: true, status: 200, json: async () => data })
const okEmpty = () => ({ ok: true, status: 204 })
const errJson = (status, data) => ({ ok: false, status, json: async () => data })

describe('T03 — projectHomeApi fetch wrappers', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })
  afterEach(() => {
    delete globalThis.fetch
  })

  test('listTodos macht GET /api/projects/:id/todos', async () => {
    globalThis.fetch.mockResolvedValueOnce(okJson([{ id: 1, label: 'x' }]))
    const result = await listTodos(2)
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/projects/2/todos', expect.objectContaining({ method: 'GET' }))
    expect(result).toEqual([{ id: 1, label: 'x' }])
  })

  test('createTodo macht POST mit JSON-Body', async () => {
    globalThis.fetch.mockResolvedValueOnce(okJson({ id: 5, label: 'neu' }))
    const result = await createTodo(2, { label: 'neu' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/projects/2/todos',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'neu' }),
      })
    )
    expect(result.id).toBe(5)
  })

  test('patchTodo macht PATCH /todos/:id', async () => {
    globalThis.fetch.mockResolvedValueOnce(okJson({ id: 5, status: 'done' }))
    await patchTodo(2, 5, { status: 'done' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/projects/2/todos/5',
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  test('deleteTodo macht DELETE und returnt null bei 204', async () => {
    globalThis.fetch.mockResolvedValueOnce(okEmpty())
    const result = await deleteTodo(2, 5)
    expect(result).toBeNull()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/projects/2/todos/5',
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  test('reorderTodos macht PATCH /todos/reorder mit {order: [...]}', async () => {
    globalThis.fetch.mockResolvedValueOnce(okJson({ updated: 3 }))
    await reorderTodos(2, [3, 1, 2])
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/projects/2/todos/reorder',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ order: [3, 1, 2] }) })
    )
  })

  test('addTodoLink macht POST /todos/:tid/links', async () => {
    globalThis.fetch.mockResolvedValueOnce(okJson({ id: 9, type: 'url', target: 'https://example.com' }))
    await addTodoLink(2, 5, { type: 'url', target: 'https://example.com' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/projects/2/todos/5/links',
      expect.objectContaining({ method: 'POST' })
    )
  })

  test('removeTodoLink macht DELETE /todos/:tid/links/:lid', async () => {
    globalThis.fetch.mockResolvedValueOnce(okEmpty())
    await removeTodoLink(2, 5, 9)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/projects/2/todos/5/links/9',
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  test('Error-Response wirft Error mit code + status + field', async () => {
    globalThis.fetch.mockResolvedValueOnce(errJson(400, { error: 'fehlt', code: 'LABEL_REQUIRED', field: 'label' }))
    await expect(createTodo(2, {})).rejects.toMatchObject({
      message: 'fehlt',
      code: 'LABEL_REQUIRED',
      field: 'label',
      status: 400,
    })
  })

  test('LINK_TYPES + TODO_STATUSES frozen mit erwarteten Werten', () => {
    expect(Object.isFrozen(LINK_TYPES)).toBe(true)
    expect(LINK_TYPES).toEqual(['spec', 'issue', 'vault', 'url'])
    expect(Object.isFrozen(TODO_STATUSES)).toBe(true)
    expect(TODO_STATUSES).toEqual(['open', 'done', 'cancelled'])
  })
})
