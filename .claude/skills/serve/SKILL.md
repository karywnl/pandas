---
name: serve
description: Start the local MkDocs preview server so the learning site can be viewed in a browser. Use whenever the user wants to preview, view, check, look at, or see the site or a page locally, open localhost, or spin up the dev server.
---

Start the MkDocs Material dev server for this project so the user can preview the site.

## Command

Run from the project root, in the background:

```
.venv/Scripts/mkdocs.exe serve -a localhost:8000
```

## Notes

- The site is served at **http://localhost:8000/pandas/** — note the `/pandas/` path prefix (it comes from `site_url` in `mkdocs.yml`), so the bare `localhost:8000` will 404.
- It **live-reloads**: any edit to files under `docs/` or to `mkdocs.yml` rebuilds and refreshes the browser automatically. No need to restart after editing a page.
- A red **"Material for MkDocs 2.0" warning** prints at startup. It is harmless — confirm the log shows `Documentation built` and `Serving on http://localhost:8000/pandas/` before handing the URL to the user.
- If port 8000 is already taken, pick another, e.g. `-a localhost:8001`.
- If the server is already running in the background, do not start a second one — just give the user the URL.
