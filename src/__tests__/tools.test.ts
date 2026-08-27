import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { execute as initProject } from "../tools/bmad-init-project.ts";
import { execute as listSkills } from "../tools/bmad-list-skills.ts";
import { execute as startSkill } from "../tools/bmad-start-skill.ts";
import { execute as completeSkill } from "../tools/bmad-complete-skill.ts";
import { execute as getState } from "../tools/bmad-get-state.ts";
import { writeState, createInitialState } from "../lib/state.ts";
import { skillsDir } from "../lib/skill-registry.ts";

/**
 * bmad_init_project now shells out to the real `npx bmad-method@<version>
 * install` — that's a real network call, unsuitable for the default fast/
 * offline unit test run. These tests exercise everything reachable
 * WITHOUT triggering the installer (the pre-install guard clauses), and
 * seed `.bmad-openclaw/state.json` + `.agents/skills/` fixtures by hand for
 * the tools that operate on an already-initialized project.
 *
 * A real end-to-end install is covered separately, opt-in only
 * (BMAD_OPENCLAW_INTEGRATION_TEST=1), at the bottom of this file.
 */

async function seedInitializedProject(tempDir: string) {
  const state = createInitialState(tempDir, "Test Project", "6.11.0");
  await writeState(tempDir, state);
  const skillDir = join(skillsDir(tempDir), "bmad-product-brief");
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    join(skillDir, "SKILL.md"),
    "---\nname: bmad-product-brief\ndescription: Create, update, or validate a product brief.\n---\n\nBody.\n",
    "utf-8"
  );
}

describe("tool: bmad_init_project (guard clauses, no network)", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bmad-tool-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("rejects nonexistent directory before attempting to install", async () => {
    const result = await initProject("t", {
      projectPath: "/nonexistent/path",
      projectName: "P",
    });
    expect(result.content[0].text).toContain("Error");
    expect(result.content[0].text).toContain("does not exist");
  });

  it("reports already-initialized without re-running the installer", async () => {
    await seedInitializedProject(tempDir);
    const result = await initProject("t", {
      projectPath: tempDir,
      projectName: "P2",
    });
    const text = result.content[0].text;
    expect(text).toContain("already initialized");
    expect(text).toContain("6.11.0");
  });
});

describe("tool: bmad_list_skills", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bmad-tool-test-"));
    await seedInitializedProject(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("lists installed skills scanned from .agents/skills/", async () => {
    const result = await listSkills("t", { projectPath: tempDir });
    const text = result.content[0].text;
    expect(text).toContain("bmad-product-brief");
    expect(text).toContain("6.11.0");
  });

  it("errors for uninitialized project", async () => {
    const result = await listSkills("t", { projectPath: "/tmp/nowhere" });
    expect(result.content[0].text).toContain("Error");
  });
});

describe("tool: bmad_start_skill / bmad_complete_skill", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bmad-tool-test-"));
    await seedInitializedProject(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("dispatches a known skill and returns a task prompt naming its SKILL.md", async () => {
    const result = await startSkill("t", {
      projectPath: tempDir,
      skill: "bmad-product-brief",
      mode: "yolo",
    });
    const text = result.content[0].text;
    expect(text).toContain("bmad-product-brief");
    expect(text).toContain("SKILL.md");
    expect(text).toContain("YOLO");
  });

  it("rejects an unknown skill id", async () => {
    const result = await startSkill("t", {
      projectPath: tempDir,
      skill: "bmad-does-not-exist",
      mode: "normal",
    });
    expect(result.content[0].text).toContain("Unknown skill");
  });

  it("rejects starting a second skill while one is active", async () => {
    await startSkill("t", { projectPath: tempDir, skill: "bmad-product-brief", mode: "normal" });
    const result = await startSkill("t", {
      projectPath: tempDir,
      skill: "bmad-product-brief",
      mode: "normal",
    });
    expect(result.content[0].text).toContain("already in progress");
  });

  it("completes the active skill and records the summary", async () => {
    await startSkill("t", { projectPath: tempDir, skill: "bmad-product-brief", mode: "normal" });
    const result = await completeSkill("t", {
      projectPath: tempDir,
      summary: '{"status":"complete"}',
    });
    const text = result.content[0].text;
    expect(text).toContain("completed");
    expect(text).toContain('{"status":"complete"}');
  });

  it("errors when completing with no active skill", async () => {
    const result = await completeSkill("t", { projectPath: tempDir });
    expect(result.content[0].text).toContain("Error");
  });
});

describe("tool: bmad_get_state", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bmad-tool-test-"));
    await seedInitializedProject(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("returns project state", async () => {
    const result = await getState("t", { projectPath: tempDir });
    const text = result.content[0].text;
    expect(text).toContain("Test Project");
    expect(text).toContain("6.11.0");
    expect(text).toContain("None");
  });
});

// ── Opt-in integration test — hits the real npm registry ────────────────────
const runIntegration = process.env.BMAD_OPENCLAW_INTEGRATION_TEST === "1";
describe.skipIf(!runIntegration)("integration: real `npx bmad-method@latest install`", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bmad-integration-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("installs a real, current skill catalog end to end", async () => {
    const result = await initProject("t", {
      projectPath: tempDir,
      projectName: "Integration Test",
    });
    const text = result.content[0].text;
    expect(text).toContain("✅");

    const list = await listSkills("t", { projectPath: tempDir });
    expect(list.content[0].text).toContain("bmad-");
  }, 5 * 60 * 1000);
});
