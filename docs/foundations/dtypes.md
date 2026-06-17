# Data types

!!! intuition "The gist"
    Every column has a **dtype** that says how its values are stored. The dtype decides what operations are legal, how much memory you use, and whether bugs stay silent. Getting types right is not housekeeping, it is correctness.

## Why it exists

A column of prices and a column of price *labels* look the same on screen, but `"9.99"` (text) and `9.99` (a number) behave completely differently. Add to the numbers and you get a sum; "add" to the text and you get gibberish or an error. The dtype is how pandas knows which is which.

```python
import pandas as pd

products = pd.DataFrame({
    "sku":      ["A1", "B2", "C3"],
    "price":    [9.99, 14.50, 3.25],
    "in_stock": [True, False, True],
    "qty":      [10, 0, 5],
})
products.dtypes
# sku        str
# price      float64
# in_stock   bool
# qty        int64
```

## The types you will actually meet

| Dtype | Holds | Notes |
| --- | --- | --- |
| `int64` | whole numbers | the default integer |
| `float64` | decimals | the only common type that holds `NaN` |
| `bool` | True / False | one byte each |
| `str` | text | the default for text in **pandas 3.0** |
| `datetime64[ns]` | timestamps | made by `pd.to_datetime` |
| `category` | repeated labels | huge memory win for low-variety text |
| `object` | anything | the catch-all, and a warning sign |

**In one line:** numbers are `int64`/`float64`, text is `str`, flags are `bool`, and `object` means "mixed, look closer".

## str vs object: what changed in pandas 3.0

This trips up anyone coming from old tutorials. For years, a text column had dtype **`object`**, which meant "a box of arbitrary Python objects". In **pandas 3.0**, text now gets a proper **`str`** dtype by default: less memory, faster, and with clean missing-value handling.

```python
pd.Series(["red", "green", "blue"]).dtype
# str        (in pandas 3.0; older pandas showed: object)
```

You will still see `object`, but now it usually means something is genuinely *mixed*, for example a column holding both numbers and text. That is a red flag worth investigating, not a normal string column.

## The missing-value trap

The single most important dtype interaction: **plain integer columns cannot hold a missing value.**

```python
pd.Series([1, 2, None]).dtype         # float64   <- silently upcast!
pd.Series([1, 2, None], dtype="Int64").dtype  # Int64   <- stays integer
```

Because the classic `NaN` is a float, one missing value drags an entire integer column up to `float64`. That can quietly break ID columns and join keys. The fix is pandas' **nullable** `Int64` (capital I), which holds missing values as `pd.NA` without changing type.

??? question "Quick check: predict the dtype"
    What dtype does `pd.Series([1, 2, None])` get, and why?

    **Answer:** `float64`. The `None` becomes `NaN`, which is a float, so pandas upcasts the whole column to hold it. Use `dtype="Int64"` if you need it to stay integer.

## category: cheap repeated text

When a text column has many rows but few distinct values (a `country`, a `status`, a `size`), `category` stores each distinct value once and keeps tiny integer codes per row.

```python
products["status"] = pd.Series(["new", "used", "new"]).astype("category")
```

A million-row column with five distinct values goes from hundreds of megabytes as text to a few megabytes as `category`, and group-bys get faster too.

## Under the hood

!!! tip "New here? You have permission to skip this."
    Knowing "numbers, text, bool, and watch out for object" is enough to start. This is the memory story behind the advice.

Storage cost per value is wildly different. Picking the right type is real money on big data:

| Type | Per value | 10M values |
| --- | --- | --- |
| `float64` / `int64` | 8 bytes | 80 MB |
| `int8` | 1 byte | 10 MB |
| `category` (few distinct) | ~1 byte | ~10 MB |
| `object` strings | 50+ bytes | 500+ MB |

This is why downcasting wide numeric tables and converting low-variety text to `category` can shrink a dataset by an order of magnitude.

## Gotchas

!!! warning "Numbers stored as text compare wrong"
    If a numeric column was loaded as text, `df["age"] > 30` compares strings letter by letter, where `"9" > "30"` is `True`. Always check `dtypes` after loading, and convert with the tools in [changing data types](../cleaning/change-dtypes.md). *(chapter coming soon)*

!!! warning "object can hide a mess"
    A column showing `object` may contain ints, strings, and `None` all at once. Inspect it with `df["col"].map(type).value_counts()` before trusting it.

## Quick reference

| You want | Write |
| --- | --- |
| See all types | `df.dtypes` |
| Count of each type | `df.dtypes.value_counts()` |
| Keep integers with gaps | `dtype="Int64"` |
| Shrink repeated text | `df["c"] = df["c"].astype("category")` |
| Safe text-to-number | `pd.to_numeric(s, errors="coerce")` |

## Where this connects

!!! connect "Types thread through the whole pipeline"
    - Wrong types are fixed in [changing data types](../cleaning/change-dtypes.md), with `astype`, `to_numeric`, and `to_datetime`. *(chapter coming soon)*
    - The missing-value upcast is the bridge to [handling missing values](../cleaning/missing-values.md). *(chapter coming soon)*
    - `dtypes` is step three of the [inspection workflow](attributes.md), and often the first hint that something is off.

!!! intuition "If you remember one thing"
    The dtype is the contract for a column. Numbers are `int64`/`float64`, text is `str` in pandas 3.0, and `object` now means "mixed, investigate". A stray missing value turns integers into floats, so check your types early.
