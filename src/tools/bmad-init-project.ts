/**
 * bmad_init_project — Initialize a BMad project by running the OFFICIAL
 * bmad-method installer (npx bmad-method@latest install --tools openclaw)
 * against it, then creating our own orchestration state file.
 *
 * This never installs from a bundled/vendored copy — it always resolves
 * whatever is current on npm, so the project always gets the latest
 * official skill catalog.
 */

import { Type } from "@sinclair/typebox";
import { access } from "node:fs/promises";
import { readState, writeState, createInitialState } from "../lib/state.ts";
import { runOfficialInstall, readInstalledVersion } from "../lib/install.ts";
import { listInstalledSkills } from "../lib/skill-registry.ts";
import type { ToolResult } from "../types.ts";

export const name = "bmad_init_project";
export const description =
  "Initialize a new BMad Method project. Runs the official bmad-method installer (latest, targeting OpenClaw) and creates orchestration state. Run once per project; safe to re-run to update to a newer BMad-METHOD release.";

export const parameters = Type.Object({
  projectPath: Type.String({
    description: "Absolute path to the project root directory",
  }),
  projectName: Type.String({
    description: "Human-readable project name",
  }),
  version: Type.Optional(
    Type.String({
      description:
        'npm dist-tag or exact version to install (e.g. "latest", "next", "6.11.0"). Defaults to "latest".',
    })
  ),
});

export async function execute(
  _id: string,
  params: { projectPath: string; projectName: string; version?: string },
  context: { defaultVersion: string } = { defaultVersion: "latest" }
): Promise<ToolResult> {
  const { projectPath, projectName } = params;
  const version = params.version ?? context.defaultVersion;

  const existing = await readState(projectPath);
  if (existing) {
    return text(
      `Project "${existing.projectName}" is already initialized at ${projectPath}.\n` +
        `Installed BMad-METHOD version: ${existing.installedVersion ?? "unknown"}\n` +
        `Active skill: ${existing.activeSkill?.id ?? "none"}\n` +
        `Completed skills: ${existing.completedSkills.map((w) => w.id).join(", ") || "none"}\n\n` +
        `To pull the latest BMad-METHOD release into this project, re-run \`bmad_init_project\` — the installer is safe to re-run and will update in place.`
    );
  }

  try {
    await access(projectPath);
  } catch {
    return text(`Error: Project directory does not exist: ${projectPath}`);
  }

  const result = await runOfficialInstall({
    projectPath,
    userName: "User",
    version,
  });

  if (!result.ok) {
    return text(
      `Error: the official bmad-method installer failed.\n\n` +
        `Command: npx -y bmad-method@${version} install ...\n\n` +
        `stderr:\n${result.stderr}\n\n` +
        `stdout:\n${result.stdout}\n\n` +
        `Common causes: Node/npm not available in this environment, or ` +
        `\`uv\` (Python) missing — current BMad-METHOD skills require \`uv\` at ` +
        `runtime, though installation itself does not.`
    );
  }

  const installedVersion = await readInstalledVersion(projectPath);
  const state = createInitialState(projectPath, projectName, installedVersion);
  await writeState(projectPath, state);

  const skills = await listInstalledSkills(projectPath);

  return text(
    `✅ BMad Method ${installedVersion ?? "(version unknown)"} installed for OpenClaw and "${projectName}" initialized.\n\n` +
      `**Created:**\n` +
      `- \`.agents/skills/\` — ${skills.length} official BMad skills (owned by the installer — do not edit by hand)\n` +
      `- \`_bmad/\` — official BMad config, scripts, and render cache (owned by the installer)\n` +
      `- \`.bmad-openclaw/state.json\` — this plugin's own orchestration state\n\n` +
      `**Next step:** Run \`bmad_list_skills\` to see what's available, then \`bmad_start_skill\` to dispatch one.`
  );
}

function text(t: string): ToolResult {
  return { content: [{ type: "text", text: t }] };
}
