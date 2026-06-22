# GroupBy

!!! intuition "The gist"
    GroupBy answers "per category" questions like "total revenue **per region**". It works in three steps: **split** the rows into groups, **apply** a calculation to each group, and **combine** the answers into one result. This is the split-apply-combine pattern.

## Why it exists

"What is the average salary per department?", "total sales per region per month?" In plain Python these need nested loops and extra tracking code. GroupBy does the whole thing in one line, fast, because the looping happens in C. Here is a small sales table.

```python
import pandas as pd

sales = pd.DataFrame({
    "region":  ["East", "East", "West", "West", "East"],
    "product": ["A", "B", "A", "B", "A"],
    "units":   [10, 5, 8, 12, 7],
    "revenue": [100, 60, 80, 130, 70],
})

sales.groupby("region")["revenue"].sum()
# region
# East    230
# West    210
```

## Picture it: split, apply, combine

```mermaid
flowchart LR
    A["all rows"] --> B["split by region"]
    B --> E["East rows<br/>100, 60, 70"]
    B --> W["West rows<br/>80, 130"]
    E --> ES["sum = 230"]
    W --> WS["sum = 210"]
    ES --> C["combine<br/>East 230<br/>West 210"]
    WS --> C
```

The rows are partitioned by `region`, each partition is summed, and the sums are stacked back into one result. Every GroupBy follows this shape.

**In one line:** split the rows by a key, run a calculation per group, combine the answers.

## How it works

### Group, then aggregate

`groupby` on its own computes nothing. It returns a lazy GroupBy object; the work happens when you call an aggregation.

```python
sales.groupby("region")["revenue"].sum()    # one number per region
sales.groupby("region")["units"].mean()     # average units per region
sales.groupby(["region", "product"]).sum()  # group by two keys at once
```

Grouping by two columns gives a result per *combination*, here per (region, product) pair.

### The common aggregations

`sum`, `mean`, `median`, `min`, `max`, `count`, `size`, `std`, `nunique`, `first`, `last`. All run in fast C code, so prefer them over hand-written functions.

### Keep the key as a column

By default the group key becomes the index. To keep it as a regular column, use `as_index=False` (or `reset_index` afterward, from [resetting the index](../indexing/reset-index.md)).

```python
sales.groupby("region", as_index=False)["revenue"].sum()
#   region  revenue
# 0   East      230
# 1   West      210
```

??? question "Quick check: predict the groups"
    `sales` has three East rows with revenue 100, 60, 70. What does `sales.groupby("region")["revenue"].sum()` give for East?

    **Answer:** **230**. GroupBy splits out the three East rows, sums their revenue (100 + 60 + 70), and reports one value for the East group.

## Under the hood

!!! tip "New here? You have permission to skip this."
    Split-apply-combine is the whole idea. This explains *how* pandas splits the rows without a slow loop, which is why grouping is fast and why `groupby` alone computes nothing.

**How the groups are actually formed.** The "Picture it" diagram shows rows being split into separate piles, but pandas does not really copy rows into separate tables. It does something cheaper: it scans the key column **once** and gives each distinct key a small **group number** (this step is called *factorizing*). Then it records which group number each row belongs to.

```text
  region column:   East   East   West   West   East
  number the keys: East -> 0,  West -> 1
  group id per row:  0      0      1      1      0
```

That list of group numbers is all the GroupBy object holds. This is why `groupby` on its own computes nothing: it has only labeled the rows, not done any maths. The work happens when you call an aggregation. `.sum()` then runs one compiled pass over the `revenue` values, adding each value into its group's running total using the group number as the slot:

```text
  group 0 (East): 100 + 60 + 70 = 230
  group 1 (West):  80 + 130     = 210
```

One scan to number the rows, one scan to total them, both in compiled C, with no row copying. That is the "fast because the looping happens in C" claim made concrete. The handling of missing keys falls out of this too: a row whose key is `NaN` is given **no** group number and is dropped by default. Pass `dropna=False` to give the `NaN` key its own group instead.

## Gotchas

!!! warning "count and size are different"
    `count()` excludes `NaN`; `size()` includes it. Mixing them up gives wrong row counts when data is missing.

!!! warning "Forgetting to pick a column"
    `df.groupby("k").mean()` averages all numeric columns. Select the one you care about to avoid a surprise wide result.

## Quick reference

| You want | Write |
| --- | --- |
| Total per group | `df.groupby("k")["v"].sum()` |
| Average per group | `df.groupby("k")["v"].mean()` |
| Group by two keys | `df.groupby(["a", "b"])["v"].sum()` |
| Rows per group | `df.groupby("k").size()` |
| Key as a column | `df.groupby("k", as_index=False)["v"].sum()` |

## Where this connects

!!! connect "The heart of analysis"
    - More aggregation power (multiple functions, named outputs, custom logic) is the next chapter, [aggregation](aggregation.md).
    - Grouping by several keys at once builds a layered, MultiIndex result, covered in [multi-level GroupBy](multi-level-groupby.md).
    - Reshaping a two-key group into a grid is [pivot tables](pivot.md).
    - The key lands in the index, so you often follow up with [resetting the index](../indexing/reset-index.md).
    - The time-aware version of grouping is `resample`, which buckets a [datetime index](../dates/datetime.md) into months, weeks, or days.
    - Real analysis often starts by [merging](../combining/merge.md) separate tables into one, then grouping the combined result.

!!! intuition "If you remember one thing"
    Split, apply, combine. `df.groupby(key)[col].agg()` splits rows by the key, runs the aggregation per group, and combines the answers into one tidy result.
