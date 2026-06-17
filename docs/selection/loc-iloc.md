# loc and iloc

!!! intuition "The gist"
    A DataFrame has two ways to find a cell: by its **name** (the label) or by its **seat number** (the position). `loc` works by name. `iloc` works by position. The `i` in `iloc` stands for *integer position*, and that single letter is the whole difference.

## Why these two things even exist

Imagine you walk into a movie theatre. There are two completely different ways someone can tell you where to sit.

They can say "sit in the seat reserved for **Alice**", which is a *label*. Or they can say "sit in **row 3, seat 5**", which is a *position*. Both get you to a seat. But they are different systems, and if you mix them up you end up in the wrong chair.

A pandas DataFrame has the exact same two systems running at once:

- The **index** and the **column names** are labels. They are the names written on the seats.
- The **integer position** of each row and column is the seat number, counted from zero, no matter what the labels say.

`loc` is the "find the seat named X" tool. `iloc` is the "find row number X, column number Y" tool. Plain bracket access like `df['rating']` is convenient but limited, it can only grab whole columns by name or filter rows. The moment you want to say "these specific rows *and* these specific columns at the same time", you reach for `loc` or `iloc`.

Let us get a real DataFrame on the table so every example is concrete.

```python
import pandas as pd

movies = pd.DataFrame(
    {
        "year":       [1999, 2008, 2014, 2019, 2010],
        "rating":     [8.7,  9.0,  8.6,  8.4,  8.8],
        "box_office": [463,  1004, 677,  53,   829],  # millions of dollars
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
pos 3 → | Parasite       |  2019  |  8.4   |     53     |
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

Notice `movies.iloc[0:3]` gives you positions 0, 1, and 2, but stops *before* 3. That is the normal Python slicing rule you already know from lists: the right end is excluded. Hold that thought, because `loc` is about to break it on purpose.

### loc: pointing by name

`loc` ignores positions and uses the labels you can actually see.

```python
movies.loc["Parasite"]                       # the Parasite row (a Series)
movies.loc["Parasite", "rating"]             # one cell -> 8.4
movies.loc["The Matrix":"Interstellar"]      # from one label to another, inclusive
movies.loc[:, "rating"]                      # every row, just the rating column
movies.loc[["The Matrix", "Inception"]]      # two named rows
movies.loc[movies["rating"] > 8.7]           # every row where rating beats 8.7
```

That last line is the one you will use constantly. `loc` happily accepts a column of True and False values and keeps only the True rows. We will come back to that friendship in [boolean indexing](#where-this-connects).

### Selecting rows and columns together

This is the superpower that plain `df[...]` cannot do cleanly. You describe the rows and the columns in one breath.

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

This trips up everyone once, so let us name it now. One label gives you a Series. A *list* of labels gives you a DataFrame, even if the list has one item.

```python
movies.loc["Parasite"]        # Series (one row laid out vertically)
movies.loc[["Parasite"]]      # DataFrame (one row, still a table)
```

The extra brackets are not decoration. They change the *type* of thing you get back, which changes what you can do with it next. If a later line complains that a Series does not have some DataFrame method, this is usually why.

## Under the hood

Here is where we go all the way down. None of what follows is trivia, it explains the two bugs that bite pandas learners most often.

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

This is not a weird edge case you can ignore. It happens every time you filter a DataFrame. To watch it happen, here is our movies table again (so you do not have to scroll), except this time imagine we loaded it with the plain default index, the numbers 0 to 4, instead of titles. Right now each label matches its position perfectly:

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
top = movies[movies["rating"] > 8.6]
```

```text
        index   year   rating    new position
          0     1999    8.7           0
          1     2008    9.0           1
          4     2010    8.8           2     <- label is still 4, but now sits in seat 2
```

Look at that last row. Filtering threw away the rows that failed (Interstellar and Parasite), but it **kept the original labels** on the survivors. So the labels are now `[0, 1, 4]`, while the positions quietly renumbered themselves to `[0, 1, 2]`. The label and the seat number have come apart.

Now the two accessors disagree on the very same number `4`:

```python
top.loc[4]    # label 4 still exists      -> the Inception row
top.iloc[4]   # position 4? only 3 rows now -> IndexError
```

`loc[4]` happily finds the row labelled 4. `iloc[4]` asks for the fifth seat, which no longer exists, so it raises an error. This is the single most common source of "but it worked a minute ago" confusion in pandas, and it is exactly why the two tools stay separate.

!!! tip "The habit that saves you"
    Pick `loc` when you are thinking in names and `iloc` when you are thinking in seat numbers, and never let the choice be an accident. If you just filtered and now want "the first surviving row", that is a *position* idea, so use `iloc[0]`, not `loc[0]`.

### Views, copies, and the famous warning

This is the deepest and most valuable part, so take it slowly. It explains the `SettingWithCopyWarning` that has confused pandas users for a decade.

A DataFrame does not store each column as a separate loose object. Under the hood, pandas groups columns of the same dtype into shared blocks of memory. All the float columns might sit together in one contiguous slab, all the integers in another. This machinery is called the **BlockManager**.

```text
DataFrame "movies"

   columns:   year(int)   rating(float)   box_office(int)
                  |             |               |
   BlockManager groups by dtype:
       int block   -> [ year , box_office ]   (one slab of memory)
       float block -> [ rating ]              (another slab)
```

When you slice a DataFrame, pandas faces a choice. If the data you asked for is already sitting in one clean contiguous run of memory, it can hand you a **view**: a window onto the original data, sharing the same memory. No copying, very fast. But writing through a view also changes the original, because they are the same bytes. If the data you asked for is scattered (different dtypes, non contiguous rows), pandas cannot make a window, so it builds a **copy**: fresh independent memory. Writing to a copy leaves the original untouched.

The trouble is that whether you get a view or a copy can depend on the dtypes and the exact slice, which means it is hard to predict. And that unpredictability is exactly what breaks **chained indexing**:

```python
# Two separate operations stuck together. This is the danger zone.
movies[movies["year"] > 2000]["rating"] = 9.9
```

Read that as pandas does, left to right. First `movies[movies["year"] > 2000]` runs and produces some new object, maybe a view, maybe a copy, you genuinely cannot tell. Then `["rating"] = 9.9` writes into *that* object. If it was a copy, your edit lands in a temporary thing that gets thrown away a microsecond later, and the real `movies` never changes. Pandas cannot be sure your edit will stick, so it raises:

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

!!! info "What changed in pandas 2.0+ (Copy on Write)"
    Modern pandas can run in a mode called Copy on Write, and it becomes the default from pandas 3.0. In this mode the rules get simpler and safer: every slice behaves as if it were its own copy, and pandas only physically copies the memory at the last possible moment, when you actually write. The upside for you is that the confusing view vs copy guessing game mostly disappears, and chained assignment simply will not silently edit the original anymore. The habit above (one `loc` call to assign) is still the correct way to write, and it works perfectly in both the old and new worlds, so you lose nothing by learning it now.

### at and iat: the express lane for one cell

When you want exactly one value, `loc` and `iloc` work, but they do extra setup to be able to return Series or DataFrames. If you know you want a single scalar, `at` and `iat` skip that overhead and are noticeably faster in a tight loop.

```python
movies.at["Parasite", "rating"]   # label based, one cell  -> 8.4
movies.iat[3, 1]                   # position based, one cell -> 8.4
```

Same idea as `loc` and `iloc` (name vs position), just specialised for a single cell.

### Why a labelled index is fast

One more reason `loc` is not just convenient but genuinely efficient. When you set a meaningful index, pandas builds a hash table behind it. Looking up `movies.loc["Parasite"]` is then close to instant, an O(1) jump, the same way a Python dictionary finds a key. Compare that to searching a plain column for a match, like `movies[movies["title"] == "Parasite"]`, which has to scan every row, an O(n) walk. For a handful of movies the difference is invisible. For a few million rows it is the difference between instant and a noticeable pause. This is why setting a good index (a topic of its own) pays off, and `loc` is how you cash in that speed.

## Quick reference

| You want | Use | Note |
| --- | --- | --- |
| First row by position | `df.iloc[0]` | zero based |
| A row by its name | `df.loc["name"]` | |
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
    - **Boolean indexing** is just `loc` being fed a column of True and False. When you write `df[df["rating"] > 8]`, you are using a mask, and doing it through `df.loc[mask, cols]` is how you filter rows and pick columns in the same move. *(chapter coming soon)*
    - **Setting the index** (`set_index`) is what gives `loc` meaningful names to look up, and turns on that fast O(1) hash lookup described above. *(chapter coming soon)*
    - **Resetting the index** (`reset_index`) is the cleanup you run after filtering, precisely to fix the "labels no longer match positions" trap from this page. *(chapter coming soon)*
    - **The SettingWithCopyWarning** you will meet again in **handling missing values** and **replacing values**, because filling and replacing are assignments, and the same one `loc` call rule keeps them safe. *(chapter coming soon)*

!!! intuition "If you remember one thing"
    Name or seat number. `loc` reads the name on the seat. `iloc` counts to the seat. Decide which one you mean *before* you type the bracket, and most pandas selection bugs never happen to you.
