# Boolean indexing

!!! intuition "The gist"
    Boolean indexing means **keep the rows where a condition is true**. You write a condition, pandas turns it into a column of `True` and `False` values (a "mask"), and `df[mask]` hands you back only the `True` rows. No loops, no fuss.

## Why it exists

Suppose you have a table of films and you want only the great ones, say rating above 8.6. In plain Python you would write a loop: go row by row, check the rating, collect the ones that pass. That is slow to write, slow to run, and easy to get wrong.

Pandas does this with one idea. You write the condition once, for example `rating > 8.6`. Pandas checks it against every row and builds a column of `True` and `False` values, one per row. This column is called the **mask**. Then `df[mask]` keeps only the rows where the mask is `True`. You write the rule once, and pandas applies it to every row at C speed.

Here is a real table to work with.

```python
import pandas as pd
import numpy as np

movies = pd.DataFrame({
    "title":  ["The Matrix", "The Dark Knight", "Interstellar", "Parasite", "Inception", "Tenet"],
    "year":   [1999, 2008, 2014, 2019, 2010, 2020],
    "rating": [8.7, 9.0, 8.6, 8.4, 8.8, np.nan],   # Tenet is not rated yet
    "genre":  ["Sci-Fi", "Action", "Sci-Fi", "Thriller", "Sci-Fi", "Sci-Fi"],
})
```

## Picture it

Here pandas applies the rule `rating > 8.6` to every row. The right hand column is the **mask**, and it decides which rows stay.

```text
 +-----------------+------+--------+----------+
 | title           | year | rating | genre    |   rating > 8.6 ?
 +-----------------+------+--------+----------+
 | The Matrix      | 1999 |  8.7   | Sci-Fi   |   True   -> keep
 | The Dark Knight | 2008 |  9.0   | Action   |   True   -> keep
 | Interstellar    | 2014 |  8.6   | Sci-Fi   |   False  -> drop
 | Parasite        | 2019 |  8.4   | Thriller |   False  -> drop
 | Inception       | 2010 |  8.8   | Sci-Fi   |   True   -> keep
 | Tenet           | 2020 |  NaN   | Sci-Fi   |   False  -> drop   (NaN is never > anything)
 +-----------------+------+--------+----------+
```

Notice Tenet already. A missing rating produces `False`, so that row is left out. Remember this, it is the single most surprising part of this whole topic, and we come back to it.

**In one line:** a condition becomes a column of `True`/`False`, and `df[mask]` keeps the `True` rows.

## How it works

It is always two steps, even when you write them on one line.

**Step 1, build the mask.** Compare a column to a value and you get a boolean Series, one `True`/`False` per row.

```python
mask = movies["rating"] > 8.6
# 0     True
# 1     True
# 2    False
# 3    False
# 4     True
# 5    False
# Name: rating, dtype: bool
```

**Step 2, apply the mask.** Hand it to the DataFrame in square brackets.

```python
movies[mask]
# keeps The Matrix, The Dark Knight, Inception
```

Most of the time you skip the variable and write it in one line: `movies[movies["rating"] > 8.6]`.

### The comparison operators

Every standard comparison builds a mask. These are the rules you can use.

| Operator | Means | Example |
| --- | --- | --- |
| `==` | equal | `movies["genre"] == "Sci-Fi"` |
| `!=` | not equal | `movies["genre"] != "Action"` |
| `>` | greater than | `movies["rating"] > 8.6` |
| `>=` | greater or equal | `movies["year"] >= 2010` |
| `<` | less than | `movies["rating"] < 8.5` |
| `<=` | less or equal | `movies["year"] <= 2008` |

For text, `==` checks exact matches. For "contains this word" or "starts with", you use `.str.contains()` and similar methods, which are covered in the strings chapter.

### Combining rules with `&`, `|`, and `~`

One rule is rarely enough. To combine masks you use **`&` for and, `|` for or, `~` for not**, and every individual condition must be wrapped in its own parentheses.

```python
# AND: Sci-Fi films rated above 8.6
movies[(movies["rating"] > 8.6) & (movies["genre"] == "Sci-Fi")]
# -> The Matrix, Inception

# OR: anything old, or anything brilliant
movies[(movies["year"] < 2005) | (movies["rating"] > 8.7)]
# -> The Matrix, The Dark Knight, Inception

# NOT: everything that is not Sci-Fi
movies[~(movies["genre"] == "Sci-Fi")]
# -> The Dark Knight, Parasite
```

Those parentheses are not optional, and the reason is genuinely surprising. We pull it apart in [Under the hood](#why-and-not-and). For now, just always wrap each condition.

??? question "Quick check: predict it"
    What does `movies[(movies["genre"] == "Sci-Fi") & (movies["year"] < 2015)]` return?

    **Answer:** The Sci-Fi films from before 2015: **The Matrix** (1999), **Interstellar** (2014), and **Inception** (2010). Tenet is Sci-Fi but from 2020, so it fails the second rule and is dropped.

### Shortcuts: `isin` and `between`

Two helpers save you from ugly chains of `|` and `&`.

`isin` checks membership in a list. Instead of `(genre == "Action") | (genre == "Thriller")`:

```python
movies[movies["genre"].isin(["Action", "Thriller"])]
# -> The Dark Knight, Parasite
```

`between` checks a range, inclusive on both ends by default. Instead of `(rating >= 8.5) & (rating <= 8.8)`:

```python
movies[movies["rating"].between(8.5, 8.8)]
# -> The Matrix, Interstellar, Inception
```

You can change which ends count with `inclusive="left"`, `"right"`, `"both"`, or `"neither"`.

### `query`: the same thing in words

When a filter gets long, the repeated `movies[...]` gets noisy. `query` lets you write the condition as a plain string.

```python
movies.query("rating > 8.6 and genre == 'Sci-Fi'")
# -> The Matrix, Inception
```

Inside a `query` string you use the ordinary words `and`, `or`, `not` (not the symbols), and you do not repeat the DataFrame name. To pull in a normal Python variable, prefix it with `@`:

```python
threshold = 8.6
movies.query("rating > @threshold")
# -> The Matrix, The Dark Knight, Inception
```

`query` is lovely for readability. The bracket-and-mask form is more flexible and is what you will see most, so know both.

### Filtering rows and picking columns at once

Drop the mask straight into `loc` and you get the chapter-one superpower: chosen rows, chosen columns, one expression.

```python
movies.loc[movies["rating"] > 8.6, ["title", "rating"]]
#              title  rating
#         The Matrix     8.7
#    The Dark Knight     9.0
#          Inception     8.8
```

This is the cleanest way to say "these rows, just these columns". It is the same `loc` from [loc and iloc](loc-iloc.md), simply fed a mask instead of labels.

**In one line:** build masks with comparisons, combine them with `& | ~` (each in parentheses), and use `isin`, `between`, or `query` to stay readable.

## Under the hood

Three things are worth understanding deeply here: why this is so fast, why the operators are so strict, and why missing data disappears.

!!! tip "New here? You have permission to skip this."
    You can filter perfectly well knowing only "build a mask, combine with `& | ~` in parentheses". Everything below is the *why*. If that is enough for now, jump to the [cheat sheet](#quick-reference) and come back when something surprises you.

### Why it is fast: vectorization

When you write `movies["rating"] > 8.6`, pandas does not loop in Python. The rating column is stored as one tight block of numbers (a NumPy array), and the comparison runs as a single operation in compiled C code that walks the whole block at once. This is called **vectorization**. A Python loop makes the interpreter do a little extra work on every single element; the vectorized version pays that cost only once. On a million rows the vectorized check finishes almost instantly, while the plain Python loop can take a long time.

The mask it produces is cheap too: one byte per row. A million-row mask is about a megabyte, so combining and reusing masks costs almost nothing.

### Why it is `&` and not `and` { #why-and-not-and }

This is the mistake almost everyone makes once. Two separate rules are at work.

**Rule one: `and` does not work on Series.** Python's `and` and `or` are built into the language, and pandas is not allowed to redefine what they mean. When Python evaluates `series_a and series_b`, it tries to ask "is `series_a` true?", which forces a whole Series into a single yes or no. A Series of six values is neither, so pandas refuses:

```python
movies[(movies["rating"] > 8.6) and (movies["genre"] == "Sci-Fi")]
# ValueError: The truth value of a Series is ambiguous.
```

Pandas *can* redefine the bitwise operators `&`, `|`, `~`, so those are the ones wired up to work element by element. That is why you use them.

**Rule two: `&` binds tighter than `>`.** Here is why the parentheses are mandatory. In Python, `&` has higher precedence than the comparison operators. So if you drop the parentheses:

```python
movies[movies["rating"] > 8.6 & movies["genre"] == "Sci-Fi"]
# TypeError: unsupported operand type(s) for &: 'float' and 'StringArray'
```

Python reads that as `movies["rating"] > (8.6 & movies["genre"]) == "Sci-Fi"`. It tries to compute `8.6 & "Sci-Fi"` first, which is nonsense, and raises an error. Wrapping each condition in parentheses forces the comparisons to happen first, then the `&` joins two clean masks.

??? question "Quick check: spot the bug"
    A teammate writes `movies[movies["year"] > 2010 and movies["genre"] == "Sci-Fi"]` and gets an error. Which error, and what is the fix?

    **Answer:** A `ValueError` about the truth value of a Series being ambiguous, because `and` cannot operate on a whole Series. The fix is `movies[(movies["year"] > 2010) & (movies["genre"] == "Sci-Fi")]`: swap `and` for `&` and wrap each side in parentheses.

### Masks line up by label, not by position

A mask is a Series, and a Series carries an index. When you filter, pandas matches the mask to the DataFrame **by index label**, not by position. If you build the mask from the same DataFrame (the normal case), the labels match perfectly and you never think about it.

But if you pass a mask whose index is in a different order, pandas realigns it by label and even warns you:

```python
df = pd.DataFrame({"v": [10, 20, 30, 40]}, index=["a", "b", "c", "d"])
other = pd.Series([True, False, True, False], index=["d", "c", "b", "a"])

df[other]
# UserWarning: Boolean Series key will be reindexed to match DataFrame index.
# keeps rows 'b' and 'd'  (matched by label, not by the order you wrote)
```

A plain NumPy array has no index, so it is matched by **position** instead, and it must be exactly the right length or you get `ValueError: Item wrong length`. The takeaway: build your mask from the same frame you are filtering, and these surprises never happen.

### Why missing data disappears

Back to Tenet. In floating-point math, `NaN` (the missing value marker) is defined to compare as `False` against everything, even against itself. `NaN > 8.6` is `False`, `NaN < 8.6` is `False`, `NaN == NaN` is `False`. So **any** comparison filter silently drops the missing rows.

```python
movies[movies["rating"] > 0]
# keeps 5 rows. Tenet is gone, even though every real rating is above 0.
```

That silence is the danger. You asked for "rating above zero", which sounds like "basically everyone", and pandas quietly removed the unrated film. When you care about the missing rows, name them explicitly with `isna` and `notna`:

```python
movies[movies["rating"].isna()]    # only Tenet
movies[movies["rating"].notna()]   # everyone with a rating

# keep the high-rated films AND the not-yet-rated ones
movies[(movies["rating"] > 8.6) | (movies["rating"].isna())]
# -> The Matrix, The Dark Knight, Inception, Tenet
```

??? question "Quick check: where did it go?"
    `movies` has 6 films. How many rows does `movies[movies["rating"] < 9.0]` return, and which film is missing for a subtle reason?

    **Answer:** **Four:** The Matrix, Interstellar, Parasite, Inception. The Dark Knight is out because 9.0 is not less than 9.0. And **Tenet** is out for the subtle reason: its rating is `NaN`, and `NaN < 9.0` is `False`, so it was silently dropped.

## Gotchas

!!! danger "Use `&` `|` `~`, never `and` `or` `not`, and parenthesize every condition"
    `df[(a > 1) & (b < 2)]` is correct. `df[a > 1 and b < 2]` raises a `ValueError`, and `df[a > 1 & b < 2]` raises a `TypeError` from the precedence trap. When in doubt, more parentheses.

!!! warning "Comparison filters silently drop NaN"
    Any `>`, `<`, `==` style filter quietly removes missing values, because `NaN` compares `False` to everything. If missing rows matter, add `| df['col'].isna()` or handle them on purpose.

!!! danger "Do not assign through a chained filter"
    `movies[movies["rating"] > 8.6]["rating"] = 9.9` writes into a throwaway object, so it fails (in pandas 3.0 it raises a `ChainedAssignmentError` and changes nothing). Assign with one `loc` call instead: `movies.loc[movies["rating"] > 8.6, "rating"] = 9.9`. This is the same one-`loc` rule from [loc and iloc](loc-iloc.md#views-copies-and-the-famous-warning).

## Quick reference

| You want | Write |
| --- | --- |
| Rows where a condition holds | `df[df["col"] > x]` |
| Build a reusable mask | `mask = df["col"] > x` then `df[mask]` |
| AND / OR / NOT | `df[(a) & (b)]` / `df[(a) \| (b)]` / `df[~(a)]` |
| Is one of several values | `df[df["col"].isin([...])]` |
| In a range (inclusive) | `df[df["col"].between(lo, hi)]` |
| Readable string filter | `df.query("col > @x and other == 'y'")` |
| Rows and specific columns | `df.loc[mask, ["a", "b"]]` |
| Only missing / only present | `df[df["col"].isna()]` / `df[df["col"].notna()]` |
| Keep matches and missing | `df[(cond) \| df["col"].isna()]` |
| Assign to matching rows | `df.loc[mask, "col"] = value` |

## Where this connects

!!! connect "Boolean indexing reaches into the rest of pandas like this"
    - **loc and iloc**: a mask is exactly what `loc` wants for its row selector. `df[mask]` filters rows; `df.loc[mask, cols]` filters rows and picks columns in one move. Boolean indexing is really [loc](loc-iloc.md) fed `True`/`False`.
    - [**Handling missing values**](../cleaning/missing-values.md): the silent-`NaN`-drop here is the same `NaN` behaviour you will manage with `isna`, `fillna`, and `dropna`. Filtering and missing data are two sides of one coin.
    - **The chained-assignment rule** from [loc and iloc](loc-iloc.md#views-copies-and-the-famous-warning) shows up the instant you try to *change* the rows a mask selects. Always assign through one `loc`.
    - [**GroupBy**](../grouping/groupby.md) later uses this exact idea to keep or drop whole groups with `filter`.

!!! intuition "If you remember one thing"
    Write the rule, and pandas applies it to every row. A condition becomes a column of `True`/`False`, and `df[mask]` keeps the `True` rows. Combine rules with `&`, `|`, `~` (each in its own parentheses), and remember that missing values are always left out.
