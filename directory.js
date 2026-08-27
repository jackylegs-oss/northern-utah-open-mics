/* ============================================================
   NORTHERN UTAH OPEN MICS

   The only code file on the site. It does two jobs:

     A. The newsletter signup - checks the address looks real,
        then hands it to Substack.

     B. The directory - downloads your Google Sheet, turns it into
        mic cards, and runs the filters above them.

   Everything you might want to change lives in SETTINGS, directly
   below. The rest is grouped into labelled sections in the order
   it runs.

   If anything goes wrong it puts a message on the page rather than
   leaving a blank screen, and prints the real reason to the browser
   console (right-click > Inspect > Console).
   ============================================================ */


/* ============================================================
   SETTINGS - the only lines here you are likely to edit
   ============================================================ */

/* Your published sheet. File > Share > Publish to web, as CSV.
   If you ever republish, paste the new URL here. */
var SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQuAfAxpgBKuvA8WSeh_YKAGvuRcTpiiOAbYyh-q1_k7ZP9BKzgiOGIfSwUj5r0SVWIC8JOtaZzLPWn/pub?gid=0&single=true&output=csv";


/* Your Substack, as it appears in the web address:
   https://THIS-BIT.substack.com
   If you make a dedicated open mic Substack later, change this one
   word - the signup form and the archive link both follow it. */
var SUBSTACK = "jackylegs";


/* Where people report a wrong or missing mic. Leave it as "" and the
   footer note simply says the listings are hand-checked, with no
   link. Put an address in and it becomes a "Tell me" link.
   Worth knowing: an address published here can be picked up by
   spammers, so use one you don't mind being public. */
var CONTACT_EMAIL = "";


/* ============================================================
   THE BITS OF THE PAGE WE TALK TO
   ============================================================ */

var listingsBox   = document.getElementById("listings");
var cityFilter    = document.getElementById("filter-city");
var dayFilter     = document.getElementById("filter-day");
var typeFilter    = document.getElementById("filter-type");
var searchFilter  = document.getElementById("filter-search");
var countBox      = document.getElementById("result-count");
var countText     = document.getElementById("result-count-text");
var clearButton   = document.getElementById("clear-filters");

/* Every switched-on mic from the sheet, sorted. The filters never
   change this list - they only choose which parts of it to draw. */
var allMics = [];


/* ============================================================
   THE NEWSLETTER SIGNUP

   The form is ours, so it matches the rest of the site. Substack
   still owns the actual list: when someone submits, we send them
   to Substack's subscribe page with their address already typed
   in, and they finish with one click there.

   Nothing about this page ever stores or transmits an email
   address anywhere else - it only puts it in the link.
   ============================================================ */

setupNewsletter();
setupContactNote();

function setupNewsletter() {
  var form     = document.getElementById("newsletter-form");
  var input    = document.getElementById("newsletter-email");
  var errorBox = document.getElementById("newsletter-error");
  var noteBox  = document.getElementById("newsletter-note");
  var home     = "https://" + SUBSTACK + ".substack.com";

  if (noteBox) {
    noteBox.innerHTML =
      'Free. One email a week. Unsubscribe any time. ' +
      '<a href="' + home + '/archive">Read past issues</a>';
  }

  if (!form) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var email = trim(input.value);

    if (!looksLikeEmail(email)) {
      showError(errorBox, input,
        email ? "That doesn't look like an email address."
              : "Enter your email address first.");
      input.focus();
      return;
    }

    clearError(errorBox, input);
    // Hand off to Substack with the address already filled in.
    window.location.href = home + "/subscribe?email=" + encodeURIComponent(email);
  });

  // Stop showing the complaint as soon as they start fixing it.
  input.addEventListener("input", function () {
    clearError(errorBox, input);
  });

  // Pressing Enter in the box should subscribe, same as clicking the
  // button. Browsers normally do this for you; we handle it here too
  // so it can't depend on that. Older browsers report the key as the
  // number 13 instead of the word "Enter", so we accept both.
  input.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.keyCode !== 13) return;
    event.preventDefault();
    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
    } else {
      form.dispatchEvent(new Event("submit", { cancelable: true }));
    }
  });
}

/* The "something wrong or missing?" line under the listings. Only
   becomes a link if CONTACT_EMAIL is filled in up in SETTINGS -
   otherwise we leave the sentence alone rather than offer a link
   that goes nowhere. */
function setupContactNote() {
  var note = document.getElementById("verified-note");
  if (!note || !CONTACT_EMAIL) return;
  note.innerHTML = 'All listings are hand-checked. Something wrong or missing? ' +
    '<a href="mailto:' + safe(CONTACT_EMAIL) + '">Tell me</a>.';
}


/* Deliberately loose. Real address validation is a fool's errand -
   this only catches obvious slips like a missing @ or a trailing
   dot. Substack does the real checking. */
function looksLikeEmail(text) {
  return /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(trim(text));
}

function showError(box, input, message) {
  if (!box) return;
  box.textContent = message;
  box.hidden = false;
  input.setAttribute("aria-invalid", "true");
}

function clearError(box, input) {
  if (!box) return;
  box.hidden = true;
  input.removeAttribute("aria-invalid");
}


/* ============================================================
   GOING AND GETTING THE SHEET
   ============================================================ */

/* The "?t=" on the end is a throwaway number that changes every time
   the page loads. Without it a browser will happily show a copy of the
   sheet it downloaded hours ago. Google still holds its own copy for
   about 5 minutes, so an edit takes up to that long to show up here. */
fetch(SHEET_URL + "&t=" + Date.now())
  .then(function (response) {
    if (!response.ok) {
      throw new Error("Google said " + response.status);
    }
    return response.text();
  })
  .then(function (csvText) {
    var mics = parseCsv(csvText);
    showMics(mics);
  })
  .catch(function (error) {
    console.error("Could not load the sheet:", error);
    showMessage(
      "Couldn't load the listings right now.",
      "The schedule lives in a Google Sheet and it didn't answer. " +
      "Try refreshing in a minute."
    );
  });


/* ============================================================
   TURNING CSV TEXT INTO A LIST

   A CSV is just lines of comma-separated values. The catch is
   that a value wrapped in "quotes" is allowed to contain commas
   of its own, like an address. So we walk through the text one
   character at a time and keep track of whether we're currently
   inside quotes.
   ============================================================ */

function parseCsv(text) {
  var rows = [];
  var row = [];
  var value = "";
  var insideQuotes = false;

  for (var i = 0; i < text.length; i++) {
    var char = text[i];

    if (insideQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {   // "" means a real quote mark
          value += '"';
          i++;
        } else {
          insideQuotes = false;      // closing quote
        }
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      insideQuotes = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }

  // Whatever is left over when the text ends.
  row.push(value);
  rows.push(row);

  // The first row is the column names. Every row after it becomes
  // an object like { Name: "Monday Night Mic", City: "Logan", ... }
  var headers = rows.shift().map(trim);
  var mics = [];

  rows.forEach(function (cells) {
    // Skip fully blank lines.
    if (cells.every(function (c) { return trim(c) === ""; })) return;

    var mic = {};
    headers.forEach(function (header, index) {
      mic[header] = trim(cells[index] || "");
    });
    mics.push(mic);
  });

  return mics;
}

function trim(text) {
  return String(text == null ? "" : text).trim();
}


/* ============================================================
   WORKING OUT DAYS AND TIMES, SO TONIGHT COMES FIRST
   ============================================================ */

var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday",
            "Thursday", "Friday", "Saturday"];

/* How many days from today until this mic runs? Today = 0. */
function daysFromToday(dayName) {
  var micDay = DAYS.indexOf(properDay(dayName));
  if (micDay === -1) return 99;              // unrecognized day, send to bottom
  var today = new Date().getDay();
  return (micDay - today + 7) % 7;
}

/* Accepts "monday", "MONDAY", "Mon" and returns "Monday". */
function properDay(dayName) {
  var wanted = trim(dayName).toLowerCase();
  for (var i = 0; i < DAYS.length; i++) {
    if (DAYS[i].toLowerCase().indexOf(wanted) === 0 && wanted.length >= 3) {
      return DAYS[i];
    }
  }
  return trim(dayName);
}

/* "8:00 PM" becomes 1200, so times can be compared as numbers. */
function timeAsNumber(timeText) {
  var match = trim(timeText).match(/(\d{1,2})(?::(\d{2}))?\s*([apAP])/);
  if (!match) return 9999;
  var hour = parseInt(match[1], 10) % 12;
  var minute = parseInt(match[2] || "0", 10);
  if (match[3].toLowerCase() === "p") hour += 12;
  return hour * 60 + minute;
}


/* ============================================================
   DECIDING WHAT TO SHOW
   ============================================================ */

function showMics(micsFromSheet) {
  // Only the ones switched on in the sheet.
  allMics = micsFromSheet.filter(isActive);

  if (allMics.length === 0) {
    showMessage(
      "No mics listed yet.",
      "The schedule is still being built. Sign up above and you'll get it " +
      "the week it's ready."
    );
    return;
  }

  // Sort once, here. Soonest first.
  allMics.sort(function (a, b) {
    var dayGap = daysFromToday(a.Day) - daysFromToday(b.Day);
    if (dayGap !== 0) return dayGap;
    return timeAsNumber(a.StartTime) - timeAsNumber(b.StartTime);
  });

  fillDropdowns();
  listenForChanges();
  applyFilters();
}


/* ============================================================
   THE FILTERS

   The dropdowns are built from your sheet, not typed into the HTML.
   Add a mic in a new city and that city appears in the City menu by
   itself.
   ============================================================ */

function fillDropdowns() {
  addOptions(cityFilter, uniqueValues("City").sort());
  addOptions(typeFilter, uniqueValues("Type").sort());

  // Days go in week order, not alphabetical.
  var daysInSheet = uniqueValues("Day").map(properDay);
  addOptions(dayFilter, DAYS.filter(function (day) {
    return daysInSheet.indexOf(day) !== -1;
  }));
}

/* Every different value in one column, with blanks dropped.
   Two spellings of the same thing - "Logan" and "logan" - count as
   one, so a stray capital in the sheet can't split a filter in two.
   The first spelling seen is the one shown. */
function uniqueValues(columnName) {
  var seen = [];
  var seenLower = [];
  allMics.forEach(function (mic) {
    var value = trim(mic[columnName]);
    if (!value) return;
    if (seenLower.indexOf(value.toLowerCase()) !== -1) return;
    seen.push(value);
    seenLower.push(value.toLowerCase());
  });
  return seen;
}

function addOptions(dropdown, values) {
  values.forEach(function (value) {
    var option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    dropdown.appendChild(option);
  });
}

/* Redraw whenever any control is touched. */
function listenForChanges() {
  [cityFilter, dayFilter, typeFilter].forEach(function (dropdown) {
    dropdown.addEventListener("change", applyFilters);
  });
  searchFilter.addEventListener("input", applyFilters);
  clearButton.addEventListener("click", clearFilters);
}

function clearFilters() {
  cityFilter.value = "";
  dayFilter.value = "";
  typeFilter.value = "";
  searchFilter.value = "";
  applyFilters();
}

/* The heart of it: keep the mics that pass every active filter. */
function applyFilters() {
  var wantedCity = cityFilter.value;
  var wantedDay  = dayFilter.value;
  var wantedType = typeFilter.value;
  var words      = trim(searchFilter.value).toLowerCase();

  var matches = allMics.filter(function (mic) {
    if (wantedCity && !same(mic.City, wantedCity)) return false;
    if (wantedDay && properDay(mic.Day) !== wantedDay) return false;
    if (wantedType && !same(mic.Type, wantedType)) return false;
    if (words && searchableText(mic).indexOf(words) === -1) return false;
    return true;
  });

  drawResults(matches);
}

/* Same text, ignoring capitals and stray spaces. */
function same(a, b) {
  return trim(a).toLowerCase() === trim(b).toLowerCase();
}

/* Everything the search box is allowed to look through. */
function searchableText(mic) {
  return [mic.Name, mic.Venue, mic.Address, mic.City, mic.Host,
          mic.Notes, mic.Type, mic.SignupMethod, mic.Day]
    .map(trim).join(" ").toLowerCase();
}

function drawResults(matches) {
  var filtering = isFiltering();

  if (matches.length === 0) {
    showMessage(
      "No mics match what you picked.",
      "Try widening one of the filters, or clear them and start over."
    );
  } else {
    listingsBox.innerHTML = matches.map(buildCard).join("");
  }

  listingsBox.removeAttribute("aria-busy");
  updateCount(matches.length, filtering);
}

function isFiltering() {
  return Boolean(cityFilter.value || dayFilter.value ||
                 typeFilter.value || trim(searchFilter.value));
}

function updateCount(shown, filtering) {
  countBox.hidden = false;
  clearButton.hidden = !filtering;

  if (!filtering) {
    countText.textContent =
      shown + (shown === 1 ? " mic" : " mics") + " listed";
  } else {
    countText.textContent =
      "Showing " + shown + " of " + allMics.length + " mics";
  }
}


/* ============================================================
   BUILDING ONE CARD
   ============================================================ */

/* Is this mic switched on? Accepts the ways people actually type it:
   TRUE/FALSE, Yes/No, Y/N, 1/0. Anything unrecognized counts as ON,
   so a typo never silently hides a real mic. */
function isActive(mic) {
  var value = trim(mic.Active).toUpperCase();
  var off = ["FALSE", "NO", "N", "0", "OFF", "HIDE", "HIDDEN"];
  return off.indexOf(value) === -1;
}


/* What kind of mic is it? Returns a CSS class so each type gets its
   own color. Matches loosely, so "Comedy only" and "comedy" both work. */
function typeClass(typeText) {
  var text = trim(typeText).toLowerCase();
  if (!text) return "";

  // "Mixed" / "variety" / "open format" says it outright, so check
  // for those first - otherwise the word "mixed" gets mistaken for
  // a music-and-poetry mic.
  if (/mixed|variety|open format|everything/.test(text)) return "type-mixed";

  var hasComedy = /comedy|stand.?up|standup/.test(text);
  var hasOther  = /music|poetry|poem|spoken|song|singer/.test(text);

  if (hasComedy && hasOther) return "type-mixed";
  if (hasComedy)             return "type-comedy";
  if (hasOther)              return "type-music";
  return "type-other";
}


function buildCard(mic) {
  var facts = [
    fact("Sign up", [mic.SignupTime, mic.SignupMethod].filter(Boolean).join(", ")),
    fact("Set length", mic.SetLength),
    fact("Cost", mic.Cost),
    fact("Ages", mic.AgeLimit),
    fact("Host", mic.Host)
  ].join("");

  return '' +
    '<article class="mic">' +
      '<div class="mic-when">' +
        '<span class="mic-day">' + safe(properDay(mic.Day)) + '</span>' +
        '<span class="mic-time">' + safe(mic.StartTime) + '</span>' +
      '</div>' +
      '<div class="mic-body">' +
        '<h3 class="mic-name">' + safe(mic.Name) + '</h3>' +
        '<p class="mic-venue">' + safe(mic.Venue) +
          (mic.City ? ' &middot; ' + safe(mic.City) : '') + '</p>' +
        (mic.Address ? '<p class="mic-address">' + safe(mic.Address) + '</p>' : '') +
        (facts ? '<ul class="mic-facts">' + facts + '</ul>' : '') +
        (mic.Notes ? '<p class="mic-notes">' + safe(mic.Notes) + '</p>' : '') +
        buildLink(mic.Link) +
      '</div>' +
      buildTags(mic) +
    '</article>';
}

/* The pills in the corner: what kind of mic, then how often.
   Either one is skipped if its cell is blank. */
function buildTags(mic) {
  var pills = "";

  if (trim(mic.Type)) {
    pills += '<span class="tag tag-type ' + typeClass(mic.Type) + '">' +
             safe(mic.Type) + '</span>';
  }
  if (trim(mic.Frequency)) {
    pills += '<span class="tag">' + safe(mic.Frequency) + '</span>';
  }

  return pills ? '<div class="mic-tags">' + pills + '</div>' : '';
}


/* One "Cost  Free" line. Returns nothing if the cell was empty. */
function fact(label, value) {
  if (!trim(value)) return "";
  return '<li><strong>' + safe(label) + '</strong> ' + safe(value) + '</li>';
}

/* Only makes a link if the cell holds a real web address. */
function buildLink(url) {
  var clean = trim(url);
  if (!/^https?:\/\//i.test(clean)) return "";
  return '<p class="mic-links"><a href="' + safe(clean) +
         '" target="_blank" rel="noopener">More info</a></p>';
}

/* ============================================================
   SMALL HELPERS
   ============================================================ */

/* Shows a friendly headline + explanation instead of cards.
   Every "something to say instead of listings" path comes through
   here, which is also why aria-busy gets cleared here - so no single
   path can forget to stop announcing "still loading". */
function showMessage(headline, detail) {
  listingsBox.innerHTML =
    '<div class="notice">' +
      '<p class="notice-headline">' + safe(headline) + '</p>' +
      '<p class="notice-detail">' + safe(detail) + '</p>' +
    '</div>';
  listingsBox.removeAttribute("aria-busy");
}

/* Stops stray characters in the sheet from breaking the page. */
function safe(text) {
  return trim(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
