/**
 * bmad_complete_skill — Mark the active skill as complete.
 * Updates state and suggests what to run next.
 */

import { Type } from "@sinclair/typebox";
import { readState, writeState } from "../lib/state.ts";
import { listInstalledSkills } from "../lib/skill-registry.ts";
import type { ToolResult } from "../types.ts";

export const name = "bmad_complete_skill";
export const description =
  "Mark the active BMad skill as complete. Updates project state and suggests what to run next.";

export const parameters = Type.Object({
  projectPath: Type.String({
    description: "Absolute path to the project root directory",
  }),
  summary: Type.Optional(
    Type.String({
      description:
        "What the sub-agent reported back — e.g. the skill's own JSON status block, or a short free-form summary of what it produced.",
    })
  ),
});

export async function execute(
  _id: string,
  params: { projectPath: string; summary?: string }
): Promise<ToolResult> {
  const state = await readState(params.projectPath);
  if (!state) {
    return text("Error: Project not initialized.");
  }
  if (!state.activeSkill) {
    return text("Error: No active skill to complete.");
  }

  const active = state.activeSkill;

  state.completedSkills.push({
    id: active.id,
    summary: params.summary ?? "",
    completedAt: new Date().toISOString(),
  });
  state.activeSkill = null;
  await writeState(params.projectPath, state);

  const allSkills = await listInstalledSkills(params.projectPath);
  const completedIds = new Set(state.completedSkills.map((w) => w.id));
  const notYetRun = allSkills.filter((s) => !completedIds.has(s.id));

  const lines = [
    `✅ Skill "${active.id}" completed.`,
    "",
    `**Mode:** ${active.mode}`,
    `**Started:** ${active.startedAt}`,
  ];
  if (params.summary) {
    lines.push("", "**Reported summary:**", params.summary);
  }
  lines.push("");

  if (notYetRun.length > 0) {
    lines.push("## Not Yet Run");
    lines.push("");
    for (const s of notYetRun) {
      lines.push(`- **${s.id}** — ${s.description}`);
    }
    lines.push("", "Use `bmad_start_skill` to dispatch the next one.");
  } else {
    lines.push("🎉 Every installed skill has been run at least once.");
  }

  return text(lines.join("\n"));
}

function text(t: string): ToolResult {
  return { content: [{ type: "text", text: t }] };
}
