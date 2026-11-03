# Open in Obsidian

A Claude Code mod that puts an **Open in Obsidian** button under every edit Claude makes to a note in an Obsidian vault. Click it and the note opens in Obsidian.

It exists because the Claude desktop app doesn't open `obsidian://` links when you click them in chat. Claude can write the link, but nothing happens on click.

## What it does

- **Inline button:** when Claude creates or edits a markdown file inside an Obsidian vault (with its Write or Edit tools), an **Open in Obsidian** button appears right under that edit in the conversation.
- **`/obsidian`:** opens a side panel listing every vault note Claude touched this session, newest first, each one a button.
- **No setup:** it finds the vault on its own by looking for the `.obsidian` folder above the edited file, so it works with any vault, or several.

Files outside a vault, and Obsidian's own settings files in `.obsidian/`, are ignored. Edits Claude makes with shell commands don't get a button.

## Requirements

- macOS (it opens notes with the macOS `open` command).
- Claude Code with mod (function hooks) support, in the Claude desktop app or a terminal.
- Obsidian installed, with the vault opened in it at least once.

## Install

In the Claude desktop app: click **+** next to the prompt box, then **Plugins**, **Add marketplace**, enter `ben-rosenthal/open-in-obsidian`, then **Add plugin**.

At the prompt of a terminal Claude Code session:

```
/plugin install open-in-obsidian --marketplace ben-rosenthal/open-in-obsidian
```

Or from a shell:

```bash
claude plugin install open-in-obsidian --marketplace ben-rosenthal/open-in-obsidian
```

## How it works

When Claude edits a note, the mod finds the vault that holds it and builds Obsidian's own link, `obsidian://open?vault=<vault>&file=<path>`. Pressing the button runs `open` with that link, which hands it to Obsidian.

## License

MIT
