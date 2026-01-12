# Whisper MCP Server

A lightweight MCP (Model Context Protocol) server for local audio transcription using [whisper.cpp](https://github.com/ggerganov/whisper.cpp). There are [several Whisper MCP implementations](https://github.com/search?q=whisper+mcp&type=repositories) out there. This one is minimal and pairs with [apple-voice-memo-mcp](https://github.com/jwulff/apple-voice-memo-mcp) for a complete voice memo workflow.

## Features

- **Local transcription** - All processing happens on your machine
- **Multiple models** - Choose from tiny, base, small, medium, or large models
- **Various formats** - Supports wav, mp3, m4a, and other audio formats
- **Timestamps** - Get transcriptions with or without timestamps

## Requirements

- macOS (tested on Apple Silicon)
- Node.js 18+
- whisper-cpp: `brew install whisper-cpp`
- ffmpeg: `brew install ffmpeg`

## Installation

```bash
npm install -g whisper-mcp
```

Or run directly:

```bash
npx whisper-mcp
```

## Configuration

### Claude Desktop

Add to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "whisper-mcp": {
      "command": "npx",
      "args": ["-y", "whisper-mcp"]
    }
  }
}
```

After editing, restart Claude Desktop.

### Claude Code (CLI)

For Claude Code, add to your project's `.mcp.json` file:

```json
{
  "mcpServers": {
    "whisper-mcp": {
      "command": "npx",
      "args": ["-y", "whisper-mcp"]
    }
  }
}
```

Or for user-wide configuration, add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "whisper-mcp": {
      "command": "npx",
      "args": ["-y", "whisper-mcp"]
    }
  }
}
```

**Tip**: Use `/mcp` in Claude Code to verify the server is connected.

### Local Development Setup

If running from source instead of npm:

```json
{
  "mcpServers": {
    "whisper-mcp": {
      "command": "node",
      "args": ["/path/to/whisper-mcp/dist/index.js"]
    }
  }
}
```

### With Apple Voice Memos MCP

For a complete voice memo workflow, use alongside apple-voice-memo-mcp:

```json
{
  "mcpServers": {
    "apple-voice-memo-mcp": {
      "command": "npx",
      "args": ["-y", "apple-voice-memo-mcp"]
    },
    "whisper-mcp": {
      "command": "npx",
      "args": ["-y", "whisper-mcp"]
    }
  }
}
```

## MCP Tools

### `transcribe_audio`

Transcribe an audio file using Whisper.

**Parameters:**
- `file_path` (required): Absolute path to the audio file
- `model` (optional): Model to use (tiny.en, base.en, small.en, medium.en, large). Default: base.en
- `language` (optional): Language code. Default: en
- `output_format` (optional): text, timestamps, or json. Default: text

**Example:**
```json
{
  "file_path": "/path/to/audio.m4a",
  "model": "medium.en",
  "output_format": "timestamps"
}
```

### `list_whisper_models`

List available Whisper models and their download status.

**Returns:**
```json
{
  "models": [
    {
      "name": "base.en",
      "size": "142 MB",
      "downloaded": true,
      "path": "/Users/you/.whisper/ggml-base.en.bin"
    }
  ]
}
```

### `download_whisper_model`

Download a Whisper model for local use.

**Parameters:**
- `model` (required): Model to download (tiny.en, base.en, small.en, medium.en, large)

## Models

| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| tiny.en | 75 MB | Fastest | Basic |
| base.en | 142 MB | Fast | Good |
| small.en | 466 MB | Medium | Better |
| medium.en | 1.5 GB | Slow | Great |
| large | 2.9 GB | Slowest | Best |

Models are stored in `~/.whisper/`.

## Workflow Example

1. List your voice memos: `list_voice_memos`
2. Get audio path: `get_audio` with memo ID
3. Transcribe: `transcribe_audio` with the file path
4. Save to your vault

## Development

```bash
# Clone and install
git clone https://github.com/jwulff/whisper-mcp.git
cd whisper-mcp
npm install

# Build
npm run build

# Test with MCP inspector
npm run inspector
```

## License

MIT
