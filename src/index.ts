#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { transcribeAudio, TranscribeOptions } from "./tools/transcribe.js";
import { listModels, downloadModel, ModelInfo } from "./tools/models.js";

const server = new Server(
  {
    name: "whisper-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "transcribe_audio",
        description:
          "Transcribe an audio file using Whisper. Supports various audio formats (wav, mp3, m4a, etc.). Returns the transcribed text.",
        inputSchema: {
          type: "object" as const,
          properties: {
            file_path: {
              type: "string",
              description: "Absolute path to the audio file to transcribe",
            },
            model: {
              type: "string",
              description:
                "Whisper model to use (tiny.en, base.en, small.en, medium.en, large). Default: base.en",
              enum: ["tiny.en", "base.en", "small.en", "medium.en", "large"],
            },
            language: {
              type: "string",
              description: "Language code (e.g., en, es, fr). Default: en",
            },
            output_format: {
              type: "string",
              description:
                "Output format: text (plain text), timestamps (with timestamps), json (structured). Default: text",
              enum: ["text", "timestamps", "json"],
            },
          },
          required: ["file_path"],
        },
      },
      {
        name: "list_whisper_models",
        description:
          "List available Whisper models and their download status. Shows which models are downloaded locally.",
        inputSchema: {
          type: "object" as const,
          properties: {},
        },
      },
      {
        name: "download_whisper_model",
        description:
          "Download a Whisper model for local transcription. Models are stored in ~/.whisper/",
        inputSchema: {
          type: "object" as const,
          properties: {
            model: {
              type: "string",
              description: "Model to download",
              enum: ["tiny.en", "base.en", "small.en", "medium.en", "large"],
            },
          },
          required: ["model"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "transcribe_audio": {
        const options: TranscribeOptions = {
          filePath: args?.file_path as string,
          model: (args?.model as string) || "base.en",
          language: (args?.language as string) || "en",
          outputFormat:
            (args?.output_format as "text" | "timestamps" | "json") || "text",
        };

        const result = await transcribeAudio(options);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "list_whisper_models": {
        const models = await listModels();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(models, null, 2),
            },
          ],
        };
      }

      case "download_whisper_model": {
        const model = args?.model as string;
        if (!model) {
          throw new Error("Model name is required");
        }
        const result = await downloadModel(model);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: message }),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Whisper MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
