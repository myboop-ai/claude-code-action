#!/usr/bin/env bun

/**
 * Check if the action trigger is from a human actor
 * Prevents automated tools or bots from triggering Claude
 */

import type { Octokit } from "@octokit/rest";
import type { ParsedGitHubContext } from "../context";

export async function checkHumanActor(
  octokit: Octokit,
  githubContext: ParsedGitHubContext,
) {
  // Check if actor is in the allowed actors list
  if (githubContext.inputs.allowedActors && githubContext.inputs.allowedActors.length > 0) {
    const isAllowed = githubContext.inputs.allowedActors.some(
      (allowedActor) => allowedActor.toLowerCase() === githubContext.actor.toLowerCase()
    );
    if (isAllowed) {
      console.log(`Actor ${githubContext.actor} is in the allowed actors list, bypassing human check`);
      return;
    }
  }

  // Fetch user information from GitHub API
  const { data: userData } = await octokit.users.getByUsername({
    username: githubContext.actor,
  });

  const actorType = userData.type;

  console.log(`Actor type: ${actorType}`);

  if (actorType !== "User") {
    throw new Error(
      `Workflow initiated by non-human actor: ${githubContext.actor} (type: ${actorType}).`,
    );
  }

  console.log(`Verified human actor: ${githubContext.actor}`);
}
