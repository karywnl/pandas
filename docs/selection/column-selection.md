# Selecting columns

!!! intuition "The gist"
    `df["col"]` pulls one column out as a **Series**. `df[["col"]]` with double brackets pulls it out as a one-column **DataFrame**. That single difference in brackets changes the type you get back, and it matters more than it looks.

## Why it exists

Most work starts by grabbing the column you care about: a price, a name, a score. Pandas gives you a few ways to do it, and knowing which to use (and which to avoid) prevents some genuinely confusing bugs.

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

### One column, as a Series

```python
emp["salary"]          # a Series of the three salaries
emp["salary"].mean()   # 85000.0
```

Because it is a Series, every Series method is right there: `.mean()`, `.value_counts()`, `.describe()`, and so on.

### Single vs double brackets

```python
emp["name"]      # Series  (one column, laid out vertically)
emp[["name"]]    # DataFrame (still a table, one column wide)
```

Pass a **string** and you get a Series. Pass a **list** and you get a DataFrame, even with one item in the list. Some operations expect a table, not a Series, so this is a real distinction, not a style choice.

**In one line:** string gives a Series, list gives a DataFrame.

### Avoid dot notation

Pandas also lets you write `emp.salary`, but do not rely on it.

```python
emp.salary       # works... until the column name collides with a method
```

If a column is named `count`, `mean`, or `shape`, then `emp.count` gives you the *method*, not the column, with no error and very confusing results downstream. Bracket notation always means the column, works with spaces and special characters, and works when the name lives in a variable. Use brackets.

??? question "Quick check: Series or DataFrame?"
    What is the difference between `emp["dept"]` and `emp[["dept"]]`?

    **Answer:** `emp["dept"]` is a **Series** (a single column). `emp[["dept"]]` is a **DataFrame** with one column, because you passed a list. Same data, different container.

## Selecting by type or pattern

Two tools let the data choose the columns for you, which is essential in real pipelines where you do not want to hand-type names.

```python
emp.select_dtypes(include="number")   # only numeric columns -> salary
emp.select_dtypes(include="bool")     # only booleans       -> remote
emp.filter(like="e")                  # name contains 'e'   -> name, dept, remote
emp.filter(regex="^s")                # name starts with 's'-> salary
```

`select_dtypes` picks columns by their dtype (numbers to scale, text to encode). `filter` picks them by a name pattern, which is perfect for systematic names like `feat_1`, `feat_2`.

## Under the hood

!!! tip "New here? You have permission to skip this."
    Brackets and `select_dtypes` cover almost everything. This is one safety note.

Selecting a column can hand you a **view** onto the original data rather than a fresh copy, so modifying it might change the parent DataFrame. In pandas 3.0 the Copy-on-Write rules make this safe by default, but the habit still holds: if you select a column and intend to change it independently, take a `.copy()` first, or assign back through `df.loc[...]`. This is the same view-versus-copy story from [loc and iloc](loc-iloc.md#views-copies-and-the-famous-warning).

## Gotchas

!!! warning "Dot notation silently returns methods"
    `df.count`, `df.mean`, `df.shape` give you the method, not a column of that name. Always use `df["count"]`.

!!! warning "A misspelled name raises KeyError"
    `df["salri"]` raises `KeyError`. Check `df.columns` for the exact spelling.

## Quick reference

| You want | Write | Returns |
| --- | --- | --- |
| One column | `df["col"]` | Series |
| One column as a table | `df[["col"]]` | DataFrame |
| Raw values | `df["col"].to_numpy()` / `.tolist()` | array / list |
| All numeric columns | `df.select_dtypes(include="number")` | DataFrame |
| Columns matching a pattern | `df.filter(like="x")` / `filter(regex="...")` | DataFrame |

## Where this connects

!!! connect "Columns in, everything out"
    - Picking **several** columns, reordering, and dropping them is the next chapter, [selecting multiple columns](multi-column.md).
    - Each selected column is a [**Series**](../foundations/series.md), so every Series method is available immediately.
    - Combine column selection with row [filtering](boolean-indexing.md) through `df.loc[mask, ["a", "b"]]` to get exactly the slice you want.

!!! intuition "If you remember one thing"
    Use brackets, never dots. A string gives you a Series, a list gives you a DataFrame, and that bracket choice quietly decides what works next.
