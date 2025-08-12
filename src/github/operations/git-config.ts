#!/usr/bin/env node

/**
 * Configure git authentication for non-signing mode
 * Sets up git user and authentication to work with GitHub App tokens
 */

import { execSync } from "child_process";
import type { ParsedGitHubContext } from "../context";
import { GITHUB_SERVER_URL } from "../api/config";

type GitUser = {
  login: string;
  id: number;
};

export function configureGitAuth(
  githubToken: string,
  context: ParsedGitHubContext,
  user: GitUser | null,
) {
  console.log("Configuring git authentication for non-signing mode");

  // Determine the noreply email domain based on GITHUB_SERVER_URL
  const serverUrl = new URL(GITHUB_SERVER_URL);
  const noreplyDomain =
    serverUrl.hostname === "github.com"
      ? "users.noreply.github.com"
      : `users.noreply.${serverUrl.hostname}`;

  // Configure git user based on the comment creator
  console.log("Configuring git user...");
  if (user) {
    const botName = user.login;
    const botId = user.id;
    console.log(`Setting git user as ${botName}...`);
    execSync(`git config user.name "${botName}"`, { encoding: 'utf8' });
    execSync(`git config user.email "${botId}+${botName}@${noreplyDomain}"`, { encoding: 'utf8' });
    console.log(`✓ Set git user as ${botName}`);
  } else {
    console.log("No user data in comment, using default bot user");
    execSync(`git config user.name "github-actions[bot]"`, { encoding: 'utf8' });
    execSync(`git config user.email "41898282+github-actions[bot]@${noreplyDomain}"`, { encoding: 'utf8' });
  }

  // Remove the authorization header that actions/checkout sets
  console.log("Removing existing git authentication headers...");
  try {
    execSync(`git config --unset-all http.${GITHUB_SERVER_URL}/.extraheader`, { encoding: 'utf8' });
    console.log("✓ Removed existing authentication headers");
  } catch (e) {
    console.log("No existing authentication headers to remove");
  }

  // Update the remote URL to include the token for authentication
  console.log("Updating remote URL with authentication...");
  const remoteUrl = `https://x-access-token:${githubToken}@${serverUrl.host}/${context.repository.owner}/${context.repository.repo}.git`;
  execSync(`git remote set-url origin ${remoteUrl}`, { encoding: 'utf8' });
  console.log("✓ Updated remote URL with authentication token");

  console.log("Git authentication configured successfully");
}
