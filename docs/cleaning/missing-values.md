# Missing values

!!! intuition "The gist"
    Real data has holes: a sensor drops out, a form field is left blank. Pandas marks these holes as `NaN`. You have three moves: **find** them (`isna`), **drop** them (`dropna`), or **fill** them (`fillna`, `interpolate`). Picking the right move is the whole skill.

## Why it exists

Most maths and most models fail on missing data, or worse, quietly give wrong answers. So before analysis you have to decide what each hole means and what to do about it. Suppose you have a weather sensor that missed a few readings.

```python
import pandas as pd, numpy as np

readings = pd.DataFrame({
    "time":  ["9am", "10am", "11am", "12pm"],
    "temp":  [20.0, np.nan, np.nan, 24.0],
    "humid": [55.0, 57.0, np.nan, 60.0],
})
```

## Find: how much is missing

```python
readings.isna()           # a True/False frame, True where missing
readings.isna().sum()     # missing count per column -> temp: 2, humid: 1
readings.isna().sum().sum()  # 3 missing in total
```

`isna().sum()` is the first thing to run. A column that is mostly holes often needs dropping, not filling.

**In one line:** `isna().sum()` tells you where the holes are and how many.

## Drop: remove the holes

```python
readings.dropna()                 # drop any row with a missing value -> 9am, 12pm
readings.dropna(subset=["temp"])  # drop only where temp is missing  -> 9am, 12pm
readings.dropna(axis=1)           # drop columns that have any missing value
```

Dropping is fine when only a tiny fraction is missing, or when the missing value is your target. It is dangerous when the missingness is systematic, because you bias what is left.

## Fill: patch the holes

The right patch depends on whether your data is *ordered*.

### Constant or statistic

```python
readings["temp"].fillna(0)                          # a fixed value
readings["temp"].fillna(readings["temp"].mean())    # -> [20, 22, 22, 24]
```

Mean filling is simple but it shrinks the variance and weakens correlations. Median is sturdier against outliers; for text, fill with the most frequent value (the mode).

### For ordered data: carry or interpolate

When rows are in a meaningful order (time, distance), the neighbours are good estimates.

```python
readings["temp"].ffill()         # carry the last reading forward -> [20, 20, 20, 24]
readings["temp"].bfill()         # pull the next reading backward  -> [20, 24, 24, 24]
readings["temp"].interpolate()   # straight line between neighbours -> [20, 21.33, 22.67, 24]
```

The difference, shown on the gap between 9am's 20 and 12pm's 24:

```text
 time:   9am    10am    11am    12pm
 temp:   20      ?       ?        24
 ffill   20      20      20       24    (repeat last known)
 bfill   20      24      24       24    (pull next known)
 interp  20    21.33   22.67      24    (evenly spaced on the line)
```

`interpolate` is usually best for something that changes smoothly, because it uses *both* sides.

??? question "Quick check: pick the fill"
    A temperature reading is missing between 20 at 9am and 24 at 12pm. What does `interpolate` put there compared to `ffill`?

    **Answer:** `interpolate` draws a straight line and fills the evenly spaced points (21.33 and 22.67). `ffill` just repeats the last known value (20, 20). For a smoothly changing quantity, interpolation is closer to the truth.

## Under the hood

!!! tip "New here? You have permission to skip this."
    Find, drop, or fill is the whole job. This explains *what* a missing value actually is inside pandas, which is why the two behaviors below happen.

**What `NaN` really is.** The default missing marker is `NaN`, short for "Not a Number". It is not a pandas invention; it is a special value built into the floating-point number standard that every computer uses, a reserved bit pattern that means "no real number here". Two consequences come straight from that:

- It is a **float**, so it can only live in a float column. This is why a single missing value turns an integer column into `float64`: pandas has to switch to a type that has a slot for `NaN`.
- The standard defines `NaN` as **not equal to anything, including itself**, so `NaN == NaN` is `False`. That is why you cannot find missing values with `== np.nan` and must use `isna()`, which checks for the special bit pattern directly instead of comparing.

**How operations handle it.** Because `NaN` cannot be compared, pandas does not just compute over it. Reductions like `mean()` and `sum()` run a **mask-first** step: they look at which positions hold `NaN`, set those positions aside, and compute over the rest. This is the `skipna=True` default. So a `mean` is the average of the **present** values only, not of all the rows.

```python
pd.Series([10, 20, None]).mean()
# 15.0      <- (10 + 20) / 2, the NaN position is skipped, not counted as 0
```

That is usually what you want, but `sum()` quietly skipping holes can mislead. Pass `skipna=False` to turn the masking off, and any `NaN` in the data spreads into the result instead. The same "compare to `NaN` gives nothing" rule is why [boolean filters silently drop missing rows](../selection/boolean-indexing.md).

## Gotchas

!!! warning "A missing value turns integers into floats"
    Put `NaN` in an integer column and it becomes `float64`. Use the nullable `Int64` type if you need integers to survive, see [data types](../foundations/dtypes.md).

!!! warning "Analyse before you fill"
    Filling destroys the information about *why* data was missing. Look at the pattern with `isna().sum()` first; never fill without thinking.

## Quick reference

| You want | Write |
| --- | --- |
| Count missing per column | `df.isna().sum()` |
| Drop rows with any hole | `df.dropna()` |
| Drop only where a column is null | `df.dropna(subset=["c"])` |
| Fill with a value / stat | `s.fillna(0)` / `s.fillna(s.median())` |
| Carry forward / backward | `s.ffill()` / `s.bfill()` |
| Estimate from neighbours | `s.interpolate()` |
| Only missing / only present | `df[df["c"].isna()]` / `.notna()` |

## Where this connects

!!! connect "Missing data touches everything"
    - The `float64` upcast comes straight from [data types](../foundations/dtypes.md).
    - Filtering [silently drops `NaN`](../selection/boolean-indexing.md) because of the same `NaN != NaN` rule.
    - Group-aware filling (fill each group with its own median) uses `transform`, covered in [aggregation](../grouping/aggregation.md).
    - A [merge](../combining/merge.md) creates fresh `NaN` for unmatched rows, so a `how="left"` merge plus `isna()` is the standard way to find rows with no partner.
    - Removing repeated rows is the sibling cleaning step, [dropping duplicates](duplicates.md).

!!! intuition "If you remember one thing"
    Three moves: find with `isna`, drop with `dropna`, fill with `fillna` or `interpolate`. Use `interpolate` for ordered data, and always look at the pattern of holes before patching them.
