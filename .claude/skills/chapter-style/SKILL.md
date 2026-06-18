---
name: chapter-style
description: House writing style for the learning site. Use whenever writing, editing, reviewing, proofreading, or fixing any chapter or page under docs/ (any .md content), so the voice and formatting rules apply automatically without being asked. This is the single source of truth for the writing rules; the /build-chapter command points here.
---

The writing rules for every page of the learning site. They apply to a full chapter build
**and** to any smaller edit, review, or proofread of an existing page. Follow them whenever
you touch prose under `docs/`.

## Writing rules (non negotiable)

- **Voice: friendly teacher.** Warm, human, like a knowledgeable friend at a whiteboard.
  Talk to the reader as "you". Never dry or reference-manual-like.
- **No em dashes anywhere.** Use commas, periods, parentheses, or colons. This includes en
  dashes and any other dash variant; the only dash allowed in prose is the hyphen.
- **Go all the way down.** Explain internals fully (memory layout, why the library made a
  given choice). Never hand wave a "why".
- **Intuition first.** Open with a one line mental model before any mechanics.
- **Choose the apt example for the concept, do not default to one domain.** Pick the
  everyday domain that makes *this* idea clearest, and vary it across chapters so the site
  stays fresh. One running example per page, real and relatable, never abstract foo/bar.
  Reusing a domain is fine when it genuinely fits, but reach for the one that best teaches
  the point in front of you.
- **Respect the reader's stamina. Keep it tight.** Short paragraphs, the *minimum* examples
  that make each point land, no padding, no saying the same thing twice. Cover everything
  that matters, but say it economically. Completeness without bloat.
- **Make connections explicit.** Every page ends by linking the concept to the others it
  touches. The connections are the whole point of this site.
- **Bold the key terms, keep paragraphs short.** Beginners skim before they read.

## Code in the content must be reproducible

- Every code block's shown output must be exactly what running it prints. If you round or
  trim for readability, make the code produce that (e.g. `.round(2)`), do not hand-edit the
  output to something the reader will not see.
- When practical, actually run a snippet to confirm its output before shipping it.

## Quick self-check before finishing an edit

- Scan the touched file for dash variants (em, en, figure dash, minus sign). The only one
  allowed is the plain hyphen.
- Confirm any code output shown matches a real run.
- Confirm the page still ends with its explicit connections section.
