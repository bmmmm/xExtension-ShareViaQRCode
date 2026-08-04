# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
The version that matters for an installation is the one in `metadata.json`;
each release is tagged `v<version>`.

## [Unreleased]

### Removed

- The **QR code background**, **background opacity** and **overlay backdrop**
  settings. Their only correct value was the default: a code that is not black
  on opaque white scans worse, which is the one thing the code has to do. The
  contrast and opacity warnings that existed to talk users out of the other
  values went with them. The backdrop now follows the theme's own modal colour
  instead of an inline `rgba(0, 0, 0, …)`, which also stops a dark theme getting
  a black film laid over an already dark page.
- The shortcut hint in the QR button's tooltip, and the second labelling pass
  wired to `freshrss:globalContextLoaded` that kept it up to date. The shortcut
  is documented in the README; the keydown guard that leaves a reassigned key to
  the core is unchanged.

### Fixed

- The overlay swallowed <kbd>Space</kbd> to stop the page behind it scrolling,
  which also stopped the focused close button being activated from the keyboard
  and the dialog being scrolled at all. A scroll lock on `<html>` does that job
  without taking a key away from the dialog, and it catches the mouse wheel too.
- Bidi control characters in the printed URL are now replaced with their code
  point. The `unicode-bidi: bidi-override` rule that used to stand for this does
  not neutralise them — it overrides the *implicit* bidi algorithm, while these
  are *explicit* formatting characters — so a link carrying U+202E could still
  display a different host than the code contained. The override and a fixed
  `dir="ltr"` stay in place for what they do cover: implicit reordering by RTL
  script letters or an RTL page locale.
- A tracking parameter is named once in the overlay however it was spelled. The
  names are matched case-insensitively but were deduplicated by raw spelling, so
  `utm_source` and `UTM_Source` were listed as two parameters.
- Tracking parameters are no longer stripped from a link that is then rejected
  for its scheme, which used to announce a removal next to the FreshRSS
  permalink that removal said nothing about.
- The UTF-8 byte encoder is applied however the QR library got onto the page. If
  another extension had already loaded it, the early return handed back an
  unpatched library and a URL with an umlaut encoded to something no scanner
  reads back.
- Dragging across the printed URL and releasing past the dialog no longer closes
  the overlay: a click reports the common ancestor of press and release, so both
  ends now have to be on the backdrop for it to count as a click beside it.
- Focus returns to the QR button on close in browsers that do not focus a button
  when it is clicked. It used to return to `<body>`, dropping the caret at the
  top of the page instead of on the article it came from.
- Saving the settings form writes the configuration file only for the values
  that changed. Each write stored the whole user configuration, so an untouched
  form was one write per setting.
- `.gitignore`'s rules are anchored to the repository root. Unanchored,
  `vendor/` also matched `static/vendor/`, so a second file next to the bundled
  QR library would have been ignored without a word.
- The printed URL breaks at its own separators where it can: `word-break:
  break-all` on top of `overflow-wrap: anywhere` threw that preference away.

### Changed

- The settings help text names what the dropdown's *Cleaned* option becomes in
  the overlay, which for an article with nothing to strip is *Article*.
- `AGPL-3.0` → `AGPL-3.0-only` in `package.json` and `composer.json`: the former
  is a deprecated SPDX id.
- CI no longer counts test cases by grepping the test files for `^test(` and
  demanding exactly that many passes. A floor of one passing test plus zero
  skips catches the run that passes because nothing ran, without failing the
  build over how a case is written.

### Added

- `CHANGELOG.md`, `.github/SECURITY.md`, and a `url` field in `metadata.json`.
- A CI check on tag builds that the tag matches the version in `metadata.json`.

### Documentation

- The install step points at the latest release rather than at the default
  branch, which is where work in progress lands.
- The README says how much of the bundled QR library is code this extension
  never calls (roughly 21 of 57 kB), and why it is shipped whole anyway: the
  file is byte-identical to the upstream build, which is what makes the git blob
  id verifiable against upstream.
- The Security section describes what actually defends the printed URL against
  bidi overrides.

## [0.5.0] - 2026-07-31

First release.

### Added

- A QR code button in the bottom line of every article, and the <kbd>g</kbd>
  shortcut, opening a full-size code in an overlay.
- A switch between three targets: the article link with known tracking
  parameters removed, the untouched original, and the FreshRSS permalink of the
  article. The URL is printed as text under the code.
- A denylist of known tracking parameters, measured against a real article
  corpus rather than guessed at. What was removed is named in the overlay.
- A settings page: preselected target and QR code size.
- A star button in the overlay. Marking an article closes the overlay; removing
  a star leaves it open so the correction is visible.
- English and German translations, travelling through the `JsVars` hook.
- Only absolute `http:`/`https:` links reach a code, checked against the raw
  string rather than a version of it resolved against the current page.
- The QR library is vendored rather than loaded from a CDN, with its provenance
  (upstream tag, commit, git blob id) written down and pinned by a checksum CI
  verifies on every push.
- CI: PHP and JavaScript syntax, metadata and entrypoint consistency, the
  tracking-parameter tests, translation-key and JS-fallback coverage, ESLint,
  PHP_CodeSniffer and PHPStan — the latter against FreshRSS 1.29.0, the oldest
  supported release, so the version floor in the README is checked rather than
  claimed.
- pnpm-only installs with a release cooldown and no build scripts allowed.

[Unreleased]: https://github.com/bmmmm/xExtension-ShareViaQRCode/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/bmmmm/xExtension-ShareViaQRCode/releases/tag/v0.5.0
