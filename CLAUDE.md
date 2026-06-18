# Writing rules for this learning site

This is a beginner-first pandas (or whatever library is detected) learning site built with
MkDocs + Material. Content lives in `docs/`. These rules apply to **every** edit of a page,
from a one-line tweak to a whole new chapter. They are always in effect; you never need to be
reminded to follow them. The full build/verify/ship workflow lives in the `/build-chapter`
command; this file is just the writing standard.

## The principle: what, why, how (non negotiable)

Every concept is taught as **what it is, why it exists, and how it works**. This is the whole
point of the site, and the most common way a page goes wrong is forgetting it **partway down**.

- It is not enough for the page as a whole to cover what/why/how. **Every feature, option, and
  subsection must answer all three on its own.** A subsection that shows a code snippet and says
  what the output is, but never says *why a reader would reach for it*, has failed.
- The "why" is the one most often dropped. Before showing how to call something, say what
  question it answers or what problem it solves. If you cannot state the why, the subsection
  is not ready.
- Concretely: when you add or edit any option's subsection, check it answers "what does this
  do", "why/when would I use it", and "how do I call it, and what does the result mean". If one
  is missing, add it.

## Beginner-first

- **Show the data before you transform it.** Print the starting DataFrame as a table once, so
  the reader sees the raw records turn into the result. Never make them trust prose about what
  the data looks like.
- **Intuition before mechanics.** Open with a one line mental model before any code.
- **Warm, friendly-teacher voice the whole way down**, not just in the intro. Talk to the
  reader as "you". The tone must not go clipped and reference-manual-like in the later
  subsections. If the voice drops, the "why" usually dropped with it.
- **Tight, not thin.** Short paragraphs, bold the key terms, the minimum examples that make
  each point land. Cover everything that matters, say it economically.

## Formatting and correctness

- **No em dashes, en dashes, or any dash variant in prose. The only dash allowed is the
  hyphen.** Use commas, periods, parentheses, or colons instead.
- **Code output must be reproducible.** Every shown output must be exactly what running the
  snippet prints. If you round or trim for readability, make the code do it (e.g. `.round(2)`),
  never hand-edit the output. Run a snippet to confirm when practical.
- **End every page with explicit connections** to the other concepts it touches. The
  connections are the point of the site.
- Pick the everyday example that teaches *this* idea most clearly, and vary the domain across
  pages. One running example per page, real and relatable, never abstract foo/bar.
