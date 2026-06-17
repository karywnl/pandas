# Pivot tables

!!! intuition "The gist"
    A pivot table turns one grouping into a **grid**: pick a column to become the rows, a column to become the columns, and a value to aggregate in each cell. It is GroupBy plus a reshape, the same tool you know from Excel.

## Why it exists

GroupBy on two keys gives a long, stacked list. Often you want a *matrix* instead: regions down the side, products across the top, revenue in the cells, so you can read across and down. `pivot_table` builds exactly that. Reusing the sales data:

```python
import pandas as pd

sales = pd.DataFrame({
    "region":  ["East", "East", "West", "West", "East"],
    "product": ["A", "B", "A", "B", "A"],
    "units":   [10, 5, 8, 12, 7],
    "revenue": [100, 60, 80, 130, 70],
})
```

## How it works

```python
pd.pivot_table(sales,
    values="revenue",   # what goes in the cells
    index="region",     # what becomes the rows
    columns="product",  # what becomes the columns
    aggfunc="sum",      # how to combine cells
)
# product    A    B
# region
# East     170   60
# West      80  130
```

Read it like a grid: East's product-A revenue is 170 (the 100 and 70 rows summed), East's product-B is 60, and so on.

**In one line:** `values` fill the cells, `index` makes the rows, `columns` make the columns, `aggfunc` combines.

### pivot_table vs pivot

`pivot` only *reshapes* and demands unique index-column pairs; it has no way to combine collisions. `pivot_table` **aggregates**, so it handles repeats. East has two product-A rows, so plain `pivot` would error, while `pivot_table` sums them. Use `pivot` for pure reshaping, `pivot_table` whenever values need combining.

### Totals and missing cells

```python
pd.pivot_table(sales, values="revenue", index="region", columns="product",
               aggfunc="sum", margins=True)      # adds an "All" row and column of totals

pd.pivot_table(sales, values="revenue", index="region", columns="product",
               aggfunc="sum", fill_value=0)      # show empty (region, product) cells as 0
```

`margins=True` is Excel's grand total. `fill_value` replaces the `NaN` that appears when a combination has no data.

??? question "Quick check: pivot or pivot_table?"
    East has two rows for product A (revenue 100 and 70). You want a region-by-product grid of total revenue. Can you use `pivot`, and what does the East/A cell show?

    **Answer:** Not `pivot`, it raises an error on the duplicate (East, A) pair. Use `pivot_table` with `aggfunc="sum"`, and the East/A cell shows **170** (100 + 70 combined).

## Under the hood

!!! tip "New here? You have permission to skip this."
    `values`, `index`, `columns`, `aggfunc` is the whole mental model. One equivalence worth seeing.

A pivot table is literally a GroupBy on the two keys, followed by `unstack` to swing one key up into the columns:

```python
pd.pivot_table(sales, values="revenue", index="region", columns="product", aggfunc="sum")
# is the same as
sales.groupby(["region", "product"])["revenue"].sum().unstack()
```

They produce identical results. `pivot_table` is the concise, batteries-included version (it adds `margins` and `fill_value`); the GroupBy form is more flexible for complex chains. Seeing they are the same thing demystifies both.

## Gotchas

!!! warning "The default aggfunc is mean, not sum"
    Leave out `aggfunc` and you get **averages**, a classic source of wrong totals. State `aggfunc="sum"` when you want sums.

!!! warning "fill_value can mislead for means"
    Filling empty cells with 0 is right for sums, but for a mean table it makes "no data" look like "an average of zero". Choose the fill to match the aggregation.

## Quick reference

| You want | Write |
| --- | --- |
| Region-by-product grid | `pd.pivot_table(df, values="v", index="r", columns="c", aggfunc="sum")` |
| Add grand totals | `..., margins=True` |
| Fill empty cells | `..., fill_value=0` |
| Pure reshape (no combine) | `df.pivot(index="r", columns="c", values="v")` |
| Equivalent with GroupBy | `df.groupby(["r", "c"])["v"].sum().unstack()` |

## Where this connects

!!! connect "Reshaping the summary"
    - It is [GroupBy](groupby.md) plus a reshape, and equals a group-then-`unstack`.
    - The cell calculation is ordinary [aggregation](aggregation.md), so any `aggfunc` works.
    - The result is a normal DataFrame, so you can keep [selecting](../selection/column-selection.md), [filtering](../selection/boolean-indexing.md), and sorting it.

!!! intuition "If you remember one thing"
    `pivot_table` makes a grid: `index` down the side, `columns` across the top, `values` in the cells, `aggfunc` to combine. And do not forget to set `aggfunc`, because the default is mean, not sum.
