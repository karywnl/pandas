# Dropping duplicates

!!! intuition "The gist"
    `duplicated()` flags repeated rows, and `drop_duplicates()` removes them. One important thing to learn first: by default they compare **all columns**, so two rows only count as duplicates if every single value matches. Often you want to dedupe on just a **subset** of columns.

## Why it exists

Duplicates appear everywhere: a pipeline retries and writes an event twice, two data extracts overlap, a user submits a form twice. If you leave them in, they inflate counts and distort every total. Here is a signup log.

```python
import pandas as pd

signups = pd.DataFrame({
    "email": ["a@x.com", "b@x.com", "a@x.com"],
    "ts":    [1, 2, 3],
})
```

## How it works

### The default compares whole rows

```python
signups.duplicated()
# 0    False
# 1    False
# 2    False     <- not a duplicate!
```

Surprised? Rows 0 and 2 share the same email, but their `ts` differs (1 vs 3), so the *full rows* are not identical. `duplicated()` looks at **all columns** by default, and here no two full rows match.

**In one line:** by default, a duplicate means every column matches, not just the one you had in mind.

### Dedupe on the columns that define identity

This is what you usually want: one row per email, whatever the timestamp.

```python
signups.drop_duplicates(subset=["email"])     # keeps the first a@x.com, drops the later one
```

The `subset` says "rows are the same if these columns match". Everything else is ignored when deciding.

### Which copy to keep

```python
signups.drop_duplicates(subset=["email"], keep="first")  # keep the earliest (default)
signups.drop_duplicates(subset=["email"], keep="last")   # keep the latest
signups.drop_duplicates(subset=["email"], keep=False)    # drop every duplicated row entirely
```

To keep the **most recent** record per email, sort first so the one you want lands where `keep` looks:

```python
(signups
 .sort_values("ts")
 .drop_duplicates(subset=["email"], keep="last"))   # newest signup per email -> ts 2 and 3
```

??? question "Quick check: why no duplicates?"
    `signups` has two rows with email `a@x.com`, yet `signups.duplicated()` says `False` for all rows. Why, and how do you actually catch the repeat?

    **Answer:** The two rows differ in `ts`, so the *full* rows are not identical, and the default compares all columns. Catch the repeat with `signups.duplicated(subset=["email"])`, which compares only the email.

## Under the hood

!!! tip "New here? You have permission to skip this."
    Subset plus keep covers almost every case. This explains *how* pandas spots a repeat, which is also why the two surprises below happen.

**How it finds duplicates.** `drop_duplicates` does not compare every row against every other row (that would be slow). It walks the rows **once**, turns the chosen columns of each row into a single **key** (a short number computed from the values, called a **hash**), and keeps a record of the keys it has already seen. A new key means a new row, so it is kept. A key already in the record means a repeat, so it is dropped. Follow it on `signups` with `subset=["email"]`:

```text
  row 0  email a@x.com  -> key A   new    -> keep,  remember A
  row 1  email b@x.com  -> key B   new    -> keep,  remember B
  row 2  email a@x.com  -> key A   seen   -> drop
```

Row 2's email gives the same key `A` that row 0 already registered, so it is the duplicate. One pass, no row-against-row comparing, which is why dedupe stays fast on millions of rows.

Two surprises fall straight out of this key-matching:

- **`NaN` counts as equal here.** Matching is by key, not by the usual `==`. Two missing values produce the **same** key, so `drop_duplicates` treats them as identical, even though `NaN == NaN` is `False` everywhere else in pandas.
- **Floats may not match.** `0.1 + 0.2` is not exactly `0.3` in floating point, so two numbers that *print* the same can differ in their last bit, produce **different** keys, and survive as separate rows. Round computed floats before deduping on them.

After dropping, the index keeps its old numbers and gets gaps, so chain `.reset_index(drop=True)` for a clean run, the same cleanup from [resetting the index](../indexing/reset-index.md).

## Gotchas

!!! warning "The default is all columns"
    If a near-duplicate has even one differing value (a timestamp, an id), the default `drop_duplicates()` will not catch it. Name the identity columns with `subset`.

!!! danger "keep=False removes the originals too"
    `keep=False` drops *every* row that is part of a duplicate group, including the first one. Use it only when all copies are suspect.

## Quick reference

| You want | Write |
| --- | --- |
| Flag repeated rows | `df.duplicated()` |
| Count repeats | `df.duplicated().sum()` |
| Remove repeats | `df.drop_duplicates()` |
| Dedupe on key columns | `df.drop_duplicates(subset=["email"])` |
| Keep newest per key | `df.sort_values("ts").drop_duplicates(subset=["k"], keep="last")` |
| Clean the index after | `... .reset_index(drop=True)` |

## Where this connects

!!! connect "A core cleaning step"
    - The leftover index gaps are fixed by [resetting the index](../indexing/reset-index.md).
    - "One row per key" is closely related to [GroupBy](../grouping/groupby.md), which instead *combines* the rows that share a key.
    - For look-alike but not identical text ("John" vs "john"), normalise first with the tools in [replacing values](replace.md).
    - To control *which* copy survives, [sort](../selection/sorting.md) first, then `drop_duplicates(keep="last")` keeps the newest.

!!! intuition "If you remember one thing"
    `drop_duplicates` compares whole rows by default. Tell it which columns define a duplicate with `subset`, and sort first when you care which copy survives.
