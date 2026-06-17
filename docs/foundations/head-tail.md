# head and tail

!!! intuition "The gist"
    `head(n)` shows the first `n` rows, `tail(n)` shows the last `n`. They let you peek at a dataset of any size without printing the whole thing. The default is 5.

## Why it exists

Real datasets have thousands or millions of rows. Printing one fills your screen and tells you nothing. You almost never want the whole table; you want a glance, to check the columns, the types, and whether the values look reasonable. That glance is `head` and `tail`.

Imagine a daily visitor log with a hundred rows.

```python
import pandas as pd

visitors = pd.DataFrame({"day": range(1, 101), "count": range(100, 200)})
```

## How it works

```python
visitors.head()      # first 5 rows (the default)
visitors.head(10)    # first 10 rows
visitors.tail()      # last 5 rows
visitors.tail(3)     # last 3 rows
```

`head` counts from the top, `tail` counts from the bottom. Both return a **DataFrame**, and both keep the original row labels.

**In one line:** `head` peeks at the start, `tail` peeks at the end, default 5 of each.

### The negative trick

A minus sign flips the meaning into "all except".

```python
visitors.head(-97)   # everything EXCEPT the last 97 rows  -> rows 0, 1, 2
visitors.tail(-98)   # everything EXCEPT the first 98 rows  -> rows 98, 99
```

This mirrors Python slicing: `head(-97)` is just `iloc[:-97]`. It is handy when the last few rows are footer junk, or the first few are stray header rows.

### Safe by design

```python
visitors.head(1000)  # only 100 rows exist -> returns all 100, no error
visitors.head(0)     # an empty frame with the right columns and dtypes
```

Asking for more rows than exist is fine, you just get everything. And `head(0)` is a neat way to grab the *schema* (columns and types) with no data.

??? question "Quick check: predict it"
    `visitors` has 100 rows (labels 0 to 99). What index labels does `visitors.tail(3)` have?

    **Answer:** `97, 98, 99`. `tail` keeps the **original** labels, it does not renumber them to `0, 1, 2`. If you want a fresh index, add `.reset_index(drop=True)`.

## Under the hood

!!! tip "New here? You have permission to skip this."
    You can use these forever knowing only "first n, last n". Two refinements below.

`head` and `tail` are just friendly names for `iloc` slices:

| Method | Same as |
| --- | --- |
| `df.head(n)` | `df.iloc[:n]` |
| `df.tail(n)` | `df.iloc[-n:]` |
| `df.head(-n)` | `df.iloc[:-n]` |
| `df.tail(-n)` | `df.iloc[n:]` |

They are also effectively free. They do not copy the data; they hand you a lightweight window, so calling `head` on a billion-row frame is instant.

## Gotchas

!!! warning "head is not a sample"
    If the data is sorted, the first 5 rows all look alike and mislead you. For a representative peek at the *distribution*, use `df.sample(5)`. Use `head` to check structure, `sample` to check content.

!!! warning "tail keeps the old index"
    After `tail(3)` the labels start at their original position, not 0. Code that assumes a clean `0, 1, 2` index will misbehave, so `reset_index(drop=True)` if you need it.

## Quick reference

| You want | Write |
| --- | --- |
| First 5 / last 5 | `df.head()` / `df.tail()` |
| First / last n | `df.head(n)` / `df.tail(n)` |
| All but the last n | `df.head(-n)` |
| All but the first n | `df.tail(-n)` |
| Just the schema | `df.head(0)` |
| A representative peek | `df.sample(5)` |

## Where this connects

!!! connect "A small but constant tool"
    - `head` and `tail` are thin wrappers over [`iloc`](../selection/loc-iloc.md) slicing.
    - They are step four of the [inspection workflow](attributes.md).
    - Their index-keeping behaviour is the same one that makes [resetting the index](../indexing/reset-index.md) useful after slicing. *(chapter coming soon)*

!!! intuition "If you remember one thing"
    `head` and `tail` are your peek at data too big to print. First n, last n, default 5, and they keep the original row labels.
