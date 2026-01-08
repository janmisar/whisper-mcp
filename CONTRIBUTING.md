# Contributing to whisper-mcp

Thank you for your interest in contributing to whisper-mcp! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites

- Node.js 18.0.0 or higher
- npm
- whisper.cpp (`brew install whisper-cpp`)
- ffmpeg (`brew install ffmpeg`)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jwulff/whisper-mcp.git
   cd whisper-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Download a Whisper model:
   ```bash
   mkdir -p ~/.whisper
   curl -L "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin" -o ~/.whisper/ggml-base.en.bin
   ```

### Running Tests

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Code Quality

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Check formatting
npm run format:check

# Format code
npm run format

# Type check
npm run typecheck
```

## Project Structure

```
whisper-mcp/
├── src/
│   ├── index.ts          # Entry point and MCP server
│   └── tools/            # Tool implementations
│       ├── transcribe.ts # Audio transcription
│       └── models.ts     # Model management
├── tests/                # Test files (mirrors src structure)
└── dist/                 # Compiled output
```

## Making Changes

### Coding Standards

- Use TypeScript for all new code
- Follow the existing code style (enforced by ESLint and Prettier)
- Write tests for new functionality
- Maintain or improve test coverage
- Add JSDoc comments for public APIs

### Commit Messages

We use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Pull Requests

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Ensure tests pass and coverage is maintained
5. Submit a pull request

### Pull Request Checklist

- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Code is formatted (`npm run format:check`)
- [ ] Types are correct (`npm run typecheck`)
- [ ] Test coverage is maintained or improved
- [ ] Documentation is updated if needed

## Architecture

### MCP Server

The server implements the Model Context Protocol (MCP) with the following tools:

- `transcribe_audio`: Transcribe audio files using Whisper
- `list_whisper_models`: List available models and their download status
- `download_whisper_model`: Download a Whisper model from HuggingFace

### Audio Processing

1. Audio files are converted to 16kHz mono WAV using ffmpeg
2. whisper-cli processes the WAV file with the specified model
3. Output is parsed to extract text and timestamps
4. Temporary WAV file is cleaned up

### Model Management

Models are stored in `~/.whisper/` and downloaded from HuggingFace:
- `tiny.en` (75 MB) - Fastest, lowest quality
- `base.en` (142 MB) - Good balance (default)
- `small.en` (466 MB) - Better quality
- `medium.en` (1.5 GB) - High quality
- `large` (2.9 GB) - Best quality, multilingual

## Reporting Issues

When reporting issues, please include:

- OS version
- Node.js version
- whisper-cpp version (`whisper-cli --version`)
- ffmpeg version (`ffmpeg -version`)
- Steps to reproduce
- Expected vs actual behavior
- Any error messages

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
