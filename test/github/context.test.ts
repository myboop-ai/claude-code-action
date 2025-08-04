import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import {
  parseMultilineInput,
  parseAdditionalPermissions,
} from "../../src/github/context";

describe("parseMultilineInput", () => {
  it("should parse a comma-separated string", () => {
    const input = `Bash(bun install),Bash(bun test:*),Bash(bun typecheck)`;
    const result = parseMultilineInput(input);
    expect(result).toEqual([
      "Bash(bun install)",
      "Bash(bun test:*)",
      "Bash(bun typecheck)",
    ]);
  });

  it("should parse multiline string", () => {
    const input = `Bash(bun install)
Bash(bun test:*)
Bash(bun typecheck)`;
    const result = parseMultilineInput(input);
    expect(result).toEqual([
      "Bash(bun install)",
      "Bash(bun test:*)",
      "Bash(bun typecheck)",
    ]);
  });

  it("should parse comma-separated multiline line", () => {
    const input = `Bash(bun install),Bash(bun test:*)
Bash(bun typecheck)`;
    const result = parseMultilineInput(input);
    expect(result).toEqual([
      "Bash(bun install)",
      "Bash(bun test:*)",
      "Bash(bun typecheck)",
    ]);
  });

  it("should ignore comments", () => {
    const input = `Bash(bun install),
Bash(bun test:*) # For testing
# For type checking
Bash(bun typecheck)
`;
    const result = parseMultilineInput(input);
    expect(result).toEqual([
      "Bash(bun install)",
      "Bash(bun test:*)",
      "Bash(bun typecheck)",
    ]);
  });

  it("should parse an empty string", () => {
    const input = "";
    const result = parseMultilineInput(input);
    expect(result).toEqual([]);
  });
});

describe("parseAdditionalPermissions", () => {
  it("should parse single permission", () => {
    const input = "actions: read";
    const result = parseAdditionalPermissions(input);
    expect(result.get("actions")).toBe("read");
    expect(result.size).toBe(1);
  });

  it("should parse multiple permissions", () => {
    const input = `actions: read
packages: write
contents: read`;
    const result = parseAdditionalPermissions(input);
    expect(result.get("actions")).toBe("read");
    expect(result.get("packages")).toBe("write");
    expect(result.get("contents")).toBe("read");
    expect(result.size).toBe(3);
  });

  it("should handle empty string", () => {
    const input = "";
    const result = parseAdditionalPermissions(input);
    expect(result.size).toBe(0);
  });

  it("should handle whitespace and empty lines", () => {
    const input = `
    actions: read

    packages: write
    `;
    const result = parseAdditionalPermissions(input);
    expect(result.get("actions")).toBe("read");
    expect(result.get("packages")).toBe("write");
    expect(result.size).toBe(2);
  });

  it("should ignore lines without colon separator", () => {
    const input = `actions: read
invalid line
packages: write`;
    const result = parseAdditionalPermissions(input);
    expect(result.get("actions")).toBe("read");
    expect(result.get("packages")).toBe("write");
    expect(result.size).toBe(2);
  });

  it("should trim whitespace around keys and values", () => {
    const input = "  actions  :  read  ";
    const result = parseAdditionalPermissions(input);
    expect(result.get("actions")).toBe("read");
    expect(result.size).toBe(1);
  });
});

describe("parseGitHubContext - repository override", () => {
  // Store original env vars
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear module cache to ensure fresh imports
    mock.module("@actions/github", () => ({
      context: {
        eventName: "issues",
        repo: {
          owner: "original",
          repo: "repo"
        },
        actor: "testuser",
        payload: {
          action: "opened",
          issue: {
            number: 1,
            title: "Test issue",
            body: "Test body"
          }
        }
      }
    }));

    // Setup minimal env vars
    process.env.GITHUB_RUN_ID = "12345";
    process.env.MODE = "tag"; // Default mode
  });

  afterEach(() => {
    // Restore original env vars
    Object.keys(process.env).forEach(key => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
    mock.restore();
  });

  it("should use default repository when TARGET_REPOSITORY is not set", async () => {
    const { parseGitHubContext } = await import("../../src/github/context");
    const context = parseGitHubContext();
    expect(context.repository.owner).toBe("original");
    expect(context.repository.repo).toBe("repo");
    expect(context.repository.full_name).toBe("original/repo");
  });

  it("should override repository when valid TARGET_REPOSITORY is set", async () => {
    process.env.TARGET_REPOSITORY = "override/repository";
    const { parseGitHubContext } = await import("../../src/github/context");
    const context = parseGitHubContext();
    expect(context.repository.owner).toBe("override");
    expect(context.repository.repo).toBe("repository");
    expect(context.repository.full_name).toBe("override/repository");
  });

  it("should trim whitespace from repository parts", async () => {
    process.env.TARGET_REPOSITORY = " override / repository ";
    const { parseGitHubContext } = await import("../../src/github/context");
    const context = parseGitHubContext();
    expect(context.repository.owner).toBe("override");
    expect(context.repository.repo).toBe("repository");
    expect(context.repository.full_name).toBe("override/repository");
  });

  it("should throw error for invalid repository format - no slash", async () => {
    process.env.TARGET_REPOSITORY = "invalidformat";
    const { parseGitHubContext } = await import("../../src/github/context");
    expect(() => parseGitHubContext()).toThrow(
      'Invalid TARGET_REPOSITORY format: "invalidformat". Expected "owner/repo" (e.g., "octocat/hello-world").'
    );
  });

  it("should throw error for invalid repository format - multiple slashes", async () => {
    process.env.TARGET_REPOSITORY = "owner/repo/extra";
    const { parseGitHubContext } = await import("../../src/github/context");
    expect(() => parseGitHubContext()).toThrow(
      'Invalid TARGET_REPOSITORY format: "owner/repo/extra". Expected "owner/repo" (e.g., "octocat/hello-world").'
    );
  });

  it("should throw error for empty owner", async () => {
    process.env.TARGET_REPOSITORY = "/repo";
    const { parseGitHubContext } = await import("../../src/github/context");
    expect(() => parseGitHubContext()).toThrow(
      'Invalid TARGET_REPOSITORY format: "/repo". Expected "owner/repo" (e.g., "octocat/hello-world").'
    );
  });

  it("should throw error for empty repo", async () => {
    process.env.TARGET_REPOSITORY = "owner/";
    const { parseGitHubContext } = await import("../../src/github/context");
    expect(() => parseGitHubContext()).toThrow(
      'Invalid TARGET_REPOSITORY format: "owner/". Expected "owner/repo" (e.g., "octocat/hello-world").'
    );
  });

  it("should throw error for whitespace-only parts", async () => {
    process.env.TARGET_REPOSITORY = "  /  ";
    const { parseGitHubContext } = await import("../../src/github/context");
    expect(() => parseGitHubContext()).toThrow(
      'Invalid TARGET_REPOSITORY format: "  /  ". Expected "owner/repo" (e.g., "octocat/hello-world").'
    );
  });
});
