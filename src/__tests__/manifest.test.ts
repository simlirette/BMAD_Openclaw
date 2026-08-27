import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import * as bmadInitProject from "../tools/bmad-init-project.ts";
import * as bmadListSkills from "../tools/bmad-list-skills.ts";
import * as bmadStartSkill from "../tools/bmad-start-skill.ts";
import * as bmadCompleteSkill from "../tools/bmad-complete-skill.ts";
import * as bmadGetState from "../tools/bmad-get-state.ts";

/**
 * OpenClaw's plugin registry silently drops any registerTool() call whose
 * name isn't listed in the manifest's `contracts.tools` array — no
 * exception, no failed registration error, just missing. The plugin's own
 * "registered N tools" log line prints unconditionally either way, so
 * nothing in the plugin's own runtime output catches a drift here (this
 * bit us once: openclaw.plugin.json shipped with no `contracts` field at
 * all until a live `openclaw plugins doctor` run caught it — see
 * openclaw.plugin.json). This test keeps that manifest declaration in
 * sync with the tools index.ts actually registers, without needing a
 * live OpenClaw gateway to notice drift.
 */
const TOOLS = [
  bmadInitProject,
  bmadListSkills,
  bmadStartSkill,
  bmadCompleteSkill,
  bmadGetState,
] as const;

describe("openclaw.plugin.json manifest", () => {
  it("declares contracts.tools for every tool this plugin registers", () => {
    const manifestPath = join(import.meta.dirname, "../../openclaw.plugin.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

    const declared = [...(manifest.contracts?.tools ?? [])].sort();
    const registered = TOOLS.map((t) => t.name).sort();

    expect(declared).toEqual(registered);
  });
});
