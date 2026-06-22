# Sorting

!!! intuition "The gist"
    `sort_values()` reorders the rows by what is **inside** a column (smallest to largest, A to Z). `sort_index()` reorders them by their **row labels**. Sorting never changes the data, only the order you see it in, and the row labels travel with their rows, so the index usually looks shuffled afterward.

## Why it exists

Data arrives in whatever order it was recorded, which is rarely the order you want to read it in. To see the top scorers, the most recent orders, or the cheapest products, you need to put the rows **in order** first. Sorting is also the setup step for many other tasks: picking the top N, finding the latest record per group, or making a report readable.

Here is a small game leaderboard we will use the whole way down.

```python
import pandas as pd

games = pd.DataFrame({
    "player": ["Ana", "Ben", "Cara", "Dan", "Eve"],
    "score":  [90, 75, 90, None, 60],
    "level":  [3, 5, 2, 4, 5],
})
games
#   player  score  level
# 0    Ana   90.0      3
# 1    Ben   75.0      5
# 2   Cara   90.0      2
# 3    Dan    NaN      4
# 4    Eve   60.0      5
```

Two players tie on `score` (Ana and Cara, both 90), and one score is missing (Dan). Those two facts, ties and missing values, are exactly where sorting has rules worth knowing, so this small table will show all of them.

## Picture it

Sorting works in two steps, and seeing them apart explains everything else on this page. First pandas works out the **new order of the rows**, as a list of their current positions. Then it rearranges the rows into that order in one move. Watch it sort by `score`, smallest first:

```text
start (position : score)        step 1: work out the sorted order
  0  Ana    90                  the positions, ordered by score
  1  Ben    75                  (missing value pushed to the end):
  2  Cara   90
  3  Dan   NaN                    [ 4, 1, 0, 2, 3 ]
  4  Eve    60                      |  |  |  |  |
                                   Eve Ben Ana Cara Dan
                                   60  75  90  90  NaN

        step 2: take the rows in that order
        v
  4  Eve    60
  1  Ben    75
  0  Ana    90
  2  Cara   90
  3  Dan   NaN
```

Notice the left column never gets renumbered: row `4` (Eve) is still labelled `4` after it moves to the top. **The row labels travel with their rows**, which is why the index looks shuffled after a sort. **In one line:** sorting figures out the new order, then rearranges the rows into it, carrying each row's label along.

## How it works

### sort_values: order by a column

Pass the column name. By default you get **ascending** order (smallest to largest), and the original index moves with the rows:

```python
games.sort_values("score")
#   player  score  level
# 4    Eve   60.0      5
# 1    Ben   75.0      5
# 0    Ana   90.0      3
# 2   Cara   90.0      2
# 3    Dan    NaN      4
```

The rows are now in score order. Eve (60) is first, and Dan, whose score is missing, sits at the bottom (more on that below). Like most pandas methods, `sort_values` returns a **new** DataFrame and leaves `games` untouched, so assign the result (`games = games.sort_values(...)`) if you want to keep it.

**In one line:** `df.sort_values("col")` returns a new frame ordered by that column, smallest first.

### Descending order

Pass `ascending=False` to go largest to smallest:

```python
games.sort_values("score", ascending=False)
#   player  score  level
# 0    Ana   90.0      3
# 2   Cara   90.0      2
# 1    Ben   75.0      5
# 4    Eve   60.0      5
# 3    Dan    NaN      4
```

Now the top scorers lead. Dan is still last: the missing value does **not** move to the top just because we flipped the direction (its position is controlled separately, below).

### Breaking ties with several columns

Ana and Cara both scored 90, so "sort by score" alone does not decide which comes first. Pass a **list** of columns to break ties: pandas sorts by the first, and where that ties, falls back to the second, and so on. You can give a matching list to `ascending` to set a direction per column:

```python
games.sort_values(["score", "level"], ascending=[False, True])
#   player  score  level
# 2   Cara   90.0      2
# 0    Ana   90.0      3
# 1    Ben   75.0      5
# 4    Eve   60.0      5
# 3    Dan    NaN      4
```

Highest score first (`score` descending), and within the 90-point tie, lower `level` first (`level` ascending), so Cara (level 2) now comes before Ana (level 3). This is the reliable way to control tie order.

??? question "Quick check: who comes first?"
    Using `sort_values(["score", "level"], ascending=[False, True])`, Ana and Cara both have score 90. Ana is level 3, Cara is level 2. Which row appears first, and why?

    **Answer:** **Cara.** The first key, `score` descending, ties them both at 90, so pandas uses the second key, `level` ascending. Cara's level 2 is lower than Ana's level 3, so Cara sorts first.

### Where missing values go

A missing value (`NaN`) has no place on the number line, so pandas does not guess; it parks all missing values at the **end** by default, whichever direction you sort. Pass `na_position="first"` to send them to the top instead:

```python
games.sort_values("score", na_position="first")
#   player  score  level
# 3    Dan    NaN      4
# 4    Eve   60.0      5
# 1    Ben   75.0      5
# 0    Ana   90.0      3
# 2   Cara   90.0      2
```

Dan's missing score now leads. This is useful when missing data is what you want to find and fix first. The key point: **`na_position`, not `ascending`, decides where `NaN` lands.**

### Keeping ties in their original order: stable sort

Sometimes you want tied rows to stay in the order they already had, rather than break the tie with another column. Pass `kind="stable"`. Sorting by `level`, where Ben and Eve both sit at level 5:

```python
games.sort_values("level", kind="stable")
#   player  score  level
# 2   Cara   90.0      2
# 0    Ana   90.0      3
# 3    Dan    NaN      4
# 1    Ben   75.0      5
# 4    Eve   60.0      5
```

Ben (originally row 1) stays ahead of Eve (originally row 4) because a **stable** sort never reorders equal values. This matters when you sort by one column and want an earlier sort, or the original order, preserved within ties.

**In one line:** use several keys to break ties on purpose, and `kind="stable"` to keep tied rows in the order they came in.

### sort_index: order by the labels

`sort_index()` ignores the values and orders rows by their **index labels**. Its most common use is cleanup: after a value sort scrambles the index, `sort_index()` puts the rows back in label order.

```python
s = games.sort_values("score")   # index is now [4, 1, 0, 2, 3]
s.sort_index()                    # back to 0, 1, 2, 3, 4
#   player  score  level
# 0    Ana   90.0      3
# 1    Ben   75.0      5
# 2   Cara   90.0      2
# 3    Dan    NaN      4
# 4    Eve   60.0      5
```

This is also how you order a table that has a meaningful index, like dates or names: [`set_index`](../indexing/set-index.md) first, then `sort_index()` to put it in label order, which also makes label slicing fast.

### The index travels, so reset it when you want clean numbers

Because labels move with their rows, the index after a sort is in the old order (`4, 1, 0, 2, 3`). When you want fresh `0, 1, 2, ...` numbering, chain [`reset_index(drop=True)`](../indexing/reset-index.md), or pass `ignore_index=True` to do it in one step:

```python
games.sort_values("score", ascending=False, ignore_index=True)
#   player  score  level
# 0    Ana   90.0      3
# 1   Cara   90.0      2
# 2    Ben   75.0      5
# 3    Eve   60.0      5
# 4    Dan    NaN      4
```

### Just the top few: nlargest and nsmallest

If you only want the top or bottom N rows by a column, `nlargest` and `nsmallest` say it directly and skip sorting the whole table:

```python
games.nlargest(2, "score")
#   player  score  level
# 0    Ana   90.0      3
# 2   Cara   90.0      2
```

This reads better than `sort_values("score", ascending=False).head(2)` and does less work, because it only needs to find the top 2, not order all the rest.

**In one line:** reach for `nlargest`/`nsmallest` when you want a top-N list, and full `sort_values` when you want the whole table ordered.

## Under the hood

!!! tip "New here? You have permission to skip this."
    "`sort_values` for column order, `sort_index` for label order, and the index moves with the rows" is the whole chapter. Come back here to see *how* pandas reorders the rows, which explains why the index travels and why missing values sit apart.

**Sorting is "work out the order, then rearrange."** pandas does not swap rows around as it compares them. It runs a routine called `nargsort` (a sort that knows how to handle `NaN`) over the chosen column, and that routine returns an **indexer**: an array of the current row positions arranged into sorted order. For our ascending `score` sort, the indexer is `[4, 1, 0, 2, 3]`, meaning "row 4 first, then row 1, then 0, 2, 3." pandas then builds the result with a single `take` of the rows in that order. Because `take` moves whole rows, each row's index label moves with it, which is exactly why the index reads `4, 1, 0, 2, 3` afterward and why a `reset_index` is often the next step.

```text
column to sort        nargsort gives an indexer        take rows in that order
  0: 90                 [ 4, 1, 0, 2, 3 ]                row 4, row 1, row 0, ...
  1: 75            -->  (the sorted order of      -->    = the sorted table,
  2: 90                  the row positions)              labels carried along
  3: NaN
  4: 60
```

**Why missing values sit apart.** `nargsort` cannot compare `NaN` with a number (no comparison with `NaN` is ever true), so it pulls the `NaN` positions out, sorts the real numbers, then appends the `NaN` positions at the end (or the front, for `na_position="first"`). That is why their place is fixed by `na_position` and is not affected by `ascending`. This is the same "`NaN` compares to nothing" rule from [missing values](../cleaning/missing-values.md).

**Several keys use one combined sort.** For a multi-column sort, pandas builds an indexer with `np.lexsort` over the columns, a single sort that orders by the last key, breaking ties with the previous one, and so on, which pandas arranges so your **first** listed column is the primary key. The `kind` option chooses the sorting algorithm: the default is fast but may reorder equal values, while `kind="stable"` guarantees ties keep their original order, at a small cost.

## Gotchas

!!! warning "Sorting returns a new frame: reassign it"
    `df.sort_values("col")` does not change `df`; it returns a sorted copy. Capture it (`df = df.sort_values("col")`) or the order is lost.

!!! warning "The index is scrambled after a value sort"
    Row labels move with their rows, so the index is no longer `0, 1, 2, ...`. If later code assumes clean sequential labels, add `ignore_index=True` (or `reset_index(drop=True)`).

!!! warning "na_position controls NaN, not ascending"
    Missing values go to the end by default in **both** directions. Flipping `ascending` does not move them; only `na_position="first"` does.

!!! warning "ascending must match the number of keys"
    When you sort by a list of columns and want different directions, pass `ascending` a list of the same length (`ascending=[False, True]`). A single `True`/`False` applies to every key.

## Quick reference

| You want | Write |
| --- | --- |
| Order by a column (ascending) | `df.sort_values("col")` |
| Largest first | `df.sort_values("col", ascending=False)` |
| Break ties with a second column | `df.sort_values(["a", "b"], ascending=[False, True])` |
| Send missing values to the top | `df.sort_values("col", na_position="first")` |
| Keep tied rows in their old order | `df.sort_values("col", kind="stable")` |
| Order by the row labels | `df.sort_index()` |
| Sort and renumber the index | `df.sort_values("col", ignore_index=True)` |
| Just the top / bottom N | `df.nlargest(n, "col")` / `df.nsmallest(n, "col")` |

## Where this connects

!!! connect "Order feeds the rest of the workflow"
    - The scrambled index after sorting is cleaned with [resetting the index](../indexing/reset-index.md); ordering by meaningful labels pairs with [setting the index](../indexing/set-index.md).
    - Missing values landing apart is the same `NaN` rule from [handling missing values](../cleaning/missing-values.md).
    - Sorting then `drop_duplicates(keep="last")` is how you keep the newest record per key, see [dropping duplicates](../cleaning/duplicates.md).
    - To order the result of a "per category" summary, sort the table that comes out of [GroupBy](../grouping/groupby.md) and [aggregation](../grouping/aggregation.md).
    - Sorting reorders rows you may have first narrowed with [boolean indexing](boolean-indexing.md) or [loc and iloc](loc-iloc.md).

!!! intuition "If you remember one thing"
    `sort_values` orders by what is in a column, `sort_index` orders by the labels. Use a list of columns to break ties, `na_position` to place missing values, and remember the index moves with the rows, so `reset_index` or `ignore_index=True` when you want clean numbers.
