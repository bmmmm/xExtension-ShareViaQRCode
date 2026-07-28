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
  shortcut <kbd>G</kbd>.
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
node --test tests/strip-tracking.test.js
```

## Installation

1. Download this repository and place the `xExtension-ShareViaQRCode` directory
   into the `extensions/` directory of your FreshRSS installation.
2. Enable **Share via QR Code** under *Configuration → Extensions*.

There is nothing to configure. Whether a link should be internal or external is
a per-article decision, so it is a switch in the overlay rather than a setting.

## Shortcut

<kbd>G</kbd> opens the overlay for the current article — the one selected with
<kbd>J</kbd>/<kbd>K</kbd>, or the first one on the page if none is selected.
The key is free in FreshRSS' default set; if you have reassigned it to a core
action, that action wins and the extension stays out of the way.

## Bundled QR library

`static/vendor/qrcode.js` is
[qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 2.0.4 by
Kazuhiko Arase, MIT licensed (see `static/vendor/qrcode.LICENSE`), unmodified
and with no dependencies of its own. It is vendored rather than loaded from a
CDN because a sane `script-src` policy will not allow a third-party origin, and
it is fetched lazily on the first click so it costs nothing until used.

*QR Code* is a registered trademark of DENSO WAVE INCORPORATED.

## Translations

English and German are included. The strings travel through the `JsVars` hook,
so adding a language only means adding an `i18n/<code>/ext.php` file.

## Licence

[AGPL-3.0](LICENSE), matching FreshRSS itself.

## Support

If you find this useful, you can [buy me a coffee](https://ko-fi.com/bmabma).
