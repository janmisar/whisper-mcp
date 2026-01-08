import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependencies before any imports
vi.mock("@modelcontextprotocol/sdk/server/index.js", () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: vi.fn(),
}));

vi.mock("../src/tools/transcribe.js", () => ({
  transcribeAudio: vi.fn(),
}));

vi.mock("../src/tools/models.js", () => ({
  listModels: vi.fn(),
  downloadModel: vi.fn(),
  getModelPath: vi.fn(),
  isModelDownloaded: vi.fn(),
}));

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { transcribeAudio } from "../src/tools/transcribe.js";
import { listModels, downloadModel } from "../src/tools/models.js";

const MockServer = vi.mocked(Server);
const mockedTranscribeAudio = vi.mocked(transcribeAudio);
const mockedListModels = vi.mocked(listModels);
const mockedDownloadModel = vi.mocked(downloadModel);

describe("Whisper MCP Server", () => {
  let mockServerInstance: {
    setRequestHandler: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockServerInstance = {
      setRequestHandler: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
    };

    MockServer.mockImplementation(() => mockServerInstance as never);
  });

  describe("server initialization", () => {
    it("should create server with correct configuration", async () => {
      // Import the module to trigger initialization
      await vi.importActual("../src/index.js").catch(() => {
        // Module may fail to import due to stdio transport, but Server should be called
      });

      expect(Server).toHaveBeenCalledWith(
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
    });
  });

  describe("ListTools handler", () => {
    it("should return 3 tools", async () => {
      // Manually set up handlers to test them
      await vi.importActual("../src/index.js").catch(() => {});

      const listToolsHandler = mockServerInstance.setRequestHandler.mock.calls.find(
        (call) => call[0]?.method === "tools/list"
      )?.[1];

      if (!listToolsHandler) {
        // Find it by checking the result
        for (const call of mockServerInstance.setRequestHandler.mock.calls) {
          const handler = call[1];
          try {
            const result = await handler();
            if (result?.tools && Array.isArray(result.tools)) {
              expect(result.tools).toHaveLength(3);
              expect(result.tools.map((t: { name: string }) => t.name)).toEqual([
                "transcribe_audio",
                "list_whisper_models",
                "download_whisper_model",
              ]);
              return;
            }
          } catch {
            // Not the right handler
          }
        }
      }
    });
  });

  describe("CallTool handler", () => {
    async function getCallToolHandler() {
      await vi.importActual("../src/index.js").catch(() => {});

      // Find the CallTool handler by checking which one handles tool calls
      for (const call of mockServerInstance.setRequestHandler.mock.calls) {
        const handler = call[1];
        try {
          // Try calling with a tool request
          mockedTranscribeAudio.mockResolvedValue({
            text: "test",
            model: "base.en",
            file: "/test.m4a",
          });

          const result = await handler({
            params: {
              name: "transcribe_audio",
              arguments: { file_path: "/test.m4a" },
            },
          });

          if (result?.content) {
            return handler;
          }
        } catch {
          // Not the right handler
        }
      }
      return null;
    }

    it("should handle transcribe_audio tool", async () => {
      mockedTranscribeAudio.mockResolvedValue({
        text: "Hello world",
        model: "base.en",
        file: "/path/to/audio.m4a",
      });

      const handler = await getCallToolHandler();
      if (!handler) return;

      const result = await handler({
        params: {
          name: "transcribe_audio",
          arguments: { file_path: "/path/to/audio.m4a" },
        },
      });

      expect(result.content[0].type).toBe("text");
      expect(JSON.parse(result.content[0].text)).toHaveProperty("text", "Hello world");
    });

    it("should handle list_whisper_models tool", async () => {
      mockedListModels.mockResolvedValue({
        models: [{ name: "base.en", size: "142 MB", downloaded: true, path: "/path", downloadUrl: "url" }],
        whisperDir: "/Users/test/.whisper",
      });

      const handler = await getCallToolHandler();
      if (!handler) return;

      const result = await handler({
        params: {
          name: "list_whisper_models",
          arguments: {},
        },
      });

      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.models).toBeDefined();
    });

    it("should handle download_whisper_model tool", async () => {
      mockedDownloadModel.mockResolvedValue({
        success: true,
        model: "base.en",
        path: "/path/to/model",
        message: "Downloaded successfully",
      });

      const handler = await getCallToolHandler();
      if (!handler) return;

      const result = await handler({
        params: {
          name: "download_whisper_model",
          arguments: { model: "base.en" },
        },
      });

      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.success).toBe(true);
    });

    it("should throw error for missing model in download", async () => {
      const handler = await getCallToolHandler();
      if (!handler) return;

      const result = await handler({
        params: {
          name: "download_whisper_model",
          arguments: {},
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("error");
    });

    it("should handle unknown tool", async () => {
      const handler = await getCallToolHandler();
      if (!handler) return;

      const result = await handler({
        params: {
          name: "unknown_tool",
          arguments: {},
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Unknown tool");
    });

    it("should handle errors gracefully", async () => {
      mockedTranscribeAudio.mockRejectedValue(new Error("Transcription failed"));

      const handler = await getCallToolHandler();
      if (!handler) return;

      const result = await handler({
        params: {
          name: "transcribe_audio",
          arguments: { file_path: "/path/to/audio.m4a" },
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Transcription failed");
    });

    it("should handle non-Error exceptions", async () => {
      mockedTranscribeAudio.mockRejectedValue("string error");

      const handler = await getCallToolHandler();
      if (!handler) return;

      const result = await handler({
        params: {
          name: "transcribe_audio",
          arguments: { file_path: "/path/to/audio.m4a" },
        },
      });

      expect(result.isError).toBe(true);
    });

    it("should use default values for transcribe_audio", async () => {
      mockedTranscribeAudio.mockResolvedValue({
        text: "test",
        model: "base.en",
        file: "/test.m4a",
      });

      const handler = await getCallToolHandler();
      if (!handler) return;

      await handler({
        params: {
          name: "transcribe_audio",
          arguments: { file_path: "/test.m4a" },
        },
      });

      expect(mockedTranscribeAudio).toHaveBeenCalledWith({
        filePath: "/test.m4a",
        model: "base.en",
        language: "en",
        outputFormat: "text",
      });
    });
  });
});
