/**
 * pi-project — project registry for pi agents (multi-project teams).
 *
 * Souls see projects as data, not config:
 *
 *   project_list      — all registered projects (name, dir, repo, topic)
 *   project_current   — which project this run's topic/chat is bound to
 *   project_use       — resolve a project: returns dir + repo so the
 *                       agent can `cd` / pass --repo for that work
 *   project_register  — onboard a project: name|dir|repo|topic_id?
 *   project_forget    — deregister
 *
 * Transport: the team mailbox ($PI_TEAM_DIR) — kind="project" ops are
 * answered by the host, which owns the projects table.
 *
 * Env: PI_TEAM_FROM (soul), PI_TEAM_CHAT, PI_TEAM_THREAD.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import { Type } from "typebox";

const DIR =
	process.env.PI_TEAM_DIR ??
	join(homedir(), ".local/state/telegram-agent/team");

async function projectOp(op: string, payload: string): Promise<string> {
	const reqDir = join(DIR, "requests");
	const repDir = join(DIR, "replies");
	mkdirSync(reqDir, { recursive: true });
	mkdirSync(repDir, { recursive: true });
	const id = randomUUID();
	writeFileSync(
		join(reqDir, `${id}.json`),
		JSON.stringify({
			id,
			from: process.env.PI_TEAM_FROM ?? "unknown",
			to: "host",
			kind: "project",
			text: `${op}|||${payload}`,
			chat: process.env.PI_TEAM_CHAT,
			thread: process.env.PI_TEAM_THREAD,
			at: Date.now(),
		}),
	);
	const file = join(repDir, `${id}.json`);
	const deadline = Date.now() + 30_000;
	while (Date.now() < deadline) {
		if (existsSync(file)) {
			try {
				const r = JSON.parse(readFileSync(file, "utf-8"));
				return String(r.text ?? "");
			} catch {
				/* partial write — retry */
			}
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	return "(project request timed out)";
}

export default function piProject(pi: ExtensionAPI) {
	pi.registerTool({
		name: "project_list",
		label: "Project List",
		description:
			"List registered projects — name, working dir, repo, bound topic.",
		promptSnippet: "List registered projects",
		parameters: Type.Object({}),
		async execute() {
			const r = await projectOp("list", "");
			return { content: [{ type: "text" as const, text: r }], details: null };
		},
	});

	pi.registerTool({
		name: "project_use",
		label: "Project Use",
		description:
			"Resolve a project by name — returns its dir and repo. cd into dir for file work; use repo for gh_* calls. Use when the task names a different project than the default.",
		promptSnippet: "Switch project context",
		parameters: Type.Object({
			name: Type.String({ description: "project name from project_list" }),
		}),
		async execute(_id, params) {
			const r = await projectOp("use", params.name);
			return { content: [{ type: "text" as const, text: r }], details: null };
		},
	});

	pi.registerTool({
		name: "project_register",
		label: "Project Register",
		description:
			"Register a project: name, local dir, optional github repo (owner/name), optional bound forum topic id.",
		parameters: Type.Object({
			name: Type.String(),
			dir: Type.String({ description: "absolute path" }),
			repo: Type.Optional(Type.String({ description: "owner/repo" })),
			topic_id: Type.Optional(Type.Number()),
			desc: Type.Optional(Type.String()),
		}),
		async execute(_id, params) {
			const r = await projectOp(
				"register",
				`${params.name}|${params.dir}|${params.repo ?? ""}|${params.topic_id ?? ""}`,
			);
			return { content: [{ type: "text" as const, text: r }], details: null };
		},
	});

	pi.registerTool({
		name: "project_forget",
		label: "Project Forget",
		description: "Deregister a project by name.",
		parameters: Type.Object({ name: Type.String() }),
		async execute(_id, params) {
			const r = await projectOp("forget", params.name);
			return { content: [{ type: "text" as const, text: r }], details: null };
		},
	});
	pi.registerTool({
		name: "project_mode",
		label: "Project Mode",
		description:
			"Set a project's lifecycle mode: develop (full work) | readonly (observe/report only) | monitor (watch only) | paused (archived). Only نگار may change modes.",
		parameters: Type.Object({
			name: Type.String(),
			mode: Type.String({ description: "develop|readonly|monitor|paused" }),
		}),
		async execute(_id, params) {
			const r = await projectOp("mode", `${params.name}|${params.mode}`);
			return { content: [{ type: "text" as const, text: r }], details: null };
		},
	});
}
