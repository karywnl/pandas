# Selecting multiple columns

!!! intuition "The gist"
    Pass a **list** of column names in brackets to pull several columns at once: `df[["a", "b", "c"]]`. The result is a DataFrame with those columns, in the exact order you listed, so selecting also reorders.

## Why it exists

You rarely want just one column. You want a tidy subset: the few features for a model, the columns for a report, everything except the junk. Listing the columns you want (or dropping the ones you do not) is how you carve a table down to size.

```python
import pandas as pd

emp = pd.DataFrame({
    "name":   ["Ana", "Ben", "Cara"],
    "dept":   ["Eng", "Sales", "Eng"],
    "salary": [95000, 72000, 88000],
    "remote": [True, False, True],
})
```

## How it works

### List selection (also reorders)

```python
emp[["name", "salary"]]            # just these two columns
emp[["salary", "name", "dept"]]    # same data, new column order
```

The result follows the order of *your* list, not the original table. That makes selection a quick way to reorder columns as a side effect.

You can build the list programmatically, which is the real power in pipelines:

```python
feature_cols = [c for c in emp.columns if c != "name"]
emp[feature_cols]
```

**In one line:** a list of names selects those columns, in that order.

### With loc and iloc

`loc` selects columns by name, `iloc` by position, and both can take all rows with `:`.

```python
emp.loc[:, ["name", "salary"]]    # by name
emp.loc[:, "name":"salary"]       # a label slice: name, dept, salary (inclusive!)
emp.iloc[:, [0, 2]]               # by position: name, salary
```

The label slice `"name":"salary"` is **inclusive on both ends**, so it grabs every column from `name` through `salary`, the same inclusive rule from [loc and iloc](loc-iloc.md).

### Dropping instead of keeping

When it is easier to say what to remove:

```python
emp.drop(columns=["remote"])      # everything except remote
```

`drop` returns a new DataFrame, so reassign or chain it.

??? question "Quick check: predict the columns"
    Given the column order `name, dept, salary, remote`, what columns does `emp.loc[:, "name":"salary"]` return?

    **Answer:** `name`, `dept`, and `salary`. A `loc` label slice includes **both** ends, so it sweeps from `name` through `salary` and keeps `dept` in between.

## Enforcing a column set with reindex

`reindex` selects and reorders, and will *create* any column you ask for that does not exist, filling it with a default. This is how you force every batch of data into the same shape.

```python
emp.reindex(columns=["name", "salary", "bonus"], fill_value=0)
#  name  salary  bonus
#   Ana   95000      0      <- 'bonus' did not exist, created and filled with 0
#   Ben   72000      0
#  Cara   88000      0
```

## Under the hood

!!! tip "New here? You have permission to skip this."
    Listing names is all you need. This is a note on speed and a sharp edge.

Selecting columns does not copy the underlying data, it references the existing column blocks, so pulling 5 columns from a 100-column table is cheap. The data is only copied if and when you modify the result.

## Gotchas

!!! warning "Use a list, not a tuple"
    `df[["a", "b"]]` selects two columns. `df[("a", "b")]` is read as a single key and usually raises `KeyError`. Always the double brackets.

!!! warning "One bad name fails the whole call"
    If any name in the list does not exist, the entire selection raises `KeyError`. Validate against `df.columns` when the list is built dynamically.

## Quick reference

| You want | Write |
| --- | --- |
| Several columns | `df[["a", "b"]]` |
| Several, by position | `df.iloc[:, [0, 2]]` |
| A range of columns | `df.loc[:, "a":"c"]` (inclusive) |
| Drop some columns | `df.drop(columns=["x"])` |
| Force a column set | `df.reindex(columns=[...], fill_value=0)` |
| Columns by type | `df.select_dtypes(include="number")` |

## Where this connects

!!! connect "Carving the table down"
    - One column at a time, plus dtype and pattern selection, is the previous chapter, [selecting columns](column-selection.md).
    - Combine with row [filtering](boolean-indexing.md): `df.loc[mask, ["a", "b"]]` picks rows and columns together.
    - `reindex` here previews the alignment idea that drives [the index](../indexing/set-index.md) chapters. *(chapter coming soon)*

!!! intuition "If you remember one thing"
    A list of names in brackets selects and reorders columns at once. Reach for `drop` when removing is simpler than listing, and `reindex` when every table must share one column set.
