# Series

!!! intuition "The gist"
    A **Series** is a single column of data that wears name tags. It is a one-dimensional list of values, plus an **index** (a label for each value) and a single **dtype** (the type of every value). A DataFrame is really just a bunch of Series standing side by side.

## Why it exists

A plain Python list can hold values, but it cannot answer "what was Wednesday's temperature?" without you remembering that Wednesday is position 2. A Series fixes that by attaching a **label** to every value, so you can ask for data by name. It also pins down **one type** for the whole column, which is what makes math fast.

Think of a week of temperature readings.

```python
import pandas as pd

temps = pd.Series([31, 33, 30, 29, 34],
                  index=["Mon", "Tue", "Wed", "Thu", "Fri"],
                  name="temp_c")
```

## Picture it

A Series is two parallel strips: the labels on the left, the values on the right, with a name and a dtype underneath.

```text
   index   values
   -----   ------
   Mon       31
   Tue       33
   Wed       30
   Thu       29
   Fri       34
           name: temp_c, dtype: int64
```

Two things are *always* there: an **index** and a **dtype**. Even if you never set an index, you get the default `0, 1, 2, ...`.

**In one line:** a Series is values plus labels plus one shared type.

## How it works

Look things up by label, and run whole-column math in one go.

```python
temps["Wed"]        # 30        (lookup by label)
temps.mean()        # 31.4      (one number for the column)
temps.max()         # 34
temps.index         # Index(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
temps.dtype         # int64
temps + 2           # adds 2 to every value at once (vectorized)
```

That `temps + 2` adds to all five values without a loop. This is the same vectorization that powers filtering and arithmetic everywhere in pandas.

### Getting the values out

```python
temps.tolist()      # [31, 33, 30, 29, 34]   most common
temps.to_dict()     # {'Mon': 31, 'Tue': 33, ...}
temps.to_numpy()    # the raw NumPy array
```

??? question "Quick check: predict it"
    Given `temps` above, what do `temps["Tue"]` and `temps.mean()` return?

    **Answer:** `temps["Tue"]` is **33** (lookup by the label "Tue"), and `temps.mean()` is **31.4** (the average of all five readings).

## Under the hood

!!! tip "New here? You have permission to skip this."
    You can use a Series knowing only "labeled column, one type". The rest is the *why* behind two behaviours that surprise people later.

### The index drives alignment

This is the most important idea in all of pandas. When you combine two Series, they line up **by label**, not by position.

```python
a = pd.Series([1, 2], index=["x", "y"])
b = pd.Series([10, 20], index=["y", "z"])
a + b
# x     NaN     (no 'x' in b)
# y    12.0     ('y' matched: 2 + 10)
# z     NaN     (no 'z' in a)
```

Only the shared label `y` adds up. Everything else becomes `NaN`, because there was nothing to add it to. This automatic alignment prevents a whole class of silent off-by-one bugs, and it is why a meaningful index is so valuable.

### One dtype, on purpose

A Series stores all its values in a single typed block of memory, so the type has to be uniform. That uniformity is what lets the math run as one fast C operation instead of a slow Python loop. If you mix types (say numbers and text), the Series falls back to the catch-all `object` dtype and you lose that speed.

## Gotchas

!!! warning "A missing value can change the dtype"
    Put a missing value in an integer Series and it quietly becomes `float64`, because the classic `NaN` is a float. `pd.Series([1, 2, None])` has dtype `float64`, not `int64`. More on this in [data types](dtypes.md).

!!! warning "Label lookup vs position lookup"
    `temps["Wed"]` uses the label. If you want the third value by position, that is `temps.iloc[2]`. When the index is integers, these two can point at different things, the same trap covered in [loc and iloc](../selection/loc-iloc.md).

## Quick reference

| You want | Write |
| --- | --- |
| Make a Series | `pd.Series(values, index=labels, name="...")` |
| Value by label | `s["label"]` |
| Value by position | `s.iloc[0]` |
| A summary number | `s.mean()`, `s.sum()`, `s.max()` |
| The labels / the type | `s.index` / `s.dtype` |
| To a list / dict / array | `s.tolist()` / `s.to_dict()` / `s.to_numpy()` |

## Where this connects

!!! connect "The Series sits underneath everything"
    - A [**DataFrame**](dataframe.md) is just several Series sharing one index. Every column you pull out with `df["col"]` is a Series.
    - **Index alignment** shown here is the engine behind arithmetic between columns and the reason [the index](../indexing/set-index.md) matters so much. *(chapter coming soon)*
    - The single-dtype rule leads straight into [data types](dtypes.md) and why missing values can change a column's type.

!!! intuition "If you remember one thing"
    A Series is a column with name tags. The values give you the data, the index lets you ask for it by name, and the labels are what pandas quietly lines up whenever two columns meet.
