# Cross tabulation

!!! intuition "The gist"
    `pd.crosstab(rows, cols)` counts how often each **combination** of two categories occurs, and lays the counts out in a grid. It answers "how many of each kind?" questions: how many mobile users are on the free plan, how many on paid, and so on.

## Why it exists

You constantly want to know how two categorical things relate. Of your users, how many are mobile-and-free versus desktop-and-paid? That is a **frequency table** (statisticians call it a contingency table), and building it by hand means tallying every record into the right bucket.

`crosstab` is the tally grid. Picture going through your data one row at a time and putting a tally mark in the cell where that row's two categories meet. At the end, each cell holds its count.

```python
import pandas as pd

survey = pd.DataFrame({
    "device": ["mobile", "desktop", "mobile", "mobile", "desktop", "desktop", "mobile"],
    "plan":   ["free",   "paid",    "paid",   "free",   "paid",    "free",    "paid"],
})
```

## Picture it

```text
seven respondents, each a (device, plan) pair:
  mobile/free,  desktop/paid, mobile/paid, mobile/free,
  desktop/paid, desktop/free, mobile/paid

        |  crosstab: tally each combination into its cell
        v

  +---------+------+------+
  |         | free | paid |
  +---------+------+------+
  | desktop |   1  |   2  |
  | mobile  |   2  |   2  |
  +---------+------+------+
     each cell = how many respondents had that (device, plan) pair
     so 2 people were mobile + free, and 1 was desktop + free
```

**In one line:** `crosstab` counts co-occurrences of two categories and arranges the counts as a grid.

## How it works

The basic call takes two columns: one for the rows, one for the columns.

```python
pd.crosstab(survey["device"], survey["plan"])
# plan     free  paid
# device
# desktop     1     2
# mobile      2     2
```

Note you pass the **Series themselves** (`survey["device"]`), not their names as strings. That is the main way `crosstab` differs from `pivot_table`, which takes the DataFrame plus column names.

### Totals with margins

```python
pd.crosstab(survey["device"], survey["plan"], margins=True)
# plan     free  paid  All
# device
# desktop     1     2    3
# mobile      2     2    4
# All         3     4    7
```

The `All` row and column give the per-row, per-column, and grand totals, the same `margins` idea as in [pivot tables](pivot.md).

### Proportions with normalize

Raw counts are hard to compare when groups differ in size. There were more mobile respondents than desktop, so the bare counts do not tell you whether mobile users *prefer* free at a higher rate. `normalize` turns the counts into fractions so you can compare:

```python
pd.crosstab(survey["device"], survey["plan"], normalize="index")
# plan      free  paid
# device
# desktop   0.33  0.67     <- this ROW sums to 1
# mobile    0.50  0.50     <- so does this one
```

Now each row reads as a percentage breakdown *within* that device: of desktop users, 33% are free and 67% are paid.

The one trap is the option's name. `normalize="index"` divides each cell by its **row** total — it is called `"index"` because the row labels are the DataFrame's index. So:

- `normalize="index"` → each **row** sums to 1 (breakdown across the columns, within each row)
- `normalize="columns"` → each **column** sums to 1
- `normalize=True` → divide by the grand total, so **every cell** is a fraction of the whole and all cells together sum to 1

A quick way to keep it straight: normalize names the thing held *fixed*. `"index"` holds each row fixed and splits it across the columns.

### Summarising a number instead of counting

Give `crosstab` a `values` column and an `aggfunc`, and it stops counting and aggregates that column instead, exactly like a pivot table:

```python
survey["spend"] = [5, 20, 15, 8, 25, 6, 18]
pd.crosstab(survey["device"], survey["plan"], values=survey["spend"], aggfunc="mean")
# plan     free  paid
# device
# desktop   6.0  22.5     <- average spend, not a count
# mobile    6.5  16.5
```

??? question "Quick check: read a cell"
    Using the seven-row `survey`, what does `pd.crosstab(survey["device"], survey["plan"])` put in the mobile/paid cell?

    **Answer:** **2**. Two respondents were on mobile and paid (rows 3 and 7 of the data). Each cell is just a count of how many rows had that exact (device, plan) pair.

??? question "Quick check: which way does normalize go?"
    With `normalize="index"`, the desktop row reads `0.33` and `0.67`. What do those mean, and why do they add to 1?

    **Answer:** They are the split *within* desktop users: one third are on free, two thirds on paid. `normalize="index"` divides each cell by its **row** total, so every row sums to 1.

## Under the hood

!!! tip "New here? You have permission to skip this."
    "Counts of combinations, in a grid" is all you need. Here is how it relates to tools you already know.

`crosstab` is not really a new engine. It is [`pivot_table`](pivot.md) with the count built in. By default it counts occurrences, which is the same thing as grouping by both keys and asking for the size of each group:

```python
pd.crosstab(survey["device"], survey["plan"])
# is the same as
survey.groupby(["device", "plan"]).size().unstack(fill_value=0)
```

Both produce the identical grid. So why does `crosstab` exist? Convenience for the most common case. Frequency tables come up so often that pandas gives them a dedicated function with `normalize` baked in, rather than making you write the groupby-size-unstack dance every time.

This also places it in a small family: `value_counts()` is the **one-variable** frequency table (counts of a single column), and `crosstab` is the **two-variable** version (counts of pairs).

## Gotchas

!!! warning "It counts by default, no values needed"
    `crosstab(a, b)` gives counts with nothing else passed. You only add `values` and `aggfunc` when you want to summarise a number instead of counting. Forgetting that and expecting a sum gets you counts.

!!! warning "Pass Series, not column names"
    `pd.crosstab(df["a"], df["b"])` works; `pd.crosstab("a", "b")` does not. Unlike `pivot_table`, `crosstab` takes the actual arrays, not column-name strings.

!!! warning "normalize directions are easy to flip"
    `"index"` makes rows sum to 1, `"columns"` makes columns sum to 1, `True` divides by the grand total. The name is the thing held *fixed*: `"index"` (the row labels) keeps each row fixed and splits it across the columns. Say out loud which breakdown you want before choosing.

## Quick reference

| You want | Write |
| --- | --- |
| Counts of two categories | `pd.crosstab(df["a"], df["b"])` |
| Add row/column/grand totals | `pd.crosstab(df["a"], df["b"], margins=True)` |
| Row proportions | `pd.crosstab(df["a"], df["b"], normalize="index")` |
| Fractions of the whole | `pd.crosstab(df["a"], df["b"], normalize=True)` |
| Summarise a value, not count | `pd.crosstab(df["a"], df["b"], values=df["v"], aggfunc="mean")` |
| One-variable version | `df["a"].value_counts()` |

## Where this connects

!!! connect "Crosstab sits in the summarising family"
    - It is [`pivot_table`](pivot.md) specialised for counting; anything `crosstab` does, `pivot_table` can do with `aggfunc="size"`, just less conveniently.
    - It equals a [GroupBy](groupby.md) on both keys followed by `size().unstack()`, the same split-apply-combine underneath.
    - For a single column, the equivalent is `value_counts()`, the one-variable frequency table.
    - The result is a normal DataFrame, so you can keep [selecting](../selection/column-selection.md) and [filtering](../selection/boolean-indexing.md) it, or feed it to a heatmap.

!!! intuition "If you remember one thing"
    `crosstab` is a tally grid: it counts how often each pair of categories shows up. Add `margins` for totals, `normalize` for proportions, and `values` plus `aggfunc` when you want to summarise a number instead of counting.
