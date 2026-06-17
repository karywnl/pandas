# Renaming columns

!!! intuition "The gist"
    `df.rename(columns={"old": "new"})` renames specific columns by mapping old names to new ones. To clean *every* name at once (lowercase, strip spaces), run a string operation over `df.columns`.

## Why it exists

Raw data arrives with awful column names: `"First Name"`, `"AGE "` with a trailing space, `"Unnamed: 3"`. Names with spaces force you into bracket notation forever and break dot access, and inconsistent casing causes joins to silently miss. Cleaning names early saves pain for the whole rest of the pipeline.

```python
import pandas as pd

df = pd.DataFrame({"First Name": ["Ana"], "AGE ": [25]})
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
# "First Name" -> "first_name",  "AGE " -> "age"
```

This is the workhorse for standardising a whole messy header row: trim whitespace, lowercase, turn spaces into underscores.

### Other handy moves

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
    The two tools above (dict for specific, `.str` for all) cover everything. One reliability tip.

`rename` **silently ignores** old names that do not exist, so a typo in the key does nothing and raises no error, which can leave you puzzled when a rename "did not work". Pass `errors="raise"` to make a missing key complain instead. And remember it returns a new frame: without reassignment or `inplace=True`, the rename is lost.

A good naming convention pays off everywhere: `snake_case`, all lowercase, no spaces, descriptive. It avoids quoting, dodges case-sensitivity bugs in joins, and keeps dot access from breaking.

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
