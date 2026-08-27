# Northern Utah Open Mics

A directory of open mics — comedy, music, and poetry — in Logan, Ogden, and
Salt Lake City, plus a weekly newsletter signup.

**Live site:** <https://jackylegs-oss.github.io/northern-utah-open-mics/>

## How it's built

Three files, no framework, no build step, no server.

| File | What it is |
|---|---|
| `index.html` | The page |
| `style.css` | Colours, fonts, spacing |
| `directory.js` | Loads the sheet, draws the cards, runs the filters and the signup form |

Listings live in a **published Google Sheet**, which the page downloads fresh on
every visit. Adding a mic means typing a row in the sheet — no code change, no
redeploy.

**[SETUP.md](SETUP.md) is the manual** — how to add a mic, what each column
does, and the three settings you might ever edit.

## Running it locally

It needs to be served over http, not opened as a file, or the browser will
block the sheet download:

```bash
python3 -m http.server 8001
```

Then open <http://localhost:8001>.
