# Aggregation

!!! intuition "The gist"
    Aggregation is the "apply" step of GroupBy: it reduces each group to summary numbers. `agg` lets you compute several statistics at once, give different columns different functions, and name the outputs cleanly. `transform` is a related method that keeps the original shape.

## Why it exists

A plain `.sum()` gives one statistic. Real summary tables want more: total revenue *and* average units *and* a headcount, each per group, with tidy column names. `agg` is the tool that builds those tables. Reusing the sales data:

```python
import pandas as pd

sales = pd.DataFrame({
    "region":  ["East", "East", "West", "West", "East"],
    "product": ["A", "B", "A", "B", "A"],
    "units":   [10, 5, 8, 12, 7],
    "revenue": [100, 60, 80, 130, 70],
})
```

## How it works

### Named aggregation (the one to learn)

This is the cleanest form and the one to use. Each output is `name=("column", "function")`.

```python
sales.groupby("region").agg(
    total_rev=("revenue", "sum"),
    avg_units=("units", "mean"),
)
#         total_rev  avg_units
# region
# East          230       7.33
# West          210      10.00
```

You get flat, named columns, exactly the summary table you wanted, no cleanup required.

**In one line:** `agg(name=("col", "func"), ...)` builds a clean, named summary table.

### Other agg forms

```python
sales.groupby("region")["revenue"].agg(["sum", "mean"])   # several funcs, one column
sales.groupby("region").agg({"revenue": "sum", "units": "max"})  # per-column functions
sales.groupby("region")["revenue"].agg(lambda g: g.max() - g.min())  # custom
```

A custom function receives each group's Series and returns one number. It is flexible but slower than the built-ins, so prefer a built-in when one exists.

### transform: same answer, original shape

`agg` shrinks each group to one row. `transform` computes a per-group value but **broadcasts it back to every original row**, so the result lines up with the input. This is how you add a "group average" column.

```python
sales["region_avg"] = sales.groupby("region")["revenue"].transform("mean")
# every East row gets 76.67, every West row gets 105.0
```

??? question "Quick check: agg or transform?"
    You want to add a column showing each row's regional average revenue, keeping all 5 rows. Which do you use, `agg` or `transform`?

    **Answer:** `transform`. `agg("mean")` would collapse to one row per region (2 rows total). `transform("mean")` computes the same group means but broadcasts them back to all 5 rows, so it fits as a new column.

## filter: keep or drop whole groups

Where `transform` reshapes values, `filter` keeps or removes entire groups based on a group-level test.

```python
sales.groupby("region").filter(lambda g: len(g) > 2)
# keeps only East, because it has 3 rows; West has 2 and is dropped
```

## Under the hood

!!! tip "New here? You have permission to skip this."
    Named `agg`, plus `transform` for shape-preserving features, covers the vast majority of work. This explains *how* `agg` runs the reduction, which is why a built-in is so much faster and why a list of functions gives two-level columns.

**How a built-in differs from a lambda.** After the [GroupBy](groupby.md) has sorted the rows into groups, `agg` has to turn each group's values into one number, and how it does that depends on which function you give it. A built-in like `"sum"` maps to a single routine written in compiled C that runs through all the grouped values in one pass, keeping a running total per group. A custom lambda cannot use that fast path: pandas must slice out each group on its own and call your Python function once for it, and a Python call carries overhead every time. With thousands of groups that becomes thousands of slow calls, which is why a lambda can be 10 to 100 times slower. Always check for a built-in first.

**Why a list of functions makes two-level columns.** When you write `agg(["sum", "mean"])`, you are asking for **one output column per (input column, function) pair**. To label both parts, pandas stacks the labels into a two-level (MultiIndex) header like `(revenue, sum)`, which is awkward to select from later. **Named aggregation** sidesteps this by letting you give each output your own flat name (`total_rev=("revenue", "sum")`), which is the main reason to prefer it.

## Gotchas

!!! warning "List-of-functions creates nested columns"
    `agg(["mean", "std"])` gives MultiIndex columns. Use named aggregation for flat names.

!!! warning "std uses a sample correction by default"
    `std()` uses `ddof=1` (sample standard deviation). For the population value, pass `ddof=0`.

## Quick reference

| You want | Write |
| --- | --- |
| A named summary table | `g.agg(tot=("v", "sum"), avg=("u", "mean"))` |
| Several stats, one column | `g["v"].agg(["sum", "mean"])` |
| Different func per column | `g.agg({"v": "sum", "u": "max"})` |
| Custom statistic | `g["v"].agg(lambda s: s.max() - s.min())` |
| Group value on every row | `df.groupby("k")["v"].transform("mean")` |
| Keep/drop whole groups | `df.groupby("k").filter(lambda g: ...)` |

## Where this connects

!!! connect "The apply step, in full"
    - It builds directly on [GroupBy](groupby.md), the split-apply-combine basics.
    - `transform` is the engine behind group-aware [missing-value filling](../cleaning/missing-values.md) (fill each group with its own median).
    - Aggregating across two keys and reshaping into a grid is [pivot tables](pivot.md).
    - When a group needs custom logic that `agg` and `transform` cannot express, the flexible (and slower) fallback is [`apply` with a custom function](../transforming/apply.md).
    - The summary that comes out is a normal table, so [sort it](../selection/sorting.md) (or use `nlargest`) to rank the groups.

!!! intuition "If you remember one thing"
    Use named `agg` for clean summary tables, `transform` when you need the group statistic on every original row, and `filter` to keep or drop whole groups. Prefer built-in functions for speed.
