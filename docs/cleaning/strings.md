# String methods (the `.str` accessor)

!!! intuition "The gist"
    Text columns need text operations: lowercase them, trim spaces, check for a word, split them apart. You cannot call Python's `.lower()` on a whole column directly, so pandas gives you the `.str` accessor, which runs a string operation on **every value at once** and quietly leaves missing values alone. `column.str.lower()`, `column.str.contains("x")`, `column.str.split()`, and so on.

## Why it exists

Real text data is messy: stray spaces, mixed upper and lower case, two values combined in one field that you need to separate. Python has string methods for all of this (`.lower()`, `.strip()`, `.split()`), but those work on **one** string. A pandas column holds many strings, and writing a loop over them is slow and clumsy. The `.str` accessor applies a string method to the whole column in one expression.

Here is a small contacts table with the usual messiness.

```python
import pandas as pd

contacts = pd.DataFrame({
    "name":  [" Ana Ng ", "BEN LEE", "cara diaz"],
    "email": ["ana@shop.com", "ben@WORK.org", "cara@shop.com"],
    "phone": ["555-0101", "555-0102", "5550103"],
})
contacts
#         name          email     phone
# 0    Ana Ng    ana@shop.com  555-0101
# 1    BEN LEE   ben@WORK.org  555-0102
# 2  cara diaz  cara@shop.com   5550103
```

The names have inconsistent spacing and case, the emails mix case, and one phone number is missing its dashes. `.str` is how you fix and inspect all of that.

## Picture it

`.str.<method>` takes a string method and runs it on each value of the column, building a new column from the results. Missing values are skipped and stay missing. Watch `.str.lower()` on a small email column:

```text
email column                .str.lower() runs lower() on each value
  ana@SHOP.com                 ana@shop.com
  ben@WORK.org      -->         ben@work.org
  NaN                          NaN          (missing skipped, stays NaN)
  cara@Shop.com                cara@shop.com
```

It looks like one operation on the column, but under the hood it is one call per value, with the missing one left untouched. **In one line:** `.str` applies a per-value string operation across the whole column and passes missing values straight through.

## How it works

### Cleaning: strip, case, and chaining

The everyday cleanup methods mirror Python's own. `.str.strip()` removes surrounding spaces; `.str.lower()`, `.str.upper()`, and `.str.title()` fix case. You can **chain** them, each `.str` step feeding the next:

```python
contacts["name"].str.strip().str.title()
# 0       Ana Ng
# 1      Ben Lee
# 2    Cara Diaz
# Name: name, dtype: str
```

The names are now trimmed and consistently capitalised. Chaining reads left to right: strip the spaces, then title-case the result. Like other column operations, this returns a **new** Series, so assign it back (`contacts["name"] = ...`) to keep the change.

**In one line:** chain `.str` methods to clean text in steps, then assign the result back.

### Measuring: len

`.str.len()` gives the length of each string as a normal integer column:

```python
contacts["name"].str.len()
# 0    8
# 1    7
# 2    9
# Name: name, dtype: int64
```

(`" Ana Ng "` is 8 characters because the surrounding spaces count, a quick way to spot values that still need stripping.)

### Testing: contains, startswith, endswith

These return a **boolean** column, which is exactly what [boolean indexing](../selection/boolean-indexing.md) wants, so `.str` is how you filter rows by their text. `.str.contains` looks for a substring (or a regex pattern); `.str.startswith` and `.str.endswith` check the ends:

```python
contacts["email"].str.contains("shop")
# 0     True
# 1    False
# 2     True
# Name: email, dtype: bool

contacts["phone"].str.startswith("555-")
# 0     True
# 1     True
# 2    False
# Name: phone, dtype: bool
```

Drop either into `contacts[...]` to keep only the matching rows, for example `contacts[contacts["email"].str.contains("shop")]`.

??? question "Quick check: what comes back, and how do you use it?"
    You write `contacts["email"].str.contains("shop")`. What type of column does it return, and how would you get just the rows whose email contains "shop"?

    **Answer:** It returns a **boolean** Series (`True`/`False` per row). Feed it back into the frame as a filter: `contacts[contacts["email"].str.contains("shop")]`, which keeps the `True` rows. This is the standard pairing of `.str.contains` with [boolean indexing](../selection/boolean-indexing.md).

### Splitting into pieces

`.str.split(sep)` breaks each string on a separator. With `expand=True`, the pieces spread into **separate columns**, which is how you turn one combined field into several:

```python
contacts["name"].str.strip().str.split(" ", expand=True)
#       0     1
# 0   Ana    Ng
# 1   BEN   LEE
# 2  cara  diaz
```

Column 0 is the first name, column 1 the last. Without `expand=True` you would get a single column where each value is a *list* of pieces, which is harder to use; `expand=True` is almost always what you want.

### Extracting with a pattern: extract

When the part you want sits inside a larger string, `.str.extract` pulls it out using a regular expression, returning each capture group `( )` as a column. To grab the domain word from each email:

```python
contacts["email"].str.extract(r"@(\w+)\.")
#       0
# 0  shop
# 1  WORK
# 2  shop
```

The group `(\w+)` captures the run of word characters between `@` and the dot, so you get `shop`, `WORK`, `shop`. This is the tool for structured-but-embedded text that `split` cannot cleanly separate.

### Replacing inside strings

`.str.replace` swaps text **within** each string. By default it matches a **literal** substring (not a pattern), so you can strip punctuation safely:

```python
contacts["phone"].str.replace("-", "", regex=False)
# 0    5550101
# 1    5550102
# 2    5550103
# Name: phone, dtype: str
```

Pass `regex=True` to match a pattern instead of a literal. Note the difference from [`replace`](replace.md) without `.str`: plain `df.replace("a", "b")` swaps **whole values** that equal `"a"`, while `df["col"].str.replace("a", "b")` edits the matching part **inside** each string.

**In one line:** `.str.replace` edits substrings within each value (literal by default); plain `replace` swaps entire values.

### Slicing characters

`.str` also supports position slicing, so `.str[:3]` takes the first three characters of every value:

```python
contacts["phone"].str[:3]
# 0    555
# 1    555
# 2    555
# Name: phone, dtype: str
```

This is the vectorized version of `some_string[:3]`, applied to the whole column.

## Under the hood

!!! tip "New here? You have permission to skip this."
    "`.str` runs a string method on every value, skips missing ones, and returns a new column" is all you need. Come back here to see *how* it runs, which explains why it skips `NaN` for free and why it is handy but not as fast as plain number math.

**`.str` hands the work to the column's string array, which loops over the values.** When you write `contacts["email"].str.lower()`, the accessor passes the request to the underlying string array's own `_str_lower`. For the default string dtype in pandas 3.0 (which stores text as Python strings), that array runs a compiled routine (`map_infer_mask`) that walks the values and calls Python's `str.lower` on each one. Crucially, it is given a **mask** of which positions are missing, computed once with `isna`, and it simply does not call the function on those positions: it writes the missing marker straight through. That built-in mask is why `.str` propagates `NaN` for free, with no error and no special handling from you.

```text
.str.lower()  ->  array._str_lower  ->  loop with a missing-mask:
   "ana@SHOP.com"   not missing  -> call lower() -> "ana@shop.com"
   NaN              missing      -> skip,         -> NaN
   "cara@Shop.com"  not missing  -> call lower() -> "cara@shop.com"
```

So `.str` is, in effect, a built-in [`apply`](../transforming/apply.md) specialised for text: one call per value, in a compiled loop, with missing-value handling baked in. That is why it is far cleaner than writing the loop yourself, but, for the Python-backed string dtype, it still pays a per-value cost and is not as fast as pure numeric [vectorization](../selection/boolean-indexing.md). (If you install the optional `pyarrow`-backed string dtype, many `.str` operations instead run as compiled Arrow routines over the whole array, which is faster, but the surface you write is identical.)

## Gotchas

!!! warning "`.str` only works on text columns"
    Calling `.str` on a numeric column raises `AttributeError: Can only use .str accessor with string values`. If a column you expect to be text is numeric (or `object`), check its dtype first and convert with [`astype("str")`](change-dtypes.md) if needed.

!!! warning "It returns a new column: assign it back"
    `df["col"].str.strip()` does not change the column in place. Capture it (`df["col"] = df["col"].str.strip()`) or the cleanup is lost.

!!! warning "`str.replace` is literal by default; plain `replace` is whole-value"
    `df["c"].str.replace(".", "")` removes only real dots, because the default is `regex=False`. Pass `regex=True` for patterns. And do not confuse it with `df.replace(...)`, which swaps entire matching values, not substrings inside them.

!!! warning "Missing values stay missing"
    `.str` skips `NaN` and returns `NaN` there. That is usually helpful, but for a boolean test like `.str.contains`, decide what a missing value should count as and set it with the `na=` argument when it matters (for example `na=False` to treat missing as "no match" before filtering).

## Quick reference

| You want | Write |
| --- | --- |
| Trim surrounding spaces | `s.str.strip()` |
| Change case | `s.str.lower()` / `.upper()` / `.title()` |
| Length of each string | `s.str.len()` |
| Test for a substring | `s.str.contains("x")` |
| Test the start / end | `s.str.startswith("x")` / `.endswith("x")` |
| Split into columns | `s.str.split(" ", expand=True)` |
| Pull out a pattern | `s.str.extract(r"@(\w+)\.")` |
| Replace inside strings | `s.str.replace("-", "", regex=False)` |
| First N characters | `s.str[:n]` |

## Where this connects

!!! connect "Cleaning and selecting text"
    - `.str.contains`/`startswith` return boolean columns built for [boolean indexing](../selection/boolean-indexing.md), so `.str` is how you filter rows by text.
    - It sits beside the other cleaning tools: [`replace` and `map`](replace.md) swap whole values, while `.str.replace` edits inside them; [renaming columns](rename.md) fixes the headers rather than the data.
    - Cleaning text is often step one before [changing data types](change-dtypes.md): strip junk with `.str`, then convert to numbers or dates.
    - `.str` is a text-specialised, missing-aware [`apply`](../transforming/apply.md): cleaner and a little faster for strings, but still per-value, unlike pure numeric [vectorization](../selection/boolean-indexing.md).
    - `split(expand=True)` and `extract` create new columns, the same widening you do by hand when [building a DataFrame](../foundations/dataframe.md).

!!! intuition "If you remember one thing"
    `.str` is the toolbox for text columns: it runs a string method on every value, skips missing ones, and hands back a new column. Use it to clean (`strip`, `lower`), to test (`contains`), and to take apart (`split`, `extract`).
