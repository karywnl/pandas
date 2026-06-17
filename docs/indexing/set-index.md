# Setting the index

!!! intuition "The gist"
    `set_index("col")` promotes a column to be the **row labels**. Instead of anonymous rows `0, 1, 2`, your rows are now labelled by something meaningful (an order id, a date), which unlocks fast lookups, automatic alignment, and time-based slicing.

## Why it exists

The default index is just a row counter. It carries no meaning, so `df.loc[2]` only means "the third row". If you make a *meaningful* column the index, lookups become about the data itself: "give me order 103", "give me everything in January". The index stops being bookkeeping and starts being a tool.

```python
import pandas as pd

orders = pd.DataFrame({
    "order_id": [101, 102, 103, 104],
    "customer": ["Ana", "Ben", "Ana", "Cara"],
    "amount":   [250, 80, 120, 300],
})

orders = orders.set_index("order_id")
```

The `order_id` column is now the row label, and it has left the columns:

```text
            customer  amount
order_id
   101      Ana          250
   102      Ben           80
   103      Ana          120     <- orders.loc[103]
   104      Cara         300
```

## How it works

### Look things up by what they mean

```python
orders.loc[103]            # the order with id 103, instantly
orders.index.is_unique     # True  -> safe to use as a key
```

The old `order_id` is gone from `orders.columns`; it became the label. If you want to keep it as a column too, pass `drop=False`.

**In one line:** `set_index` turns a column into the row labels so you can look rows up by meaning.

### A datetime index unlocks time slicing

This is the killer feature. Set a date column as the index and you can slice by calendar text.

```python
ts = (pd.DataFrame({
        "date": pd.to_datetime(["2024-01-05", "2024-02-10", "2024-03-15"]),
        "sales": [10, 20, 30]})
      .set_index("date"))

ts.loc["2024-01":"2024-02"]   # every row in Jan and Feb -> sales 10 and 20
```

You did not write any date math. A datetime index understands `"2024-01"` means "all of January".

### Multiple levels

Pass a list to build a hierarchical index, which lets you group lookups.

```python
orders.set_index(["customer", "order_id"])   # group rows by customer, then id
```

??? question "Quick check: where did the column go?"
    After `orders = orders.set_index("order_id")`, what does `orders["order_id"]` do?

    **Answer:** It raises a `KeyError`. `set_index` *consumes* the column: `order_id` is now the row label, not a column. Use `drop=False` if you need it in both places, or `reset_index` to bring it back.

## Under the hood

!!! tip "New here? You have permission to skip this."
    You can use a meaningful index knowing only "look rows up by name". Here is why it is also fast.

When you set an index, pandas builds a **hash table** over the labels. Looking up `orders.loc[103]` is then an O(1) jump, like a Python dictionary, no matter how many rows there are. The alternative, scanning a column with `orders[orders["order_id"] == 103]`, is an O(n) walk over every row. On millions of rows that is the difference between instant and a visible pause.

The index also drives **alignment**: arithmetic between two frames matches rows by label automatically, so `revenue - cost` lines up by date even if the rows are in different orders. A sorted, unique index gives the best performance for both lookups and slices, so `df.sort_index()` is often worth it.

## Gotchas

!!! warning "set_index returns a new frame"
    `df.set_index("col")` does nothing unless you reassign: `df = df.set_index("col")`. This catches everyone once.

!!! warning "Duplicate labels break single-row lookups"
    If the column is not unique, `loc[value]` returns several rows instead of one, which can break code expecting a single record. Check `df.index.is_unique`, or pass `verify_integrity=True` to catch it at set time.

## Quick reference

| You want | Write |
| --- | --- |
| Make a column the index | `df = df.set_index("col")` |
| Keep it as a column too | `df.set_index("col", drop=False)` |
| Hierarchical index | `df.set_index(["a", "b"])` |
| Sort by the index | `df.sort_index()` |
| Check it is unique | `df.index.is_unique` |

## Where this connects

!!! connect "The index ties the workflow together"
    - The inverse, moving the index back to a column, is [resetting the index](reset-index.md).
    - Fast `loc` lookups are the payoff promised back in [loc and iloc](../selection/loc-iloc.md).
    - Alignment by label is the same [Series](../foundations/series.md) behaviour, now driving whole-table arithmetic.
    - A datetime index is what makes resampling and time grouping possible later in [GroupBy](../grouping/groupby.md). *(chapter coming soon)*

!!! intuition "If you remember one thing"
    `set_index` turns a meaningful column into your row labels. Lookups get fast, arithmetic lines up by label, and dates become sliceable. Just remember to reassign the result.
