/**
 * Dispatch rules injected into the task prompt handed to a spawned sub-agent.
 *
 * Unlike the pre-v6.2.0 BMad-METHOD (which shipped bare workflow.md + steps/
 * files that an external orchestrator had to walk step-by-step), every
 * installed skill is now self-contained: it has its own activation sequence,
 * its own headless-mode contract, and its own persona baked into SKILL.md.
 * This plugin's job shrinks to *dispatching* — telling the sub-agent exactly
 * which skill to load and in what mode — not re-implementing the skill's
 * internal logic.
 */

export const DISPATCH_RULES = `## BMad Skill Dispatch Rules

You are a dedicated sub-agent spawned to run exactly one BMad-METHOD skill.

- **Load the skill file in full.** Read the entire SKILL.md named below before doing anything else. Do not skim, summarize, or paraphrase it — its "On Activation" section defines mandatory steps.
- **Follow the skill's own instructions exactly**, including any scripts it tells you to run via \`uv run\`. Do not substitute your own judgment for what the skill's activation sequence specifies.
- **This skill manages its own output paths, state, and step sequencing.** Do not try to intercept, redirect, or manually track its internal steps — that is exactly what broke the previous version of this plugin when BMad-METHOD's internal file layout changed upstream.
- **When the skill finishes**, report back to the master with its final status (most skills end headless runs with a JSON status block — pass that through verbatim if present) and stop. Do not chain into another skill yourself.`;

export const YOLO_MODE_RULES = `### Mode: YOLO (headless)
Invoke the skill in its **headless mode** (every current BMad-METHOD skill documents one in its own SKILL.md — follow that section, not a generic guess). Do not wait for user confirmation at decision points; make the expert-user call yourself and keep going. If the skill halts with a "blocked" status because intent is genuinely ambiguous, stop and report that rather than guessing.`;

export const NORMAL_MODE_RULES = `### Mode: Normal (interactive)
Run the skill in its normal interactive mode. Let the skill's own conversation flow drive elicitation and confirmation — do not skip prompts it asks for. Pause when the skill itself pauses; do not pre-answer on the user's behalf.`;
