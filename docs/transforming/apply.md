# apply: custom functions

!!! intuition "The gist"
    `apply()` runs **your own function** over the data, one piece at a time: each value of a Series, each row or column of a DataFrame, or each group of a GroupBy. It is the tool for logic that no built-in covers. It is also slow, so reach for it only when there is no vectorized way to do the same job.

## Why it exists

Most things you do to a column already have a fast built-in: add two columns, compare to a threshold, take an average. Once in a while, though, your logic fits no built-in, a custom rule, an odd mix of columns, a call into another library. `apply()` is how you run that arbitrary function across the data.

Here is the table we will use throughout:

```python
import pandas as pd
import numpy as np

emp = pd.DataFrame({
    "name":      ["Ana", "Ben", "Cara", "Dan"],
    "dept":      ["Sales", "Sales", "Engineering", "Engineering"],
    "salary":    [50000, 60000, 90000, 80000],
    "bonus_pct": [0.10, 0.15, 0.20, 0.10],
})
emp
#    name         dept  salary  bonus_pct
# 0   Ana        Sales   50000       0.10
# 1   Ben        Sales   60000       0.15
# 2  Cara  Engineering   90000       0.20
# 3   Dan  Engineering   80000       0.10
```

Keep one rule in mind the whole way down: `apply()` is the **last** tool to reach for, not the first.

## Picture it

`apply()` calls your function once for every value. A vectorized operation, a plain column expression like `salary >= 70000`, gets the same answer without ever handing control to your Python code, which is why it is far faster.

```text
df["salary"].apply(f)        df["salary"] >= 70000
one Python call per value    a single fast loop in C

  50000  ->  f(50000) -> "low"     50000
  60000  ->  f(60000) -> "low"     60000   compared in one
  90000  ->  f(90000) -> "high"    90000   C loop, with no
  80000  ->  f(80000) -> "high"    80000   Python per value
  4 calls into Python              0 calls into Python
```

**In one line:** `apply()` runs your function value by value in Python; vectorized methods do the whole column in compiled C. Same answer, very different speed.

## How it works

### On a Series: one value at a time

`apply()` runs your function on each value and gathers the results into a new Series. The function takes one value and returns one value:

```python
emp["name"].apply(len)
# 0    3
# 1    3
# 2    4
# 3    3
# Name: name, dtype: int64
```

A `lambda` is handy for a quick inline rule:

```python
emp["salary"].apply(lambda x: "high" if x >= 70000 else "low")
# 0     low
# 1     low
# 2    high
# 3    high
# Name: salary, dtype: str
```

### On a DataFrame: `axis` picks columns or rows

On a DataFrame, `apply()` hands your function a **whole Series at a time**, and `axis` decides whether that Series is a column or a row.

=== "axis=0: each column (default)"

    ```python
    emp[["salary", "bonus_pct"]].apply(lambda col: col.max() - col.min())
    # salary       40000.0
    # bonus_pct        0.1
    # dtype: float64
    ```

    The function receives each **column** and returns one result per column (here, the range).

=== "axis=1: each row"

    ```python
    emp.apply(lambda row: row["salary"] * row["bonus_pct"], axis=1)
    # 0     5000.0
    # 1     9000.0
    # 2    18000.0
    # 3     8000.0
    # dtype: float64
    ```

    The function receives each **row**, so it can combine columns within that row.

The numbering catches everyone, so fix it now: **`axis=0` gives you each column, `axis=1` gives you each row.**

??? question "Quick check: which axis?"
    You want each employee's salary times their bonus percentage, one number per person. Which `axis`?

    **Answer:** `axis=1`. You need each **row** handed to the function so you can multiply two of its columns together. `axis=0` would pass whole columns instead, giving one number per column.

### Prefer a vectorized version first

Both DataFrame examples above were really just for teaching: each has a faster form that skips `apply()`. The multiply is plain column arithmetic:

```python
emp["salary"] * emp["bonus_pct"]
# 0     5000.0
# 1     9000.0
# 2    18000.0
# 3     8000.0
# dtype: float64
```

And the "high/low" label is a one-line `np.where`, a vectorized "if/else" over the whole column:

```python
np.where(emp["salary"] >= 70000, "high", "low")
# array(['low', 'low', 'high', 'high'], dtype='<U4')
```

These run in compiled C and are usually many times faster than the matching `apply()`. **Before writing `apply()`, ask: is there a column expression, `np.where`, or `pd.cut` (which sorts numbers into labelled bands) that does this?** Usually there is, and `apply()` is for the cases where there genuinely is not.

### On a GroupBy: one group at a time

On a [GroupBy](../grouping/groupby.md), `apply()` hands your function **each group as a small DataFrame**, and the function can return a number, a Series, or a table. For example, the salary spread within each department:

```python
emp.groupby("dept").apply(lambda g: g["salary"].max() - g["salary"].min())
# dept
# Engineering    10000
# Sales          10000
# dtype: int64
```

It is the most flexible GroupBy tool but the slowest, because it runs your Python function once per group. Prefer [`agg`](../grouping/aggregation.md) for plain summaries and `transform` for a per-group value put back on every row; use `apply` only when neither fits.

### map and DataFrame.map

Two close relatives, worth knowing so you do not reach for `apply` out of habit:

- **`Series.map`** does the same as `Series.apply` for a function, and it also takes a **dictionary** for value lookups (`s.map({"M": "Male"})`). See [replace and map](../cleaning/replace.md).
- **`DataFrame.map`** runs a function on **every cell** of a frame, for example `emp[["salary"]].map(lambda x: x / 1000)`.

## Under the hood

!!! tip "New here? You can skip this."
    "Vectorize first, use `apply` only when nothing built-in fits" is the whole chapter. This explains *why* it is slow.

A vectorized operation like `salary >= 70000` runs one loop in compiled C over the block of numbers, never stopping for Python. `apply` cannot, because your function *is* Python: pandas still walks the values in a compiled loop, but for each one it hands control back to the slow Python interpreter and waits for the answer. That hand-off, paid once per value, is the cost. The loop happens either way; the difference is that the C step is tiny while the Python step is heavy. This is the other side of the [vectorization](../selection/boolean-indexing.md) that makes filtering fast.

`axis=1` is the slowest form of all, because pandas has to build a temporary Series for **every row** before calling your function, and a DataFrame stores its data column by column, not row by row.

## Gotchas

!!! danger "Reach for vectorized first, always"
    Using `apply` where a column expression, `np.where`, or `pd.cut` would do is the single most common pandas performance mistake. On large data the vectorized form can be many times faster for the identical result. Treat `apply` as the tool you justify, not the default.

!!! warning "axis=0 is columns, axis=1 is rows"
    The numbering feels backwards. If an `apply` returns the wrong shape, a flipped `axis` is the first thing to check.

!!! warning "Keep the function pure"
    Give `apply` a function that only computes and returns a value, with no side effects (no printing, no appending to an outside list). pandas does not promise how many times it calls your function, so never rely on a count.

## Quick reference

| You want | Write |
| --- | --- |
| Function on each Series value | `s.apply(f)` |
| Function on each column | `df.apply(f)` (axis=0) |
| Function on each row | `df.apply(f, axis=1)` |
| Function on every cell | `df.map(f)` |
| Custom logic per group | `df.groupby("k").apply(f)` |
| Vectorized if/else (preferred) | `np.where(cond, a, b)` |
| Vectorized banding (preferred) | `pd.cut(s, bins=[...], labels=[...])` |

## Where this connects

!!! connect "The fallback, and what to use instead"
    - `apply` is the slow, general fallback for [vectorization](../selection/boolean-indexing.md): vectorized methods never run your Python code per value, which is the speed `apply` gives up.
    - On a Series, `apply` equals [`map`](../cleaning/replace.md) for a function; for value swaps and dictionary lookups, `map` and [`replace`](../cleaning/replace.md) are cleaner.
    - For if/else labelling prefer `np.where` or `pd.cut`; for turning text into numbers, [`to_numeric`](../cleaning/change-dtypes.md).
    - On a [GroupBy](../grouping/groupby.md), `apply` is the flexible cousin of [`agg` and `transform`](../grouping/aggregation.md); reach for those first.

!!! intuition "If you remember one thing"
    `apply` runs your own function over the data, one value, row, or group at a time. That flexibility costs speed, so vectorize whenever you can and keep `apply` for the logic that has no built-in form.
