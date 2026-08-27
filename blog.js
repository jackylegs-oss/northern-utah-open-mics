/* ============================================================
   NORTHERN UTAH OPEN MICS  -  the blog

   Posts are written in Google Docs. This file turns a published
   Doc into clean HTML that matches the rest of the site.

   Why it isn't just "show me the Doc": a published Google Doc is
   wrapped in Google's own fonts, colours and spacing, which would
   look nothing like this site. So we throw all of that away and
   keep only the meaning - headings, bold, italic, lists, links -
   then let style.css decide how it looks.

   The tricky part, explained once:
   Google does not write <strong>bold</strong>. It writes
   <span class="c5"> and then, further up the page, a rule saying
   .c5 { font-weight: 700 }. Those class names are regenerated for
   every document, so we cannot look for "c5". Instead we read the
   document's own stylesheet, work out which classes mean bold or
   italic, and convert those. That keys off what the CSS *says*,
   not what the classes are *called*, so it keeps working.
   ============================================================ */


/* ---- SETTINGS ---------------------------------------------- */

/* The Posts tab of your sheet, published as CSV. Same File >
   Share > Publish to web as the listings, but pick the Posts tab. */
var POSTS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTUCVYNdj4mfOLR2askibiTv49xPDzJVUOuWyJWGjw1EdUIaO9OqQkWnL6rPbccajHJPuRUKfa96dU_/pub?gid=0&single=true&output=csv";


/* ============================================================
   TURNING A PUBLISHED GOOGLE DOC INTO CLEAN HTML
   ============================================================ */

/* Tags we allow through. Anything else is unwrapped or dropped. */
var ALLOWED = ["H1","H2","H3","H4","H5","H6","P","BR","HR",
               "UL","OL","LI","STRONG","EM","U","S",
               "A","IMG","BLOCKQUOTE","SUP","SUB",
               "TABLE","THEAD","TBODY","TR","TH","TD"];

function docHtmlToClean(rawHtml) {
  var doc = new DOMParser().parseFromString(rawHtml, "text/html");

  // Google's own stylesheet tells us which classes mean bold/italic.
  var styling = readGoogleStyles(doc);

  var source = doc.querySelector(".doc-content") ||
               doc.querySelector("#contents") ||
               doc.body;
  if (!source) return "";

  var out = document.createElement("div");
  out.innerHTML = source.innerHTML;

  out.querySelectorAll("script, style, meta, link").forEach(function (n) {
    n.remove();
  });

  applyEmphasis(out, styling);
  collapseNesting(out);
  unwrapGoogleLinks(out);
  stripToMeaning(out);
  dropEmptyBlocks(out);

  // Last line of defence: even though everything above is ours,
  // run it through DOMPurify so a surprise in the Doc can never
  // put a script on the page.
  return window.DOMPurify.sanitize(out.innerHTML, {
    ALLOWED_TAGS: ALLOWED.map(function (t) { return t.toLowerCase(); }),
    ALLOWED_ATTR: ["href", "src", "alt", "title", "colspan", "rowspan"]
  });
}

/* Read every ".c12 { ... }" rule and note which ones are bold or
   italic. Returns something like { bold: ["c5"], italic: ["c7"] }. */
function readGoogleStyles(doc) {
  var css = "";
  doc.querySelectorAll("style").forEach(function (s) { css += s.textContent; });

  var bold = [];
  var italic = [];
  var rule = /\.([A-Za-z0-9_-]+)\s*\{([^}]*)\}/g;
  var found;

  while ((found = rule.exec(css)) !== null) {
    var name = found[1];
    var body = found[2];
    if (/font-weight:\s*(700|800|900|bold)/i.test(body)) bold.push(name);
    if (/font-style:\s*italic/i.test(body)) italic.push(name);
  }
  return { bold: bold, italic: italic };
}

/* Turn the spans Google used for bold and italic into real tags. */
function applyEmphasis(root, styling) {
  root.querySelectorAll("span, p, li").forEach(function (el) {
    var classes = (el.getAttribute("class") || "").split(/\s+/);
    var inline  = el.getAttribute("style") || "";

    var isBold = /font-weight:\s*(700|800|900|bold)/i.test(inline) ||
      classes.some(function (c) { return styling.bold.indexOf(c) !== -1; });
    var isItalic = /font-style:\s*italic/i.test(inline) ||
      classes.some(function (c) { return styling.italic.indexOf(c) !== -1; });

    // A whole heading being bold is just what headings look like -
    // don't nest a <strong> inside it.
    var insideHeading = el.closest("h1,h2,h3,h4,h5,h6");

    if (isBold && !insideHeading) wrapInside(el, "strong");
    if (isItalic) wrapInside(el, "em");
  });
}

/* A paragraph and the span inside it can both be marked bold, which
   would give us <strong><strong>text</strong></strong>. Renders the
   same, but it's untidy, so flatten any doubled-up pair. */
function collapseNesting(root) {
  root.querySelectorAll("strong strong, em em").forEach(function (inner) {
    var parent = inner.parentNode;
    while (inner.firstChild) parent.insertBefore(inner.firstChild, inner);
    parent.removeChild(inner);
  });
}

/* Put the element's contents inside a new tag, keeping the element. */
function wrapInside(el, tagName) {
  if (!el.textContent.trim()) return;
  var wrapper = document.createElement(tagName);
  while (el.firstChild) wrapper.appendChild(el.firstChild);
  el.appendChild(wrapper);
}

/* Google routes links through google.com/url?q=... - point them at
   where the reader actually wants to go. */
function unwrapGoogleLinks(root) {
  root.querySelectorAll("a[href]").forEach(function (a) {
    var href = a.getAttribute("href") || "";
    var match = href.match(/[?&]q=([^&]+)/);
    if (href.indexOf("google.com/url") !== -1 && match) {
      a.setAttribute("href", decodeURIComponent(match[1]));
    }
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener");
  });
}

/* Remove every class, style and id, and unwrap tags we don't keep
   (mostly Google's nested <div>s and now-empty <span>s). */
function stripToMeaning(root) {
  root.querySelectorAll("*").forEach(function (el) {
    el.removeAttribute("class");
    el.removeAttribute("style");
    el.removeAttribute("id");
    el.removeAttribute("dir");
  });

  var changed = true;
  while (changed) {
    changed = false;
    root.querySelectorAll("*").forEach(function (el) {
      if (ALLOWED.indexOf(el.tagName) !== -1) return;
      var parent = el.parentNode;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      changed = true;
    });
  }
}

/* Google writes an empty paragraph for every blank line you leave.
   They'd render as odd gaps, so drop the ones holding nothing. */
function dropEmptyBlocks(root) {
  root.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6").forEach(function (el) {
    if (!el.textContent.trim() && !el.querySelector("img, br, hr")) el.remove();
  });
}


/* ============================================================
   LOADING THE LIST OF POSTS

   The Posts tab of your sheet is the table of contents. Each row
   points at a Google Doc holding the actual writing.
   ============================================================ */

var postListBox = document.getElementById("post-list");
var postBox     = document.getElementById("post");
var latestBox   = document.getElementById("latest-post");

if (postListBox || postBox || latestBox) startBlog();

function startBlog() {
  if (!POSTS_URL) {
    // On the mics page there is nothing to say about this - just
    // leave the teaser hidden rather than showing an error to readers.
    if (!postListBox && !postBox) return;
    blogMessage("The blog isn't switched on yet.",
      "Once the Posts sheet is published, its address goes in the " +
      "POSTS_URL setting at the top of blog.js.");
    return;
  }

  fetch(POSTS_URL + "&t=" + Date.now())
    .then(function (r) {
      if (!r.ok) throw new Error("Google said " + r.status);
      return r.text();
    })
    .then(function (csv) {
      var posts = parseCsv(csv).filter(isPublished);
      posts.sort(function (a, b) { return dateValue(b.Date) - dateValue(a.Date); });
      if (postListBox) showPostList(posts);
      if (postBox) showSinglePost(posts);
      if (latestBox) showLatestPost(posts);
    })
    .catch(function (error) {
      console.error("Could not load the posts sheet:", error);
      blogMessage("Couldn't load the posts right now.",
        "The list lives in a Google Sheet and it didn't answer. " +
        "Try refreshing in a minute.");
    });
}

/* Same forgiving rule the mics use: only an explicit "no" hides it. */
function isPublished(post) {
  var value = trim(post.Status).toUpperCase();
  return ["DRAFT","FALSE","NO","N","0","HIDDEN","OFF"].indexOf(value) === -1;
}

/* Turns "8/26/26" or "2026-08-26" into something sortable.

   The fiddly bit: JavaScript reads "2026-08-26" as midnight UTC,
   then shows it in your timezone - which in Utah is six hours
   earlier, i.e. the previous evening. A post dated the 26th would
   display as the 25th. So we read year-month-day ourselves and
   build the date in local time, where no shift can happen. */
function dateValue(text) {
  var clean = trim(text);
  var iso = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return new Date(+iso[1], +iso[2] - 1, +iso[3]).getTime();
  }
  var parsed = Date.parse(clean);
  return isNaN(parsed) ? 0 : parsed;
}

/* "8/26/26" -> "26 August 2026". Falls back to whatever you typed. */
function prettyDate(text) {
  var stamp = dateValue(text);
  if (!stamp) return trim(text);
  return new Date(stamp).toLocaleDateString("en-GB",
    { day: "numeric", month: "long", year: "numeric" });
}

/* The web address bit: "My First Set" -> "my-first-set". */
function slugFor(post) {
  var given = trim(post.Slug);
  if (given) return given.toLowerCase();
  return trim(post.Title).toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


/* ============================================================
   THE BLOG INDEX - every post, newest first
   ============================================================ */

function showPostList(posts) {
  if (posts.length === 0) {
    blogMessage("No posts yet.",
      "Write one in Google Docs, add a row to the Posts sheet, and it " +
      "appears here.");
    return;
  }

  postListBox.innerHTML = posts.map(function (post) {
    var link = "post.html?p=" + encodeURIComponent(slugFor(post));
    return '' +
      '<article class="post-card">' +
        '<p class="post-date">' + safe(prettyDate(post.Date)) + '</p>' +
        '<h2 class="post-card-title">' +
          '<a href="' + link + '">' + safe(post.Title) + '</a></h2>' +
        (trim(post.Summary)
          ? '<p class="post-summary">' + safe(post.Summary) + '</p>' : '') +
      '</article>';
  }).join("");

  postListBox.removeAttribute("aria-busy");
}


/* The "latest from the blog" strip on the mics page. Stays hidden
   if there is nothing to show, so the page never gains an empty box. */
function showLatestPost(posts) {
  if (posts.length === 0) return;
  var post = posts[0];
  latestBox.innerHTML =
    '<p class="latest-label">Latest from the blog</p>' +
    '<h2 class="latest-title"><a href="post.html?p=' +
      encodeURIComponent(slugFor(post)) + '">' + safe(post.Title) + '</a></h2>' +
    (trim(post.Summary)
      ? '<p class="post-summary">' + safe(post.Summary) + '</p>' : '') +
    '<p class="latest-more"><a href="blog.html">All posts &rarr;</a></p>';
  latestBox.hidden = false;
}


/* ============================================================
   ONE POST - reads ?p=the-slug from the web address
   ============================================================ */

function showSinglePost(posts) {
  var wanted = new URLSearchParams(window.location.search).get("p");
  var post = posts.filter(function (p) { return slugFor(p) === wanted; })[0];

  if (!post) {
    blogMessage("Post not found.",
      "That link may be out of date. Try the list of all posts below.");
    return;
  }

  document.title = trim(post.Title) + " — Northern Utah Open Mics";

  var docUrl = trim(post.DocURL);
  if (!/^https:\/\/docs\.google\.com\//.test(docUrl)) {
    blogMessage("This post has no document attached.",
      "The DocURL cell for “" + trim(post.Title) + "” needs the " +
      "published Google Doc address.");
    return;
  }

  fetch(docUrl)
    .then(function (r) {
      if (!r.ok) throw new Error("Google said " + r.status);
      return r.text();
    })
    .then(function (raw) {
      postBox.innerHTML =
        '<p class="post-date">' + safe(prettyDate(post.Date)) + '</p>' +
        '<h2 class="post-title">' + safe(post.Title) + '</h2>' +
        '<div class="post-body">' + docHtmlToClean(raw) + '</div>';
      postBox.removeAttribute("aria-busy");
    })
    .catch(function (error) {
      console.error("Could not load the document:", error);
      blogMessage("Couldn't load this post.",
        "The writing lives in a Google Doc and it didn't answer. Check " +
        "the Doc is still published to the web, then try again.");
    });
}

/* A headline and an explanation, in whichever box this page has. */
function blogMessage(headline, detail) {
  var box = postBox || postListBox;
  if (!box) return;
  box.innerHTML =
    '<div class="notice">' +
      '<p class="notice-headline">' + safe(headline) + '</p>' +
      '<p class="notice-detail">' + safe(detail) + '</p>' +
    '</div>';
  box.removeAttribute("aria-busy");
}
