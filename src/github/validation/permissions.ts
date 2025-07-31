import * as core from "@actions/core";
import type { ParsedGitHubContext } from "../context";
import type { Octokit } from "@octokit/rest";

/**
 * Check if the actor has write permissions to the repository
 * or is in the allowed actors list
 * @param octokit - The Octokit REST client
 * @param context - The GitHub context
 * @returns true if the actor has write permissions, false otherwise
 */
export async function checkWritePermissions(
  octokit: Octokit,
  context: ParsedGitHubContext,
): Promise<boolean> {
  const { repository, actor, inputs } = context;

  try {
    core.info(`Checking permissions for actor: ${actor}`);

    // First check if actor is in the allowed actors list
    if (inputs.allowedActors && inputs.allowedActors.length > 0) {
      const isAllowed = inputs.allowedActors.some(
        (allowedActor) => allowedActor.toLowerCase() === actor.toLowerCase(),
      );
      if (isAllowed) {
        core.info(
          `Actor ${actor} is in the allowed actors list, bypassing permission check`,
        );
        return true;
      }
    }

    // If not in allowed list, check permissions directly using the permission endpoint
    core.info(
      `Actor ${actor} not in allowed list, checking repository permissions`,
    );
    const response = await octokit.repos.getCollaboratorPermissionLevel({
      owner: repository.owner,
      repo: repository.repo,
      username: actor,
    });

    const permissionLevel = response.data.permission;
    core.info(`Permission level retrieved: ${permissionLevel}`);

    if (permissionLevel === "admin" || permissionLevel === "write") {
      core.info(`Actor has write access: ${permissionLevel}`);
      return true;
    } else {
      core.warning(`Actor has insufficient permissions: ${permissionLevel}`);
      return false;
    }
  } catch (error) {
    core.error(`Failed to check permissions: ${error}`);
    throw new Error(`Failed to check permissions for ${actor}: ${error}`);
  }
}
