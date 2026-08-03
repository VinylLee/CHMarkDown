const EMPTY_SESSION: SessionState = {
  version: 1,
  documents: [],
  selected: null,
}

export interface WorkspaceBootstrapResult {
  notes: Note[]
  session: SessionState
  notesError: unknown | null
  sessionError: unknown | null
}

export async function loadWorkspaceBootstrap(
  loadNotes: () => Promise<Note[]>,
  loadSession: () => Promise<SessionState>,
): Promise<WorkspaceBootstrapResult> {
  const [notesResult, sessionResult] = await Promise.allSettled([
    loadNotes(),
    loadSession(),
  ])

  return {
    notes: notesResult.status === 'fulfilled' ? notesResult.value : [],
    session: sessionResult.status === 'fulfilled' ? sessionResult.value : { ...EMPTY_SESSION },
    notesError: notesResult.status === 'rejected' ? notesResult.reason : null,
    sessionError: sessionResult.status === 'rejected' ? sessionResult.reason : null,
  }
}

