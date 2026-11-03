export type TouchedNote = {
  /** Absolute path of the note. */
  file: string
  /** Absolute path of the vault folder that holds it. */
  vaultRoot: string
  action: 'created' | 'edited'
  at: number
}

declare module 'claude-code' {
  interface PluginState {
    'open-in-obsidian': { notes: Shaped<TouchedNote[]> }
  }
}
