# Northern Utah Open Mics — how it works

**Live at <https://jackylegs-oss.github.io/northern-utah-open-mics/>**

A directory of open mics, plus a newsletter signup. No framework, no build
step, no server. Three files do everything.

| File | What it is |
|---|---|
| `index.html` | The page itself — the words and the structure |
| `style.css` | Every colour, font, and spacing decision |
| `directory.js` | Loads the listings sheet, draws the cards, runs the filters and the signup form |
| `blog.html` / `post.html` | The blog: all posts, and one post |
| `blog.js` | Loads the Posts sheet and turns Google Docs into clean web pages |
| `vendor/` | One borrowed library (DOMPurify) that strips anything dangerous out of post content. Never edit this. |

The listings live in a **Google Sheet**, not in any of these files. The page
downloads it fresh every time someone visits. Edit the sheet, refresh the site,
the change is there. You never touch code to add a mic.

---

## Adding or changing a mic

1. Open the **Open Mic Listings** sheet.
2. Type into the first empty row. Don't leave blank rows between mics.
3. Wait up to five minutes (see below), then refresh the site.

There is no save button and nothing to deploy. Google saves as you type.

### Edits take up to 5 minutes to appear

Google keeps its own copy of the published sheet for five minutes
(`cache-control: max-age=300`). After you change something, the site can keep
showing the old version for up to that long. **If a change hasn't shown up,
wait five minutes and refresh before assuming it's broken.** There's no way
around this and it isn't a fault.

### What each column does

Keep the header row spelled exactly as it is — the code matches on these names,
so a renamed column stops that information appearing.

| Column | What goes in it | Example |
|---|---|---|
| `Name` | What the mic is called | Monday Night Mic |
| `Venue` | The business | The Owl |
| `Address` | Full street address | 100 N Main St, Logan, UT 84321 |
| `City` | Just the city — this builds the City filter | Logan |
| `Day` | Day of the week | Monday |
| `StartTime` | When the show starts | 8:00 PM |
| `SignupTime` | When the list opens | 7:30 PM |
| `SignupMethod` | How you get on | In person list |
| `Cost` | Cover charge, or Free | Free |
| `AgeLimit` | 21+, 18+, All ages | 21+ |
| `Frequency` | Shown as the outline pill | Weekly |
| `SetLength` | Time you get | 5 min |
| `Host` | Who runs it | Ben Corrigan |
| `Link` | Instagram, Facebook event, website | https://… |
| `Notes` | One sentence of useful detail | Get there early |
| `Type` | Kind of mic — see below | Comedy |
| `Active` | Whether it shows at all | TRUE |
| `LastVerified` | When you last confirmed it | 8/22/26 |

**Any cell you leave blank simply doesn't appear on the card.** No empty
"Host:" labels, no gaps.

### The `Type` column

Drives the coloured pill, so someone can tell at a glance whether a mic is
worth their night. Keep it short — it has to fit in a pill.

| You write | Pill | Means |
|---|---|---|
| `Comedy` | orange | Stand-up only |
| `Mixed` | purple | Comedy, music and poetry all welcome |
| `Music & poetry` | teal | No comedy |

Matching is loose: `Comedy only`, `comedy`, and `Stand-up` all come out orange;
`Variety` and `Open format` come out purple. Anything it doesn't recognise gets
a plain grey pill rather than breaking. Blank means no type pill at all.

### Hiding a mic without deleting it

Set `Active` to `FALSE`. It also understands `No`, `N`, `0`, `Off`, and
`Hidden`. Anything else counts as showing — including a typo, deliberately, so
a slip never silently hides a real mic.

### Capitals and spare spaces don't matter

`monday`, `Monday`, and `MONDAY` all become **Monday**. `Logan` and `logan`
count as the same city rather than splitting the filter into two entries.
Trailing spaces are trimmed.

---

## Settings you might edit

All three sit together at the top of `directory.js`, under `SETTINGS`.

```js
var SHEET_URL     = "https://docs.google.com/.../output=csv";
var SUBSTACK      = "jackylegs";
var CONTACT_EMAIL = "";
```

- **`SHEET_URL`** — the published sheet. Only changes if you republish and
  Google hands you a new address.
- **`SUBSTACK`** — the middle bit of `https://`**`jackylegs`**`.substack.com`.
  When you make a dedicated open mic Substack, change this one word; the signup
  form and the "Read past issues" link both follow it.
- **`CONTACT_EMAIL`** — currently empty, so the footer just reads "All listings
  are hand-checked." Put an address in and it gains a "Tell me" link. Anything
  published there can be harvested by spammers, so use an address you don't
  mind being public.

### After editing any code file

Browsers keep their own copy of `style.css` and `directory.js`. Bump **both**
version numbers in `index.html` to the same next number:

```html
<link rel="stylesheet" href="style.css?v=12">     <!-- line 8 -->
<script src="directory.js?v=12"></script>          <!-- near the bottom -->
```

If you edit a file and the site stubbornly doesn't change, this is almost
always why.

---

## What the page does in each situation

| Situation | What people see |
|---|---|
| Sheet has mics | Cards, soonest first — today's at the top, then tomorrow's, round the week. Earliest start time first within a day. |
| Sheet is empty | "No mics listed yet." |
| Sheet unreachable | "Couldn't load the listings right now." Never a blank page. The real reason is printed to the browser console. |
| Filters match nothing | "No mics match what you picked," with a Clear filters button. |

## The filters

City, Day, Type, and a search box. They stack — City = Salt Lake City plus
Type = Comedy shows only SLC comedy mics.

**The dropdowns build themselves from the sheet.** You never edit HTML to add a
choice. List a mic in Ogden and "Ogden" appears in the City menu on its own.
The Day menu shows only days you actually have mics on, in week order.

The search box looks through name, venue, address, city, host, notes, type,
signup method, and day. Capitals don't matter.

## The newsletter

The form is **ours**, styled to match the site. Substack owns the list. On
submit, the reader goes to Substack's subscribe page with their address already
filled in and confirms with one click.

So the box looks like your site, but signup *finishes* on Substack. That's the
honest cost of not running your own subscriber database — and it means no email
address is ever stored or sent by this website. The address only ever goes into
a link the reader's own browser follows.

We deliberately do **not** use Substack's iframe embed: it can't be restyled
from outside, so it always looked like Substack instead of like this site.

---

## The blog

Posts are written in **Google Docs**. A second sheet lists them.

### Writing a post

1. Write it in a normal Google Doc.
2. **File → Share → Publish to web → Publish.** Copy the link.
3. Add a row to the **Posts** sheet with the title, the date, and that link.
4. Wait up to five minutes, refresh. It's live.

That's it — no code, no git, no uploading.

### The one habit to learn

**Use the style dropdown for headings.** It's the box in the toolbar that says
"Normal text". Pick **Heading 1** or **Heading 2** for your headings.

Do *not* make a heading by just enlarging or bolding the text. Google only
marks it as a real heading when you use that dropdown, and the site can only
show it as a heading if Google marked it as one. Bold text and a heading look
similar in the Doc but are completely different underneath.

Bold, italic, bulleted lists, numbered lists, links, images, and tables all
carry across on their own with nothing special required.

### What the Posts sheet needs

| Column | What goes in it | Example |
|---|---|---|
| `Title` | Post title, shown on the site | What I learned bombing at Wiseguys |
| `Date` | Publication date | 2026-08-26 |
| `Slug` | The web address bit. Leave blank and it's made from the title. | bombing-at-wiseguys |
| `DocURL` | The published Google Doc link, ending in `/pub` | https://docs.google.com/… |
| `Summary` | One or two lines shown in the post list | — |
| `Status` | `Published`, or `Draft` to hide it | Published |

Same forgiving rule as the mics: only `Draft`, `No`, `False`, `Hidden`, or `Off`
hides a post. Anything else publishes it.

### Setting it up (once)

Make the sheet, publish that tab as CSV, and paste the address into
`POSTS_URL` at the top of `blog.js`. Until that's filled in, the blog page
politely says it isn't switched on yet.

### Why your site doesn't just show the Google Doc

A published Doc comes wrapped in Google's own fonts, colours and spacing, and
would look nothing like the rest of the site. So `blog.js` throws all of that
away and keeps only the meaning — headings, bold, italic, lists, links — and
`style.css` decides how it looks.

The awkward part it handles for you: Google doesn't write `<strong>` for bold.
It writes `<span class="c5">` plus a hidden rule saying `.c5` is bold, and it
renames those classes for every document. So the code reads each document's own
stylesheet, works out which classes mean bold or italic, and converts them.
It keys off what the styling *says*, not what the classes are *called*, which
is why it keeps working.

---

## Files you can ignore

- `listings-template.csv` — the original blank sheet, kept for reference.
- `test-data.csv` — deliberately messy mic rows used to test edge cases.
- `test-posts.csv` — the same, for blog posts.

Neither is part of the working site.


---

## Publishing changes

The listings are **not** in the code, so adding or editing a mic needs no
deploy at all — edit the sheet, wait up to five minutes, refresh.

You only need the steps below if you change `index.html`, `style.css`, or
`directory.js`. From this folder:

```bash
git add -A && git commit -m "what you changed" && git push
```

GitHub rebuilds the site within about a minute. Remember to bump both `?v=`
numbers in `index.html` first, or browsers will keep running the old copy.

### Where things live

- **Code:** <https://github.com/jackylegs-oss/northern-utah-open-mics>
- **Live site:** <https://jackylegs-oss.github.io/northern-utah-open-mics/>
- **Listings sheet:** your Google Drive, "Open Mic Listings"
- **Newsletter:** <https://jackylegs.substack.com>
