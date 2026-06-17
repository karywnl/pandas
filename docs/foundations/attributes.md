# Inspecting a DataFrame

!!! intuition "The gist"
    Before you touch a new dataset, you look it over: how big is it, what columns exist, what types are they, and is anything missing? A handful of attributes and two methods (`info` and `describe`) answer all of that in seconds.

## Why it exists

Loading data is the easy part. The bugs come from *assuming* things about it: assuming a column is numeric when it is text, assuming there are no missing values, assuming the merge did not secretly double your rows. A quick inspection replaces every assumption with a fact.

```python
import pandas as pd, numpy as np

customers = pd.DataFrame({
    "name":  ["Ana", "Ben", "Cara", "Dan"],
    "age":   [25, np.nan, 41, 33],
    "city":  ["NYC", "LA", "NYC", "SF"],
    "spend": [120.0, 80.0, 200.0, 50.0],
})
```

## The six-step once-over

Run these in order on any new table. It catches most problems before you write a line of analysis.

```python
customers.shape            # (4, 4)   how big?
customers.columns          # what features exist?
customers.dtypes           # are the types right?
customers.head()           # do the first rows look sane?
customers.info()           # any missing values?
customers.describe()       # any weird numbers?
```

**In one line:** `shape` then `columns` then `dtypes` then `head` then `info` then `describe`, every time.

## How it works

### Size and shape

```python
customers.shape    # (4, 4)  -> (rows, columns), a plain tuple
customers.size     # 16      -> total cells, rows * columns
len(customers)     # 4       -> just the row count
```

`shape` is an attribute, so there are no parentheses. Writing `customers.shape()` is an error.

### Types, and the missing-value tell

```python
customers.dtypes
# name      str
# age      float64
# city      str
# spend    float64
```

Look at `age`. You gave it whole numbers, yet it is `float64`, not `int64`. That is the fingerprint of a **missing value**: one `NaN` forces the whole integer column to float. So `dtypes` quietly told you data is missing before you even asked.

### info: structure plus completeness

```python
customers.info()
# RangeIndex: 4 entries, 0 to 3
# Data columns (total 4 columns):
#  #   Column  Non-Null Count  Dtype
#  0   name    4 non-null      str
#  1   age     3 non-null      float64    <- 3 of 4, one is missing
#  2   city    4 non-null      str
#  3   spend   4 non-null      float64
```

The **Non-Null Count** is the gold here. `age` shows `3 non-null` out of 4 rows, so exactly one value is missing, and you knew it instantly.

### describe: the numbers at a glance

```python
customers.describe()
#         age   spend
# count   3.0     4.0
# mean   33.0   112.5
# std     8.0    65.0
# min    25.0    50.0
# 50%    33.0   100.0
# max    41.0   200.0
```

By default it summarises only numeric columns. Note `count` for `age` is 3, not 4: `describe` skips the missing value too. Pass `include="all"` to summarise text columns as well.

??? question "Quick check: read the tell"
    You load a table and `dtypes` shows an `age` column as `float64`, even though ages are whole numbers. What does that almost certainly mean?

    **Answer:** `age` has at least one **missing value**. A single `NaN` is a float, so it upcasts the whole integer column to `float64`. Confirm it with `info()`, where the non-null count will be less than the row count.

## Under the hood

!!! tip "New here? You have permission to skip this."
    The six-step workflow is all you need day to day. This is one extra trick for big data.

`info(memory_usage="deep")` reports the *true* memory a DataFrame uses. The plain version underestimates text columns, because old-style `object` strings store a separate Python object per value. The deep version walks them properly, which is what you want before deciding to downcast numbers or convert a text column to `category` to save memory. More on that in [data types](dtypes.md).

## Gotchas

!!! warning "shape and size are attributes, not methods"
    `df.shape` and `df.size`, never `df.shape()`. The parentheses raise a `TypeError`.

!!! warning "Always check shape after a merge or filter"
    A join on non-unique keys can silently multiply your rows. Compare `df.shape[0]` before and after, it is the cheapest bug check you have.

## Quick reference

| You want | Write | Returns |
| --- | --- | --- |
| Rows and columns | `df.shape` | `(rows, cols)` tuple |
| Just the row count | `len(df)` | int |
| Total cells | `df.size` | int |
| Column names | `df.columns` | Index |
| Column types | `df.dtypes` | Series |
| Structure + missing | `df.info()` | printed summary |
| Numeric summary | `df.describe()` | DataFrame |
| First / last rows | `df.head()` / `df.tail()` | DataFrame |

## Where this connects

!!! connect "Inspection points at your next move"
    - A `float64` where you expected `int64`, or `info` showing gaps, sends you to [handling missing values](../cleaning/missing-values.md).
    - Wrong types (numbers stored as text) send you to [changing data types](../cleaning/change-dtypes.md).
    - `head` and `tail` have their own short [chapter](head-tail.md) on peeking at large data safely.

!!! intuition "If you remember one thing"
    Six steps, every time: shape, columns, dtypes, head, info, describe. They turn a mystery dataset into a known one before you write any real code.
