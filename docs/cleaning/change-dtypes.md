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

**In one line:** `astype` for clean data, `to_numeric(errors="coerce")` for data that might be dirty.

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
    `astype` and the `to_*` functions cover the daily work. This explains *how* a conversion happens, which is why you reassign the result and why `category` saves so much memory.

**How a conversion runs.** `astype` does not change the existing column in place; it returns a **new** column, which is why you must reassign (`df["qty"] = df["qty"].astype(int)`) or the conversion is lost. What it does to the data depends on whether the type really changes its representation. When the new type stores values differently (`int64` to `float64`, parsing text to numbers, a different byte size), pandas allocates a new block of memory and converts each value into it one at a time. When the target type needs no real change to the stored bytes, pandas can hand back a **view** of the same data instead of copying. Because the converting case re-builds each value, it can also change data: `float64` to `int` drops the decimal part, and a value too big for the target type overflows. `to_numeric` and `to_datetime` are the same idea for text: they read each string and build a number or a timestamp from it, with `errors="coerce"` writing `NaN` wherever a string cannot be parsed.

**Why `category` is cheap.** Converting to `category` does not store the text for every row. It builds **two** small structures: a list of the distinct values (the *categories*), and an array of tiny integers (the *codes*) where each row holds the position of its value in that list. A million-row `status` column with three distinct values then stores three strings plus a million one-byte codes, instead of a million separate strings.

```text
  status (object): "open","closed","open","open","closed"   <- a full string per row

  status (category):
     categories: ["closed", "open"]        <- each label stored once
     codes:      [1, 0, 1, 1, 0]           <- one tiny int per row, points into the list
```

This is also why **downcasting** numbers (`pd.to_numeric(col, downcast="integer")`) shrinks data: it picks the smallest integer type whose range still fits the values, turning `int64` (8 bytes per value) into `int8` (1 byte). The smaller range is the catch: if later data exceeds it, the value overflows silently.

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
    - `to_datetime` gets a chapter of its own in [dates and times](../dates/datetime.md), where a `datetime64` column powers the `.dt` accessor, date slicing, and `resample`.

!!! intuition "If you remember one thing"
    Clean the text, then convert. `astype` when the data is tidy, `to_numeric` and `to_datetime` with `errors="coerce"` when it might be dirty, so bad values become `NaN` instead of crashing your pipeline.
