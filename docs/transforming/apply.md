# apply: custom functions

!!! intuition "The gist"
    `apply()` runs **your own Python function** over a Series, a DataFrame, or the groups of a GroupBy. It is the fallback for logic that the built-in vectorized methods cannot express. It is also slow, because it calls your function once per value (or per row, or per group) instead of letting fast compiled code do the work over the whole column. So the rule is: reach for a vectorized method first, and use `apply()` only when there is no vectorized way.

## Why it exists

Most of what you do to a column has a built-in, fast version: add two columns, compare to a threshold, take a mean. Those run as one operation over the whole column in compiled C code. But sometimes your logic does not fit any built-in: a custom parsing rule, a calculation that mixes several columns in an odd way, a call into another library that only accepts one value at a time. `apply()` is the way to run that arbitrary function across your data.

Here is a small employee table we will use the whole way down.

```python
import pandas as pd
import numpy as np

emp = pd.DataFrame({
    "full_name":  ["Ana Ng", "Ben Lee", "Cara Diaz", "Dan Cole"],
    "department": ["Sales", "Sales", "Engineering", "Engineering"],
    "salary":     [50000, 60000, 90000, 80000],
    "bonus_pct":  [0.10, 0.15, 0.20, 0.10],
})
emp
#    full_name   department  salary  bonus_pct
# 0     Ana Ng        Sales   50000       0.10
# 1    Ben Lee        Sales   60000       0.15
# 2  Cara Diaz  Engineering   90000       0.20
# 3   Dan Cole  Engineering   80000       0.10
```

Keep one thing in mind throughout: `apply()` is the **last** tool to reach for, not the first, and we show the faster alternative beside each use.

## Picture it

`apply()` takes your function and calls it once for each value. A vectorized operation walks the values too, but down in compiled C and without ever calling back into Python. That difference is why one is slow and the other is fast.

```text
df["salary"].apply(f)                 df["salary"] >= 70000
one Python call per value             a fast C loop, no Python calls

  salary                                salary
  +-------+                             +-------+
  | 50000 | --> f(50000) --> "low"      | 50000 | -.
  | 60000 | --> f(60000) --> "low"      | 60000 |  |  looped over in C:
  | 90000 | --> f(90000) --> "high"     | 90000 |  |  cheap per value,
  | 80000 | --> f(80000) --> "high"     | 80000 | -'  no Python
  +-------+                             +-------+
  4 calls into Python                   0 calls into Python
```

Both sides go value by value. The difference is what each step costs: on the left, pandas hands each value to your Python function and waits for the answer, four separate times. On the right, the comparison still runs over each number in turn, but as a fast loop down in C with no call back into Python for any value.

Why is each C step so much cheaper? Python is **interpreted**: for every value it stops to check the type, pick the right version of the operation, and wrap the answer back into an object, a small cost paid again and again. Compiled C code (the layer beneath pandas) was told the column's type once, so it just does the bare arithmetic with none of that per-value checking. So **vectorized does not mean every value at the same instant**: the loop is still there, it has only moved out of Python and down into C, where each step is tiny. (The full mechanism is under the hood.)

**In one line:** both loop over the values, but `apply()` runs the loop in slow interpreted Python (a heavy step per value), while vectorized methods run the same loop down in fast compiled C (a tiny step per value).

## How it works

The examples below all use the same `emp` table:

```text
   full_name   department  salary  bonus_pct
0     Ana Ng        Sales   50000       0.10
1    Ben Lee        Sales   60000       0.15
2  Cara Diaz  Engineering   90000       0.20
3   Dan Cole  Engineering   80000       0.10
```

### apply on a Series

On a Series, `apply()` runs your function on **each value** and collects the returned values into a new Series:

```python
emp["full_name"].apply(len)
# 0    6
# 1    7
# 2    9
# 3    8
# Name: full_name, dtype: int64
```

Each name string went in, its length came out. A `lambda` works the same way for quick inline logic:

```python
emp["salary"].apply(lambda x: "high" if x >= 70000 else "low")
# 0     low
# 1     low
# 2    high
# 3    high
# Name: salary, dtype: str
```

The function receives **one value** and returns **one value**. For this element-by-element case, `apply()` and [`map()`](../cleaning/replace.md) do the same thing on a Series.

**In one line:** `Series.apply(f)` calls `f` on every value and gathers the results.

### apply on a DataFrame: axis picks rows or columns

On a DataFrame, `apply()` does not go value by value. It feeds your function a **whole Series at a time**, and `axis` decides whether that Series is a column or a row.

=== "axis=0: one column at a time (default)"

    ```python
    emp[["salary", "bonus_pct"]].apply(lambda col: col.max() - col.min())
    # salary       40000.0
    # bonus_pct        0.1
    # dtype: float64
    ```

    With `axis=0` (the default), the function receives each **column** as a Series. Here it gets the `salary` column, then the `bonus_pct` column, and returns the range of each. You get one result per column.

=== "axis=1: one row at a time"

    ```python
    emp.apply(lambda row: row["salary"] * row["bonus_pct"], axis=1)
    # 0     5000.0
    # 1     9000.0
    # 2    18000.0
    # 3     8000.0
    # dtype: float64
    ```

    With `axis=1`, the function receives each **row** as a Series, so you can combine columns within a row (`row["salary"] * row["bonus_pct"]`). You get one result per row.

The axis numbering confuses almost everyone, so learn it now: **`axis=0` walks down the rows to hand you each column; `axis=1` walks across the columns to hand you each row.** Row-wise `apply` (`axis=1`) is the slower of the two, for a reason we explain under the hood.

??? question "Quick check: which axis?"
    You want one number per employee: their salary times their bonus percentage. Do you use `axis=0` or `axis=1`, and how many numbers come back?

    **Answer:** `axis=1`, because you need each **row** (one employee) handed to the function so you can multiply two of its columns together. You get **4** numbers, one per row. `axis=0` would instead pass whole columns and give one result per column, which is not what you want here.

### Prefer a vectorized version (the most important habit)

Both DataFrame examples above were a teaching detour: each has a faster version that skips `apply()` entirely. The multiply is just column times column:

```python
emp["salary"] * emp["bonus_pct"]
# 0     5000.0
# 1     9000.0
# 2    18000.0
# 3     8000.0
# dtype: float64
```

Same numbers, but this runs as one compiled operation instead of one Python call per row. For the "high or low" label, `np.where` does a two-way choice over the whole column:

```python
np.where(emp["salary"] >= 70000, "high", "low")
# array(['low', 'low', 'high', 'high'], dtype='<U4')
```

And for splitting a number into several labelled bands, `pd.cut` is the vectorized tool:

```python
pd.cut(emp["salary"], bins=[0, 55000, 75000, 100000], labels=["low", "mid", "high"])
# 0     low
# 1     mid
# 2    high
# 3    high
# Name: salary, dtype: category
# Categories (3, str): ['low' < 'mid' < 'high']
```

These vectorized forms are typically many times faster than the matching `apply()`, and they read just as clearly once you know them.

**In one line:** before writing `apply()`, ask "is there a column expression, `np.where`, or `pd.cut` that does this?" Usually there is.

### When apply really is the right tool

Sometimes there really is no built-in for the job, and those are the moments `apply()` is the right call. A few you will actually meet:

- **Fiddly text parsing** the [`.str` tools](../cleaning/strings.md) cannot handle, where you have to pull each value apart and decide what to keep case by case.
- **A calculation that ties several columns together** in a way that is more than simple arithmetic.
- **Handing each value to another library** that only knows how to take one at a time, so there is nothing to vectorize against.
- **Several layers of if/else** that `np.where` (one yes/no) or `np.select` (a flat list of conditions) cannot lay out cleanly.

In all of these the per-value cost is unavoidable anyway, so here `apply()` is not a shortcut, it is genuinely the clearest tool. Use it without guilt.

### Returning several columns at once

Here is a handy move: if your function returns a **Series**, `apply()` turns each one into a row, which lets you split a single column into several. The classic example is breaking a full name into a first and last name:

```python
emp["full_name"].apply(lambda s: pd.Series({"first": s.split()[0], "last": s.split()[-1]}))
#   first  last
# 0   Ana    Ng
# 1   Ben   Lee
# 2  Cara  Diaz
# 3   Dan  Cole
```

Notice how the keys you chose (`first`, `last`) turned into the new column headers. From here you just save them back onto the table with `emp[["first", "last"]] = ...`. (Prefer to return a plain **list** rather than a Series? Add `result_type="expand"` and it spreads into columns just the same.)

### apply with GroupBy

On a [GroupBy](../grouping/groupby.md), `apply()` hands your function **each group as a DataFrame**. It is the most flexible GroupBy tool: the function can return a single number, a Series, or a whole DataFrame. Return one number per group and you get a summary, like [aggregation](../grouping/aggregation.md).

Here is `emp` once more, since the next examples group it by `department`:

```text
   full_name   department  salary  bonus_pct
0     Ana Ng        Sales   50000       0.10
1    Ben Lee        Sales   60000       0.15
2  Cara Diaz  Engineering   90000       0.20
3   Dan Cole  Engineering   80000       0.10
```

```python
emp.groupby("department").apply(lambda g: g["salary"].max() - g["salary"].min())
# department
# Engineering    10000
# Sales          10000
# dtype: int64
```

Return a **DataFrame** and you can reshape each group, like [`transform`](../grouping/aggregation.md) but more freely. Here we add a within-department salary z-score (how far each salary is from its department mean, in standard deviations):

```python
def normalize_group(g):
    g = g.copy()
    g["salary_z"] = (g["salary"] - g["salary"].mean()) / g["salary"].std()
    return g

emp.groupby("department").apply(normalize_group)
#                full_name  salary  bonus_pct  salary_z
# department
# Engineering 2  Cara Diaz   90000       0.20  0.707107
#             3   Dan Cole   80000       0.10 -0.707107
# Sales       0     Ana Ng   50000       0.10 -0.707107
#             1    Ben Lee   60000       0.15  0.707107
```

Two things to notice, both specific to current pandas. First, the result has the `department` added as an extra **index level** in front of the original row numbers. Second, the group `g` your function receives **does not include the grouping column** (`department`); pandas leaves it out because it is already known for the group. That is why `normalize_group` only touches `salary`.

**Use `agg` or `transform` when you can.** GroupBy `apply()` is the most flexible GroupBy method but also the slowest, because it runs your Python function once per group. If you only need a summary number, [`agg`](../grouping/aggregation.md) is faster; if you need a per-group value broadcast back, `transform` is faster. Reach for `apply()` only when neither fits.

### map vs apply vs DataFrame.map

These three blur together, so here is the clean split:

| Method | Works on | Your function gets | Reach for it when |
| --- | --- | --- | --- |
| `Series.map` | a Series | one value | element-wise change or a dictionary lookup |
| `Series.apply` | a Series | one value | element-wise change (same as `map` for a function) |
| `DataFrame.apply` | a DataFrame | a whole column or row | custom logic over a column or across a row |
| `DataFrame.map` | a DataFrame | one value | the same function on **every cell** |

`DataFrame.map` is the element-wise-over-the-whole-frame tool, and it replaces the old `applymap`, which is deprecated:

```python
emp[["salary"]].map(lambda x: x / 1000)
#    salary
# 0    50.0
# 1    60.0
# 2    90.0
# 3    80.0
```

### Handling errors inside the function

`apply()` runs your function for real, so if it raises on one value, the whole `apply()` fails. When the input may be messy, catch the error **inside** the function and return a safe value:

```python
def safe_parse(x):
    try:
        return float(x)
    except (ValueError, TypeError):
        return np.nan

pd.Series(["10.5", "oops", "3"]).apply(safe_parse)
# 0    10.5
# 1     NaN
# 2     3.0
# dtype: float64
```

For the specific case of parsing numbers, you do not need `apply` at all: [`pd.to_numeric(col, errors="coerce")`](../cleaning/change-dtypes.md) does the same thing, vectorized, turning bad values into `NaN`. Use `apply` with `try`/`except` only for custom logic that has no built-in equivalent.

## Under the hood

!!! tip "New here? You have permission to skip this."
    "Vectorize first, use `apply` only when nothing built-in fits" is the whole chapter. Come back here to understand *why* `apply` is slow and why `axis=1` is slower still, which is the same machinery that makes the vectorized alternatives fast.

**Why `apply` is slow: it crosses into Python for every call.** A vectorized operation like `salary >= 70000` runs a single loop written in compiled C over the whole block of numbers, never stopping to run Python. `apply` cannot do that, because your function *is* Python. For a Series, pandas runs a routine (`lib.map_infer`) that loops over the values and calls your Python function on each one. The loop itself is compiled, but every call hands control back to the slow Python interpreter and waits for the result. That hand-off, paid once per value, is the cost. So the speed gap is not that pandas loops and you do not; it is that the vectorized path **never enters Python per value** while `apply` enters it every time. This is the other side of the [vectorization](../selection/boolean-indexing.md) that makes filters fast.

**Why `axis=1` is slower than `axis=0`.** When you apply across rows, pandas builds a **temporary Series object for each row** and passes it to your function (in the code, a generator yields one row Series at a time, and the function is called on each). Building those row Series is extra work on top of the per-call cost. It also does not fit how a DataFrame is stored: columns are kept as separate blocks of memory ([the BlockManager](../selection/loc-iloc.md#views-copies-and-the-famous-warning)), so assembling one row means reaching into every column block to collect a single value from each. Going column by column (`axis=0`) reads each block straight through, which is why it is the cheaper direction.

**What `raw=True` saves.** Passing `raw=True` tells `apply` to hand your function the raw NumPy array of each column or row instead of building a Series around it. pandas takes a separate code path that skips the Series construction entirely. It is faster, but your function then cannot use index or column labels, only the bare numbers, so it only works when your logic does not need them.

```python
emp[["salary", "bonus_pct"]].apply(lambda a: a.max() - a.min(), raw=True)
# salary       40000.0
# bonus_pct        0.1
# dtype: float64
```

For functions heavy enough that even this matters, compiling the inner function with **numba** (`engine="numba"`) turns it into machine code and removes the per-call Python cost, approaching vectorized speed.

## Gotchas

!!! warning "axis=0 is columns, axis=1 is rows"
    The numbering feels backwards. `axis=0` points down the rows, so the function receives each **column**; `axis=1` points across the columns, so it receives each **row**. When an `apply` gives a result the wrong shape, a flipped `axis` is the first thing to check.

!!! danger "Reach for vectorized first, always"
    Using `apply` where a column expression, `np.where`, or `pd.cut` would do is the single most common pandas performance mistake. On large data the vectorized version can be many times faster for the identical result. Treat `apply` as the tool you justify, not the default.

!!! warning "Keep the function pure (no side effects)"
    Write functions that only compute and return a value, with no outside effects (no appending to a list, no printing counts). pandas does not promise exactly how many times it calls your function: current pandas calls it once per element or group, but older versions evaluated the first group twice for type inference. Code that depends on the call count is fragile, so do not rely on it.

!!! warning "GroupBy apply is the slow path"
    GroupBy `apply` runs your Python function once per group and is the slowest GroupBy method. Prefer [`agg`](../grouping/aggregation.md) for summaries and `transform` for broadcast-back values. Also remember the group passed in excludes the grouping column, and the result gains the group key as an index level.

## Quick reference

| You want | Write |
| --- | --- |
| Function on each Series value | `s.apply(f)` |
| Function on each column | `df.apply(f)` (axis=0) |
| Function across each row | `df.apply(f, axis=1)` |
| Same function on every cell | `df.map(f)` |
| Split into several columns | `s.apply(lambda v: pd.Series({...}))` |
| Custom logic per group | `df.groupby("k").apply(f)` |
| Faster apply (no labels needed) | `df.apply(f, raw=True)` |
| Two-way choice (vectorized) | `np.where(cond, a, b)` |
| Banding a number (vectorized) | `pd.cut(s, bins=[...], labels=[...])` |
| Parse numbers safely (vectorized) | `pd.to_numeric(s, errors="coerce")` |

## Where this connects

!!! connect "The general fallback, and what to use instead"
    - `apply` is the slow, general fallback for [vectorization](../selection/boolean-indexing.md): vectorized methods never enter Python per value, which is exactly the speed `apply` gives up.
    - On a Series, `apply` for a function is the same as [`map`](../cleaning/replace.md); for value swaps and dictionary lookups, `map` and [`replace`](../cleaning/replace.md) are the cleaner tools.
    - For two-way or multi-way labelling, prefer `np.where`, `np.select`, or `pd.cut`; for type-safe number parsing, [`to_numeric`](../cleaning/change-dtypes.md).
    - On a [GroupBy](../grouping/groupby.md), `apply` is the flexible cousin of [`agg` and `transform`](../grouping/aggregation.md); use those first and `apply` only when neither fits.
    - The reason `axis=1` is slow is the column-major [BlockManager](../selection/loc-iloc.md#views-copies-and-the-famous-warning) storage, the same layout that makes column work cheap.

!!! intuition "If you remember one thing"
    `apply` runs your own function over the data, one value, row, or group at a time. That flexibility costs speed, because it calls back into Python for every piece. Vectorize whenever you can, and keep `apply` for the logic that has no built-in form.
