# Merge DataFrames

!!! intuition "The gist"
    Real data lives in **separate tables**: customers in one, their orders in another. `merge` glues two tables together on a **shared key column** (like `customer_id`), so each row in one table picks up the matching columns from the other. The only real decisions are *which key to match on* and *what to do with rows that have no match*.

## Why it exists

You rarely get everything in one table. A shop keeps a **customers** table (who they are, where they live) and a separate **orders** table (what was bought, for how much). The two are linked by a shared id. To answer "which city did each order ship to?" you need columns from *both* tables in one place.

Copying columns by hand is hopeless once tables get big, and lookups by position break the moment rows are in a different order. `merge` does the lookup **by value**: for each row, it finds the rows in the other table whose key matches, and joins them. This is exactly a SQL `JOIN`, and if you know those, the same four join types are all here.

The whole chapter rests on two questions. **What column do the two tables share?** That is the key. **What should happen to a row that has no partner in the other table?** That is the join type. Get those two right and merge is easy.

```python
import pandas as pd

customers = pd.DataFrame({
    "customer_id": [1, 2, 3, 4],
    "name": ["Ana", "Ben", "Cara", "Dan"],
    "city": ["Lisbon", "Berlin", "Cairo", "Denver"],
})
customers
#    customer_id  name    city
# 0            1   Ana  Lisbon
# 1            2   Ben  Berlin
# 2            3  Cara   Cairo
# 3            4   Dan  Denver

orders = pd.DataFrame({
    "order_id": [101, 102, 103, 104],
    "customer_id": [1, 1, 2, 5],
    "amount": [50, 30, 20, 90],
})
orders
#    order_id  customer_id  amount
# 0       101            1      50
# 1       102            1      30
# 2       103            2      20
# 3       104            5      90
```

Look at the keys before merging, because they decide everything. **Ana (1)** has two orders, **Ben (2)** has one, **Cara (3)** and **Dan (4)** have none, and **order 104** belongs to customer **5**, who is not in the customers table at all. Those mismatches are not a mistake in the data; they are the whole reason join types exist.

## Picture it

The shared key is `customer_id`. The customers table has keys `1, 2, 3, 4`; the orders table has keys `1, 1, 2, 5`. The join type decides which rows survive:

```text
customers keys: 1, 2, 3, 4
orders keys:    1, 1, 2, 5

  +-------+----------------------------------+--------+
  | how   | kept keys                        | result |
  +-------+----------------------------------+--------+
  | inner | in BOTH      -> 1, 1, 2          | 3 rows |
  | left  | in customers -> 1, 1, 2, 3, 4    | 5 rows |
  | right | in orders    -> 1, 1, 2, 5       | 4 rows |
  | outer | in EITHER    -> 1, 1, 2, 3, 4, 5 | 6 rows |
  +-------+----------------------------------+--------+
```

**In one line:** pick the key, then pick how much of each side to keep; everything else merge does for you.

## How it works

### The basic merge

Pass the two tables and the shared column name to `on`. There are two spellings and they do exactly the same thing:

```python
pd.merge(customers, orders, on="customer_id")
# or, the form you will see more in method chains:
customers.merge(orders, on="customer_id")
```

The first table is the **left**, the second is the **right**. Both give:

```python
#    customer_id name    city  order_id  amount
# 0            1  Ana  Lisbon       101      50
# 1            1  Ana  Lisbon       102      30
# 2            2  Ben  Berlin       103      20
```

Each result row carries the customer columns *and* the order columns. Notice Ana appears **twice**, once per order: her single customer row was copied to match each of her orders. That row-copying is normal and we come back to it under [one-to-many](#how-many-rows-relationship-types).

**In one line:** `merge(left, right, on="key")` looks up each row's key in the other table and joins the matching columns.

### Join types: the `how` parameter

The default above quietly dropped Cara, Dan, and order 104, because they had no match. `how` controls that. It is the single most important option on `merge`.

=== "inner (default)"

    Keep only keys present in **both** tables. The safest default: it never invents missing data.

    ```python
    pd.merge(customers, orders, on="customer_id", how="inner")
    #    customer_id name    city  order_id  amount
    # 0            1  Ana  Lisbon       101      50
    # 1            1  Ana  Lisbon       102      30
    # 2            2  Ben  Berlin       103      20
    ```

    Cara and Dan (no orders) and order 104 (no customer) all drop out.

=== "left"

    Keep **every row from the left** table. Customers with no order still appear, with the order columns filled by `NaN`.

    ```python
    pd.merge(customers, orders, on="customer_id", how="left")
    #    customer_id  name    city  order_id  amount
    # 0            1   Ana  Lisbon     101.0    50.0
    # 1            1   Ana  Lisbon     102.0    30.0
    # 2            2   Ben  Berlin     103.0    20.0
    # 3            3  Cara   Cairo       NaN     NaN
    # 4            4   Dan  Denver       NaN     NaN
    ```

    Use this when the left table is your "spine" and you want to enrich it: every customer stays, matched or not. (See why `order_id` became `101.0`: a column with `NaN` cannot stay an integer, so pandas widens it to float. More in [data types](../foundations/dtypes.md).)

=== "right"

    Keep **every row from the right** table. The mirror image of left. Order 104 stays even though customer 5 is unknown, so its name and city are `NaN`.

    ```python
    pd.merge(customers, orders, on="customer_id", how="right")
    #    customer_id name    city  order_id  amount
    # 0            1  Ana  Lisbon       101      50
    # 1            1  Ana  Lisbon       102      30
    # 2            2  Ben  Berlin       103      20
    # 3            5  NaN     NaN       104      90
    ```

    `how="right"` is uncommon; most people swap the two tables and use `left` instead, because reading "keep all of the left" is easier.

=== "outer"

    Keep **every row from both** tables. Nothing is dropped; unmatched rows get `NaN` on the missing side.

    ```python
    pd.merge(customers, orders, on="customer_id", how="outer")
    #    customer_id  name    city  order_id  amount
    # 0            1   Ana  Lisbon     101.0    50.0
    # 1            1   Ana  Lisbon     102.0    30.0
    # 2            2   Ben  Berlin     103.0    20.0
    # 3            3  Cara   Cairo       NaN     NaN
    # 4            4   Dan  Denver       NaN     NaN
    # 5            5   NaN     NaN     104.0    90.0
    ```

    Use outer when you want to see the full picture including both kinds of orphan: customers with no orders *and* orders with no customer.

**In one line:** `inner` keeps matches only, `left`/`right` keep one whole side, `outer` keeps everything; every non-match becomes `NaN`.

??? question "Quick check: which `how` finds customers who never ordered?"
    You want a list of customers who have **zero** orders. Which join, and how do you spot them in the result?

    **Answer:** A `how="left"` merge (keep all customers), then look for rows where the order columns are `NaN`. Cara and Dan come back with `NaN` in `order_id` and `amount`, which is exactly the "no order" signal. You could then filter with `result[result["order_id"].isna()]`. An `inner` join would simply hide them, which is the opposite of what you want.

### Matching when the columns are named differently

`on` only works when **both** tables use the same column name. Often they do not: the orders table might call it `cust_id` instead of `customer_id`. Use `left_on` and `right_on` to name the key on each side:

```python
# orders2 is the orders table with customer_id renamed to cust_id
pd.merge(customers, orders2, left_on="customer_id", right_on="cust_id")
#    customer_id name    city  order_id  cust_id  amount
# 0            1  Ana  Lisbon       101        1      50
# 1            1  Ana  Lisbon       102        1      30
# 2            2  Ben  Berlin       103        2      20
```

The match still happens by value, so the result is the same rows. The one catch: **both** key columns survive in the output (`customer_id` and `cust_id`), holding identical values. Drop the redundant one afterward with `.drop(columns="cust_id")`.

If the key is in the **index** rather than a column, use `left_index=True` or `right_index=True` in place of `left_on`/`right_on`. That connects merge to [setting the index](../indexing/set-index.md): a key you have promoted to the index is matched the same way.

### Column name clashes: `suffixes`

What if both tables have a column with the **same name** that is not the key? Say each order can be refunded, in full or in part, and a **returns** table also has an `amount` column (the refund):

```python
returns = pd.DataFrame({"order_id": [101, 103], "amount": [50, 10]})

pd.merge(orders, returns, on="order_id")
#    order_id  customer_id  amount_x  amount_y
# 0       101            1        50        50
# 1       103            2        20        10
```

pandas cannot keep two columns both called `amount`, so it renames them with **suffixes**: by default `_x` (from the left) and `_y` (from the right). Those are easy to mix up. Always pass your own meaningful `suffixes`:

```python
pd.merge(orders, returns, on="order_id", suffixes=("_order", "_refund"))
#    order_id  customer_id  amount_order  amount_refund
# 0       101            1            50             50
# 1       103            2            20             10
```

Now `amount_order` and `amount_refund` say what they are. The key column (`order_id`) is shared by definition, so it never gets a suffix; only the *other* overlapping names do.

**In one line:** overlapping non-key columns get renamed with suffixes; set `suffixes` yourself so you can tell the sides apart.

### How many rows? Relationship types

A merge can quietly change your row count, and understanding why is the difference between a correct join and a silent bug. It depends on how often the key repeats:

- **One-to-one:** the key is unique on both sides. Output has one row per match, same size as the inputs. Example: customers joined to a one-row-per-customer profile table.
- **One-to-many:** the key is unique on the left but repeats on the right. The left row is **copied** for each match. That is why Ana appeared twice above: one customer, two orders. This is the most common shape in real work.
- **Many-to-many:** the key repeats on **both** sides. Every matching left row pairs with every matching right row (a Cartesian product), so a key that appears 2 times on the left and 3 times on the right turns into 6 rows. This is almost always a mistake and can blow up your row count.

### Catching mistakes: `validate`

Because a stray duplicate key can silently multiply your rows, `merge` can check the relationship for you and raise an error if reality does not match what you expected:

```python
# we expect each customer (left) to map to many orders (right): one-to-many
pd.merge(customers, orders, on="customer_id", validate="one_to_many")  # fine

# but if we wrongly assume one order per customer:
pd.merge(customers, orders, on="customer_id", validate="one_to_one")
# MergeError: Merge keys are not unique in right dataset; not a one-to-one merge
```

The options are `"one_to_one"`, `"one_to_many"`, `"many_to_one"`, and `"many_to_many"`. Adding `validate` turns a silent data bug into a loud, immediate error, which is exactly what you want. Reach for it whenever you are not 100% sure the keys are unique.

**In one line:** `validate` states the relationship you expect and fails fast if the keys do not honor it.

### Seeing where each row came from: `indicator`

After an outer join, you often want to know *which side* each row matched. `indicator=True` adds a `_merge` column that says so:

```python
pd.merge(customers, orders, on="customer_id", how="outer", indicator=True)
#    customer_id  name    city  order_id  amount      _merge
# 0            1   Ana  Lisbon     101.0    50.0        both
# 1            1   Ana  Lisbon     102.0    30.0        both
# 2            2   Ben  Berlin     103.0    20.0        both
# 3            3  Cara   Cairo       NaN     NaN   left_only
# 4            4   Dan  Denver       NaN     NaN   left_only
# 5            5   NaN     NaN     104.0    90.0  right_only
```

The values are `both`, `left_only`, and `right_only`. This is the fastest way to **audit a merge**: count the `_merge` values to see how many rows matched, and filter to `left_only` to list exactly the customers who never ordered. It pairs naturally with the `how="left"` check from earlier.

**In one line:** `indicator=True` labels every row `both` / `left_only` / `right_only`, turning "did my join work?" into a question you can just count.

## Under the hood

!!! tip "New here? You have permission to skip this."
    "Pick a key with `on`, pick how much to keep with `how`, watch for `NaN`" is the whole chapter. The cheat sheet is below. Come back for these details when a merge surprises you.

**Merge matches by value, not by row position.** To join, pandas first reads one table's key column and builds a quick lookup from it: for each key, where are the rows that have it. Then it goes through the other table once and uses that lookup to find each row's matches. Because it looks keys up directly instead of comparing every row against every other row, it stays fast even on big tables, and the order of the rows in either table does not matter. (A small practical effect: number keys are a little quicker to look up than text keys, so `customer_id` as an integer beats it as a string.)

**`NaN` matches `NaN` in pandas (unlike SQL).** This surprises people coming from databases. If both tables have rows with a missing key, those missing keys are treated as **equal** and get joined together:

```python
left  = pd.DataFrame({"k": [1, 2, None], "a": ["x", "y", "z"]})
right = pd.DataFrame({"k": [1, None], "b": ["p", "q"]})
pd.merge(left, right, on="k")
#      k  a  b
# 0  1.0  x  p
# 1  NaN  z  q     <- the two NaN keys matched each other
```

That joined row is rarely meaningful (two different unknowns are not really "the same customer"). The safe habit is to drop or fill missing keys with [missing-value tools](../cleaning/missing-values.md) *before* you merge, so a `NaN` cannot create a bogus match.

**Only combinations that actually occur produce rows.** Merge never invents a key. If a customer has no order, an inner join simply has no row for them; you only see them again if you ask for it with `how="left"` or `how="outer"`.

## Gotchas

!!! warning "Key dtypes must match, or you get an error"
    Merging an integer key against a string key does not silently return zero matches; in pandas 3.0 it **raises** a `ValueError`: *"You are trying to merge on int64 and str columns."* This is a feature: it stops a broken join early. Fix it by making both keys the same type first, for example `df["k"] = df["k"].astype(int)`. See [changing data types](../cleaning/change-dtypes.md).

!!! warning "A duplicate key can multiply your rows"
    If a key you thought was unique actually repeats on both sides, you get a many-to-many Cartesian product and the row count explodes. Check `left.shape` and `right.shape` against `result.shape`, and pass `validate=` to make the assumption explicit.

!!! warning "NaN keys join to each other"
    pandas treats two missing keys as equal and merges them, which is almost never what you mean. Clean missing keys out before merging.

!!! warning "Default suffixes are cryptic"
    When non-key columns clash, the default `_x` / `_y` tell you nothing about which side is which. Always set `suffixes=("_left_meaning", "_right_meaning")`.

!!! warning "`merge` aligns on values, `concat` stacks on position"
    `merge` is for joining tables that share a **key**. If you just want to stack tables on top of each other (same columns, more rows) or set them side by side by position, that is [`pd.concat`](concat.md), a different tool. Reaching for `merge` to stack rows is a common mix-up.

## Quick reference

| You want | Write |
| --- | --- |
| Join on a shared column | `pd.merge(a, b, on="key")` |
| Keep only matches | `pd.merge(a, b, on="key", how="inner")` |
| Keep all of the left table | `pd.merge(a, b, on="key", how="left")` |
| Keep everything from both | `pd.merge(a, b, on="key", how="outer")` |
| Keys named differently | `pd.merge(a, b, left_on="x", right_on="y")` |
| Match on the index | `pd.merge(a, b, left_index=True, right_index=True)` |
| Name clashing columns | `pd.merge(a, b, on="key", suffixes=("_a", "_b"))` |
| Guard the relationship | `pd.merge(a, b, on="key", validate="one_to_many")` |
| Audit which side matched | `pd.merge(a, b, on="key", how="outer", indicator=True)` |

## Where this connects

!!! connect "Combining tables, then using the result"
    - The `NaN` that unmatched rows produce is handled with [missing values](../cleaning/missing-values.md); a `how="left"` merge then `isna()` is the standard way to find rows with no partner.
    - Matching on the index instead of a column ties back to [setting the index](../indexing/set-index.md), and the redundant key column you drop afterward uses plain [column selection](../selection/column-selection.md).
    - Mismatched key types are fixed with [changing data types](../cleaning/change-dtypes.md); this is the most common reason a merge "finds nothing".
    - After merging, you usually [group](../grouping/groupby.md) and [aggregate](../grouping/aggregation.md) the combined table: merge brings the columns together, GroupBy summarizes them.
    - `merge` joins on keys; its sibling [`concat`](concat.md) stacks tables by position. Different jobs, often confused.

!!! intuition "If you remember one thing"
    Every merge is two decisions: the **key** to match on (`on`, or `left_on`/`right_on`) and **how much to keep** when a row has no partner (`how`). Inner keeps matches, left keeps the left side, outer keeps all, and every gap becomes `NaN`.
