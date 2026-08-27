/**
 * Installer bridge — runs the OFFICIAL bmad-method CLI (npx bmad-method@latest
 * install) against a project, targeting the "openclaw" platform.
 *
 * This plugin no longer bundles a vendored copy of BMad-METHOD. Every
 * `bmad_init_project` call installs whatever is current on npm, so the
 * skill catalog a project gets is always the latest official release —
 * there is nothing in this repo to fall behind.
 *
 * Official install targets: tools/installer/ide/platform-codes.yaml in
 * bmad-code-org/BMAD-METHOD defines `openclaw` -> target_dir ".agents/skills".
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const execFileAsync = promisify(execFile);

export interface InstallResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  skillsDir: string;
}

export interface InstallOptions {
  projectPath: string;
  userName: string;
  /** npm dist-tag or version to install; defaults to "latest" */
  version?: string;
}

/**
 * Run `npx bmad-method@<version> install` non-interactively, targeting the
 * bmm module and the openclaw platform. Safe to re-run (installer treats an
 * existing install as an update).
 */
export async function runOfficialInstall(
  opts: InstallOptions
): Promise<InstallResult> {
  const { projectPath, userName, version = "latest" } = opts;

  const args = [
    "-y", // let npx auto-fetch bmad-method without its own confirmation prompt
    `bmad-method@${version}`,
    "install",
    "--yes",
    "--directory",
    projectPath,
    "--modules",
    "bmm",
    "--tools",
    "openclaw",
    "--user-name",
    userName,
    "--communication-language",
    "English",
    "--document-output-language",
    "English",
    "--output-folder",
    "_bmad-output",
  ];

  // On Windows, npm-installed binaries are .cmd (batch) shims. Node's
  // execFile can't exec a batch file directly without a shell — it fails
  // with "spawn EINVAL", not a normal command-not-found — so route through
  // cmd.exe explicitly there. Passing args as an array still lets Node
  // quote each one safely for cmd.exe's re-parsing.
  const [command, commandArgs] =
    process.platform === "win32"
      ? ["cmd.exe", ["/c", "npx", ...args]]
      : ["npx", args];

  try {
    const { stdout, stderr } = await execFileAsync(command, commandArgs, {
      cwd: projectPath,
      timeout: 5 * 60 * 1000, // installer shells out to npm; give it room
      maxBuffer: 10 * 1024 * 1024,
    });
    return {
      ok: true,
      stdout,
      stderr,
      skillsDir: join(projectPath, ".agents", "skills"),
    };
  } catch (err: any) {
    return {
      ok: false,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? err.message ?? String(err),
      skillsDir: join(projectPath, ".agents", "skills"),
    };
  }
}

/**
 * Best-effort read of the installed BMad-METHOD version, for state tracking
 * and for surfacing "you're on vX" to the user. Reads the manifest the
 * official installer writes at {projectRoot}/_bmad/_config/manifest.yaml
 * (installation.version) — see tools/installer/core/manifest.js upstream.
 * Returns null if it can't be found (older installer layouts, or install
 * failed before the manifest step).
 */
export async function readInstalledVersion(
  projectPath: string
): Promise<string | null> {
  const manifestPath = join(projectPath, "_bmad", "_config", "manifest.yaml");
  try {
    const raw = await readFile(manifestPath, "utf-8");
    const parsed = parseYaml(raw) as { installation?: { version?: string } };
    return parsed?.installation?.version ?? null;
  } catch {
    return null;
  }
}
