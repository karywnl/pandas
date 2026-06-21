# Building a DataFrame

!!! intuition "The gist"
    A **DataFrame** is a table: rows and columns with labels on both. The usual way to build one is to hand pandas a **dictionary**, where each key becomes a column name and each value is the list of data down that column.

## Why it exists

Most data is a table: a row per thing, a column per attribute. The DataFrame is pandas' table, and the fastest way to create one is column by column, because that matches how pandas stores data internally.

```python
import pandas as pd

books = pd.DataFrame({
    "title": ["Dune", "1984", "Hyperion"],
    "year":  [1965, 1949, 1989],
    "price": [9.99, 7.50, 12.00],
})
```

You get a three-column table. The row index defaults to `0, 1, 2`.

## Picture it

The dictionary keys become the column headers, and each list fills its column top to bottom.

```text
   keys ->   title      year   price
           +----------+------+-------+
   row 0   | Dune     | 1965 |  9.99 |
   row 1   | 1984     | 1949 |  7.50 |
   row 2   | Hyperion | 1989 | 12.00 |
           +----------+------+-------+
   each dict value is one column
```

**In one line:** dict keys are columns, dict values are the column data, one row per position.

## How it works

```python
books.shape       # (3, 3)   -> (rows, columns)
books.columns     # Index(['title', 'year', 'price'])
books.dtypes      # title: str, year: int64, price: float64
```

### The one hard rule: equal lengths

Every column list must be the same length, because the table has to be rectangular.

```python
pd.DataFrame({"a": [1, 2], "b": [1, 2, 3]})
# ValueError: All arrays must be of the same length
```

If some rows are missing a value, fill the gap with `None` instead of shortening the list.

### Other ways to build one

Sometimes your data arrives as rows, not columns. That is common from JSON or APIs.

=== "From a list of rows"

    ```python
    pd.DataFrame([
        {"title": "Dune", "year": 1965},
        {"title": "1984", "year": 1949},
    ])
    # each dict is a row; missing keys become NaN
    ```

=== "From a 2D array"

    ```python
    import numpy as np
    pd.DataFrame(np.array([[1, 2], [3, 4]]), columns=["a", "b"])
    ```

### Picking the index and column order

```python
pd.DataFrame(books, columns=["title", "price"])   # choose which columns, and their order
books2 = books.set_index("title")                 # use a real column as the row labels
```

??? question "Quick check: predict it"
    What is the `shape` of `books`, and what type is the `price` column?

    **Answer:** `(3, 3)`, three rows and three columns. `price` is `float64`, because the values contain decimals.

## Under the hood

!!! tip "New here? You have permission to skip this."
    You can build tables all day knowing only "dict of columns". This explains why that way is the fast way.

### Why columns, not rows

Pandas stores each column as one block of values that all share a type, kept together in memory. When you pass a dict of lists, pandas can wrap each list directly as a column with almost no copying. Building a DataFrame **row by row in a loop** is the classic mistake: each step rebuilds and recopies the whole table, turning a quick job into a slow one.

```python
# Slow: rebuilds the table every iteration
df = pd.DataFrame()
for row in source:
    df = pd.concat([df, pd.DataFrame([row])])

# Fast: collect rows in a list, build the DataFrame once
df = pd.DataFrame(list(source))
```

### How dtypes are guessed

Pandas infers each column's type from its values: all integers give `int64`, any decimal gives `float64`, text gives `str` (the dedicated string type in pandas 3.0), and a genuinely mixed column becomes `object`. You can force a type with `pd.DataFrame(data, dtype=...)` or fix it afterward, covered in [data types](dtypes.md).

## Gotchas

!!! warning "Scalars need an index"
    `pd.DataFrame({"a": 1})` fails, because pandas does not know how many rows to make. Wrap the value in a list, `{"a": [1]}`, or pass an explicit `index`.

!!! warning "Build once, not in a loop"
    Accumulate rows in a plain Python list first, then call `pd.DataFrame` a single time. Growing a DataFrame inside a loop is the most common pandas performance trap.

## Quick reference

| You want | Write |
| --- | --- |
| Table from columns | `pd.DataFrame({"col": [...], ...})` |
| Table from rows | `pd.DataFrame([{...}, {...}])` |
| Choose columns / order | `pd.DataFrame(data, columns=[...])` |
| Custom row labels | `pd.DataFrame(data, index=[...])` |
| Use a column as index | `df.set_index("col")` |

## Where this connects

!!! connect "From here the whole workflow opens up"
    - Each column is a [**Series**](series.md), and they all share one row index.
    - Building from a dict is for learning; real data is loaded from a file with [**reading and writing data**](reading-data.md).
    - Once built, you [**inspect**](attributes.md) it with `shape`, `dtypes`, and `info`, then [**select**](../selection/loc-iloc.md) the parts you want.
    - The `set_index` shortcut shown here gets its own chapter on [setting the index](../indexing/set-index.md).

!!! intuition "If you remember one thing"
    Hand pandas a dictionary of columns. Keys become headers, lists become columns, and they must all be the same length.
