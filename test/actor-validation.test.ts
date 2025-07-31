import { describe, test, expect, beforeEach, afterEach, spyOn, jest } from "bun:test";
import { checkHumanActor } from "../src/github/validation/actor";
import type { ParsedGitHubContext } from "../src/github/context";

describe("checkHumanActor", () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  const createMockOctokit = () => {
    return {
      users: {
        getByUsername: jest.fn().mockResolvedValue({
          data: { type: "Bot" },
        }),
      },
    } as any;
  };

  const createContext = (overrides: Partial<ParsedGitHubContext> = {}): ParsedGitHubContext => ({
    runId: "12345",
    eventName: "issue_comment",
    eventAction: undefined,
    repository: {
      owner: "test-owner",
      repo: "test-repo",
      full_name: "test-owner/test-repo",
    },
    actor: "test-bot",
    inputs: {
      mode: "tag",
      triggerPhrase: "@claude",
      assigneeTrigger: "",
      labelTrigger: "",
      allowedTools: [],
      allowedActors: [],
      disallowedTools: [],
      customInstructions: "",
      directPrompt: "",
      overridePrompt: "",
      branchPrefix: "claude/",
      useStickyComment: false,
      additionalPermissions: new Map(),
      useCommitSigning: false,
    },
    entityNumber: 123,
    isPR: false,
    payload: {} as any,
    ...overrides,
  });

  test("should throw error when actor is a bot", async () => {
    const mockOctokit = createMockOctokit();
    const context = createContext();
    
    await expect(checkHumanActor(mockOctokit, context)).rejects.toThrow(
      "Workflow initiated by non-human actor: test-bot (type: Bot)."
    );
  });

  test("should bypass check when actor is in allowed actors list", async () => {
    const mockOctokit = createMockOctokit();

    const context = createContext({
      actor: "copilot-pull-request-reviewer",
      inputs: {
        ...createContext().inputs,
        allowedActors: ["copilot-pull-request-reviewer", "another-bot"],
      },
    });

    // Should not throw
    await checkHumanActor(mockOctokit, context);
    
    // Verify the API was never called
    expect(mockOctokit.users.getByUsername).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Actor copilot-pull-request-reviewer is in the allowed actors list, bypassing human check"
    );
  });
});