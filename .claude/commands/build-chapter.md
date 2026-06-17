---
description: Autonomously decide and build the next chapter of the learning site, fully verified
argument-hint: "[optional: a specific topic, otherwise you choose]"
---

You are building the next chapter of a beginner-first learning website. This command is the
**single source of truth** for everything: how to decide what to build, how to write it, how
to verify it, and how to ship it. There is no other rules file. Read all of it first.

Optional override for this run: **$ARGUMENTS**
If that is non-empty, build that specific topic. If it is empty, **you decide what to build**
(Step 1). Do not ask the user which topic to pick. Deciding is your job.

---

## Philosophy (read this before anything else)

- **`notes.md` is a seed, not a spec.** It is the user's rough course notes, raw material to
  spark a chapter. You are the subject-matter expert. Use the notes where they help, ignore
  them where they are thin, and **add whatever a learner actually needs** that the notes
  leave out: missing subtopics, a clearer ordering, extra connections, a correction where the
  notes are wrong. Rely on your own reasoning more than on the notes.
- **Use production judgment, the course is not the ceiling or the floor.** You have real
  production data-science experience; use it. If a topic is missing something that matters in
  real-world pandas work, add it and explain it. If the notes include filler that does not
  help a learner, leave it out. Weave in the practical things intro courses skip (method
  chaining, copy/view discipline, vectorization over `apply`, sane dtypes on read, avoiding
  `inplace`) where they fit, kept concise and verified like everything else.
- **Think about what the learner needs right now**, not about transcribing. Every run, reason
  about the best next thing to build and the best way to teach it, then do that.
- **Be autonomous but show your thinking.** At the start of a run, state what you chose to
  build and a one or two line reason, and note anything you are adding beyond the notes. This
  is the user's only checkpoint, so make it honest and brief, then proceed without waiting.
- **One chapter per run.** Autonomy is about *what* to build, not about doing everything at
  once. Building all topics in one pass produces mediocre pages.

## What this project is

A single, intuitive, deeply connected learning site that fills the gap between shallow
beginner content (no internals) and official docs (no warmth). Every concept is taught as
**what it is, how it works, and why it behaves that way**, with visuals and explicit
connections between concepts. It is the user's primary study tool and is shared with
classmates. Static site, no runnable code in the content, pure rendered explanation.

This command is **library agnostic**. Today the library is pandas; tomorrow it might be numpy
or anything else. Never hardcode a library or version. Detect them (Step 2).

## Who does what

The user pastes notes, sets high-level direction, and reviews the rendered site. The user
does not write content or code, and does not pick the topic. **You** write every explanation,
build the frontend, decide what to build, and **run every command** (`uv run mkdocs serve`,
builds, verification).

## Tooling rules (apply to everything, always)

- Package manager: **`uv` only, never `pip`.** Add deps with `uv add`, run with `uv run`.
- Static site: **MkDocs + Material.** Config in `mkdocs.yml`, content in `docs/`.
- Preview: `uv run mkdocs serve -a 127.0.0.1:8000`. Build check: `uv run mkdocs build --strict`.
- Generated `site/` is never edited by hand and never committed.

---

## Step 1 — Decide what to build (skip if $ARGUMENTS was given)

1. Survey what already exists: read `mkdocs.yml` `nav`, list `docs/`, and read
   `docs/index.md` (the concept map) to see which chapters are done.
2. Read `notes.md` fresh (it changes over time, never trust a cached copy) to see what raw
   material exists, but treat it as one input, not the outline.
3. Reason about the **best next chapter**: the one that builds naturally on what is already
   done, unlocks the most of what comes after, and matches a sound learning progression for
   this library. Prerequisites first. If the most valuable next chapter is something the notes
   do not even mention, build that anyway and say so.
4. State your choice and a brief reason, then continue.

## Step 2 — Detect the library and its installed version

Work out which library this site documents (from `notes.md` and `mkdocs.yml` `site_name`),
then read the exact installed version:

```
uv run python -c "import <LIB>; print(<LIB>.__version__)"
```

If it is not installed, add it as a dev dependency (`uv add --dev <LIB>` then
`uv pip install <LIB>`). Use this detected version for verification (Step 5) and the footer
(Step 6). Never write a version from memory.

## Step 3 — Gather and augment the material

Pull the relevant section from `notes.md` if it exists, then **improve on it with your own
expertise**: fill gaps, add subtopics a learner needs, add connections to other chapters,
and correct anything the notes get wrong. The goal is the best possible explanation of the
concept, not a faithful copy of the notes. Anything you add from your own knowledge is held
to the same accuracy bar and must be verified in Step 5.

## Step 4 — Write the chapter

Create `docs/<area>/<topic>.md` (reuse or add a sensible area folder). Follow the page
template and every writing rule below.

## Step 5 — Verify before it ships (mandatory)

**Every code snippet and every claimed output, whether it came from the notes or from you,
must be run against the real detected version before the chapter is done.** Write a short
throwaway script, run it with `uv run python`, and fix the content to match reality. Do not
trust memory, especially for version-sensitive behaviour. This is non-negotiable and is why
the site can be trusted.

## Step 6 — Wire it in, stamp, build, report

- Add the page to `nav:` in `mkdocs.yml`. Update the concept map in `docs/index.md` so the
  new chapter appears, is highlighted as current, and shows its connection edges. Cross link
  to and from related chapters.
- Set the footer in `mkdocs.yml` (`copyright:`) to
  `Written for <LIB> <version> · last reviewed <current month year>`.
- Run `uv run mkdocs build --strict` and confirm it is clean.
- Report: what you chose to build and why, what you added beyond the notes, which snippets
  you verified and anything that surprised you, the version targeted, and the local URL.

---

## Writing rules (non negotiable)

- **Voice: friendly teacher.** Warm, human, like a knowledgeable friend at a whiteboard.
  Talk to the reader as "you". Never dry or reference-manual-like.
- **No em dashes anywhere.** Use commas, periods, parentheses, or colons.
- **Go all the way down.** Explain internals fully (memory layout, why the library made a
  given choice). Never hand wave a "why".
- **Intuition first.** Open with a one line mental model before any mechanics.
- **Choose the apt example for the concept, do not default to one domain.** Pick the
  everyday domain that makes *this* idea clearest, and vary it across chapters so the site
  stays fresh. Sales or orders for grouping and pivots, temperatures or sensor readings for
  interpolation and time, a survey or form for missing data, a messy CSV for renaming, a
  product catalog for dtypes, student grades for filtering, and so on. One running example
  per page, real and relatable, never abstract foo/bar. Reusing a domain is fine when it
  genuinely fits, but reach for the one that best teaches the point in front of you.
- **Respect the reader's stamina. Keep it tight.** Beginners tire of length. Be concise:
  short paragraphs, the *minimum* examples that make each point land, no padding, no saying
  the same thing twice. Cover everything that matters (do not drop content), but say it
  economically. Aim for the shortest version that still teaches the what, the how, the why,
  and the connections. Completeness without bloat.
- **Make connections explicit.** Every page ends by linking the concept to the others it
  touches. The connections are the whole point of this site. Never leave them untold.
- Keep paragraphs short, bold the key terms. Beginners skim before they read.

## Page template (layered, in this order)

A reader must be able to stop at any depth and still have gained something.

1. **Intuition** box, the one line mental model. `!!! intuition "The gist"`.
2. **Why it exists / the problem it solves.** Motivation before mechanics. Introduce the
   page's single analogy here.
3. **Picture it.** A visual. ASCII for memory and grid layouts, Mermaid for graphs and flows.
   Decide per diagram. **Verify ASCII alignment, do not eyeball it:** every column, `|`, and
   `+` must line up across rows; count characters. Prefer **boxed tables** and a **top-to-
   bottom** layout (with a down-arrow between stages) over side-by-side tables, which almost
   never align cleanly in monospace. Use plain ASCII (`->`, `|`, `+`, `-`), never box-drawing
   or arrow glyphs that read like stray dashes.
4. **How it works.** Small examples building up. Use `=== "tabs"` to compare variants.
5. **Under the hood.** The deepest internals and the real "why". Open it with a `!!! tip`
   that gives beginners **permission to skip** to the cheat sheet and come back.
6. **Gotchas.** Pitfalls as admonitions (`!!! warning`, `!!! danger`).
7. **Quick reference** table.
8. **Where this connects.** Explicit links to related concepts. `!!! connect "..."`.

## Learning-design rules (these turn reading into learning)

- **One strong analogy per concept**, introduced at the top and called back at the very end.
- **Skimmable takeaways:** after each major subsection, a bolded one liner
  (`**In one line:** ...`) so a skimmer still leaves with the point.
- **Active recall:** 2 to 3 collapsible predict-the-output prompts per page
  (`??? question "Quick check: ..."`), each right after the idea it tests, answer inside and
  verified. Reading is input; these force output. Highest leverage feature.
- A diagram travels with the explanation that needs it. Never make the reader scroll back up
  to see referenced data. Re-show a compact version inline.

## Custom ingredients already available

`!!! intuition "..."` (teal) and `!!! connect "..."` (purple) admonitions, plus standard
admonitions, `??? collapsible` blocks, `=== tabs`, fenced ```mermaid diagrams, dark/light
toggle, and search are all configured. Custom CSS lives in `docs/stylesheets/extra.css`.

## Definition of done

You chose (or were given) a chapter and explained the choice; it follows the full template
and writing rules; everything you added beyond the notes is included where it helps; every
snippet has been run against the detected version and matches; it is wired into the nav and
concept map; the footer version and date are current; and `mkdocs build --strict` is clean.
