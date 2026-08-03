import { describe, expect, it, vi } from 'vitest'
import { loadWorkspaceBootstrap } from './workspaceBootstrap'

const note: Note = {
  id: 'note-1',
  title: 'Note',
  content: '# Note',
  createdAt: '2026-08-03T00:00:00.000Z',
  updatedAt: '2026-08-03T00:00:00.000Z',
}

describe('workspaceBootstrap', () => {
  it('starts independent notes and session reads in parallel', async () => {
    let resolveNotes!: (notes: Note[]) => void
    let resolveSession!: (session: SessionState) => void
    const loadNotes = vi.fn(() => new Promise<Note[]>((resolve) => { resolveNotes = resolve }))
    const loadSession = vi.fn(() => new Promise<SessionState>((resolve) => { resolveSession = resolve }))

    const loading = loadWorkspaceBootstrap(loadNotes, loadSession)

    expect(loadNotes).toHaveBeenCalledOnce()
    expect(loadSession).toHaveBeenCalledOnce()
    resolveSession({ version: 1, documents: [], selected: null })
    resolveNotes([note])

    await expect(loading).resolves.toMatchObject({ notes: [note] })
  })

  it('keeps successful data when the other startup read fails', async () => {
    const sessionError = new Error('broken session')
    const result = await loadWorkspaceBootstrap(
      async () => [note],
      async () => { throw sessionError },
    )

    expect(result.notes).toEqual([note])
    expect(result.session).toEqual({ version: 1, documents: [], selected: null })
    expect(result.notesError).toBeNull()
    expect(result.sessionError).toBe(sessionError)
  })
})

