# Changing data types

!!! intuition "The gist"
    `astype` converts a column to a new type when the data is clean. For messy data, use the safer `pd.to_numeric` and `pd.to_datetime` with `errors="coerce"`, which turn the unconvertible values into `NaN` instead of crashing.

## Why it exists

Data loaded from CSVs and APIs often has the wrong type: prices stored as text with dollar signs, dates stored as plain strings, numeric ids that should never have been floats. Until you fix the type, you cannot do maths, sort correctly, or use date features. Picture a sales export.

```python
import pandas as pd

df = pd.DataFrame({
    "price": ["$1,200", "$950"],
    "date":  ["2024-01-05", "2024-02-10"],
    "qty":   ["10", "20"],
})
```

## How it works

### Clean, then convert: string to number

Text numbers usually carry junk (currency symbols, thousands commas). Strip it first, then convert.

```python
df["price"] = df["price"].str.replace(r"[$,]", "", regex=True).astype(int)
# [1200, 950], now a real int64 you can sum
```

For potentially dirty data, `pd.to_numeric` with `errors="coerce"` is safer than `astype`, because bad values become `NaN` instead of raising.

```python
pd.to_numeric(df["qty"])                    # ["10", "20"] -> [10, 20]
pd.to_numeric(pd.Series(["1", "x"]), errors="coerce")  # ["1", "x"] -> [1.0, NaN]
```

**In one line:** `astype` for clean data, `to_numeric(errors="coerce")` for data that might fight back.

### String to datetime

This unlocks every date feature.

```python
df["date"] = pd.to_datetime(df["date"])
df["date"].dt.year      # [2024, 2024]
df["date"].dt.month     # [1, 2]
df["date"].dt.dayofweek # 0 = Monday
```

Once a column is `datetime64`, the `.dt` accessor gives you year, month, weekday, and the date slicing from [setting the index](../indexing/set-index.md). For big files, passing an explicit `format=` makes parsing much faster.

### Several columns at once

```python
df = df.astype({"qty": "int64", "price": "float64"})
```

??? question "Quick check: astype or to_numeric?"
    A column `["1", "2", "oops"]` should be numbers, but one value is junk. What does `.astype(int)` do, and what is the safer call?

    **Answer:** `.astype(int)` raises a `ValueError` on `"oops"` and converts nothing. The safer call is `pd.to_numeric(col, errors="coerce")`, which gives `[1, 2, NaN]`, converting what it can and flagging the bad value so you can deal with it.

## Under the hood

!!! tip "New here? You have permission to skip this."
    `astype` and the `to_*` functions cover the daily work. Two efficiency notes.

**Low-variety text to `category`.** A column with millions of rows but a handful of distinct values shrinks dramatically as `category`, which stores each label once plus tiny codes. `df["status"] = df["status"].astype("category")`.

**Downcasting numbers.** `pd.to_numeric(col, downcast="integer")` picks the smallest integer type that fits, turning `int64` into `int8` when values are small. Be careful: if future data exceeds the smaller range, it overflows silently.

## Gotchas

!!! warning "Integers cannot hold NaN"
    Converting a float column that contains `NaN` to plain `int` raises an error. Fill the holes first, or use the nullable `Int64` type from [data types](../foundations/dtypes.md).

!!! warning "astype(bool) is too eager"
    Every non-zero number becomes `True`, and every non-empty string becomes `True`, so the string `"False"` converts to `True`. Map text to real booleans explicitly instead.

## Quick reference

| You want | Write |
| --- | --- |
| Convert clean data | `s.astype("int64")` / `s.astype(float)` |
| Safe text to number | `pd.to_numeric(s, errors="coerce")` |
| Text to datetime | `pd.to_datetime(s)` |
| Date parts | `s.dt.year`, `s.dt.month`, `s.dt.dayofweek` |
| Several columns | `df.astype({"a": "int64", "b": float})` |
| Shrink repeated text | `s.astype("category")` |

## Where this connects

!!! connect "Fixing what inspection revealed"
    - This chapter is the cure for the wrong types you spot in [data types](../foundations/dtypes.md) and the [inspection workflow](../foundations/attributes.md).
    - Cleaning the strings first uses [replace](replace.md) and the `.str` accessor.
    - A `datetime64` column powers the time slicing and grouping in [setting the index](../indexing/set-index.md) and [GroupBy](../grouping/groupby.md).

!!! intuition "If you remember one thing"
    Clean the text, then convert. `astype` when the data is tidy, `to_numeric` and `to_datetime` with `errors="coerce"` when it might be dirty, so bad values become `NaN` instead of crashing your pipeline.
