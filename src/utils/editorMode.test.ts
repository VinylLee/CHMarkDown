import { describe, expect, it } from 'vitest'
import { resolveDocumentSwitchMode } from './editorMode'

describe('resolveDocumentSwitchMode', () => {
  it('首次加载文档时应用默认打开模式', () => {
    expect(resolveDocumentSwitchMode(false, 'preview', 'edit')).toBe('edit')
    expect(resolveDocumentSwitchMode(false, 'preview', 'split')).toBe('split')
    expect(resolveDocumentSwitchMode(false, 'preview', 'preview')).toBe('preview')
  })

  it('启动后切换文档时保持当前模式', () => {
    expect(resolveDocumentSwitchMode(true, 'split', 'preview')).toBe('split')
    expect(resolveDocumentSwitchMode(true, 'edit', 'preview')).toBe('edit')
    expect(resolveDocumentSwitchMode(true, 'preview', 'edit')).toBe('preview')
  })
})
