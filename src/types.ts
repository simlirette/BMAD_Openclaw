/**
 * BMad Method Plugin — Core Types
 */

// ── State ────────────────────────────────────────────────────────────────────

export interface BmadState {
  projectName: string;
  projectPath: string;
  /** ISO timestamp of project init */
  createdAt: string;
  /** BMad-METHOD version installed by `bmad_init_project` (from package.json) */
  installedVersion: string | null;
  /** Currently active skill invocation, if any */
  activeSkill: ActiveSkill | null;
  /** Completed skill invocations */
  completedSkills: CompletedSkill[];
}

export interface ActiveSkill {
  /** Skill ID, e.g. "bmad-product-brief" */
  id: string;
  /** Execution mode passed to the sub-agent */
  mode: "normal" | "yolo";
  /** ISO timestamp when the skill was dispatched */
  startedAt: string;
}

export interface CompletedSkill {
  id: string;
  /** Free-form summary the sub-agent reported back (e.g. the skill's JSON status block) */
  summary: string;
  completedAt: string;
}

// ── Skill registry (dynamic — scanned from installed .agents/skills/) ────────

export interface SkillDefinition {
  /** Skill ID — the directory name under .agents/skills/, e.g. "bmad-product-brief" */
  id: string;
  /** Display name from SKILL.md frontmatter */
  name: string;
  /** Description from SKILL.md frontmatter */
  description: string;
  /** Absolute path to the skill's SKILL.md */
  skillFile: string;
}

// ── Plugin API types (minimal interface for what we need from OpenClaw) ──────

export interface PluginApi {
  registerTool(
    tool: ToolDefinition,
    options?: { optional?: boolean }
  ): void;
  config: Record<string, unknown>;
  logger: {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
  };
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: unknown;
  execute(id: string, params: Record<string, unknown>): Promise<ToolResult>;
}

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
}
