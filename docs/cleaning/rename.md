# Renaming columns

!!! intuition "The gist"
    `df.rename(columns={"old": "new"})` renames specific columns by mapping old names to new ones. To clean *every* name at once (lowercase, strip spaces), run a string operation over `df.columns`.

## Why it exists

Raw data arrives with awful column names: `"First Name"`, `"AGE "` with a trailing space, `"Unnamed: 3"`. Names with spaces force you into bracket notation forever and break dot access, and inconsistent casing causes joins to silently miss. Cleaning names early saves trouble for the whole rest of the pipeline.

```python
import pandas as pd

df = pd.DataFrame({"First Name": ["Ana"], "AGE ": [25]})

df.columns
# Index(['First Name', 'AGE '], dtype='str')   <- a space inside one, a trailing space on the other
```

## How it works

### Rename specific columns

```python
df.rename(columns={"First Name": "first_name"})
# only the listed columns change; everything else is untouched
```

Columns not in the dictionary are left alone. By default `rename` returns a new frame, so reassign it.

**In one line:** pass a `{old: new}` map to `rename(columns=...)` to fix named columns.

### Clean every name at once

Because `df.columns` is an Index, it has a `.str` accessor, so you can transform all names in one chain.

```python
df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
df.columns
# Index(['first_name', 'age'], dtype='str')
```

Both names are fixed in one line: `"First Name"` became `first_name` and `"AGE "` lost its trailing space and became `age`. This is the main tool for cleaning a whole messy header row: trim whitespace, lowercase, turn spaces into underscores.

### Other useful operations

```python
df.columns = ["id", "age"]          # replace all names (list must match width exactly)
df.add_prefix("raw_")               # "age" -> "raw_age"
df.add_suffix("_2024")              # "age" -> "age_2024"
```

Prefixes and suffixes are great for tagging columns before a merge so you can tell two sources apart.

??? question "Quick check: what changes?"
    After `df.rename(columns={"First Name": "first_name"})`, what is the second column still called?

    **Answer:** Still `"AGE "`, with its trailing space. `rename` only touches the columns you name in the dictionary; it leaves the rest exactly as they were.

## Under the hood

!!! tip "New here? You have permission to skip this."
    The two tools above (dict for specific, `.str` for all) cover everything. This explains *how* `rename` rebuilds the labels, which is why a typo passes silently and why you must reassign.

**How `rename` rebuilds the labels.** `rename` does not edit the existing column labels in place. It builds a **new** list of labels by passing every current label through your map one by one: if a label is a key in the dict, it is swapped for the new value; if it is **not** in the dict, it passes through unchanged. It then returns a new frame that points at the same underlying data but carries the new labels.

```text
  current columns:  "First Name"   "AGE "      "city"
  your map:         {"First Name": "first_name"}
                         |            |            |
  pass each through:  in map        not in map   not in map
                         v            v            v
  new columns:      "first_name"    "AGE "      "city"
```

Two behaviors follow from "every label is passed through, matched or not":

- **A typo in a key is silently ignored.** If you write `{"frist_name": ...}`, that key matches no current label, so nothing is swapped and no error is raised, which looks like the rename "did nothing". Pass `errors="raise"` to make an unmatched key complain instead.
- **You must capture the result.** Because `rename` returns a **new** frame rather than changing the original, the rename is lost unless you reassign it (`df = df.rename(...)`).

A good naming convention helps everywhere: `snake_case`, all lowercase, no spaces, descriptive. It avoids quoting, avoids case-sensitivity bugs in joins, and keeps dot access from breaking.

## Gotchas

!!! warning "rename returns a new frame"
    `df.rename(columns={...})` with no reassignment does nothing visible. Use `df = df.rename(...)`.

!!! warning "Replacing all names needs the exact count"
    `df.columns = [...]` requires the list to be exactly as long as the number of columns, or it raises `ValueError`.

## Quick reference

| You want | Write |
| --- | --- |
| Rename specific columns | `df.rename(columns={"old": "new"})` |
| Catch typos in old names | `df.rename(columns={...}, errors="raise")` |
| Lowercase, de-space all | `df.columns = df.columns.str.lower().str.replace(" ", "_")` |
| Strip whitespace | `df.columns = df.columns.str.strip()` |
| Replace all names | `df.columns = [...]` |
| Tag for a merge | `df.add_prefix("a_")` / `df.add_suffix("_x")` |

## Where this connects

!!! connect "Tidy names, tidy pipeline"
    - Clean `snake_case` names make [column selection](../selection/column-selection.md) and dot access safe.
    - The same `.str` accessor cleans *values*, the subject of [replacing values](replace.md).
    - Renaming fits naturally into a [method chain](../selection/loc-iloc.md) of cleaning steps.

!!! intuition "If you remember one thing"
    Use a `{old: new}` dict for a few columns, and `df.columns.str.lower().str.replace(" ", "_")` to standardise the whole header at once. Always reassign the result.
