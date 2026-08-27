/**
 * Skill registry — dynamically scans {projectRoot}/.agents/skills/*\/SKILL.md
 * for whatever BMad-METHOD actually installed.
 *
 * There is deliberately no hardcoded catalog here. The previous version of
 * this plugin hand-maintained a static list of workflow IDs and file paths
 * (`workflow-registry.ts`); BMad-METHOD's own v6.2.0 rearchitecture (skills
 * replacing the old workflow/steps model) silently broke every path in it.
 * Scanning the installed skills directory means this plugin tracks whatever
 * BMad-METHOD ships next without another rewrite.
 */

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import matter from "gray-matter";
import type { SkillDefinition } from "../types.ts";

export function skillsDir(projectPath: string): string {
  return join(projectPath, ".agents", "skills");
}

/**
 * List every installed skill, parsed from its SKILL.md frontmatter
 * (`name` + `description` — the only two fields BMad-METHOD's installer
 * keeps for non-Claude-Code platforms; see hosts/openclaw.ts-style
 * frontmatter allowlisting in the upstream installer).
 */
export async function listInstalledSkills(
  projectPath: string
): Promise<SkillDefinition[]> {
  const dir = skillsDir(projectPath);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  const skills: SkillDefinition[] = [];
  for (const entry of entries) {
    const skillFile = join(dir, entry, "SKILL.md");
    try {
      const raw = await readFile(skillFile, "utf-8");
      const { data } = matter(raw);
      skills.push({
        id: (data.name as string) ?? entry,
        name: (data.name as string) ?? entry,
        description: (data.description as string) ?? "",
        skillFile,
      });
    } catch {
      // Not a skill directory (no SKILL.md) — skip.
    }
  }

  return skills.sort((a, b) => a.id.localeCompare(b.id));
}

export async function getSkill(
  projectPath: string,
  skillId: string
): Promise<SkillDefinition | null> {
  const skills = await listInstalledSkills(projectPath);
  return skills.find((s) => s.id === skillId) ?? null;
}
