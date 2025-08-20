import { execSync } from "child_process";
import { homedir } from "os";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";

export async function setupClaudeCodeSettings(
  settingsInput?: string,
  homeDir?: string,
) {
  const home = homeDir ?? homedir();
  const settingsPath = `${home}/.claude/settings.json`;
  console.log(`Setting up Claude settings at: ${settingsPath}`);

  // Ensure .claude directory exists
  console.log(`Creating .claude directory...`);
  await mkdir(`${home}/.claude`, { recursive: true });

  let settings: Record<string, unknown> = {};
  try {
    if (existsSync(settingsPath)) {
      const existingSettings = await readFile(settingsPath, 'utf-8');
      if (existingSettings.trim()) {
        settings = JSON.parse(existingSettings);
        console.log(
          `Found existing settings:`,
          JSON.stringify(settings, null, 2),
        );
      } else {
        console.log(`Settings file exists but is empty`);
      }
    } else {
      console.log(`No existing settings file found, creating new one`);
    }
  } catch (e) {
    console.log(`Error reading settings file: ${e}`);
  }

  // Handle settings input (either file path or JSON string)
  if (settingsInput && settingsInput.trim()) {
    console.log(`Processing settings input...`);
    let inputSettings: Record<string, unknown> = {};

    try {
      // First try to parse as JSON
      inputSettings = JSON.parse(settingsInput);
      console.log(`Parsed settings input as JSON`);
    } catch (e) {
      // If not JSON, treat as file path
      console.log(
        `Settings input is not JSON, treating as file path: ${settingsInput}`,
      );
      try {
        const fileContent = await readFile(settingsInput, "utf-8");
        inputSettings = JSON.parse(fileContent);
        console.log(`Successfully read and parsed settings from file`);
      } catch (fileError) {
        console.error(`Failed to read or parse settings file: ${fileError}`);
        throw new Error(`Failed to process settings input: ${fileError}`);
      }
    }

    // Merge input settings with existing settings
    settings = { ...settings, ...inputSettings };
    console.log(`Merged settings with input settings`);
  }

  // Always set enableAllProjectMcpServers to true
  settings.enableAllProjectMcpServers = true;
  console.log(`Updated settings with enableAllProjectMcpServers: true`);

  await writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  console.log(`Settings saved successfully`);
}
