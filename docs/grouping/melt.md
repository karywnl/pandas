# Melt: wide to long

!!! intuition "The gist"
    The same data can be stored **wide** (one column per subject: `math`, `english`, `science`) or **long** (one column called `subject` whose values are math/english/science, and one column of scores). `melt` turns wide into long. It takes the column *names* you point at and folds them down into a single column, stacking the values underneath. One wide row with 3 score columns becomes 3 long rows.

## Why it exists

Spreadsheets usually store data **wide**: one row per student, a separate column for each subject. It is easy for a person to read. But it is awkward for a computer to work with, because the subject is hidden in the *column names* instead of sitting in a column you can filter or group by. You cannot write "average score per subject" cleanly when each subject is its own column.

**Long** format fixes that. It has one row per single observation (one student, one subject, one score), with the subject as an ordinary column. This is the shape that grouping, filtering, and almost every plotting library expect. Plotting tools like seaborn ask "which column is the category and which is the value?", and that question only has an answer in long format.

So `melt` is the tool that **unpivots**: it takes columns spread across the top and turns them into rows going down. It is the exact opposite of [pivot tables](pivot.md), which spread rows back out into columns.

```python
import pandas as pd

scores = pd.DataFrame({
    "student": ["Alice", "Bob"],
    "math": [90, 78],
    "english": [85, 92],
    "science": [88, 81],
})
scores
#   student  math  english  science
# 0   Alice    90       85       88
# 1     Bob    78       92       81
```

Two students, three subject columns. The subject ("math", "english", "science") lives in the column headers, not in the data. We want to pull it down into a real column.

This is what a well-known guideline for table design (the "tidy data" rules) is about: each variable should be its own column, and each observation its own row. The table above breaks the rule, because the subject is really a variable but its values are sitting in the column *names*. Melting moves them into a real `subject` column, so the table becomes tidy. That is the deeper reason melt matters: it is not just reshaping, it puts the data into the shape the rest of pandas is built to consume.

## Picture it

```text
WIDE: one row per student, one column per subject

  +---------+------+---------+---------+
  | student | math | english | science |
  +---------+------+---------+---------+
  | Alice   | 90   | 85      | 88      |
  | Bob     | 78   | 92      | 81      |
  +---------+------+---------+---------+

        |  melt: keep student, unpivot the 3 subject columns
        v

LONG: one row per (student, subject)

  +---------+---------+-------+
  | student | subject | score |
  +---------+---------+-------+
  | Alice   | math    | 90    |
  | Bob     | math    | 78    |
  | Alice   | english | 85    |
  | Bob     | english | 92    |
  | Alice   | science | 88    |
  | Bob     | science | 81    |
  +---------+---------+-------+
```

Each value cell in the wide grid becomes one row in the long table, carrying its student (the id) and its subject (the old column name) along with it. **In one line:** `melt` folds column headers down into a single column, stacking their values in another.

## How it works

### The basic melt

You tell `melt` two things: which columns to **keep as labels** (`id_vars`), and which columns to **fold down** (`value_vars`). The folded column names land in a new column you name with `var_name`, and their values in one named with `value_name`:

```python
pd.melt(
    scores,
    id_vars=["student"],                          # keep this, repeat it
    value_vars=["math", "english", "science"],    # fold these down
    var_name="subject",                           # new column for the old names
    value_name="score",                           # new column for the values
)
#   student  subject  score
# 0   Alice     math     90
# 1     Bob     math     78
# 2   Alice  english     85
# 3     Bob  english     92
# 4   Alice  science     88
# 5     Bob  science     81
```

The `student` column is **repeated** once for each subject, because every student now has three rows. The three old column names are stacked in `subject`, and their numbers in `score`. There is also a method form, `scores.melt(...)`, which is identical and often reads better when you chain several steps together.

Notice the **order**: `melt` works one value column at a time, so you get all the `math` rows first, then all the `english`, then all the `science`. It does not group by student. That is normal; if you want a different order, sort afterward.

**In one line:** `id_vars` are the columns you keep, `value_vars` are the columns you fold into `var_name` (the names) and `value_name` (the values).

??? question "Quick check: how many rows come out?"
    The wide `scores` has 2 rows and 3 subject columns. After the melt above, how many rows does the long table have, and why?

    **Answer:** **6 rows** (2 students times 3 subjects). Melting replaces each wide row with one long row per value column, so `n` rows and `k` value columns give `n * k` rows. Here 2 times 3 is 6. The growth is expected, not a bug; the data is the same, just reshaped.

### Letting `value_vars` default

If you leave out `value_vars`, `melt` folds down **every column that is not in `id_vars`**. Here that is the same three subjects:

```python
pd.melt(scores, id_vars=["student"])
#   student variable  value
# 0   Alice     math     90
# 1     Bob     math     78
# 2   Alice  english     85
# ...
```

Two things to note. First, the result is identical except the new columns are named `variable` and `value`, the defaults, because we did not pass `var_name` or `value_name`. Those generic names tell a reader nothing, so name them in real work. Second, "everything not in `id_vars`" is convenient but risky: if the table later gains a column you did not expect, it gets melted too. **Listing `value_vars` explicitly is the safer habit.**

**In one line:** omit `value_vars` to melt all the other columns, but then you inherit the unhelpful `variable`/`value` names and the risk of folding a column you did not mean to.

### Keeping several id columns

`id_vars` can be a list of several columns. Every one of them is kept and repeated on each long row. This is common when more than one column identifies a row, for example a student id alongside the name:

```python
roster = pd.DataFrame({
    "student_id": [1, 2],
    "student": ["Alice", "Bob"],
    "q1": [80, 70],
    "q2": [85, 75],
})

pd.melt(roster, id_vars=["student_id", "student"],
        value_vars=["q1", "q2"], var_name="quarter", value_name="score")
#    student_id student quarter  score
# 0           1   Alice      q1     80
# 1           2     Bob      q1     70
# 2           1   Alice      q2     85
# 3           2     Bob      q2     75
```

Both `student_id` and `student` are kept on every row, so you never lose track of who a score belongs to. This shape, one column per time period folded into rows, is exactly what you need for data recorded over time (q1, q2, and so on).

### Cleaning the names after melting

The folded names are just the old column strings, so they often need cleaning. Because the new column is ordinary text, you can use the [string tools](../cleaning/strings.md) on it. For example, remove a repeated `_score` suffix:

```python
q = pd.DataFrame({"id": [1], "q1_score": [80], "q2_score": [85]})
long = pd.melt(q, id_vars=["id"], value_vars=["q1_score", "q2_score"])
long["variable"] = long["variable"].str.replace("_score", "")
long
#    id variable  value
# 0   1       q1     80
# 1   1       q2     85
```

Now `variable` reads `q1`, `q2` instead of `q1_score`, `q2_score`. This little cleanup step is so common it is worth remembering: melt first, then fix the names.

**In one line:** the new name column is plain text, so `.str` methods clean it up just like any other column.

### Melt is the inverse of pivot

`melt` (wide to long) and [pivot](pivot.md) (long to wide) undo each other. If you melt a table and then pivot it back, you return to where you started:

```python
long = scores.melt(id_vars=["student"], var_name="subject", value_name="score")
long.pivot(index="student", columns="subject", values="score")
# subject  english  math  science
# student
# Alice         85    90       88
# Bob           92    78       81
```

You are back to one row per student and one column per subject. Two honest caveats, though. The **column order changed**: pivot sorts the subjects alphabetically (`english, math, science`), not back to the original order. And the `student` label is now the index, not a plain column, so add [`reset_index()`](../indexing/reset-index.md) if you want it back as a column. The data is the same; the exact layout is not guaranteed to match the original.

**In one line:** melt and pivot are opposites, but going wide and back can reorder columns and move a key into the index, so it is not always identical.

## Under the hood

!!! tip "New here? You have permission to skip this."
    "`id_vars` to keep, `value_vars` to fold down, name the two new columns" is the whole chapter. Come back here when you want to know *how* melt builds the result, which explains the row order, the row count, and the dtype surprise below.

**How melt builds the long table.** Melt does not move cells around one by one. It treats each value column as a whole **block** of values and builds the three output columns by stacking and repeating those blocks. Picture the three subject columns of `scores`, each a block of `n = 2` values (one per student):

```text
the 3 value columns, each a vertical block of n = 2 values:

  +------+---------+---------+
  | math | english | science |
  +------+---------+---------+
  | 90   | 85      | 88      |
  | 78   | 92      | 81      |
  +------+---------+---------+

        |  melt stacks the blocks one below another
        v

  score   = the blocks joined end to end (n x k = 6 values)
  subject = each block's name, repeated n times to label its block
  student = the id block, repeated once per value column

  +---------+---------+-------+
  | student | subject | score |
  +---------+---------+-------+
  | Alice   | math    | 90    |   <- math block
  | Bob     | math    | 78    |
  | Alice   | english | 85    |   <- english block
  | Bob     | english | 92    |
  | Alice   | science | 88    |   <- science block
  | Bob     | science | 81    |
  +---------+---------+-------+
```

Walk down the result one block at a time. The `score` column is the `math` block, then the `english` block, then the `science` block, joined end to end. The `subject` column labels each block by repeating its name `n` times (`math` twice, then `english` twice, then `science` twice). The `student` column copies the whole `[Alice, Bob]` id block once for every value column, so each value still lines up with the student it came from.

That single mechanism explains three things you saw earlier:

- **The order** (all `math` rows, then all `english`, then all `science`) is just the order the blocks were stacked. Melt never groups by student.
- **The row count** is `n x k`: `k` blocks of `n` values each, giving `2 x 3 = 6` rows.
- **The dtype** can collapse, which is the next point.

**Why mixing value types gives `object`.** Because the `score` column is one block of values joined from several columns, it is a **single** column, and a single column can hold only one type. If the value columns you stacked held different types, pandas has to find one type that fits all of them, and the only one that always fits is the catch-all `object`:

```python
mix = pd.DataFrame({"id": [1], "a": [10], "b": ["hi"]})
pd.melt(mix, id_vars=["id"], value_vars=["a", "b"])["value"].dtype
# dtype('O')   <- object: a number and a string stacked into one column
```

So melt columns that belong together (all scores, all prices), not a mix of unrelated types, or the joined column loses its clean dtype. This is the same idea you saw when [concatenating mismatched columns](../combining/concat.md).

## Gotchas

!!! warning "Always set `id_vars`, or you lose the labels"
    If you forget `id_vars`, the identifying columns (like `student`) get folded into the values too, and you can no longer tell which row each value came from. Name the columns that identify an observation as `id_vars` so they are kept.

!!! warning "Name the new columns"
    Without `var_name` and `value_name`, you get columns literally called `variable` and `value`. They work, but they tell a reader nothing. Set both names to something meaningful (`subject`, `score`).

!!! warning "Melting multiplies rows"
    `n` rows with `k` value columns become `n * k` rows. Two students and three subjects is only 6 rows, but 100 rows with 50 value columns is 5,000. This is expected, but know it is coming before you melt a wide table.

!!! warning "Mixed value types collapse to `object`"
    Folding columns of different types into one value column forces the result to `object`, losing the specific dtype. Melt columns that share a type and a meaning.

## Quick reference

| You want | Write |
| --- | --- |
| Wide to long, named columns | `df.melt(id_vars=["k"], value_vars=["a","b"], var_name="v", value_name="n")` |
| Melt every other column | `df.melt(id_vars=["k"])` |
| Keep several id columns | `df.melt(id_vars=["id","name"], value_vars=[...])` |
| Clean the folded names | `long["variable"] = long["variable"].str.replace("_x", "")` |
| Long back to wide | `long.pivot(index="k", columns="v", values="n")` |

## Where this connects

!!! connect "Reshaping, both directions"
    - `melt` is the exact inverse of [pivot tables](pivot.md): melt folds columns down into rows, pivot spreads rows out into columns.
    - The index based version of this reshape is [unstack](unstack.md) (long to wide) and its inverse `stack`: same idea as pivot and melt, but driven by the row index instead of named columns.
    - Long format is what [GroupBy](groupby.md) and [aggregation](aggregation.md) are built for, so melting is often the step that makes a wide table groupable.
    - Cleaning the folded name column uses [string methods](../cleaning/strings.md), and moving the pivoted key back to a column uses [resetting the index](../indexing/reset-index.md).
    - Stacking value columns of different types collapses to `object`, the same dtype rule you met in [concatenate](../combining/concat.md).
    - Melt reshapes one table; to combine several tables first, see [merge](../combining/merge.md) and [concat](../combining/concat.md).

!!! intuition "If you remember one thing"
    `melt` turns wide into long: pick the columns to keep (`id_vars`), point at the columns to fold down (`value_vars`), and name the two new columns. One wide row with `k` value columns becomes `k` long rows. It is the opposite of pivot.
