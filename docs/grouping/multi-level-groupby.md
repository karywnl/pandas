# Multi-level GroupBy

!!! intuition "The gist"
    Group by **two or more keys** and you ask a finer question: not "average salary per department" but "average salary per department **and** seniority". The answer comes back with a **hierarchical index** (a MultiIndex), one row per combination. This chapter is about reading, reshaping, and flattening that layered result.

## Why it exists

A single key answers a "per category" question: average salary per department. But the real question is often more specific. Within each department, how do juniors and seniors compare? That needs **two keys at once**, department and seniority, so each answer belongs to one (department, seniority) pair.

You already saw in [GroupBy](groupby.md) that you can pass a list of keys. But that page did not explain one important thing: the **shape of the result**. When you group by two keys, pandas can no longer use a plain flat index, because each row is now named by a *pair* of labels. So it stacks the answer into a **MultiIndex**: an index with more than one level.

The result has **two levels**: an **outer** level (department) and an **inner** level (seniority). In the printed output, each department is written once like a heading, with its seniority rows listed underneath. The rest of this page is just three actions on that structure: take one department, take one exact (department, seniority) row, or lay the whole thing out flat as a grid.

```python
import pandas as pd

emp = pd.DataFrame({
    "department": ["Engineering", "Engineering", "Engineering", "Engineering",
                   "Marketing", "Marketing", "Marketing", "Marketing"],
    "seniority":  ["Junior", "Junior", "Senior", "Senior",
                   "Junior", "Junior", "Senior", "Senior"],
    "salary":     [70000, 80000, 110000, 130000, 50000, 60000, 85000, 95000],
    "bonus":      [5000, 6000, 15000, 15000, 3000, 4000, 9000, 11000],
})
emp
#     department seniority  salary  bonus
# 0  Engineering    Junior   70000   5000
# 1  Engineering    Junior   80000   6000
# 2  Engineering    Senior  110000  15000
# 3  Engineering    Senior  130000  15000
# 4    Marketing    Junior   50000   3000
# 5    Marketing    Junior   60000   4000
# 6    Marketing    Senior   85000   9000
# 7    Marketing    Senior   95000  11000
```

Eight employees, two departments, two seniority levels. We want one salary number per (department, seniority) pair.

## Picture it

```text
group by [department, seniority]: one value per (department, seniority) pair,
stacked into a two-level (hierarchical) index

  department    seniority
  Engineering   Junior        75000      <- the Junior row under
                Senior       120000         the Engineering heading
  Marketing     Junior        55000
                Senior        90000

        |  unstack("seniority"): lift the inner level up to become columns
        v

  +-------------+--------+--------+
  |             | Junior | Senior |
  +-------------+--------+--------+
  | Engineering |  75000 | 120000 |
  | Marketing   |  55000 |  90000 |
  +-------------+--------+--------+
```

**In one line:** grouping by several keys gives a result with one row per key combination; the main skill is moving between that stacked form and a flat grid.

## How it works

### Creating multi-level groups

Pass a **list** of columns to `groupby`. Everything else (selecting a column, calling an aggregation) is exactly as before. The only new thing is the result.

```python
by_pair = emp.groupby(["department", "seniority"])["salary"].mean()
by_pair
# department   seniority
# Engineering  Junior        75000.0
#              Senior       120000.0
# Marketing    Junior        55000.0
#              Senior        90000.0
# Name: salary, dtype: float64
```

This is still a Series, but its index now has **two levels**, `department` and `seniority`. The blank cells under `Engineering` are not missing data; pandas just hides the repeated outer label so the hierarchy is easy to read. (The values are floats because `mean` always returns floats.)

**In one line:** a list of keys in, a MultiIndex out, one entry per existing combination.

### Reading one slice: `loc` and `xs`

A grid is only useful if you can pull pieces out of it. There are two moves, and which one you want depends on **which level you are pinning**.

To take one department (the **outer** level), use `loc`:

```python
by_pair.loc["Engineering"]
# seniority
# Junior     75000.0
# Senior    120000.0
# Name: salary, dtype: float64
```

To take one exact (department, seniority) row, pass the **full tuple**:

```python
by_pair.loc[("Engineering", "Senior")]
# 120000.0
```

But what if you want the same inner value from *every* department, say every Junior figure? That fixes the **inner** level, and plain `loc` is awkward for that. Use `xs` (cross-section) with an explicit level:

```python
by_pair.xs("Junior", level="seniority")
# department
# Engineering    75000.0
# Marketing      55000.0
# Name: salary, dtype: float64
```

Naming the level (`level="seniority"`) is the readable way to say "I mean the seniority axis, not the department one", and it keeps working no matter how many levels you have.

### Reshape: turn a level into columns with `unstack`

Stacked output is great for reading top to bottom, but to *compare* juniors against seniors side by side you want them as columns. `unstack` lifts one index level up into the columns:

```python
by_pair.unstack("seniority")
# seniority     Junior    Senior
# department
# Engineering  75000.0  120000.0
# Marketing    55000.0   90000.0
```

Now each department is a row and each seniority a column, and you can read the comparison directly: Engineering seniors earn 120k against juniors' 75k, Marketing's 90k against 55k. Both are about a 60% jump, but Engineering's gap in money (45k) is the bigger one. This is the point of the grid: the question from the top of the page, answered at a glance.

This is also the link to [pivot tables](pivot.md): a pivot table is really "group by two keys, then `unstack`" done in one call. So when should you do it by hand instead? If the wide grid is all you want, use `pivot_table`. Use multi-level GroupBy when you want to keep the stacked result and pull pieces out of it with `loc` and `xs`, or when reshaping is only one part of a bigger task.

**In one line:** `unstack` moves a level from the rows to the columns, turning a tall stack into a wide grid.

### Many statistics at once

Often one number per group is not enough. You want the average salary, the headcount, and the total bonus side by side for each (department, seniority). The same multi-key group feeds straight into named [aggregation](aggregation.md), and the only difference from a single key is that the result keeps the two-level row index:

```python
emp.groupby(["department", "seniority"]).agg(
    avg_salary=("salary", "mean"),
    headcount=("salary", "size"),
    total_bonus=("bonus", "sum"),
)
#                        avg_salary  headcount  total_bonus
# department  seniority
# Engineering Junior        75000.0          2        11000
#             Senior       120000.0          2        30000
# Marketing   Junior        55000.0          2         7000
#             Senior        90000.0          2        20000
```

`transform` and `filter` work identically with multiple keys too; the group is just keyed by a tuple now. See [aggregation](aggregation.md) for those.

### Flatten back to plain columns

A MultiIndex is useful for slicing but inconvenient when you want to keep processing, merge, or export. To turn the index levels back into ordinary columns, use `reset_index`:

```python
by_pair.reset_index()
#     department seniority    salary
# 0  Engineering    Junior   75000.0
# 1  Engineering    Senior  120000.0
# 2    Marketing    Junior   55000.0
# 3    Marketing    Senior   90000.0
```

If you know from the start that you do not want a MultiIndex at all, skip that extra step and pass `as_index=False` in the `groupby` itself. It gives the same flat table directly:

```python
emp.groupby(["department", "seniority"], as_index=False)["salary"].mean()
#     department seniority    salary
# 0  Engineering    Junior   75000.0
# 1  Engineering    Senior  120000.0
# 2    Marketing    Junior   55000.0
# 3    Marketing    Senior   90000.0
```

### Level order decides how you slice

The order you list the keys is the order of the index levels, and that controls what `loc` can select directly. Level 0 (the outer level) is whichever key you put first:

```python
emp.groupby(["seniority", "department"])["salary"].mean()
# seniority  department
# Junior     Engineering     75000.0
#            Marketing       55000.0
# Senior     Engineering    120000.0
#            Marketing       90000.0
# Name: salary, dtype: float64
```

Same numbers, different hierarchy. Now `loc["Junior"]` selects on seniority instead of department. Put first whatever you most often want to slice by, and use `xs` when you need the inner one.

??? question "Quick check: which tool gets every Junior?"
    From `by_pair` (indexed by department then seniority), you want the Junior salary for **both** departments. Do you use `by_pair.loc["Junior"]` or `by_pair.xs("Junior", level="seniority")`?

    **Answer:** `xs`. `loc["Junior"]` looks on the **outer** level, which is `department`, so it would fail (there is no "Junior" department). Junior lives on the inner level, and `xs("Junior", level="seniority")` pins exactly that level, returning one value per department.

??? question "Quick check: stack or grid?"
    You have `by_pair` stacked as a Series and you want a table with departments down the side and `Junior`/`Senior` as two columns to compare. One method gets you there. Which?

    **Answer:** `by_pair.unstack("seniority")`. It moves the seniority level off the index and up into the columns, giving the wide department-by-seniority grid.

## Under the hood

!!! tip "New here? You have permission to skip this."
    "Two keys make a two-level index; `unstack` widens it, `reset_index` flattens it" is the whole chapter. A few extra details.

**A MultiIndex is just a column of tuples, displayed nicely.** Each row's label is really `("Engineering", "Senior")`. That is why `loc[("Engineering", "Senior")]` works and why the group name is a **tuple** when you iterate:

```python
for (dept, sen), group in emp.groupby(["department", "seniority"]):
    ...   # dept = "Engineering", sen = "Junior", then the next pair
```

**Only combinations that actually occur get a row.** Grouping does not invent the empty cells. If no Marketing employee were Senior, that pair simply would not appear in the stacked result. You only see the gap once you `unstack`, where the missing cell becomes `NaN`:

```python
# if Marketing/Senior had no rows:
# seniority     Junior    Senior
# department
# Engineering  70000.0  120000.0
# Marketing    55000.0       NaN     <- combination never occurred
```

**Bare `unstack()` uses the innermost level.** `unstack()` with no argument moves the *last* level (here `seniority`). Naming the level, `unstack("seniority")`, is clearer and still works if you reorder the levels.

## Gotchas

!!! warning "loc only opens the outer level directly"
    `by_pair.loc["Junior"]` fails because `Junior` is on the inner level. Use `xs("Junior", level="seniority")`, or reorder the keys so seniority is first.

!!! warning "Unstacking can create NaN"
    Missing (department, seniority) combinations have no row while stacked, but turn into `NaN` cells when you `unstack`. Decide whether to `fillna(0)` afterward, just like with [pivot tables](pivot.md).

!!! warning "Level order is not just for looks"
    `groupby(["dept", "year"])` and `groupby(["year", "dept"])` give the same numbers but a different hierarchy, which changes what `loc` can slice. Pick the order that matches how you will read the result.

!!! warning "Custom functions get slow with many groups"
    Two keys with many values can make a huge number of groups. Built-in aggregations stay fast (they run in C); a Python lambda runs once per group and can be very slow. Prefer built-ins, as in [aggregation](aggregation.md).

## Quick reference

| You want | Write |
| --- | --- |
| Group by two keys | `df.groupby(["a", "b"])["v"].mean()` |
| Open the outer level | `result.loc["A"]` |
| One exact cell | `result.loc[("A", "X")]` |
| Pin the inner level | `result.xs("X", level="b")` |
| Tall stack into a wide grid | `result.unstack("b")` |
| Several stats at once | `df.groupby(["a", "b"]).agg(...)` |
| Levels back to columns | `result.reset_index()` |
| Never make a MultiIndex | `df.groupby([...], as_index=False)` |

## Where this connects

!!! connect "Finer groups, layered results"
    - It extends [GroupBy](groupby.md): same split-apply-combine, just a list of keys and a MultiIndex result.
    - The per-group statistics come from [aggregation](aggregation.md); `agg`, `transform`, and `filter` all work unchanged with multiple keys.
    - `unstack` is the link to [pivot tables](pivot.md): a pivot is a two-key group plus an unstack, in one call.
    - Flattening uses [resetting the index](../indexing/reset-index.md); the layered result itself is a MultiIndex on the rows, the multi-level version of [setting the index](../indexing/set-index.md).
    - For counting pure combinations rather than summarising a value, the shortcut is [cross tabulation](crosstab.md).

!!! intuition "If you remember one thing"
    Multiple keys build a result with an outer and an inner level. Group by a list to make it, `loc` and `xs` to take pieces out, `unstack` to lay it flat as a grid, and `reset_index` or `as_index=False` to get plain columns back.
