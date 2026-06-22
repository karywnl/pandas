# Unstack: long to wide

!!! intuition "The gist"
    When a table has **two keys stacked in the row index** (like region *and* quarter), `unstack()` lifts one of those keys up and turns its values into **columns**. The long list of (region, quarter) rows becomes a compact grid: regions down the side, quarters across the top. It is the index based counterpart of [`pivot`](pivot.md), and it is what you reach for right after a [GroupBy](groupby.md).

## Why it exists

A [GroupBy](groupby.md) on two keys gives you a long, narrow result: one column of values and a row for every pair of keys. Group sales by region and quarter, and you get one row for every (region, quarter) pair, with the two keys stacked together in the **row index** (a [MultiIndex](multi-level-groupby.md)):

```python
import pandas as pd

sales = pd.DataFrame({
    "region":  ["North", "North", "South", "South", "North", "South"],
    "product": ["Tea",   "Tea",   "Tea",   "Tea",   "Coffee","Coffee"],
    "quarter": ["Q1",    "Q2",    "Q1",    "Q2",    "Q1",    "Q1"],
    "revenue": [100,     150,     80,      120,     200,     90],
    "units":   [10,      12,      8,       11,      20,      9],
})

g = sales.groupby(["region", "quarter"])["revenue"].sum()
g
# region  quarter
# North   Q1         300
#         Q2         150
# South   Q1         170
#         Q2         120
# Name: revenue, dtype: int64
```

This is correct, but it is awkward to read and to compare. To answer "how did each region do across quarters?" you have to look up and down the list. What you really want is a **grid**: each region on its own row, each quarter its own column. Moving one of the two index keys (here `quarter`) up into the column headers is exactly what `unstack()` does.

```python
g.unstack()
# quarter   Q1   Q2
# region
# North    300  150
# South    170  120
```

Same four numbers, far easier to read. **`unstack()` takes a level of the row index and rotates it into columns.**

## Picture it

The starting data has two keys living in the rows: `region` and `quarter`. `unstack()` keeps `region` as the rows and lifts `quarter` up to become column headers. Each unique quarter (`Q1`, `Q2`) turns into its own column, and every value slides into the cell where its region meets its quarter.

```text
LONG (a MultiIndex Series): two keys stacked in the rows
+--------+---------+---------+
| region | quarter | revenue |
+--------+---------+---------+
| North  | Q1      | 300     |
| North  | Q2      | 150     |
| South  | Q1      | 170     |
| South  | Q2      | 120     |
+--------+---------+---------+

        |  unstack(): lift the quarter key up into columns
        v

WIDE (quarter pivoted into columns)
+--------+-----+-----+
| region | Q1  | Q2  |
+--------+-----+-----+
| North  | 300 | 150 |
| South  | 170 | 120 |
+--------+-----+-----+
```

Read one value across both pictures: the `(North, Q1) -> 300` row in the long table becomes the `North` row, `Q1` column cell in the grid. Nothing is added or removed; the numbers are just laid out in two dimensions instead of one. **In one line:** `unstack()` turns one row-index level into column headers, reshaping a tall list into a wide grid.

## How it works

### unstack after a GroupBy (the main use)

This is the pattern you will use most. A GroupBy on two or more keys produces a MultiIndex, and `unstack()` spreads the last key across the top:

```python
g = sales.groupby(["region", "quarter"])["revenue"].sum()
g.unstack()
# quarter   Q1   Q2
# region
# North    300  150
# South    170  120
```

The grouping does the maths (summing revenue per region per quarter), and `unstack()` only reshapes the result. This is the same grid a [pivot table](pivot.md) would give you; in fact `pivot_table` is literally a group-then-unstack under the hood. When you have already grouped, `unstack()` is the shorter path to the grid.

**In one line:** group by two keys, then `unstack()` to turn the second key into columns.

??? question "Quick check: what shape comes out?"
    `g` has 4 rows (2 regions times 2 quarters) in a single column. After `g.unstack()`, how many rows and columns does the grid have, and where did the quarter labels go?

    **Answer:** **2 rows and 2 columns.** The 2 regions stay as rows; the 2 quarters (`Q1`, `Q2`) move up to become the two column headers. The 4 values rearrange from a 4-by-1 list into a 2-by-2 grid. No value is lost; the same four numbers are just placed where each region meets each quarter.

### Choosing which level to unstack

By default `unstack()` lifts the **innermost** level (the last key you grouped by, `level=-1`). You can pick a different one by position or by name:

=== "default (innermost)"

    ```python
    g.unstack()          # same as g.unstack(level=-1)
    # quarter   Q1   Q2
    # region
    # North    300  150
    # South    170  120
    ```

    `quarter` is the innermost level, so it becomes the columns and `region` stays as the rows.

=== "by position"

    ```python
    g.unstack(level=0)   # lift the outermost level (region)
    # region   North  South
    # quarter
    # Q1         300    170
    # Q2         150    120
    ```

    Now `region` moves up to the columns and `quarter` stays as the rows. The grid is transposed compared to the default.

=== "by name"

    ```python
    g.unstack("region")  # same result, named instead of numbered
    # region   North  South
    # quarter
    # Q1         300    170
    # Q2         150    120
    ```

    Naming the level is clearer and safer than counting positions, especially once you have three or more levels.

With three or more index levels, `unstack()` moves just the **one** level you name and leaves the rest as rows. Grouping by three keys and lifting the middle one (`product`):

```python
g3 = sales.groupby(["region", "product", "quarter"])["revenue"].sum()
g3.unstack("product")
# product         Coffee    Tea
# region quarter
# North  Q1        200.0  100.0
#        Q2          NaN  150.0
# South  Q1         90.0   80.0
#        Q2          NaN  120.0
```

`product` became the columns; `region` and `quarter` stayed stacked in the rows. (The `NaN` cells are explained next.)

**In one line:** `unstack()` lifts the innermost level by default; pass `level=` by number or, better, by name to lift a specific one.

### Filling the gaps with fill_value

A grid has a cell for **every** combination of rows and columns, but real data rarely contains every combination. Look at the result above: Coffee was only sold in Q1, so the Coffee/Q2 cells have nothing to put there. `unstack()` marks those holes with `NaN`:

```python
g3.unstack("product")
# product         Coffee    Tea
# region quarter
# North  Q1        200.0  100.0
#        Q2          NaN  150.0     <- no North/Coffee/Q2 sale existed
# South  Q1         90.0   80.0
#        Q2          NaN  120.0
```

Often "no sale" really means **zero**. `fill_value` writes a value of your choice into the empty cells:

```python
g3.unstack("product", fill_value=0)
# product         Coffee  Tea
# region quarter
# North  Q1          200  100
#        Q2            0  150
# South  Q1           90   80
#        Q2            0  120
```

Notice the numbers also lost their `.0`. That is the real payoff, not just looks: with no `NaN` to store, the columns can stay the compact `int64` type instead of widening to `float64`. (Why a single `NaN` forces a whole column to float is covered under the hood.)

**In one line:** missing (row, column) combinations come back as `NaN`; `fill_value=0` fills the holes and keeps the result as integers.

### stack(): the inverse direction

`stack()` does the opposite of `unstack()`: it takes a level of **columns** and folds it back down into the row index, turning a wide grid into a long Series. Used together they undo each other:

```python
wide = g.unstack()    # long -> wide
wide.stack()          # wide -> long again
# region  quarter
# North   Q1         300
#         Q2         150
# South   Q1         170
#         Q2         120
# dtype: int64
```

You are back to the original MultiIndex Series. The pair works in two directions: `unstack()` moves a key from rows to columns, and `stack()` moves it from columns back to rows.

!!! warning "In pandas 3.0, `stack()` keeps `NaN` rows"
    Older pandas dropped missing combinations when you called `stack()`. As of pandas 3.0 it keeps them, and the old `dropna=` argument now raises an error. So stacking a grid that has holes gives you `NaN` rows, not a shorter result. Drop them yourself afterward with `.dropna()` if you do not want them.

**In one line:** `unstack()` moves a key from rows to columns; `stack()` moves a key from columns to rows. They are opposites.

### Multiple value columns

When the thing you unstack has **more than one value column**, every column gets its own copy of the new headers, producing a two level (hierarchical) column index. Aggregate revenue and units together, then unstack:

```python
m = sales.groupby(["region", "quarter"]).agg({"revenue": "mean", "units": "sum"})
m.unstack()
#         revenue        units
# quarter      Q1     Q2    Q1  Q2
# region
# North     150.0  150.0    30  12
# South      85.0  120.0    17  11
```

The top level of the columns is the measure (`revenue`, `units`) and the second level is the quarter. So the column `("revenue", "Q1")` is "average revenue in Q1". Those stacked headers can be awkward for later steps, so it is common to flatten them into single strings:

```python
wide = m.unstack()
wide.columns = [f"{measure}_{quarter}" for measure, quarter in wide.columns]
wide
#         revenue_Q1  revenue_Q2  units_Q1  units_Q2
# region
# North        150.0       150.0        30        12
# South         85.0       120.0        17        11
```

Each column is now a plain name like `revenue_Q1`, which is far easier to select and to export.

**In one line:** with several value columns, `unstack()` makes a two level column index (measure, then unstacked key); flatten it with a list comprehension when you need simple names.

## Under the hood

!!! tip "New here? You have permission to skip this."
    "Group by two keys, then `unstack()` to turn the second key into columns" is the whole chapter. Come back here when you want to know *why* a `NaN` appears or why a column turns into floats.

**How `unstack()` actually places each value.** First it works out the full size of the grid: the number of distinct kept-key values (the rows) times the number of distinct lifted-key values (the columns). It allocates that whole grid up front and fills **every** cell with the fill value, which is `NaN` by default. Only then does it place the data: each row of the long Series is addressed by a pair of labels, for example `(North, Q1)`, and `unstack()` splits that pair, using the kept part (`North`) to pick the row and the lifted part (`Q1`) to pick the column, and writes the value into that one slot. Any slot that no pair lands on keeps the `NaN` it was pre-filled with.

```text
each (row-key, lifted-key) pair points at one cell:

   (North, Q1) = 300                column ->   Q1    Q2
   (North, Q2) = 150              +--------+-----+-----+
   (South, Q1) = 170      North-> |  row   | 300 | 150 |
   (South, Q2) = 120      South-> |  row   | 170 | 120 |
                                  +--------+-----+-----+
       \______ kept    \__ lifted        ^      ^
              = row        = column    (North,Q1) lands here
```

The kept label gives the row, the lifted label gives the column, and together they name one cell. Because the grid was pre-filled with `NaN` and has a slot for **every** row crossed with **every** column, any pair that did not exist in your data never overwrites its slot, so that slot keeps its `NaN`. That is the whole reason holes appear: the grid is complete by construction, but your data may not be.

**Why one `NaN` turns a column into floats.** A pandas integer column has no way to store "missing"; there is no integer that means absent. A float column does, because `NaN` is a special float value. So the moment a single cell needs to be empty, pandas must widen that whole column from `int64` to `float64` to hold the `NaN`, and every number in it gains a `.0`. `fill_value=0` sidesteps this entirely: it gives each empty cell a real integer, so no `NaN` is ever needed and the column stays `int64`. This is the same rule you met in [missing values](../cleaning/missing-values.md) and [pivot tables](pivot.md).

**Why duplicates are rejected.** Each cell holds exactly one value, so each (kept-key, lifted-key) pair must be unique. pandas actually catches this through the placement step itself: it marks each filled slot as it writes, and if two rows point at the same slot, the number of filled slots ends up **smaller** than the number of input rows. pandas treats that mismatch as a sign of duplicates and raises a `ValueError` rather than letting one value silently overwrite the other. The fix is to aggregate first (with a GroupBy) so each pair occurs once, which is why `unstack()` pairs so naturally with grouping.

## Gotchas

!!! danger "Duplicate pairs raise a ValueError"
    If the (kept-key, lifted-key) combination is not unique, `unstack()` cannot decide which value wins and raises `ValueError: Index contains duplicate entries, cannot reshape`. This is not a bug to silence; it means a cell has more than one value. Aggregate first so each pair appears once:

    ```python
    dup = pd.DataFrame({
        "region": ["North", "North"],
        "quarter": ["Q1", "Q1"],
        "revenue": [100, 50],
    }).set_index(["region", "quarter"])

    dup.unstack()
    # ValueError: Index contains duplicate entries, cannot reshape
    ```

!!! warning "Missing combinations become NaN (and floats)"
    Any (row, column) pair that never occurred comes back as `NaN`, and that single `NaN` widens the whole column to `float64`. Pass `fill_value=0` (or another value) when you want clean, gap-free integers.

!!! warning "Hierarchical columns complicate later steps"
    Unstacking a frame with several value columns gives a two level column index. Selecting and exporting from it is fiddly, so flatten the columns (`wide.columns = [f"{a}_{b}" for a, b in wide.columns]`) before moving on.

!!! warning "Do not mix up the direction"
    `unstack()` moves a **row** level up into columns (long to wide). `stack()` moves a **column** level down into rows (wide to long). Reaching for the wrong one gives you the opposite shape from what you wanted.

## Quick reference

| You want | Write |
| --- | --- |
| Grid from a grouped result | `df.groupby(["r", "c"])["v"].sum().unstack()` |
| Lift the innermost level | `s.unstack()` |
| Lift a specific level (safest) | `s.unstack("colname")` |
| Lift the outermost level | `s.unstack(level=0)` |
| Fill empty cells (and keep int) | `s.unstack(fill_value=0)` |
| Wide back to long | `wide.stack()` |
| Flatten hierarchical columns | `df.columns = [f"{a}_{b}" for a, b in df.columns]` |

## Where this connects

!!! connect "Reshaping around the index"
    - `unstack()` is the index based counterpart of [pivot tables](pivot.md): a `pivot_table` is just a [GroupBy](groupby.md) followed by an `unstack`, so the two produce the same grid.
    - It works on the [MultiIndex](multi-level-groupby.md) that a multi-key GroupBy creates, which is why grouping then unstacking is such a common pair.
    - Its inverse is `stack` (wide to long), the same idea as [melt](melt.md) but driven by the index instead of named columns.
    - The `NaN`-forces-`float64` behaviour is the same dtype rule you met in [missing values](../cleaning/missing-values.md) and [pivot](pivot.md); `fill_value` avoids it.
    - After unstacking you have an ordinary grid, so you can keep [selecting columns](../selection/column-selection.md), [filtering](../selection/boolean-indexing.md), and [resetting the index](../indexing/reset-index.md) to turn the row labels back into a column.

!!! intuition "If you remember one thing"
    `unstack()` lifts one key out of the row index and turns its values into columns, reshaping a tall grouped result into a readable grid. Use it right after a two-key GroupBy, name the level you lift, and pass `fill_value=0` to keep the holes clean.
