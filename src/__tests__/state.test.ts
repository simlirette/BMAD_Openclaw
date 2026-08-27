import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  readState,
  writeState,
  createInitialState,
  stateDir,
  statePath,
} from "../lib/state.ts";

describe("state", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "bmad-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("readState returns null for uninitialized project", async () => {
    const state = await readState(tempDir);
    expect(state).toBeNull();
  });

  it("createInitialState creates valid state", () => {
    const state = createInitialState(tempDir, "Test Project", "6.11.0");
    expect(state.projectName).toBe("Test Project");
    expect(state.projectPath).toBe(tempDir);
    expect(state.installedVersion).toBe("6.11.0");
    expect(state.activeSkill).toBeNull();
    expect(state.completedSkills).toEqual([]);
  });

  it("createInitialState tolerates an unknown installed version", () => {
    const state = createInitialState(tempDir, "Test Project", null);
    expect(state.installedVersion).toBeNull();
  });

  it("writeState + readState roundtrip", async () => {
    const state = createInitialState(tempDir, "Test Project", "6.11.0");
    await writeState(tempDir, state);
    const loaded = await readState(tempDir);
    expect(loaded).toEqual(state);
  });

  it("stateDir and statePath use .bmad-openclaw, not _bmad (owned by the installer)", () => {
    expect(stateDir("/foo/bar")).toBe(join("/foo/bar", ".bmad-openclaw"));
    expect(statePath("/foo/bar")).toBe(join("/foo/bar", ".bmad-openclaw", "state.json"));
  });
});
