# Pivot tables

!!! intuition "The gist"
    A pivot reshapes a long list of records into a **grid**: one column becomes the rows, another becomes the columns, and a third fills the cells. `pivot()` just rearranges the data. `pivot_table()` does the same but can also **combine** several records that land in the same cell (by summing, averaging, and so on).

## Why it exists

Data usually arrives "long": one row per record. That is great for storing, but hard to read. Say you have temperature readings, one row per (city, day):

```python
import pandas as pd

readings = pd.DataFrame({
    "city": ["Paris", "Paris", "Tokyo", "Tokyo"],
    "day":  ["Mon",   "Tue",   "Mon",   "Tue"],
    "temp": [12,       14,      18,      17],
})
```

To compare cities and days at a glance, you want a **grid**: cities down the side, days across the top, temperature in each cell. Reshaping the long list into that grid is what pivoting does.

```text
  long form (one row per record)        grid form (pivoted)
  city    day   temp                     day    Mon  Tue
  Paris   Mon    12                       city
  Paris   Tue    14          ─────►       Paris   12   14
  Tokyo   Mon    18                       Tokyo   18   17
  Tokyo   Tue    17
```

## pivot(): just rearrange

When every (row, column) pair shows up **exactly once**, you can use `pivot()`. It does no maths at all; it simply moves each value to its spot in the grid.

```python
readings.pivot(index="city", columns="day", values="temp")
# day    Mon  Tue
# city
# Paris   12   14
# Tokyo   18   17
```

`index` is the column that becomes the rows, `columns` becomes the columns, and `values` is what fills the cells. The four temperatures are the same four numbers, just laid out differently.

**In one line:** `pivot()` rearranges long data into a grid, with no combining, so each cell must come from exactly one record.

## pivot_table(): rearrange and combine

Here is the catch. What if two records want the **same cell**? Suppose Paris was measured twice on Monday, 12 and 16. Now the Paris/Monday cell has two values, and `pivot()` has no way to choose:

```python
readings_dup = pd.DataFrame({
    "city": ["Paris", "Paris", "Tokyo", "Tokyo", "Paris"],
    "day":  ["Mon",   "Tue",   "Mon",   "Tue",   "Mon"],
    "temp": [12,       14,      18,      17,      16],   # a second Paris/Mon reading
})

readings_dup.pivot(index="city", columns="day", values="temp")
# ValueError: Index contains duplicate entries, cannot reshape
```

`pivot_table()` fixes this by asking *how* to combine the clashing values, through `aggfunc`:

```python
readings_dup.pivot_table(index="city", columns="day", values="temp", aggfunc="mean")
# day     Mon   Tue
# city
# Paris  14.0  14.0     <- Paris/Mon is the average of 12 and 16
# Tokyo  18.0  17.0
```

So the rule is simple:

- **`pivot()`** when each cell has one value. Pure reshape.
- **`pivot_table()`** when cells can collide and need combining. Reshape plus aggregate.

In real data, collisions are the norm. Take the sales table, which has two "East / product A" rows:

```python
sales = pd.DataFrame({
    "region":  ["East", "East", "West", "West", "East"],
    "product": ["A", "B", "A", "B", "A"],
    "revenue": [100, 60, 80, 130, 70],
})

sales.pivot_table(index="region", columns="product", values="revenue", aggfunc="sum")
# product    A    B
# region
# East     170   60     <- East/A is 100 + 70, summed
# West      80  130
```

`pivot()` would have raised an error on the duplicate East/A pair. `pivot_table()` just adds them up. That is why `pivot_table()` is the one you will reach for almost every time.

??? question "Quick check: which one?"
    You have sales with two "East / product A" rows, and you want a region-by-product grid of total revenue. Can you use `pivot()`? What does the East/A cell show?

    **Answer:** No. `pivot()` raises a `ValueError` because (East, A) appears twice and it cannot pick one. Use `pivot_table(..., aggfunc="sum")`, and the East/A cell shows **170**, the two rows (100 and 70) added together.

## Totals and missing cells

Two options make `pivot_table()` more useful.

```python
# add a row and column of totals (a "grand total")
sales.pivot_table(index="region", columns="product", values="revenue",
                  aggfunc="sum", margins=True)

# show empty (region, product) combinations as 0 instead of NaN
sales.pivot_table(index="region", columns="product", values="revenue",
                  aggfunc="sum", fill_value=0)
```

`margins=True` adds the totals row and column. `fill_value` replaces the `NaN` that appears when a combination simply has no data.

## Under the hood

!!! tip "New here? You have permission to skip this."
    `index`, `columns`, `values`, `aggfunc` is the whole mental model. One nice equivalence below.

A pivot table is really a [GroupBy](groupby.md) on the two keys, followed by `unstack`, which swings one key up to become the columns:

```python
sales.pivot_table(index="region", columns="product", values="revenue", aggfunc="sum")
# is the same as
sales.groupby(["region", "product"])["revenue"].sum().unstack()
```

They give identical results. `pivot_table()` is the concise version with extras baked in (`margins`, `fill_value`); the GroupBy form is more flexible inside a longer chain. Seeing they are the same thing makes both less mysterious.

## Gotchas

!!! warning "The default aggfunc is mean, not sum"
    If you leave out `aggfunc`, `pivot_table()` averages. When you actually want totals, say `aggfunc="sum"`, or you will get silently wrong numbers.

!!! warning "pivot() breaks on duplicates by design"
    A `ValueError` about duplicate entries is `pivot()` telling you a cell has more than one value. That is not a bug to fight; it is your signal to switch to `pivot_table()` and pick an `aggfunc`.

!!! warning "fill_value can mislead for averages"
    Filling empty cells with 0 is right for sums, but in an average table it makes "no data" look like "an average of zero". Match the fill to the aggregation.

## Quick reference

| You want | Write |
| --- | --- |
| Reshape, one value per cell | `df.pivot(index="r", columns="c", values="v")` |
| Reshape and combine collisions | `df.pivot_table(index="r", columns="c", values="v", aggfunc="sum")` |
| Add grand totals | `..., margins=True` |
| Fill empty cells | `..., fill_value=0` |
| The GroupBy equivalent | `df.groupby(["r", "c"])["v"].sum().unstack()` |

## Where this connects

!!! connect "Reshaping the summary"
    - `pivot_table()` is [GroupBy](groupby.md) plus a reshape, and equals a group-then-`unstack`.
    - The cell combining is ordinary [aggregation](aggregation.md), so any `aggfunc` (sum, mean, count, custom) works.
    - The result is a normal DataFrame, so you can keep [selecting](../selection/column-selection.md), [filtering](../selection/boolean-indexing.md), and sorting it.

!!! intuition "If you remember one thing"
    Both turn a long list into a grid. `pivot()` only rearranges, so each cell needs exactly one value. `pivot_table()` rearranges **and** combines clashing values with an `aggfunc`, which is why it is the one you will almost always use.
