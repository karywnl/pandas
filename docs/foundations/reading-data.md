# Reading and writing data

!!! intuition "The gist"
    `pd.read_csv("file.csv")` turns a file on disk into a DataFrame. `df.to_csv("file.csv")` writes one back out. Everything else in this guide assumed you already had a DataFrame; this is how you actually get one from real data.

## Why it exists

So far every example built a DataFrame from a Python dictionary. That is fine for learning, but real data does not arrive as a dictionary. It arrives as a **file**: a CSV exported from a spreadsheet, a database, or an API. `read_csv` is the front door to almost every real pandas session.

Think of a CSV as a flat cardboard box of text: rows of values separated by commas, with no idea what anything *means*. `read_csv` is the unpacker. It reads that text, works out a type for each column, and hands you a proper typed, labelled table.

## Picture it

```text
sales.csv  (plain text, commas separate the columns)
  order_id,date,amount,zip
  1,2024-01-05,250,02134
  2,2024-02-10,,90210
  3,2024-03-15,300,02134

        |  pd.read_csv("sales.csv")
        v

  +----------+------------+--------+-------+
  | order_id | date       | amount |  zip  |
  +----------+------------+--------+-------+
  |        1 | 2024-01-05 |  250.0 |  2134 |
  |        2 | 2024-02-10 |    NaN | 90210 |
  |        3 | 2024-03-15 |  300.0 |  2134 |
  +----------+------------+--------+-------+
     read_csv guessed a type for every column, and the guesses bite:
     amount became a float because one value was blank (blank -> NaN)
     zip became a number, so "02134" lost its leading zero -> 2134
```

That picture already shows why this chapter matters. A plain `read_csv` *guesses*, and the guesses can quietly corrupt your data.

**In one line:** `read_csv` reads a text file and guesses a type per column; your job is to correct the guesses it gets wrong.

## How it works

The simplest call just needs a path:

```python
import pandas as pd

df = pd.read_csv("sales.csv")
```

But the default guesses are exactly the bugs earlier chapters warned about. Compare a naive read with a careful one:

=== "Naive (let it guess)"

    ```python
    df = pd.read_csv("sales.csv")
    df.dtypes
    # order_id     int64
    # date         str        <- still text, not a real date
    # amount     float64
    # zip          int64      <- "02134" is now 2134
    ```

=== "Careful (tell it what you know)"

    ```python
    df = pd.read_csv(
        "sales.csv",
        dtype={"zip": str},       # keep leading zeros
        parse_dates=["date"],     # make 'date' a real datetime64
    )
    df.dtypes
    # order_id            int64
    # date       datetime64[us]
    # amount            float64
    # zip                   str   <- "02134" preserved
    ```

The four options you will reach for constantly:

```python
pd.read_csv("sales.csv", dtype={"zip": str})        # force a column's type
pd.read_csv("sales.csv", parse_dates=["date"])      # parse date columns
pd.read_csv("sales.csv", na_values=["missing", "-"])# treat these strings as NaN
pd.read_csv("sales.csv", index_col="order_id")      # use a column as the row index
pd.read_csv("sales.csv", usecols=["order_id", "amount"])  # read only some columns
```

### Writing it back out

```python
df.to_csv("clean.csv", index=False)
```

That `index=False` matters more than it looks (see the gotcha below).

??? question "Quick check: the round-trip"
    You run `df.to_csv("out.csv")` without `index=False`, then read it straight back with `pd.read_csv("out.csv")`. What is different about the table you get back?

    **Answer:** It has an extra leftmost column called **`Unnamed: 0`**. The row index was written out as a nameless first column, and on the way back in pandas had no name for it, so it became a junk data column. Writing with `index=False` avoids it.

??? question "Quick check: where did the zero go?"
    A `zip` column in your CSV holds `"02134"`. After a plain `pd.read_csv(...)`, `df["zip"]` shows `2134`. Why, and what is the fix?

    **Answer:** `read_csv` saw digits and guessed `int64`, and integers cannot carry a leading zero, so `02134` became `2134`. Fix it by telling pandas the column is text: `pd.read_csv(..., dtype={"zip": str})`.

## Under the hood

!!! tip "New here? You have permission to skip this."
    You can load data knowing only "pass a path, fix the types you care about". This explains *why* the guessing happens and how to control it.

When `read_csv` opens a file, every value is just text. To build typed columns, it **scans each column and infers a type**: all digits become `int64`, digits with a decimal or a blank become `float64`, recognisable dates stay text unless you ask for `parse_dates`, and everything else becomes `str`. This is the same inference described in [data types](dtypes.md), now happening at the file boundary.

The inference is fast but blind to *meaning*. It cannot know that `zip` is an identifier, not a quantity, or that `02134` is special. That is why **you** supply `dtype` for the columns where the guess would be wrong: identifiers, codes, phone numbers, anything with leading zeros or that you will never do maths on.

A blank cell becomes `NaN`, and because `NaN` is a float, a single blank turns an integer column into `float64`, the exact upcast from [missing values](../cleaning/missing-values.md). So `amount` arrived as a float purely because one row was empty.

## Gotchas

!!! danger "Use index=False when writing, or you get a junk column"
    `df.to_csv("out.csv")` writes the row index as an unnamed first column. Read that file back and pandas cannot name it, so you get a stray `Unnamed: 0` column:

    ```python
    df.to_csv("out.csv")              # first line: ,order_id,date,amount,zip
    pd.read_csv("out.csv").columns    # ['Unnamed: 0', 'order_id', ...]  <- junk
    ```

    Unless the index is meaningful, always write with `index=False`.

!!! warning "Identifiers lose leading zeros"
    Zip codes, account numbers, and product codes get read as integers and lose leading zeros. Pass `dtype={"id": str}` for any column that is a label rather than a number.

!!! warning "Check dtypes right after loading"
    The first thing to run after `read_csv` is `df.dtypes` (and `df.info()`), the [inspection](attributes.md) step. Catch a number-stored-as-text or a date-stored-as-text now, before it causes silent wrong results later.

## Other formats, same idea

CSV is the common case, but the pattern is identical for other sources. Each `read_*` has a matching `to_*`:

```python
pd.read_excel("book.xlsx")     # spreadsheets (needs the openpyxl package)
pd.read_parquet("data.parquet")# columnar, typed, fast; great for large data
pd.read_json("data.json")      # JSON arrays or records
pd.read_sql(query, connection) # straight from a database
```

Parquet is worth knowing: it stores dtypes inside the file, so you skip the guessing entirely and it loads far faster than CSV on big data.

## Quick reference

| You want | Write |
| --- | --- |
| Read a CSV | `pd.read_csv("f.csv")` |
| Keep leading zeros / force a type | `pd.read_csv("f.csv", dtype={"zip": str})` |
| Parse date columns | `pd.read_csv("f.csv", parse_dates=["date"])` |
| Treat strings as missing | `pd.read_csv("f.csv", na_values=["N/A"])` |
| Use a column as the index | `pd.read_csv("f.csv", index_col="id")` |
| Read only some columns | `pd.read_csv("f.csv", usecols=["a", "b"])` |
| Write a CSV (no junk column) | `df.to_csv("f.csv", index=False)` |

## Where this connects

!!! connect "The front door to every other chapter"
    - The type guessing here is the [data types](dtypes.md) inference, happening as the file loads. `dtype=` is how you override it at the door.
    - Blank cells become `NaN`, so a fresh file usually goes straight to [handling missing values](../cleaning/missing-values.md).
    - `parse_dates` produces the `datetime64` columns you then slice and group, see [setting the index](../indexing/set-index.md) and [changing data types](../cleaning/change-dtypes.md).
    - Right after loading, run the [inspection](attributes.md) workflow to confirm the read did what you expected.

!!! intuition "If you remember one thing"
    `read_csv` is the unpacker: it turns a flat text file into a typed table, guessing a type for each column. The guesses are often wrong for identifiers and dates, so pass `dtype` and `parse_dates` to fix them, and write back with `index=False`.
