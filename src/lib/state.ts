/**
 * State management — reads/writes {projectRoot}/.bmad-openclaw/state.json
 *
 * Deliberately NOT inside {projectRoot}/_bmad/ — that directory is owned by
 * the official BMad-METHOD installer and its skills (config.toml, render/,
 * scripts/, custom/, ...). Keeping our own orchestration state in a separate
 * directory means an upstream BMad-METHOD update or re-install can never
 * collide with or wipe it.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { BmadState } from "../types.ts";

const STATE_DIR = ".bmad-openclaw";
const STATE_FILE = "state.json";

export function stateDir(projectPath: string): string {
  return join(projectPath, STATE_DIR);
}

export function statePath(projectPath: string): string {
  return join(projectPath, STATE_DIR, STATE_FILE);
}

export async function readState(projectPath: string): Promise<BmadState | null> {
  try {
    const raw = await readFile(statePath(projectPath), "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.projectName) {
      return null;
    }
    if (!Array.isArray(parsed.completedSkills)) {
      parsed.completedSkills = [];
    } else {
      parsed.completedSkills = parsed.completedSkills.filter(
        (w: unknown) => w != null && typeof w === "object"
      );
    }
    return parsed as BmadState;
  } catch {
    return null;
  }
}

export async function writeState(
  projectPath: string,
  state: BmadState
): Promise<void> {
  const dir = stateDir(projectPath);
  await mkdir(dir, { recursive: true });
  await writeFile(statePath(projectPath), JSON.stringify(state, null, 2), "utf-8");
}

export function createInitialState(
  projectPath: string,
  projectName: string,
  installedVersion: string | null
): BmadState {
  return {
    projectName,
    projectPath,
    createdAt: new Date().toISOString(),
    installedVersion,
    activeSkill: null,
    completedSkills: [],
  };
}
