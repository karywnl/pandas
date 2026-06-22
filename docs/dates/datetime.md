# Dates and times (the `.dt` accessor)

!!! intuition "The gist"
    Dates usually arrive as **text**, and text cannot do date maths or know what month it is in. `pd.to_datetime()` turns those strings into real datetime values. Once converted, `.dt` pulls out parts (`.dt.year`, `.dt.month`, `.dt.day_name()`), a **datetime index** lets you slice by date like `df.loc["2024-02"]`, and `resample()` groups rows into time buckets like months.

## Why it exists

A column of dates stored as text is almost useless for analysis. `"2024-02-10"` is just characters: you cannot ask for its month, you cannot sort it as time (text sorts character by character, so `"2024-1-5"` would land in the wrong place), and you cannot group by week or quarter. The fix is to convert the text into a real **datetime** type, after which pandas understands it as a moment in time.

Here is a small orders table with dates that came in as strings.

```python
import pandas as pd

orders = pd.DataFrame({
    "order_date": ["2024-01-05", "2024-01-20", "2024-02-10", "2024-02-28", "2024-03-15"],
    "amount": [120, 80, 200, 50, 90],
})

orders
#    order_date  amount
# 0  2024-01-05     120
# 1  2024-01-20      80
# 2  2024-02-10     200
# 3  2024-02-28      50
# 4  2024-03-15      90

orders["order_date"].dtype
# str    <- still plain text, not dates yet
```

Until that `order_date` column is real datetime, every time-based question is blocked. Converting it is the first move.

## Picture it

`pd.to_datetime` reads each text date and stores it as a real datetime value. Internally each one becomes a single number: a count of time units since a fixed starting point (1970-01-01). That is what lets pandas do date maths and comparisons quickly.

```text
order_date as text          to_datetime          datetime64 column
  "2024-01-05"                                     2024-01-05
  "2024-01-20"        -->                          2024-01-20
  "2024-02-10"                                     2024-02-10

text: sorts character by           each date is stored as one integer
character, no month, no            (microseconds since 1970-01-01), so
time maths                         sorting and date maths are just numbers
```

**In one line:** `to_datetime` converts date text into real datetime values stored as numbers, unlocking sorting, date parts, slicing, and time grouping.

## How it works

### Convert with to_datetime

`pd.to_datetime` parses a column of date strings into the datetime type. Assign it back to replace the text column:

```python
orders["order_date"] = pd.to_datetime(orders["order_date"])
orders["order_date"].dtype
# datetime64[us]
```

The dtype is now `datetime64[us]`, pandas' datetime type (the `us` means it keeps time to the microsecond in pandas 3.0). It reads common formats automatically. For an unusual or ambiguous layout, pass `format=` to say exactly how to read it (for example `format="%d/%m/%Y"` for day-first dates), and pass `errors="coerce"` to turn anything unparseable into `NaT` (the datetime version of `NaN`) instead of raising.

**In one line:** `pd.to_datetime(col)` turns date text into the `datetime64` type; add `format=` for odd layouts and `errors="coerce"` for messy data.

### Pull out parts with .dt

Once a column is datetime, the `.dt` accessor exposes its pieces, the same idea as [`.str`](../cleaning/strings.md) for text. Attributes like `.dt.year` and `.dt.month` return numbers; methods like `.dt.day_name()` need parentheses:

```python
orders["order_date"].dt.month
# 0    1
# 1    1
# 2    2
# 3    2
# 4    3
# Name: order_date, dtype: int32

orders["order_date"].dt.day_name()
# 0       Friday
# 1     Saturday
# 2     Saturday
# 3    Wednesday
# 4       Friday
# Name: order_date, dtype: str
```

Common pieces: `.dt.year`, `.dt.month`, `.dt.day`, `.dt.hour`, `.dt.quarter`, `.dt.dayofweek` (Monday is 0), and `.dt.day_name()`. These create ordinary columns you can then group by or filter on, for example "total sales per month" is `orders.groupby(orders["order_date"].dt.month)["amount"].sum()`.

??? question "Quick check: attribute or method?"
    To get the month number you write `s.dt.month` (no parentheses), but to get the weekday name you write `s.dt.day_name()` (with parentheses). Why the difference?

    **Answer:** `.dt.month` is an **attribute**: the month is stored information, read directly. `.dt.day_name()` is a **method**: pandas has to compute the name, and computing needs a call, so it takes `()`. If you forget and write `s.dt.day_name` you get the method object, not the names.

### Filter by date

Because datetime values compare as real time, you can filter with normal comparisons, building a [boolean mask](../selection/boolean-indexing.md):

```python
orders[orders["order_date"] >= "2024-02-01"]
#   order_date  amount
# 2 2024-02-10     200
# 3 2024-02-28      50
# 4 2024-03-15      90
```

pandas reads the string `"2024-02-01"` as a date for the comparison, so this keeps every order from February onward. This only works because the column is real datetime; on text it would compare character by character and give wrong answers.

### A datetime index enables date slicing

Set the datetime column as the [index](../indexing/set-index.md) and pandas lets you select by date with `loc`, including **partial** dates. `"2024-02"` means "all of February":

```python
ts = orders.set_index("order_date")
ts.loc["2024-02"]
#             amount
# order_date
# 2024-02-10     200
# 2024-02-28      50
```

A range works too, and both ends are included (the same inclusive `loc` slicing from [loc and iloc](../selection/loc-iloc.md)):

```python
ts.loc["2024-01":"2024-02"]
#             amount
# order_date
# 2024-01-05     120
# 2024-01-20      80
# 2024-02-10     200
# 2024-02-28      50
```

This partial-string selection is one of the biggest payoffs of converting to datetime.

### Group into time buckets with resample

`resample` is [GroupBy](../grouping/groupby.md) for time: it gathers rows into regular time bins (months, weeks, days) and aggregates each bin. It needs a datetime index. To total sales per month, use `"ME"` (month end) and `sum`:

```python
ts.resample("ME").sum()
#             amount
# order_date
# 2024-01-31     200     <- Jan: 120 + 80
# 2024-02-29     250     <- Feb: 200 + 50
# 2024-03-31      90
```

Each row is one month, labelled by its last day, holding that month's total. Use `"MS"` to label by the month's first day instead, `"W"` for weeks, `"D"` for days, `"YE"` for years. The frequency codes changed in pandas 3.0: the old `"M"` now raises an error, so use `"ME"` or `"MS"`.

**In one line:** `df.resample("ME").sum()` is a time GroupBy: it buckets a datetime-indexed frame into months and aggregates each one.

## Under the hood

!!! tip "New here? You have permission to skip this."
    "Convert with `to_datetime`, pull parts with `.dt`, slice with a datetime index, bucket with `resample`" is the whole chapter. Come back here to see *how* a date is stored, which explains why date maths is fast and why partial-string slicing works.

**A datetime is just an integer.** A `datetime64` value is not stored as text or as separate year/month/day fields. It is a single 64-bit integer counting fixed time units from one reference moment, the **epoch**, which is 1970-01-01 00:00:00. In pandas 3.0 the unit is microseconds (`datetime64[us]`), so `1970-01-02` is stored as `86400000000` (the microseconds in one day) and `1970-01-01` is `0`. Because every date is one integer:

```text
  "2024-01-05"  --to_datetime-->  a single integer: microseconds since 1970-01-01
  date - date   ->  integer - integer   (a duration, fast)
  date < date   ->  integer < integer   (an instant comparison)
  .dt.month     ->  arithmetic on that integer, for every value, in fast C
```

comparing or subtracting two dates is just comparing or subtracting two integers, which is why it is fast and vectorized, and why `.dt` extractions run over the whole column without a Python loop. Converting text to this integer form once, with `to_datetime`, is what makes all of it possible. This is the datetime side of the [dtypes](../foundations/dtypes.md) story: the right type is what decides what a column can do.

**Why partial-string slicing works.** When the index is datetime, pandas knows its resolution, so it can read `"2024-02"` as the *range* from the first instant of February to the last and return everything inside it. On a plain text index, `"2024-02"` would have to match a label exactly. The datetime index turns a partial date into a time range automatically. `resample` builds on the same idea: it works out the bin edges (each month boundary as an integer) and groups rows by which bin their integer falls into, then aggregates, exactly like a [GroupBy](../grouping/groupby.md) whose key is "which time bucket".

## Gotchas

!!! danger "Convert before you do anything time-based"
    On a **text** column, `>=` and sorting compare character by character, so `"2024-02-10"` versus `"2024-1-5"` can order wrongly, and `.dt` does not exist at all. Always `to_datetime` first. A column that looks like dates but has dtype `str` (plain text) is the usual cause of "my date filter returns the wrong rows".

!!! warning "Use ME/MS, not M (changed in pandas 3.0)"
    The resample/offset code `"M"` was removed; it now raises `ValueError: Invalid frequency: M`. Use `"ME"` (month end) or `"MS"` (month start). Likewise `"Y"` became `"YE"`/`"YS"`.

!!! warning "resample needs a datetime index"
    `resample` only works when the index is datetime (or you point it at a datetime column with `on=`). If you get an error about the index, `set_index` your datetime column first.

!!! warning "Ambiguous formats need help"
    `03/04/2024` could be March 4 or April 3. pandas guesses month-first by default. Pass `dayfirst=True` or an explicit `format=` so the parse is certain, and `errors="coerce"` to send unparseable values to `NaT` rather than crashing.

## Quick reference

| You want | Write |
| --- | --- |
| Text to datetime | `pd.to_datetime(df["col"])` |
| Handle bad/odd dates | `pd.to_datetime(s, format="%d/%m/%Y", errors="coerce")` |
| Year / month number | `s.dt.year` / `s.dt.month` |
| Weekday name | `s.dt.day_name()` |
| Filter from a date | `df[df["col"] >= "2024-02-01"]` |
| Select one month (datetime index) | `df.loc["2024-02"]` |
| Select a date range | `df.loc["2024-01":"2024-02"]` |
| Monthly totals | `df.resample("ME").sum()` |
| Per-month group (no index) | `df.groupby(df["col"].dt.month)["v"].sum()` |

## Where this connects

!!! connect "Time threads through the workflow"
    - `to_datetime` is one of the conversions in [changing data types](../cleaning/change-dtypes.md), alongside `astype` and `to_numeric`; `read_csv`'s `parse_dates` does it at [load time](../foundations/reading-data.md).
    - A datetime [index](../indexing/set-index.md) is what makes partial-string slicing and `resample` possible, and slicing it uses the inclusive `loc` rule from [loc and iloc](../selection/loc-iloc.md).
    - `.dt` mirrors [`.str`](../cleaning/strings.md): one accessor that pulls structured pieces out of each value, vectorized over the column.
    - `resample` is a time-aware [GroupBy](../grouping/groupby.md), and aggregates each bucket with the same functions as [aggregation](../grouping/aggregation.md).
    - The "a date is really an integer" idea is the datetime case of the [dtypes](../foundations/dtypes.md) storage story.

!!! intuition "If you remember one thing"
    Convert text to real dates with `pd.to_datetime` first; everything else depends on it. Then `.dt` gives you the parts, a datetime index gives you `loc["2024-02"]` slicing, and `resample("ME")` buckets rows into months. Under it all, a date is just an integer count from 1970.
