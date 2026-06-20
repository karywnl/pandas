---
name: keep-memory-local
description: Store all memory files in the repo at .claude/memory/, never in the global ~/.claude location
metadata:
  type: feedback
---

Always write memory files to the repo-local path `.claude/memory/` (relative to the project root), not the global `~/.claude/projects/.../memory/` path the harness points at by default.

**Why:** The user wants memory version-controlled and scoped to this repo. They do not want files living under their global `~/.claude` directory, even though that path is namespaced per project.

**How to apply:** When saving any memory (user, feedback, project, reference), put the `.md` file and the `MEMORY.md` index under `<repo>/.claude/memory/`. Do not create files under `~/.claude`.
