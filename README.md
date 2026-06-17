# Pandas

A friendly, visual guide to the pandas library. The kind of explanation you wish someone had handed you on day one.

Read it here: https://karywnl.github.io/pandas/

## Why this exists

Most pandas resources pull you in one of two directions. The beginner ones tell you what to type but never why it works, so you are stuck the moment something breaks. The official docs are precise and complete, but they can feel cold and a little overwhelming when you are just finding your feet.

This guide tries to sit in the friendly middle. Every idea is explained three ways: what it is, how to use it, and why it behaves the way it does. There are diagrams, plain language, small "predict the output" checks, and the links between ideas are spelled out instead of left for you to stumble onto later.

A few things I cared about while writing it:

- You can stop at any depth. Each page opens with a one-line idea, then shows you how to use it, then goes as deep as you want into the internals.
- Every snippet is real. All the code and its output was actually run on pandas 3.0 before it went in, including the things that changed in 3.0 like the new string type and Copy-on-Write.
- It reads like a web, not a list. Every chapter ends by pointing to the ones it builds on, so you can wander in any direction.

## What is inside

1. Foundations: Series, building a DataFrame, inspecting one, data types, head and tail
2. Selecting data: columns, multiple columns, loc and iloc, boolean indexing
3. The index: setting it and resetting it
4. Cleaning data: missing values, duplicates, renaming, replacing, fixing types
5. Grouping and reshaping: GroupBy, aggregation, pivot tables

New to pandas? Start with Foundations and read straight down.

Made as a personal learning project, shared in case it helps you too.
