import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { listInstalledSkills, getSkill, skillsDir } from "../lib/skill-registry.ts";

async function seedSkill(
  projectPath: string,
  id: string,
  frontmatter: { name: string; description: string }
) {
  const dir = join(skillsDir(projectPath), id);
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "SKILL.md"),
    `---\nname: ${frontmatter.name}\ndescription: ${frontmatter.description}\n---\n\n# Body\n`,
    "utf-8"
  );
}

describe("skill-registry", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bmad-skillreg-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns an empty list when .agents/skills/ does not exist", async () => {
    const skills = await listInstalledSkills(tempDir);
    expect(skills).toEqual([]);
  });

  it("scans installed skills from SKILL.md frontmatter, no hardcoded catalog", async () => {
    await seedSkill(tempDir, "bmad-product-brief", {
      name: "bmad-product-brief",
      description: "Create, update, or validate a product brief.",
    });
    await seedSkill(tempDir, "bmad-build", {
      name: "bmad-build",
      description: "Implement a story end to end.",
    });

    const skills = await listInstalledSkills(tempDir);
    expect(skills).toHaveLength(2);
    expect(skills.map((s) => s.id)).toEqual(["bmad-build", "bmad-product-brief"]);
    expect(skills[1].description).toBe("Create, update, or validate a product brief.");
  });

  it("skips directories without a SKILL.md", async () => {
    await mkdir(join(skillsDir(tempDir), "not-a-skill"), { recursive: true });
    await seedSkill(tempDir, "bmad-build", {
      name: "bmad-build",
      description: "Implement a story end to end.",
    });

    const skills = await listInstalledSkills(tempDir);
    expect(skills.map((s) => s.id)).toEqual(["bmad-build"]);
  });

  it("getSkill finds a skill by id, and returns null for an unknown one", async () => {
    await seedSkill(tempDir, "bmad-prd", {
      name: "bmad-prd",
      description: "Produce a PRD.",
    });

    expect((await getSkill(tempDir, "bmad-prd"))?.description).toBe("Produce a PRD.");
    expect(await getSkill(tempDir, "bmad-nonexistent")).toBeNull();
  });
});
