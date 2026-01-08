import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";

// Mock dependencies
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

vi.mock("os", () => ({
  tmpdir: vi.fn(() => "/tmp"),
  homedir: vi.fn(() => "/Users/testuser"),
}));

vi.mock("child_process", () => ({
  exec: vi.fn(),
}));

vi.mock("util", () => ({
  promisify: vi.fn((fn) => {
    return async (...args: unknown[]) => {
      return new Promise((resolve, reject) => {
        fn(...args, (err: Error | null, result: unknown) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
    };
  }),
}));

vi.mock("../../src/tools/models.js", () => ({
  getModelPath: vi.fn(() => "/Users/testuser/.whisper/ggml-base.en.bin"),
  isModelDownloaded: vi.fn(() => true),
}));

import { exec } from "child_process";
import { getModelPath, isModelDownloaded } from "../../src/tools/models.js";

const mockedExistsSync = vi.mocked(fs.existsSync);
const mockedUnlinkSync = vi.mocked(fs.unlinkSync);
const mockedExec = vi.mocked(exec);
const mockedIsModelDownloaded = vi.mocked(isModelDownloaded);

describe("transcribe utility", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockedExistsSync.mockReturnValue(true);
    mockedIsModelDownloaded.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("transcribeAudio", () => {
    it("should throw error if file not found", async () => {
      mockedExistsSync.mockImplementation((path) => {
        if (typeof path === "string" && path === "/path/to/audio.m4a") {
          return false;
        }
        return true;
      });

      const { transcribeAudio } = await import("../../src/tools/transcribe.js");

      await expect(
        transcribeAudio({ filePath: "/path/to/audio.m4a" })
      ).rejects.toThrow("File not found");
    });

    it("should throw error if whisper-cli not installed", async () => {
      mockedExistsSync.mockReturnValue(true);

      let callCount = 0;
      mockedExec.mockImplementation((cmd, ...args) => {
        const callback = typeof args[0] === "function" ? args[0] : args[1];
        if (typeof cmd === "string" && cmd.includes("which whisper-cli")) {
          if (typeof callback === "function") {
            callback(new Error("not found"), null as never);
          }
        }
        return {} as never;
      });

      const { transcribeAudio } = await import("../../src/tools/transcribe.js");

      await expect(
        transcribeAudio({ filePath: "/path/to/audio.m4a" })
      ).rejects.toThrow("whisper-cli not found");
    });

    it("should throw error if model not downloaded", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedIsModelDownloaded.mockReturnValue(false);

      mockedExec.mockImplementation((cmd, ...args) => {
        const callback = typeof args[0] === "function" ? args[0] : args[1];
        if (typeof cmd === "string" && cmd.includes("which whisper-cli")) {
          if (typeof callback === "function") {
            callback(null, { stdout: "/usr/local/bin/whisper-cli" } as never);
          }
        }
        return {} as never;
      });

      const { transcribeAudio } = await import("../../src/tools/transcribe.js");

      await expect(
        transcribeAudio({ filePath: "/path/to/audio.m4a" })
      ).rejects.toThrow("Model base.en not downloaded");
    });

    it("should convert audio and transcribe", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedIsModelDownloaded.mockReturnValue(true);

      const whisperOutput = `[00:00:00.000 --> 00:00:05.000] Hello world
[00:00:05.000 --> 00:00:10.000] This is a test`;

      mockedExec.mockImplementation((cmd, ...args) => {
        const callback = typeof args[0] === "function" ? args[0] : args[1];
        if (typeof cmd === "string") {
          if (cmd.includes("which whisper-cli")) {
            if (typeof callback === "function") {
              callback(null, { stdout: "/usr/local/bin/whisper-cli" } as never);
            }
          } else if (cmd.includes("ffmpeg")) {
            if (typeof callback === "function") {
              callback(null, { stdout: "", stderr: "" } as never);
            }
          } else if (cmd.includes("whisper-cli")) {
            if (typeof callback === "function") {
              callback(null, { stdout: whisperOutput, stderr: "" } as never);
            }
          }
        }
        return {} as never;
      });

      const { transcribeAudio } = await import("../../src/tools/transcribe.js");
      const result = await transcribeAudio({ filePath: "/path/to/audio.m4a" });

      expect(result.text).toBe("Hello world This is a test");
      expect(result.model).toBe("base.en");
      expect(result.file).toBe("/path/to/audio.m4a");
    });

    it("should include segments for timestamps format", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedIsModelDownloaded.mockReturnValue(true);

      const whisperOutput = `[00:00:00.000 --> 00:00:05.000] Hello world`;

      mockedExec.mockImplementation((cmd, ...args) => {
        const callback = typeof args[0] === "function" ? args[0] : args[1];
        if (typeof cmd === "string") {
          if (typeof callback === "function") {
            if (cmd.includes("which")) {
              callback(null, { stdout: "/usr/local/bin/whisper-cli" } as never);
            } else {
              callback(null, { stdout: whisperOutput, stderr: "" } as never);
            }
          }
        }
        return {} as never;
      });

      const { transcribeAudio } = await import("../../src/tools/transcribe.js");
      const result = await transcribeAudio({
        filePath: "/path/to/audio.m4a",
        outputFormat: "timestamps",
      });

      expect(result.segments).toBeDefined();
      expect(result.segments).toHaveLength(1);
      expect(result.segments![0].text).toBe("Hello world");
      expect(result.segments![0].start).toBe(0);
      expect(result.segments![0].end).toBe(5);
    });

    it("should include segments for json format", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedIsModelDownloaded.mockReturnValue(true);

      const whisperOutput = `[00:00:00.000 --> 00:00:05.000] Test`;

      mockedExec.mockImplementation((cmd, ...args) => {
        const callback = typeof args[0] === "function" ? args[0] : args[1];
        if (typeof cmd === "string" && typeof callback === "function") {
          if (cmd.includes("which")) {
            callback(null, { stdout: "/bin/whisper-cli" } as never);
          } else {
            callback(null, { stdout: whisperOutput, stderr: "" } as never);
          }
        }
        return {} as never;
      });

      const { transcribeAudio } = await import("../../src/tools/transcribe.js");
      const result = await transcribeAudio({
        filePath: "/path/to/audio.m4a",
        outputFormat: "json",
      });

      expect(result.segments).toBeDefined();
    });

    it("should clean up temp wav file after success", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedIsModelDownloaded.mockReturnValue(true);

      mockedExec.mockImplementation((cmd, ...args) => {
        const callback = typeof args[0] === "function" ? args[0] : args[1];
        if (typeof cmd === "string" && typeof callback === "function") {
          if (cmd.includes("which")) {
            callback(null, { stdout: "/bin/whisper-cli" } as never);
          } else {
            callback(null, { stdout: "[00:00:00.000 --> 00:00:01.000] test", stderr: "" } as never);
          }
        }
        return {} as never;
      });

      const { transcribeAudio } = await import("../../src/tools/transcribe.js");
      await transcribeAudio({ filePath: "/path/to/audio.m4a" });

      expect(mockedUnlinkSync).toHaveBeenCalled();
    });

    it("should clean up temp wav file on error", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedIsModelDownloaded.mockReturnValue(true);

      mockedExec.mockImplementation((cmd, ...args) => {
        const callback = typeof args[0] === "function" ? args[0] : args[1];
        if (typeof cmd === "string" && typeof callback === "function") {
          if (cmd.includes("which")) {
            callback(null, { stdout: "/bin/whisper-cli" } as never);
          } else if (cmd.includes("ffmpeg")) {
            callback(null, { stdout: "", stderr: "" } as never);
          } else if (cmd.includes("whisper-cli")) {
            callback(new Error("Transcription failed"), null as never);
          }
        }
        return {} as never;
      });

      const { transcribeAudio } = await import("../../src/tools/transcribe.js");

      await expect(
        transcribeAudio({ filePath: "/path/to/audio.m4a" })
      ).rejects.toThrow();

      expect(mockedUnlinkSync).toHaveBeenCalled();
    });

    it("should use custom model", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedIsModelDownloaded.mockReturnValue(true);

      let whisperCommand = "";
      mockedExec.mockImplementation((cmd, ...args) => {
        const callback = typeof args[0] === "function" ? args[0] : args[1];
        if (typeof cmd === "string") {
          if (cmd.includes("whisper-cli") && !cmd.includes("which")) {
            whisperCommand = cmd;
          }
          if (typeof callback === "function") {
            if (cmd.includes("which")) {
              callback(null, { stdout: "/bin/whisper-cli" } as never);
            } else {
              callback(null, { stdout: "[00:00:00.000 --> 00:00:01.000] test", stderr: "" } as never);
            }
          }
        }
        return {} as never;
      });

      const { transcribeAudio } = await import("../../src/tools/transcribe.js");
      const result = await transcribeAudio({
        filePath: "/path/to/audio.m4a",
        model: "medium.en",
      });

      expect(result.model).toBe("medium.en");
    });

    it("should use custom language", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedIsModelDownloaded.mockReturnValue(true);

      let whisperCommand = "";
      mockedExec.mockImplementation((cmd, ...args) => {
        const callback = typeof args[0] === "function" ? args[0] : args[1];
        if (typeof cmd === "string") {
          if (cmd.includes("whisper-cli") && !cmd.includes("which")) {
            whisperCommand = cmd;
          }
          if (typeof callback === "function") {
            if (cmd.includes("which")) {
              callback(null, { stdout: "/bin/whisper-cli" } as never);
            } else {
              callback(null, { stdout: "[00:00:00.000 --> 00:00:01.000] test", stderr: "" } as never);
            }
          }
        }
        return {} as never;
      });

      const { transcribeAudio } = await import("../../src/tools/transcribe.js");
      await transcribeAudio({
        filePath: "/path/to/audio.m4a",
        language: "es",
      });

      expect(whisperCommand).toContain("-l es");
    });

    it("should handle output with no timestamps", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedIsModelDownloaded.mockReturnValue(true);

      const whisperOutput = `Plain text output without timestamps
More text here`;

      mockedExec.mockImplementation((cmd, ...args) => {
        const callback = typeof args[0] === "function" ? args[0] : args[1];
        if (typeof cmd === "string" && typeof callback === "function") {
          if (cmd.includes("which")) {
            callback(null, { stdout: "/bin/whisper-cli" } as never);
          } else {
            callback(null, { stdout: whisperOutput, stderr: "" } as never);
          }
        }
        return {} as never;
      });

      const { transcribeAudio } = await import("../../src/tools/transcribe.js");
      const result = await transcribeAudio({ filePath: "/path/to/audio.m4a" });

      expect(result.text).toContain("Plain text output");
    });

    it("should skip lines starting with [", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedIsModelDownloaded.mockReturnValue(true);

      const whisperOutput = `[WARN] Some warning
Plain text here`;

      mockedExec.mockImplementation((cmd, ...args) => {
        const callback = typeof args[0] === "function" ? args[0] : args[1];
        if (typeof cmd === "string" && typeof callback === "function") {
          if (cmd.includes("which")) {
            callback(null, { stdout: "/bin/whisper-cli" } as never);
          } else {
            callback(null, { stdout: whisperOutput, stderr: "" } as never);
          }
        }
        return {} as never;
      });

      const { transcribeAudio } = await import("../../src/tools/transcribe.js");
      const result = await transcribeAudio({ filePath: "/path/to/audio.m4a" });

      expect(result.text).not.toContain("WARN");
    });

    it("should handle hour timestamps", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedIsModelDownloaded.mockReturnValue(true);

      const whisperOutput = `[01:30:00.000 --> 01:30:05.000] Long recording`;

      mockedExec.mockImplementation((cmd, ...args) => {
        const callback = typeof args[0] === "function" ? args[0] : args[1];
        if (typeof cmd === "string" && typeof callback === "function") {
          if (cmd.includes("which")) {
            callback(null, { stdout: "/bin/whisper-cli" } as never);
          } else {
            callback(null, { stdout: whisperOutput, stderr: "" } as never);
          }
        }
        return {} as never;
      });

      const { transcribeAudio } = await import("../../src/tools/transcribe.js");
      const result = await transcribeAudio({
        filePath: "/path/to/audio.m4a",
        outputFormat: "timestamps",
      });

      expect(result.segments![0].start).toBe(5400); // 1.5 hours in seconds
    });
  });
});
