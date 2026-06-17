# Pandas, Properly

A beginner-first, visual, deeply connected guide to **pandas**.

📖 **Read it online: https://karywnl.github.io/pandas/**

## What this is

Most pandas resources fall into one of two traps. Beginner ones show you *what* to type but never *why* it works, so you are stuck the moment something breaks. Advanced ones (the official docs) are technically perfect but unwelcoming if you are still finding your feet.

This guide lives in the middle. Every concept is explained as **what it is, how it works, and why it behaves that way**, with diagrams, plain language, predict-the-output checks, and the connections between ideas made explicit instead of left for you to discover the hard way.

- **Layered pages** so you can stop at any depth: a one-line intuition, then how to use it, then the internals when you want them.
- **Verified against pandas 3.0.** Every code snippet and its output was run on pandas 3.0 before publishing, including the 3.0-specific behaviour (the new `str` dtype, Copy-on-Write, and more).
- **Connected, not a list.** Each chapter ends by linking to the ones it leans on, so you can follow the threads in any direction.

## What it covers

1. **Foundations** — Series, building a DataFrame, inspecting one, data types, head and tail
2. **Selecting data** — selecting columns, multiple columns, `loc`/`iloc`, boolean indexing
3. **The index** — setting and resetting the index
4. **Cleaning data** — missing values, duplicates, renaming, replacing, changing types
5. **Grouping and reshaping** — GroupBy, aggregation, pivot tables

New to pandas? Start with **Foundations** and read top to bottom.

## Running it locally

The site is built with [MkDocs](https://www.mkdocs.org/) + [Material](https://squidfunk.github.io/mkdocs-material/), managed with [uv](https://docs.astral.sh/uv/).

```bash
uv sync --no-dev          # install the docs dependencies
uv run mkdocs serve       # live preview at http://127.0.0.1:8000
```

To build the static site into `site/`:

```bash
uv run mkdocs build
```

## How it deploys

Every push to `main` triggers the GitHub Actions workflow in `.github/workflows/deploy.yml`, which builds the site and publishes it to GitHub Pages.

## Project layout

```
docs/            the guide content, one Markdown file per concept
mkdocs.yml       site config and navigation
.github/         the deploy workflow
```

---

Built as a personal learning resource, shared in case it helps you too.
