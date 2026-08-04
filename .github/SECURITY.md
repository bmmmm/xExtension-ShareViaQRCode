# Security policy

## Reporting a vulnerability

Mail **hi@brtsz.de**. Please do not open a public issue for something that is
exploitable — a report that arrives privately gets a fix before it gets an
audience.

You should have an acknowledgement within **72 hours** and an assessment —
whether it is a vulnerability, and if so what the fix looks like — within
**7 days**. If a fix is warranted, the release goes out before or together with
the write-up describing it; the advisory comes last.

If you have not heard back within a week, assume the mail went astray and send
it again rather than concluding the report was ignored.

## What to include

This extension runs entirely in the browser, on data a feed controls, inside a
theme this repository does not ship. A report that reproduces on someone else's
install needs enough of that context to rebuild:

- **FreshRSS version** (*About* → the version string).
- **Extension version** (`metadata.json`, or the release you installed).
- **Theme** in use, and whether the problem survives switching to the base theme.
- **Browser and version.**
- **A link to an article that reproduces it**, or the raw article link if the
  article itself is not public — the link is the untrusted input this extension
  is built around, so it is usually the whole reproducer.
- **What you expected and what happened**, and whether it needs a click, the
  keyboard shortcut, or neither.

A proof of concept is welcome but not required. So is a proposed fix.

## Scope

In scope: anything in this repository — the extension code, the bundled QR
library, the configuration form, the CI workflow.

Out of scope, and better reported upstream: FreshRSS core itself
(https://github.com/FreshRSS/FreshRSS/security), the QR library
(https://github.com/kazuhikoarase/qrcode-generator), and the server a FreshRSS
instance runs on.

Two things that are known and deliberate rather than bugs:

- **The extension does not validate the content of a link, only its scheme.** An
  `https:` link to a hostile site becomes a QR code, which is why the URL is
  printed as text underneath.
- **Tracking parameters are removed from a fixed denylist, not by a heuristic.**
  An unrecognised tracking parameter surviving in a link is expected behaviour;
  it is still worth reporting as an addition to the list, just not as a
  vulnerability.
