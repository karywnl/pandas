# Concatenate DataFrames

!!! intuition "The gist"
    `concat` is the "stack them together" tool. Stack tables **on top of each other** to add rows (three months of data into one table), or **side by side** to add columns. It does not look at any key column; it just lines tables up by **column name** (when stacking rows) or by **index** (when stacking columns) and glues them.

## Why it exists

Data often arrives **split into pieces of the same shape**: one CSV per month, one log file per device, one export per region. Each piece has the same columns; you just need them in one table to analyze together. That is not a *join* on a key, it is a *stack*: put the second table's rows right under the first.

This is exactly what [merge](merge.md) is **not** for. Merge matches rows by the *value* of a key column (each customer to their orders). `concat` ignores values entirely and combines by **position and label**: same columns go in the same column, same index rows line up. If you are using merge just to put two same-shape tables together, `concat` is the tool you actually want.

Two directions, set by `axis`:

- **`axis=0` (the default): stack rows.** Add more observations. Columns are matched by name.
- **`axis=1`: stack columns.** Add more variables side by side. Rows are matched by index.

```python
import pandas as pd

week1 = pd.DataFrame({"day": ["Mon", "Tue", "Wed"], "steps": [8000, 9500, 7000]})
week2 = pd.DataFrame({"day": ["Mon", "Tue", "Wed"], "steps": [10000, 8500, 9000]})

week1
#    day  steps
# 0  Mon   8000
# 1  Tue   9500
# 2  Wed   7000

week2
#    day  steps
# 0  Mon  10000
# 1  Tue   8500
# 2  Wed   9000
```

Two weeks of step counts, same two columns. We want one table holding both weeks.

## Picture it

```text
axis=0  (the default): stack ROWS, line columns up by NAME

   week1            week2                 result
   +-----+-----+    +-----+-----+         +-----+-----+
   | day |steps|    | day |steps|         | day |steps|
   +-----+-----+    +-----+-----+   -->   +-----+-----+
   | Mon | 8000|    | Mon |10000|         | Mon | 8000|
   | Tue | 9500|    | Tue | 8500|         | Tue | 9500|
   +-----+-----+    +-----+-----+         | Mon |10000|
                                          | Tue | 8500|
                                          +-----+-----+


axis=1: stack COLUMNS side by side, line rows up by INDEX

   steps          resting_hr            result
   +-----+-----+  +-----+-----+         +-----+-----+-----+
   |     |steps|  |     | hr  |         |     |steps| hr  |
   +-----+-----+  +-----+-----+   -->   +-----+-----+-----+
   | Mon | 8000|  | Mon |  58 |         | Mon | 8000|  58 |
   | Tue | 9500|  | Tue |  60 |         | Tue | 9500|  60 |
   +-----+-----+  +-----+-----+         +-----+-----+-----+
```

**In one line:** `axis=0` grows the table downward (more rows, matched by column name), `axis=1` grows it rightward (more columns, matched by index).

## How it works

### Stacking rows (the default)

Pass a **list** of DataFrames. `concat` takes a list, not two arguments, so you can stack any number at once:

```python
pd.concat([week1, week2])
#    day  steps
# 0  Mon   8000
# 1  Tue   9500
# 2  Wed   7000
# 0  Mon  10000
# 1  Tue   8500
# 2  Wed   9000
```

All six rows are now in one table, columns matched by name. This is the everyday use: read many same-shape files into a list and stack them in one call, `pd.concat([jan, feb, mar])`.

But look at the index on the left: `0, 1, 2, 0, 1, 2`. Each table kept its original row labels, so now **they repeat**. We fix that next.

**In one line:** `pd.concat([a, b, c])` stacks rows from same-shape tables into one, matching columns by name.

### Fixing the duplicate index: `ignore_index`

The stacked table above has two rows labeled `0`, two labeled `1`, and so on. That is a real problem: `result.loc[0]` would now return **two** rows, not one, which quietly breaks label-based lookups. Pass `ignore_index=True` to throw away the old labels and number the result fresh from 0:

```python
pd.concat([week1, week2], ignore_index=True)
#    day  steps
# 0  Mon   8000
# 1  Tue   9500
# 2  Wed   7000
# 3  Mon  10000
# 4  Tue   8500
# 5  Wed   9000
```

Now the index runs `0` to `5`, one label per row. Use `ignore_index=True` whenever the old row numbers carry no meaning (which is almost always when stacking files). This is the same idea as [resetting the index](../indexing/reset-index.md), done as part of the concat.

**In one line:** stacking keeps the original row labels, so they can repeat; `ignore_index=True` renumbers the result cleanly from 0.

### Tagging the source: `keys`

When you stack files, you often lose track of which row came from which source. `keys` adds an **outer index level** labeling each piece:

```python
pd.concat([week1, week2], keys=["week1", "week2"])
#          day  steps
# week1 0  Mon   8000
#       1  Tue   9500
#       2  Wed   7000
# week2 0  Mon  10000
#       1  Tue   8500
#       2  Wed   9000
```

The result has a [MultiIndex](../grouping/multi-level-groupby.md): the outer level says which week, the inner level is the original row number. Now `result.loc["week2"]` pulls back just the second week. Reach for `keys` when the *source* of each row is information you want to keep, not throw away. (Note: `keys` and `ignore_index` are opposites, so you would not use both.)

**In one line:** `keys=[...]` stamps each input with a label in a new outer index level, so you can still tell the pieces apart.

### When columns do not match

The tables above had identical columns. What if they do not? Say a phone app logs `steps` and `sleep`, while a watch logs `steps` and `calories`. They share `steps` but each has its own extra column:

```python
phone = pd.DataFrame({"steps": [8000, 9500], "sleep": [7.5, 6.0]})
watch = pd.DataFrame({"steps": [10000, 8500], "calories": [2200, 2400]})

pd.concat([phone, watch])
#    steps  sleep  calories
# 0   8000    7.5       NaN
# 1   9500    6.0       NaN
# 0  10000    NaN    2200.0
# 1   8500    NaN    2400.0
```

By default `concat` keeps the **union** of all columns (`steps`, `sleep`, `calories`) and fills the gaps with `NaN`: the phone rows have no `calories`, the watch rows have no `sleep`. That is the safe default; nothing is silently dropped. (Notice `calories` shows as `2200.0`: the `NaN` in the phone rows forced the column to float. See [data types](../foundations/dtypes.md).)

If you only want the columns that **all** tables share, pass `join="inner"`:

```python
pd.concat([phone, watch], join="inner")
#    steps
# 0   8000
# 1   9500
# 0  10000
# 1   8500
```

Only `steps` survives, because it is the one column present in both. Use `outer` (the default) to keep everything and accept some `NaN`; use `inner` when you only care about the shared columns.

**In one line:** mismatched columns give the union with `NaN` by default (`join="outer"`), or just the shared columns with `join="inner"`.

### Stacking columns: `axis=1`

Everything so far added rows. Set `axis=1` to add **columns** instead, placing tables side by side. Now the matching happens on the **row index**, not the column names. Say you have steps and resting heart rate in two separate tables, both indexed by day:

```python
steps_t = pd.DataFrame({"steps": [8000, 9500, 7000]}, index=["Mon", "Tue", "Wed"])
hr_t    = pd.DataFrame({"resting_hr": [58, 60, 57]}, index=["Mon", "Tue", "Wed"])

pd.concat([steps_t, hr_t], axis=1)
#      steps  resting_hr
# Mon   8000          58
# Tue   9500          60
# Wed   7000          57
```

The two tables line up by their shared index (`Mon`, `Tue`, `Wed`) and sit side by side. This works cleanly **only because the indexes match**. If they do not, `concat` aligns what it can and fills the rest with `NaN`:

```python
# hr_mis is indexed Mon, Tue, Thu (no Wed; an extra Thu)
pd.concat([steps_t, hr_mis], axis=1)
#       steps  resting_hr
# Mon  8000.0        58.0
# Tue  9500.0        60.0
# Wed  7000.0         NaN     <- no heart rate for Wed
# Thu     NaN        57.0     <- no steps for Thu
```

This is the most common `axis=1` mistake: tables whose indexes do not line up produce a result full of `NaN`. Before a horizontal concat, make sure both tables share the same index, or [reset the index](../indexing/reset-index.md) on both so they align by position (`0, 1, 2, ...`).

**In one line:** `axis=1` joins tables side by side on their index; mismatched indexes silently produce `NaN`, so align them first.

??? question "Quick check: which `concat` adds two more weeks of rows?"
    You have `week3` and `week4`, both with the exact same `day` and `steps` columns, and you want one table with every row from both, numbered cleanly from 0. Which call?

    **Answer:** `pd.concat([week3, week4], ignore_index=True)`. The default `axis=0` stacks the rows (same columns matched by name), and `ignore_index=True` renumbers the combined index from 0 so the two weeks' old labels do not collide. Using `axis=1` would be wrong; that would try to set them side by side as columns.

## Under the hood

!!! tip "New here? You have permission to skip this."
    "List of tables in, one stacked table out: `axis=0` adds rows, `axis=1` adds columns, `ignore_index=True` cleans the index" is the whole chapter. Come back here when concat does something surprising.

**`concat` lines tables up by label, not by data.** When you stack rows (`axis=0`), it looks at the **column names**: each value goes under the column with the same name, and if a table does not have one of the columns, those cells become `NaN`. When you stack columns (`axis=1`), it does the same thing, just using the **row index** instead of the column names. Either way, it never looks at the *values* inside the cells. That is the real difference from [merge](merge.md), which matches on values, and it is why `concat` can take a whole list of tables at once while merge joins exactly two.

**Mixing dtypes promotes the column.** When stacked columns hold different types, pandas picks one type that can hold them all. Stacking an integer column under a float column gives `float64`:

```python
a = pd.DataFrame({"x": [1, 2]})      # int64
b = pd.DataFrame({"x": [3.5, 4.5]})  # float64
pd.concat([a, b], ignore_index=True)["x"].dtype
# dtype('float64')
```

Stacking integers under strings gives `object`, and this one can surprise you in pandas 3.0. A column of only text now uses the dedicated `str` type, but that type holds *only* strings. The moment a column mixes numbers and text, no specialized type fits, so pandas falls back to the catch-all `object` dtype:

```python
a = pd.DataFrame({"x": [1, 2]})       # int64
c = pd.DataFrame({"x": ["hi", "yo"]}) # str
pd.concat([a, c], ignore_index=True)["x"].dtype
# dtype('O')   <- object: a mix of numbers and text
```

The float case is the same upcasting rule you saw with missing values and merge, just triggered by combining columns. See [data types](../foundations/dtypes.md).

**Never concat inside a loop.** This is the performance mistake that most often slows real code. Each `concat` builds a brand-new table and copies all the data gathered so far, so growing a table one piece at a time copies the early rows again and again:

```python
# SLOW: re-copies everything on every pass, cost grows with the square of the count
result = pd.DataFrame()
for file in files:
    result = pd.concat([result, pd.read_csv(file)])

# FAST: collect into a list, concat once at the end
parts = [pd.read_csv(file) for file in files]
result = pd.concat(parts)
```

The first version copies `1 + 2 + 3 + ... + n` rows of data; the second copies each row once. For many files the difference is large and grows as you add more. The rule is simple: **build a list, then `concat` once.**

## Gotchas

!!! warning "Duplicate index after stacking rows"
    Plain `pd.concat([a, b])` keeps the original row labels, so they repeat. `result.loc[0]` then returns several rows instead of one, which breaks label lookups. Pass `ignore_index=True` (or use `keys` to tag the sources on purpose).

!!! warning "Mismatched column names create NaN, they do not merge"
    `concat` matches columns by exact name. If one table calls it `"Name"` and another `"name"`, you get two separate columns, each half `NaN`, not one combined column. Normalize names with [rename](../cleaning/rename.md) before stacking.

!!! warning "axis=1 aligns on the index, not on row order"
    Side-by-side concat lines tables up by index label, not by position. If the indexes differ, you get `NaN`-filled rows even when the tables look the same length. Make the indexes match, or reset both first.

!!! warning "Don't grow a table by concatenating in a loop"
    Repeated `concat` in a loop re-copies the data every pass and gets slow as the table grows. Collect the pieces in a list and concat once at the end.

!!! warning "Reach for concat, not merge, to stack same-shape data"
    If the tables share a schema and you just want them together, that is `concat`. Use [merge](merge.md) only when you are matching rows on a shared **key** column.

## Quick reference

| You want | Write |
| --- | --- |
| Stack rows (same columns) | `pd.concat([a, b, c])` |
| Stack rows, renumber index | `pd.concat([a, b], ignore_index=True)` |
| Stack rows, tag each source | `pd.concat([a, b], keys=["a", "b"])` |
| Keep only shared columns | `pd.concat([a, b], join="inner")` |
| Add columns side by side | `pd.concat([a, b], axis=1)` |

## Where this connects

!!! connect "Stacking versus joining"
    - `concat` is the structural sibling of [merge](merge.md): concat stacks same-shape tables by position and label, merge joins related tables by a key value. Mixing them up is a common beginner error.
    - The repeated labels from stacking are cleaned with [resetting the index](../indexing/reset-index.md); `ignore_index=True` does it inline.
    - Tagging sources with `keys` builds the same [MultiIndex](../grouping/multi-level-groupby.md) you get from a multi-key GroupBy, so `loc` on the outer level works the same way.
    - The `NaN` from mismatched columns or indexes is handled with [missing values](../cleaning/missing-values.md), and the float upcast comes from [data types](../foundations/dtypes.md).
    - Column-name mismatches are fixed ahead of time with [renaming columns](../cleaning/rename.md).

!!! intuition "If you remember one thing"
    `concat` stacks a **list** of tables: `axis=0` adds rows (matched by column name), `axis=1` adds columns (matched by index). Add `ignore_index=True` to get a clean index, and never grow a table by concatenating in a loop.
