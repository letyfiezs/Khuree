<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project workflow rules

Optimize workflow for speed, precision, and minimal token and tool usage.

1. Do not over-investigate simple tasks. Start with the most likely, simplest solution. Inspect only directly related files and do not scan the entire repository unless necessary.
2. Minimize tool calls and terminal commands. Batch related checks, avoid repeating commands, and do not re-read unchanged files already inspected.
3. Avoid unnecessary reasoning loops. After a failure, identify its cause before retrying. After two failed attempts at the same issue, reassess and choose one evidence-based approach. Report an undetermined blocker instead of endlessly experimenting.
4. Make targeted changes. Modify only required files. Do not refactor, redesign, or alter unrelated UI, UX, architecture, or behavior unless explicitly requested.
5. Preserve working code. Prefer the smallest safe patch and determine whether a small fix is sufficient before replacing a large implementation.
6. Debug efficiently: read the actual error, trace it to the relevant function, form a likely root cause, make one targeted fix, and verify that fix.
7. Do not over-test. Run only the targeted test, type check, lint check, or build needed for the change. Do not repeatedly run full builds for tiny changes when a narrower check is sufficient.
8. Keep context small. Search for the relevant symbol first and inspect only necessary surrounding code. Do not load generated files, build outputs, dependencies, `node_modules`, `.next`, `dist`, logs, caches, or large data files unless required.
9. Reuse project knowledge already discovered during the current task instead of rediscovering it.
10. Stop once the requested task is correctly completed and minimally verified. Do not continue with unrelated cleanup, refactoring, or improvements.
11. Before a complex task, briefly determine the exact change, the most likely files involved, and the minimum verification required, then execute the shortest reasonable path.
12. Token and compute efficiency are priorities, but never sacrifice safety or correctness.
13. For simple requests, do not create a large plan: find the relevant code, make the change, verify it, and finish.
14. If ambiguity would cause substantial unnecessary work, ask one concise clarification question instead of broadly inspecting the repository.
15. At completion, respond concisely with what changed, which files changed, what verification was performed, and any important unresolved issue.
