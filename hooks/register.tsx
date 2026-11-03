import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { TouchedNote } from '../types'

const PANE = 'obsidian-notes'
const TITLE = 'Obsidian'

const notes = atom({ plugin: 'open-in-obsidian', key: 'notes' } as const, [], {
  shape: 'notes-2',
})

// The vault that holds a markdown file: the nearest folder above it with an .obsidian folder.
// Notes inside .obsidian itself, and files outside any vault, have none.
async function findVault($: EngineInterface, filePath: string): Promise<string | undefined> {
  if (!filePath.startsWith('/') || !filePath.endsWith('.md') || filePath.includes('/.obsidian/')) return undefined
  let dir = filePath.slice(0, filePath.lastIndexOf('/'))
  while (dir.length > 0) {
    if (await $.fs.exists(`${dir}/.obsidian`)) return dir
    dir = dir.slice(0, dir.lastIndexOf('/'))
  }
  return undefined
}

// Obsidian names a vault after its folder.
function obsidianUri(vaultRoot: string, filePath: string): string {
  const vault = vaultRoot.slice(vaultRoot.lastIndexOf('/') + 1)
  const file = filePath.slice(vaultRoot.length + 1).replace(/\.md$/, '')
  return `obsidian://open?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(file)}`
}

// Newest first, one row per note; a note created earlier this session stays 'created'.
function remember(list: TouchedNote[], note: TouchedNote): TouchedNote[] {
  const prior = list.find(n => n.file === note.file)
  const row = prior?.action === 'created' ? { ...note, action: 'created' as const } : note
  return [row, ...list.filter(n => n.file !== note.file)].slice(0, 50)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'obsidian',
      description: 'List the Obsidian notes Claude touched this session',
    })
    return next(e)
  })

  on('command.run', { command: 'obsidian' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'Obsidian panel opened.' }
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError === true) return ran
    try {
      const vaultRoot = await findVault($, e.file_path)
      if (vaultRoot !== undefined) {
        const note: TouchedNote = { file: e.file_path, vaultRoot, action: 'created', at: Date.now() }
        await update($, notes, list => remember(list, note))
      }
    } catch {
      // The list is a convenience; never let it fail the write itself.
    }
    return ran
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError === true) return ran
    try {
      const vaultRoot = await findVault($, e.file_path)
      if (vaultRoot !== undefined) {
        const note: TouchedNote = { file: e.file_path, vaultRoot, action: 'edited', at: Date.now() }
        await update($, notes, list => remember(list, note))
      }
    } catch {
      // The list is a convenience; never let it fail the edit itself.
    }
    return ran
  }).catch(($, e, next) => next(e))

  // Inline: an "Open in Obsidian" button under each finished Write/Edit row for a vault note.
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const own = await next(e)
    const { tool, input, isRunning, isErrored } = e.props
    if ((tool !== 'Write' && tool !== 'Edit') || isRunning || isErrored) return own
    const filePath = (input as { file_path?: unknown } | null)?.file_path
    if (typeof filePath !== 'string') return own
    const vaultRoot = await findVault($, filePath)
    if (vaultRoot === undefined) return own

    const { Box, Button } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {own}
        <Box>
          <Button
            key={`open-${e.requestId}`}
            label="Open in Obsidian"
            variant="secondary"
            onPress={() => {
              void $.process.run(['open', obsidianUri(vaultRoot, filePath)])
            }}
          />
        </Box>
      </Box>
    )
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const list = await read($, notes)

    return (
      <Box flexDirection="column" gap={1}>
        {list.length === 0 && <Text dimColor>No vault notes touched yet.</Text>}
        {list.map(note => (
          <Box flexDirection="column">
            <Button
              key={note.file}
              label={note.file.slice(note.file.lastIndexOf('/') + 1).replace(/\.md$/, '')}
              onPress={() => {
                void $.process.run(['open', obsidianUri(note.vaultRoot, note.file)])
              }}
            />
            <Text dimColor>
              {note.action} · {note.file.slice(note.vaultRoot.length + 1)}
            </Text>
          </Box>
        ))}
      </Box>
    )
  })
}
