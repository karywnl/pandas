# loc and iloc

!!! intuition "The gist"
    A DataFrame has two ways to find a cell: by its **label** (the name in the index or the column header) or by its **position** (its integer number, counted from zero). `loc` works by label. `iloc` works by position. The `i` in `iloc` stands for *integer position*, and that single letter is the whole difference.

## Why these two things even exist

A pandas DataFrame lets you point at a cell in two completely different ways, and mixing them up is a common source of bugs.

- The **index** and the **column names** are **labels**: the names you can see, such as `"Parasite"` or `"rating"`.
- The **position** is the integer number of each row and column, counted from zero, no matter what the labels say.

`loc` finds data by label. `iloc` finds data by position. Plain bracket access like `df['rating']` is convenient but limited: it can only grab whole columns by name or filter rows. The moment you want to say "these specific rows *and* these specific columns at the same time", you use `loc` or `iloc`.

Here is a real DataFrame so every example is concrete.

```python
import pandas as pd

movies = pd.DataFrame(
    {
        "year":       [1999, 2008, 2014, 2019, 2010],
        "rating":     [8.7,  9.0,  8.6,  8.4,  8.8],
        "box_office": [463,  1004, 677,  263,  829],  # millions of dollars
    },
    index=["The Matrix", "The Dark Knight", "Interstellar", "Parasite", "Inception"],
)
```

This is what it looks like, with both labelling systems drawn in. The names down the left and along the top are the **labels**, which is what `loc` uses. The `pos` numbers around the edge are the **positions**, which is what `iloc` counts. Read each `pos` straight down its column.

```text
        +----------------+--------+--------+------------+
        |                | pos 0  | pos 1  |   pos 2    |
        |    (index)     |  year  | rating | box_office |
        +----------------+--------+--------+------------+
pos 0 → | The Matrix     |  1999  |  8.7   |    463     |
pos 1 → | The Dark Knight|  2008  |  9.0   |    1004    |
pos 2 → | Interstellar   |  2014  |  8.6   |    677     |
pos 3 → | Parasite       |  2019  |  8.4   |    263     |
pos 4 → | Inception      |  2010  |  8.8   |    829     |
        +----------------+--------+--------+------------+
          ^ row labels       ^ the columns, counted by position
```

Keep this picture in your head. Everything below is just two ways of pointing at it.

## How it works

Both accessors use square brackets (not parentheses), and both follow the same shape:

```python
df.loc[row_selector, column_selector]
df.iloc[row_selector, column_selector]
```

If you give only one selector, pandas assumes you mean the rows.

### iloc: counting from zero

`iloc` ignores every label and counts positions, starting at zero, exactly like a Python list.

```python
movies.iloc[0]            # first row -> The Matrix (as a Series)
movies.iloc[0, 0]         # first row, first column -> 1999 (a single value)
movies.iloc[0:3]          # rows 0, 1, 2  (NOT 3)  -> a DataFrame
movies.iloc[0:3, 0:2]     # rows 0-2, columns 0-1
movies.iloc[[0, 3, 4]]    # rows at positions 0, 3 and 4
movies.iloc[-1]           # last row -> Inception
```

Notice `movies.iloc[0:3]` gives you positions 0, 1, and 2, but stops *before* 3. That is the normal Python slicing rule you already know from lists: the right end is excluded. Remember this, because `loc` is about to break it on purpose.

**In one line:** `iloc` counts positions from zero and, just like a Python list, excludes the right end of a slice.

### loc: pointing by label

`loc` ignores positions and uses the labels you can actually see.

```python
movies.loc["Parasite"]                       # the Parasite row (a Series)
movies.loc["Parasite", "rating"]             # one cell -> 8.4
movies.loc["The Matrix":"Interstellar"]      # from one label to another, inclusive
movies.loc[:, "rating"]                      # every row, just the rating column
movies.loc[["The Matrix", "Inception"]]      # two named rows
movies.loc[movies["rating"] > 8.7]           # every row where rating beats 8.7
```

That last line is the one you will use constantly. `loc` happily accepts a column of True and False values and keeps only the True rows. That has its own chapter: [boolean indexing](boolean-indexing.md).

**In one line:** `loc` finds rows and columns by their labels, and it is the tool you will use most when filtering.

### Selecting rows and columns together

This is the superpower that plain `df[...]` cannot do cleanly. You describe the rows and the columns in one step.

=== "With loc (by name)"

    ```python
    # The rating and box_office of every highly rated film
    movies.loc[movies["rating"] >= 8.7, ["rating", "box_office"]]
    ```

    ```text
                     rating  box_office
    The Matrix          8.7         463
    The Dark Knight     9.0        1004
    Inception           8.8         829
    ```

=== "With iloc (by position)"

    ```python
    # First three films, first two columns
    movies.iloc[0:3, 0:2]
    ```

    ```text
                     year  rating
    The Matrix       1999     8.7
    The Dark Knight  2008     9.0
    Interstellar     2014     8.6
    ```

### The single brackets vs double brackets trick

This surprises everyone once, so let us name it now. One label gives you a Series. A *list* of labels gives you a DataFrame, even if the list has one item.

```python
movies.loc["Parasite"]        # Series (one row laid out vertically)
movies.loc[["Parasite"]]      # DataFrame (one row, still a table)
```

The extra brackets are not decoration. They change the *type* of thing you get back, which changes what you can do with it next. If a later line complains that a Series does not have some DataFrame method, this is usually why.

??? question "Quick check: predict it"
    Using the `movies` table from the top of the page, what does `movies.iloc[1:3]` give you, and is it a Series or a DataFrame?

    **Answer:** Positions 1 and 2 only, because `iloc` excludes the right end. That is **The Dark Knight** and **Interstellar**. It comes back as a **DataFrame**, because a slice returns more than one row. (Compare `movies.iloc[1]`, a single position, which returns a Series.)

## Under the hood

Here is the deepest part. None of what follows is trivia; it explains the two bugs that catch pandas learners most often.

!!! tip "New here? You have permission to skip this."
    Everything below explains *why* pandas behaves the way it does. It is worth knowing, but you do not need a single word of it to start using `loc` and `iloc` today. If that is enough for now, jump straight to the [cheat sheet](#quick-reference) and come back to this part later. Nothing here is required to be productive right now.

### Why loc slices are inclusive but iloc slices are not

You saw it above. `iloc[0:3]` stops before 3, but `loc["The Matrix":"Interstellar"]` *includes* Interstellar. That looks inconsistent until you see the reason, and then it feels obvious.

```text
iloc[0:3]     positions:  0   1   2  | 3
                         [keep keep keep] stop      <- math can compute "one before 3"

loc["A":"C"]  labels:    "A" "B" "C"
                         [keep keep keep]           <- what is "one before C"?  there isn't one
```

With positions, "stop before 3" is easy, because 3 minus 1 is 2. Numbers have a built in "previous". But labels do not. If your index is movie titles, or dates, or the strings `"mon"`, `"tue"`, `"wed"`, there is no arithmetic that gives you "the label just before Interstellar". So pandas made a deliberate choice: **label slices include both ends**, because excluding the end would require a "previous label" that does not exist in general. Positions keep the normal Python exclusive rule because they *can*.

So the rule to memorise is short: **`iloc` is exclusive on the right like a Python list. `loc` is inclusive on both ends because labels have no arithmetic.**

??? question "Quick check: inclusive or exclusive?"
    How many rows does `movies.loc["The Dark Knight":"Parasite"]` return?

    **Answer:** **Three:** The Dark Knight, Interstellar, and Parasite. `loc` includes the final label, so Parasite is kept. If slicing dropped the right end the way `iloc` does, Parasite would vanish and you would get only two.

### The integer index trap

Now the nastiest gotcha, and the real reason these two accessors exist as separate tools. What happens when your labels *are* integers?

```python
s = pd.Series([100, 200, 300], index=[10, 20, 30])
```

```text
            label   position   value
              10       0        100
              20       1        200
              30       2        300
```

```python
s.iloc[0]      # position 0   -> 100
s.loc[10]      # label 10     -> 100
s.iloc[1]      # position 1   -> 200
s.loc[20]      # label 20     -> 200
```

`s.iloc[0]` and `s.loc[10]` happen to point at the same value here, but for completely different reasons. One counted to position zero. The other looked up the label `10`. The instant your labels stop lining up with positions, they disagree.

This is not a weird edge case you can ignore. It happens every time you filter a DataFrame. To watch it happen, let us take the very same movies but swap the title index for the plain default index (the numbers 0 to 4), so that labels and positions start out matching perfectly:

```python
films = movies.reset_index(drop=True)   # same data, the index is now 0..4
```

```text
        index   year   rating
          0     1999    8.7
          1     2008    9.0
          2     2014    8.6
          3     2019    8.4
          4     2010    8.8
        (label)        (label == position, for now)
```

Now we keep only the films rated above 8.6:

```python
top = films[films["rating"] > 8.6]
```

```text
        index   year   rating    new position
          0     1999    8.7           0
          1     2008    9.0           1
          4     2010    8.8           2     <- label is still 4, but now at position 2
```

Look at that last row. Filtering threw away the rows that failed (Interstellar and Parasite), but it **kept the original labels** on the survivors. So the labels are now `[0, 1, 4]`, while the positions quietly renumbered themselves to `[0, 1, 2]`. The label and the position have come apart.

Now the two accessors disagree on the very same number `4`:

```python
top.loc[4]    # label 4 still exists      -> the Inception row
top.iloc[4]   # position 4? only 3 rows now -> IndexError
```

`loc[4]` happily finds the row labelled 4. `iloc[4]` asks for the row at position 4, which no longer exists, so it raises an error. This is the single most common source of "but it worked a minute ago" confusion in pandas, and it is exactly why the two tools stay separate.

!!! tip "The habit that saves you"
    Pick `loc` when you are thinking in labels and `iloc` when you are thinking in positions, and never let the choice be an accident. If you just filtered and now want "the first surviving row", that is a *position* idea, so use `iloc[0]`, not `loc[0]`.

??? question "Quick check: spring the trap"
    After `top = films[films['rating'] > 8.6]`, the survivors are labelled `[0, 1, 4]` (positions `[0, 1, 2]`). What does `top.iloc[2]` return, and what does `top.loc[2]` return?

    **Answer:** `top.iloc[2]` is the third surviving row *by position*, which is **Inception** (whose label happens to be 4). `top.loc[2]` hunts for the *label* 2, which was filtered away, so it raises a **`KeyError`**. Same number, opposite outcomes. That is the whole trap in one example.

### Views, copies, and the famous warning

This is the deepest and most valuable part, so take it slowly. It explains the `SettingWithCopyWarning` that has confused pandas users for a decade.

A DataFrame does not store each column as a separate loose object. Under the hood, pandas groups columns of the same dtype into shared blocks of memory. All the float columns might sit together in one block of memory, all the integers in another. This machinery is called the **BlockManager**.

```text
DataFrame "movies"

   columns:   year(int)   rating(float)   box_office(int)
                  |             |               |
   BlockManager groups by dtype:
       int block   -> [ year , box_office ]   (one slab of memory)
       float block -> [ rating ]              (another slab)
```

When you slice a DataFrame, pandas faces a choice. If the data you asked for is already sitting in one unbroken run of memory, it can hand you a **view**: a window onto the original data, sharing the same memory. No copying, very fast. But writing through a view also changes the original, because they are the same bytes. If the data you asked for is scattered (different dtypes, or rows not stored next to each other), pandas cannot make a window, so it builds a **copy**: fresh independent memory. Writing to a copy leaves the original untouched.

The trouble is that whether you get a view or a copy can depend on the dtypes and the exact slice, which means it is hard to predict. And that unpredictability is exactly what breaks **chained indexing**:

```python
# Two separate operations stuck together. This is the danger zone.
movies[movies["year"] > 2000]["rating"] = 9.9
```

Read that as pandas does, left to right. First `movies[movies["year"] > 2000]` runs and produces some new object, maybe a view, maybe a copy, you genuinely cannot tell. Then `["rating"] = 9.9` writes into *that* object. If it was a copy, your edit lands in a temporary thing that gets thrown away a microsecond later, and the real `movies` never changes. On pandas 2.x and earlier, pandas could not be sure your edit would stick, so it raised a warning:

```text
SettingWithCopyWarning: A value is trying to be set on a copy of a
slice from a DataFrame
```

That warning is not noise. It is pandas saying "I am not confident your change will actually take effect." The fix is to stop chaining and state the rows and the column in **one** `loc` call, so pandas knows for certain you mean the original:

```python
# One operation. Unambiguous. Always works.
movies.loc[movies["year"] > 2000, "rating"] = 9.9
```

Because it is a single `loc` on the original `movies`, there is no in between object to get lost, and pandas writes straight into the real data.

!!! danger "The one rule that prevents the warning"
    Never write `df[...][...] = value` with two sets of brackets on the left of an `=`. Always collapse it into one accessor: `df.loc[rows, cols] = value`. Selecting with two brackets to *read* is usually fine. Assigning through two brackets is the trap.

!!! info "What pandas 3.0 changes here (Copy on Write)"
    This site is written for pandas 3.0, and 3.0 quietly cleans up most of this mess with a behaviour called Copy on Write, which is now always on and can no longer be switched off. The idea: every slice behaves as if it owns a private copy, and pandas only physically copies the memory at the last possible moment, the instant you actually write to it. So the old view versus copy guessing game is essentially over. The chained assignment above behaves more helpfully now too. Instead of the vague old `SettingWithCopyWarning`, pandas raises a clearer `ChainedAssignmentError` warning and simply leaves your real data unchanged, so you find out immediately instead of silently getting nothing. The takeaway has not moved: assign with one `loc` call. If you are still on an older pandas 2.x, you can switch this safer behaviour on early with `pd.set_option("mode.copy_on_write", True)`. Learning the one `loc` habit now keeps your code correct on every version.

### at and iat: the fast way to one cell

When you want exactly one value, `loc` and `iloc` work, but they do extra setup to be able to return Series or DataFrames. If you know you want a single scalar, `at` and `iat` skip that overhead and are noticeably faster in a tight loop.

```python
movies.at["Parasite", "rating"]   # label based, one cell  -> 8.4
movies.iat[3, 1]                   # position based, one cell -> 8.4
```

Same idea as `loc` and `iloc` (label vs position), just specialised for a single cell.

### Why a labelled index is fast

One more reason `loc` is not just convenient but genuinely efficient. When you set a meaningful index, pandas builds a **lookup** behind it that can jump straight to a label's row in a single step, instead of checking the rows one by one. So `movies.loc["Parasite"]` stays close to instant no matter how many rows there are. (That single, fixed cost is what people call a **constant time**, or **O(1)**, lookup.) Compare that with scanning an ordinary column, like `movies[movies["year"] == 2019]`, which has to walk every row to find the matches, so the work grows with the number of rows (an **O(n)** operation). For a handful of movies the difference is invisible. For a few million rows it is the difference between instant and a noticeable pause. This is why setting a good index (a topic of its own) pays off, and `loc` is how you use that speed.

## Gotchas

The "under the hood" section explains each of these in full; here they are in one place as the traps to watch for.

!!! danger "Never assign through chained brackets"
    `df[mask]["col"] = value` writes into a temporary in-between object, not your real data, so in pandas 3.0 it raises a `ChainedAssignmentError` and changes nothing. Always assign through one accessor: `df.loc[mask, "col"] = value`. See [views, copies, and the famous warning](#views-copies-and-the-famous-warning).

!!! warning "The integer index trap: pick loc or iloc on purpose"
    When the index is made of integers, `df.loc[2]` means "the row **labelled** 2" while `df.iloc[2]` means "the row in **position** 2", and they can point at different rows. Choose the one that matches what you mean, and do not rely on them agreeing. See [the integer index trap](#the-integer-index-trap).

!!! warning "loc slices include the end, iloc slices do not"
    `df.loc["a":"c"]` keeps `"c"`, but `df.iloc[0:3]` stops before position 3. Mixing up the two ends is a common off-by-one. See [why loc slices are inclusive but iloc slices are not](#why-loc-slices-are-inclusive-but-iloc-slices-are-not).

!!! warning "One label gives a Series, a list of labels gives a DataFrame"
    `df.loc[:, "col"]` returns a Series; `df.loc[:, ["col"]]` returns a one-column DataFrame. Reach for the list form when you want to keep a DataFrame.

## Quick reference

| You want | Use | Note |
| --- | --- | --- |
| First row by position | `df.iloc[0]` | zero based |
| A row by its label | `df.loc["name"]` | |
| Rows 0 to 2 (not 3) | `df.iloc[0:3]` | right end excluded |
| Labels "a" through "c" | `df.loc["a":"c"]` | both ends included |
| Filter rows by a condition | `df.loc[mask]` | `mask` is True/False |
| Specific rows and columns | `df.loc[mask, ["a", "b"]]` | the superpower |
| One cell, fast | `df.at["name", "col"]` / `df.iat[r, c]` | scalar only |
| Last 5 rows | `df.iloc[-5:]` | |
| Every 3rd row | `df.iloc[::3]` | |
| Assign to a subset | `df.loc[mask, "col"] = value` | never chain brackets |

## Where this connects

!!! connect "loc and iloc plug into the rest of pandas like this"
    - [**Boolean indexing**](boolean-indexing.md) is just `loc` being fed a column of True and False. When you write `df[df["rating"] > 8]`, you are using a mask, and doing it through `df.loc[mask, cols]` is how you filter rows and pick columns in the same move.
    - [**Setting the index**](../indexing/set-index.md) (`set_index`) is what gives `loc` meaningful names to look up, and turns on that fast O(1) index lookup described above.
    - [**Resetting the index**](../indexing/reset-index.md) (`reset_index`) is the cleanup you run after filtering, precisely to fix the "labels no longer match positions" trap from this page.
    - **The SettingWithCopyWarning** you will meet again in [handling missing values](../cleaning/missing-values.md) and [replacing values](../cleaning/replace.md), because filling and replacing are assignments, and the same one `loc` call rule keeps them safe.

!!! intuition "If you remember one thing"
    Label or position. `loc` finds data by its label. `iloc` finds it by its position number. Decide which one you mean *before* you type the bracket, and most pandas selection bugs never happen to you.
