# Share via QR Code

A [FreshRSS](https://freshrss.org) extension that shows a large QR code for the
article you are reading, so a phone can pick up the link from the screen.

## Why

Getting an article from a desktop browser to a phone otherwise takes a detour:
star it, unlock the phone, open FreshRSS, find the favourites, open the article,
open the original, share from there. Screen to camera is the only route that
needs no additional service, no account and no app on the desktop.

## What it does

* Adds a small QR button to the bottom line of every article, and the
  shortcut <kbd>g</kbd>.
* Shows the code full size in an overlay — size is what decides whether a
  camera locks on from arm's length.
* Points at the **external article link** by default, with known tracking
  parameters removed.
* Prints the URL as text underneath, so it is clear what the code contains
  before scanning it.
* Offers a switch between the cleaned link, the untouched original and the
  FreshRSS permalink of the article. Which one is right differs per article:
  the original for a page that needs its parameters, the FreshRSS view for a
  full-text feed you want to read yourself, the cleaned link for anything you
  send to someone else.
* Has a star in the top right corner to keep the article. Marking one closes
  the overlay — that is the end of the errand. Removing one leaves it open, so
  the correction is visible.

Close the overlay with <kbd>Esc</kbd>, the ✕ or a click next to it. While it is
open, the shortcuts of the stream behind it stay inert.

## Tracking parameters

The extension uses a fixed denylist of known trackers, not a heuristic —
anything it does not recognise stays in the URL. That is a deliberate trade:
a heuristic that guesses wrong breaks the link, and the person who notices is
the one holding the phone.

If something was removed, the overlay says so by name (*1 tracking parameter
removed: `wt_mc`*) and the **Original** button is one click away. If nothing
was removed, that line does not appear at all.

The list is in `static/script.js` and covers the usual families — `utm_*`,
`wt_mc` (Webtrekk), `fbclid`, `gclid`, `mc_cid`, Matomo, HubSpot and so on.
Parameters that carry meaning (`p`, `id`, `ts`, `page`, `q`, `ref`, …) are not
on it and never will be.

`tests/strip-tracking.test.js` pins this behaviour. Run it with:

```sh
node --test tests/*.test.js
```

## Installation

Requires **FreshRSS 1.29.0 or newer** — that is where
`Minz_Extension::setUserConfigurationValue()` and the typed configuration
getters arrive. CI analyses the extension against exactly that release, so this
is a checked property rather than a claim.

1. Download the [latest release](https://github.com/bmmmm/xExtension-ShareViaQRCode/releases/latest)
   and place the `xExtension-ShareViaQRCode` directory into the `extensions/`
   directory of your FreshRSS installation. The default branch is where work in
   progress lands, so a release is the version that was actually checked.
2. Enable **Share via QR Code** under *Configuration → Extensions*.

## Settings

Under *Configuration → Extensions → Share via QR Code*:

| Setting | Default | Notes |
|---|---|---|
| Preselected link | Cleaned | Which target the overlay opens on. It is a preference, not a rule: a preselection that does not exist for an article (no tracking to strip, no entry id) falls back to the first one that does. |
| QR code size | 400 px | 200–800. A wider setting still shrinks to fit a narrow window. |
| QR code background | `#ffffff`, 100 % | Colour and opacity of the area behind the code. |
| Overlay backdrop | 65 % | How far the page behind the overlay is dimmed. |

The modules of the code stay black whatever the background is set to, because
inverted codes are read unreliably. If the chosen background is too dark or too
transparent to scan, the settings page says so instead of quietly refusing the
value — the same reasoning as for the removed-parameters line: tell the user,
then let them decide.

Whether a link should be internal or external stays a per-article decision, so
it remains a switch in the overlay; the setting only picks which one is on top.

## Shortcut

<kbd>g</kbd> opens the overlay for the current article — the one selected with
<kbd>j</kbd>/<kbd>k</kbd>, or the first one on the page if none is selected.
Plain <kbd>g</kbd> only; like the core's own single-letter shortcuts it ignores
modifiers.

The key is free in FreshRSS' default set. If you have reassigned it to a core
action, that action wins, the extension stays out of the way, and the button
stops advertising a shortcut it no longer has.

## Security

A feed decides what an article's link is, so that link is untrusted input.
FreshRSS only HTML-escapes it on the way in (SimplePie sanitises `CONSTRUCT_IRI`
with `htmlspecialchars`) — it never checks the scheme, and the browser hands the
decoded value back to JavaScript. The extension therefore:

* **Never builds HTML from feed data.** Everything goes through `textContent`
  and `createElement`; there is no `innerHTML` anywhere in the extension.
* **Only puts absolute `http:` and `https:` links into a code.** A
  `javascript:` or `data:` link gets no external target at all — only the
  FreshRSS permalink remains. Pointing a camera at a code should never be a way
  to run something. The check reads the same raw string that gets encoded, not
  a version of it resolved against the current page: `https:evil.example/x` and
  `//evil.example/x` look local next to the reader's URL but mean something
  else to a phone reading the code on its own, so both are rejected.
* **Prints the URL with the bidi algorithm overridden.** A link containing
  U+202E would otherwise display a different host than the code carries, which
  would defeat the point of printing it.
* **Validates its settings on the way in and on the way out**, so a value edited
  into `config.php` by hand cannot reach the page either.

The settings form is protected against CSRF by FreshRSS itself: `initAuth()`
rejects any POST without a valid token, and extensions are not on its exemption
list.

## Bundled QR library

`static/vendor/qrcode.js` is
[qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 2.0.4 by
Kazuhiko Arase, MIT licensed (see `static/vendor/qrcode.LICENSE`), unmodified
and with no dependencies of its own. It is vendored rather than loaded from a
CDN because a sane `script-src` policy will not allow a third-party origin, and
it is fetched lazily on the first click so it costs nothing until used.

It is third-party code running in your browser, so its exact origin is written
down in `static/vendor/PROVENANCE.md` — upstream tag, commit and git blob id —
and CI fails if the file changes without the checksum changing with it. That
makes any edit to it visible in the diff; the blob id lets you verify against
upstream without trusting this repository at all.

*QR Code* is a registered trademark of DENSO WAVE INCORPORATED.

## Development

```sh
# JavaScript tests
node --test tests/*.test.js

# JavaScript style (ESLint, aligned with FreshRSS core's own eslint.config.js)
pnpm install
pnpm run eslint

# PHP style (PHP_CodeSniffer, FreshRSS' own ruleset)
composer install
vendor/bin/phpcs .

# PHP static analysis (PHPStan). Needs FreshRSS core checked out as a sibling
# directory to resolve the Minz_Extension classes this extension extends —
# see phpstan.neon for why, and .github/workflows/ci.yml for how CI does it.
git clone --depth 1 https://github.com/FreshRSS/FreshRSS .freshrss-core
vendor/bin/phpstan analyse
```

## Translations

English and German are included. The strings travel through the `JsVars` hook,
so adding a language only means adding an `i18n/<code>/ext.php` file.

## Licence

[AGPL-3.0](LICENSE), matching FreshRSS itself.

## Support

If you find this useful, you can [buy me a coffee](https://ko-fi.com/bmabma).
