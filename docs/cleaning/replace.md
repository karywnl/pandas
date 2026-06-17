# Replacing values

!!! intuition "The gist"
    `replace` swaps values for other values: one for one, many for one, or by pattern. `map` remaps a whole column from a dictionary. `where` and `mask` swap values based on a condition. Together they standardise messy data.

## Why it exists

Raw data is full of placeholders and codes that need fixing before analysis: `"N/A"` strings that should be missing, single-letter codes like `"M"` and `"F"`, negative numbers that should be clipped to zero. Pretend you have survey responses.

```python
import pandas as pd

survey = pd.DataFrame({
    "gender": ["M", "F", "U"],
    "score":  [1, -1, 2],
})
```

## How it works

### replace: swap known values

```python
survey.replace("U", None)                          # one value, everywhere
survey.replace({"M": "Male", "F": "Female"})       # several at once
survey.replace({"gender": {"M": "Male"}})          # only in one column (nested dict)
```

`replace` leaves anything it does not mention untouched, which is the key difference from `map`.

### map: remap an entire column

`map` rebuilds a column from a dictionary, and anything not in the dictionary becomes `NaN`.

```python
survey["gender"].map({"M": "Male", "F": "Female"})
# ["Male", "Female", NaN]    <- "U" was not in the dict, so it becomes NaN
```

That `NaN` behaviour is the whole difference: `replace` keeps unknowns as-is, `map` blanks them out. Choose by which you want.

**In one line:** `replace` keeps unlisted values, `map` turns unlisted values into `NaN`.

### where and mask: swap by condition

These two are mirror images, and the names are genuinely confusing, so here is the trick: **`where` keeps where the condition is true**; **`mask` replaces where the condition is true**.

```python
survey["score"].where(survey["score"] > 0, 0)   # keep positives, others -> 0  => [1, 0, 2]
survey["score"].mask(survey["score"] < 0, 0)    # replace negatives with 0     => [1, 0, 2]
```

### clip: bound values to a range

For the common "floor and ceiling" case, `clip` is cleaner than either.

```python
survey["score"].clip(lower=0)            # nothing below 0 -> [1, 0, 2]
survey["score"].clip(lower=0, upper=10)  # squeeze into [0, 10]
```

??? question "Quick check: replace or map?"
    You remap `gender` with `{"M": "Male", "F": "Female"}`. What happens to the `"U"` value under `replace` versus under `map`?

    **Answer:** With `replace`, `"U"` stays `"U"` (unmentioned values are untouched). With `map`, `"U"` becomes `NaN` (anything not in the dictionary is blanked). Pick based on whether you want unknowns preserved or flagged.

## Under the hood

!!! tip "New here? You have permission to skip this."
    The four tools above handle almost everything. Two notes on power and speed.

**Regex for patterns.** With `regex=True`, `replace` matches patterns, not just exact strings, which is how you strip junk: `df.replace(r"[\$,]", "", regex=True)` removes dollar signs and commas. Without the flag, the pattern is treated literally.

**Speed order.** Exact `map` from a dict is fastest (hash lookup). Plain `replace` is fast. Regex `replace` is slower (it runs the regex engine per value). A Python `apply(lambda ...)` is slowest of all, so reach for the vectorised options first.

## Gotchas

!!! warning "Replacements apply all at once"
    In a single `replace({"A": "B", "B": "C"})`, pandas does not chain them. `"A"` becomes `"B"`, not `"C"`. The swaps happen simultaneously, not in sequence.

!!! warning "Types must match"
    `replace(0, np.nan)` does not touch the string `"0"`, and vice versa. Match the value's actual type, which you can confirm with [dtypes](../foundations/dtypes.md).

## Quick reference

| You want | Write |
| --- | --- |
| Swap a value everywhere | `df.replace("old", "new")` |
| Several swaps | `df.replace({"a": 1, "b": 2})` |
| Swaps in one column | `df.replace({"col": {"a": 1}})` |
| Remap a column (unknowns -> NaN) | `s.map({...})` |
| Pattern replace | `df.replace(r"...", "", regex=True)` |
| Keep-if / replace-if | `s.where(cond, other)` / `s.mask(cond, other)` |
| Floor and ceiling | `s.clip(lower=0, upper=100)` |

## Where this connects

!!! connect "Standardising values"
    - Replacing `"N/A"`-style placeholders with `NaN` feeds straight into [handling missing values](missing-values.md).
    - `where` and `mask` are condition-driven, the same boolean logic as [boolean indexing](../selection/boolean-indexing.md).
    - Cleaning currency and code strings is the first half of [changing data types](change-dtypes.md), where you then convert the cleaned text to numbers.

!!! intuition "If you remember one thing"
    `replace` keeps what you do not mention, `map` blanks it. `where` keeps where true, `mask` replaces where true. And `clip` is the quick way to bound a range.
