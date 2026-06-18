# Resetting the index

!!! intuition "The gist"
    `reset_index()` is the undo button for `set_index`. It moves the current row labels back into a regular column and gives you a fresh `0, 1, 2` index. With `drop=True`, it throws the old labels away instead of keeping them.

## Why it exists

Two everyday situations leave you with an index you do not want. **GroupBy** puts the grouping keys into the index. **Filtering** leaves gaps in the row numbers. `reset_index` cleans up both, so the data is ready for export, display, or code that expects tidy sequential rows.

## How it works

### After a GroupBy

A group aggregation puts the group key in the index, which is awkward to work with.

```python
import pandas as pd

orders = pd.DataFrame({
    "customer": ["Ana", "Ben", "Ana", "Cara"],
    "amount":   [250, 80, 120, 300],
})

totals = orders.groupby("customer")["amount"].sum()
# customer
# Ana     370
# Ben      80
# Cara    300      <- 'customer' is the index, not a column
```

`reset_index` turns it back into a normal two-column table:

```python
totals.reset_index()
#   customer  amount
# 0      Ana     370
# 1      Ben      80
# 2     Cara     300
```

**In one line:** `reset_index` moves the labels back into a column and renumbers the rows.

### After filtering: closing the gaps

Filtering keeps the original labels, so the index gets holes.

```python
big = orders[orders["amount"] > 100]
big.index.tolist()                      # [0, 2, 3]  -> gaps at 1
big.reset_index(drop=True).index.tolist()  # [0, 1, 2]  -> clean again
```

Here you almost always want **`drop=True`**, because the old row numbers `0, 2, 3` carry no meaning worth keeping.

??? question "Quick check: keep or drop?"
    You filtered a frame and the index is now `[0, 2, 3]`. You just want clean sequential rows and do not care about the old numbers. Which call do you use?

    **Answer:** `df.reset_index(drop=True)`. Without `drop=True`, the old labels `0, 2, 3` would be saved into a new column called `index`, which you do not want here.

## drop=True vs the default

This is the whole decision in one line:

- **Default** (`reset_index()`): the old index becomes a column. Use it after GroupBy, when the labels are meaningful (the customer, the date).
- **`drop=True`**: the old index is discarded. Use it after filtering, when the labels are just leftover row numbers.

## Under the hood

!!! tip "New here? You have permission to skip this."
    Default keeps, `drop=True` discards. That is the core. Here is the naming detail.

`reset_index` names the new column after the index. If the index had a name (say `customer`), you get a `customer` column. If it had **no** name, you get a column literally called `index`, which can clash with the `.index` attribute and confuse later code. Name your index, or rename the result immediately.

Doing `set_index` and then `reset_index` brings you back exactly where you started: the column comes back with the same name and type it had before.

## Gotchas

!!! warning "reset_index returns a new frame"
    Like most pandas methods, it does not change the original in place. Reassign: `df = df.reset_index()`.

!!! warning "Do not double-reset"
    Calling `reset_index()` on a frame that already has a clean `RangeIndex` adds an unwanted `index` column. Reset only when there is actually something to move.

!!! tip "You may not need it before a merge"
    If you are about to merge on the index, do not reset it first. Use `left_index=True` in the merge instead.

## Quick reference

| You want | Write |
| --- | --- |
| Index back to a column | `df = df.reset_index()` |
| Drop the old index | `df.reset_index(drop=True)` |
| Reset one level only | `df.reset_index(level="dept")` |
| Avoid it after groupby | `df.groupby("k", as_index=False)...` |

## Where this connects

!!! connect "The cleanup step"
    - It is the exact inverse of [setting the index](set-index.md), and the two reverse each other cleanly.
    - You use it constantly after [GroupBy](../grouping/groupby.md), which puts the keys in the index.
    - With `drop=True` it fixes the index gaps left by [boolean filtering](../selection/boolean-indexing.md), the same gaps that cause the integer-label trap in [loc and iloc](../selection/loc-iloc.md).

!!! intuition "If you remember one thing"
    `reset_index` undoes `set_index`. Keep the old labels (after a groupby) by default, or throw them away with `drop=True` (after a filter). Either way, reassign the result.
