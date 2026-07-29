import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { convertFlowdeskImagesForExport } from '../../src/utils/markdownImageSize'

export interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export type CreateNoteInput = Pick<Note, 'title' | 'content'>

function getDataPath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'notes.json')
}

function readNotes(): Note[] {
  const filePath = getDataPath()
  try {
    if (!fs.existsSync(filePath)) {
      return []
    }
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as Note[]
  } catch (err) {
    console.error('Failed to read notes.json:', err)
    return []
  }
}

function writeNotes(notes: Note[]): void {
  const filePath = getDataPath()
  try {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, JSON.stringify(notes, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to write notes.json:', err)
    throw new Error('保存笔记失败')
  }
}

export function getAllNotes(): Note[] {
  return readNotes()
}

export function addNote(input: CreateNoteInput): Note {
  const notes = readNotes()
  const now = new Date().toISOString()
  const note: Note = {
    id: crypto.randomUUID(),
    title: input.title || '未命名笔记',
    content: input.content || '',
    createdAt: now,
    updatedAt: now,
  }
  notes.push(note)
  writeNotes(notes)
  return note
}

export function updateNote(id: string, updates: Partial<CreateNoteInput>): Note {
  const notes = readNotes()
  const index = notes.findIndex((n) => n.id === id)
  if (index === -1) {
    throw new Error('笔记不存在')
  }
  const note = notes[index]
  const updated: Note = {
    ...note,
    ...updates,
    id: note.id,
    createdAt: note.createdAt,
    updatedAt: new Date().toISOString(),
  }
  notes[index] = updated
  writeNotes(notes)
  return updated
}

export function deleteNote(id: string): void {
  const notes = readNotes()
  const filtered = notes.filter((n) => n.id !== id)
  if (filtered.length === notes.length) {
    throw new Error('笔记不存在')
  }
  writeNotes(filtered)
}

function ensureImagesDir(): string {
  const imagesDir = path.join(app.getPath('userData'), 'images')
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true })
  }
  return imagesDir
}

export function copyImage(sourcePath: string): string {
  const imagesDir = ensureImagesDir()

  const ext = path.extname(sourcePath) || '.png'
  const filename = `${crypto.randomUUID()}${ext}`
  const destPath = path.join(imagesDir, filename)

  fs.copyFileSync(sourcePath, destPath)

  return `flowdesk://images/${filename}`
}

export function saveImageFromBuffer(buffer: Buffer, mimeType: string): string {
  const imagesDir = ensureImagesDir()

  const extMap: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/bmp': '.bmp',
  }
  const ext = extMap[mimeType] || '.png'
  const filename = `${crypto.randomUUID()}${ext}`
  const destPath = path.join(imagesDir, filename)

  fs.writeFileSync(destPath, buffer)

  return `flowdesk://images/${filename}`
}

export async function exportNoteFile(noteId: string, destPath: string): Promise<{ hasImages: boolean }> {
  const notes = readNotes()
  const note = notes.find((n) => n.id === noteId)
  if (!note) {
    throw new Error('笔记不存在')
  }

  const exported = convertFlowdeskImagesForExport(note.content)
  const imageFiles = exported.imageFiles

  if (imageFiles.length === 0) {
    fs.writeFileSync(destPath, exported.content, 'utf-8')
    return { hasImages: false }
  }

  const imagesDir = ensureImagesDir()
  const { ZipArchive } = await import('archiver')
  const output = fs.createWriteStream(destPath)
  const archive = new ZipArchive({ zlib: { level: 9 } })

  archive.on('error', (err) => {
    output.destroy()
    throw err
  })

  archive.pipe(output)

  const safeTitle = note.title.replace(/[<>:"/\\|?*]/g, '_') || '未命名笔记'
  archive.append(exported.content, { name: `${safeTitle}.md` })

  for (const imgFile of imageFiles) {
    const imgPath = path.join(imagesDir, imgFile)
    if (fs.existsSync(imgPath)) {
      archive.file(imgPath, { name: `images/${imgFile}` })
    }
  }

  await archive.finalize()
  await new Promise<void>((resolve) => {
    output.on('close', () => resolve())
  })
  return { hasImages: true }
}
