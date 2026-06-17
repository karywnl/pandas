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
long form: one row per reading
  +-------+------+------+
  | city  | day  | temp |
  +-------+------+------+
  | Paris | Mon  |  12  |
  | Paris | Tue  |  14  |
  | Tokyo | Mon  |  18  |
  | Tokyo | Tue  |  17  |
  +-------+------+------+

        |  pivot:  index = city,  columns = day,  values = temp
        v

grid form: city down the side, day across the top
  +-------+------+------+
  |       | Mon  | Tue  |
  +-------+------+------+
  | Paris |  12  |  14  |
  | Tokyo |  18  |  17  |
  +-------+------+------+
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

Two options turn a bare grid into the kind of summary table you would actually hand to someone: `margins` for totals, `fill_value` for the gaps.

### margins: a row and column of totals

`margins=True` adds one extra row and one extra column holding the **grand totals**, computed with the same `aggfunc`. Picking up the sales grid from above:

```python
sales.pivot_table(index="region", columns="product", values="revenue",
                  aggfunc="sum", margins=True)
# product    A    B  All
# region
# East     170   60  230     <- East's row total
# West      80  130  210
# All      250  190  440     <- 440 is the grand total
```

The `All` column sums across each row, the `All` row sums down each column, and the bottom-right `440` is everything added up. It is the same total whether you read it across or down, which is a quick sanity check that your grid is complete.

```text
  +-------+-----+-----+-----+
  |       |   A |   B | All |
  +-------+-----+-----+-----+
  | East  | 170 |  60 | 230 |
  | West  |  80 | 130 | 210 |
  | All   | 250 | 190 | 440 |
  +-------+-----+-----+-----+
     the All column holds row totals:    170 + 60  = 230
     the All row holds column totals:    170 + 80  = 250
     the corner is the grand total:      230 + 210 = 440
```

Prefer a clearer label? Pass `margins_name`:

```python
sales.pivot_table(index="region", columns="product", values="revenue",
                  aggfunc="sum", margins=True, margins_name="Total")
# the "All" row and column are now labelled "Total"
```

**In one line:** `margins=True` bolts a totals row and column onto the grid using your chosen `aggfunc`, with `All` as the default label.

### fill_value: holes in the grid

A pivot grid has a cell for **every** (row, column) pair, but real data rarely fills all of them. When a combination never occurs, that cell has nothing to aggregate, so pandas puts a `NaN` there. Say East also sold a product C, but West never did:

```python
sales_c = pd.DataFrame({
    "region":  ["East", "East", "West", "West", "East", "East"],
    "product": ["A", "B", "A", "B", "A", "C"],
    "revenue": [100, 60, 80, 130, 70, 40],
})

sales_c.pivot_table(index="region", columns="product", values="revenue", aggfunc="sum")
# product      A      B     C
# region
# East     170.0   60.0  40.0
# West      80.0  130.0   NaN     <- West never sold C, so this cell is empty
```

The `NaN` marks "no West/C sale ever happened". Often you would rather read that as a **0**. That is what `fill_value` does:

```python
sales_c.pivot_table(index="region", columns="product", values="revenue",
                    aggfunc="sum", fill_value=0)
# product    A    B   C
# region
# East     170   60  40
# West      80  130   0     <- the gap is now a clean 0
```

Notice the numbers also lost their `.0`. That is not cosmetic, and it is the real reason `fill_value` matters beyond looks (next section).

**In one line:** empty (row, column) combinations come back as `NaN`; `fill_value=0` rewrites those gaps so the grid reads cleanly.

??? question "Quick check: where does the NaN come from?"
    In the `sales_c` table, why is the West/C cell `NaN` and not `0`? And what does `fill_value=0` change about the rest of the column besides that one cell?

    **Answer:** There is no West/C row in the data at all, so there is nothing for `aggfunc="sum"` to add up; pandas marks the empty cell `NaN` rather than inventing a 0. Turning on `fill_value=0` swaps that `NaN` for `0`, **and** lets the whole table go back to `int64`: with no `NaN` left, pandas no longer needs `float64` to hold a missing value.

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

**Why a single hole turns the whole column to `float64`.** A pandas integer column has no slot for a missing value, but a float column does (`NaN` is a float). So the moment one empty cell needs a `NaN`, pandas has to widen the column from `int64` to `float64` to store it, and that is why a grid with a gap comes back with `.0` on every number. `fill_value=0` supplies a real integer for the gap instead, so no `NaN` is ever needed and the column stays `int64`. The clean look is a side effect; keeping the dtype is the substance. This is the same `NaN`-forces-float rule you met in [missing values](../cleaning/missing-values.md).

## Gotchas

!!! warning "The default aggfunc is mean, not sum"
    If you leave out `aggfunc`, `pivot_table()` averages. When you actually want totals, say `aggfunc="sum"`, or you will get silently wrong numbers.

!!! warning "pivot() breaks on duplicates by design"
    A `ValueError` about duplicate entries is `pivot()` telling you a cell has more than one value. That is not a bug to fight; it is your signal to switch to `pivot_table()` and pick an `aggfunc`.

!!! warning "fill_value can mislead for averages"
    Filling empty cells with 0 is right for sums, but in an average table it makes "no data" look like "an average of zero". Match the fill to the aggregation.

!!! warning "Margins are recomputed, not summed from the cells"
    The `All` row and column run your `aggfunc` over the **raw rows**, not over the visible cells. For `sum` that is the same number either way, but for `mean` it is not: the `All` mean is the mean of every underlying value, not the average of the cell averages. Do not try to reproduce a margin by hand from the grid.

## Quick reference

| You want | Write |
| --- | --- |
| Reshape, one value per cell | `df.pivot(index="r", columns="c", values="v")` |
| Reshape and combine collisions | `df.pivot_table(index="r", columns="c", values="v", aggfunc="sum")` |
| Add grand totals | `..., margins=True` |
| Rename the totals label | `..., margins=True, margins_name="Total"` |
| Fill empty cells (and keep `int64`) | `..., fill_value=0` |
| The GroupBy equivalent | `df.groupby(["r", "c"])["v"].sum().unstack()` |

## Where this connects

!!! connect "Reshaping the summary"
    - `pivot_table()` is [GroupBy](groupby.md) plus a reshape, and equals a group-then-`unstack`.
    - The cell combining is ordinary [aggregation](aggregation.md), so any `aggfunc` (sum, mean, count, custom) works.
    - The result is a normal DataFrame, so you can keep [selecting](../selection/column-selection.md), [filtering](../selection/boolean-indexing.md), and sorting it.
    - For frequency tables (counting category combinations), [cross tabulation](crosstab.md) is the specialised, more convenient version.

!!! intuition "If you remember one thing"
    Both turn a long list into a grid. `pivot()` only rearranges, so each cell needs exactly one value. `pivot_table()` rearranges **and** combines clashing values with an `aggfunc`, which is why it is the one you will almost always use.
