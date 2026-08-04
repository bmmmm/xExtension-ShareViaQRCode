'use strict';

// Run with `node --test tests/*.test.js`. No dependencies, no framework.
const test = require('node:test');
const assert = require('node:assert/strict');

const { stripTracking } = require('../static/script.js');

const HEISE = 'https://www.heise.de/news/Mathematiker-11378210.html';

test('removes the tracker that actually occurs in these feeds', () => {
	assert.deepEqual(
		stripTracking(HEISE + '?wt_mc=rss.red.ho.ho.atom.beitrag.beitrag'),
		{ url: HEISE, removed: ['wt_mc'] }
	);
});

test('a URL without a query string is returned untouched', () => {
	assert.deepEqual(stripTracking(HEISE), { url: HEISE, removed: [] });
});

// A bare `?` and a query that strips down to nothing both carry zero
// information, so both must leave the same trailing `?` behind: none.
test('a bare trailing question mark is dropped, like an emptied-out query', () => {
	assert.deepEqual(
		stripTracking('https://e.example/a?'),
		{ url: 'https://e.example/a', removed: [] }
	);
	assert.deepEqual(
		stripTracking('https://e.example/a?utm_source=1&'),
		{ url: 'https://e.example/a', removed: ['utm_source'] }
	);
});

// These names were measured in the article corpus and are all functional.
// If this test ever fails, the denylist has grown a false positive.
test('functional parameters survive', () => {
	const url = 'https://e.example/x?p=2&ts=1700000000&id=9&v=3&page=4&q=term&action=show&ref=nav';
	assert.deepEqual(stripTracking(url), { url: url, removed: [] });
});

test('mixes are split without reordering what stays', () => {
	assert.deepEqual(
		stripTracking('https://e.example/a?seite=3&utm_source=rss&wt_mc=rss.red&id=7&fbclid=abc'),
		{ url: 'https://e.example/a?seite=3&id=7', removed: ['utm_source', 'wt_mc', 'fbclid'] }
	);
});

test('the question mark goes when every parameter was a tracker', () => {
	assert.deepEqual(
		stripTracking('https://e.example/a?utm_source=rss&utm_medium=feed'),
		{ url: 'https://e.example/a', removed: ['utm_source', 'utm_medium'] }
	);
});

// Re-serialising through URL/URLSearchParams would turn %20 into + here.
test('kept pairs keep their original encoding byte for byte', () => {
	assert.deepEqual(
		stripTracking('https://e.example/s?q=a%20b%2Bc&wt_mc=x&t=%C3%A4'),
		{ url: 'https://e.example/s?q=a%20b%2Bc&t=%C3%A4', removed: ['wt_mc'] }
	);
});

test('the fragment is preserved', () => {
	assert.deepEqual(
		stripTracking('https://e.example/a?wt_mc=x&id=1#section-2'),
		{ url: 'https://e.example/a?id=1#section-2', removed: ['wt_mc'] }
	);
	assert.deepEqual(
		stripTracking('https://e.example/a?wt_mc=x#top'),
		{ url: 'https://e.example/a#top', removed: ['wt_mc'] }
	);
});

test('a question mark inside a hash route is not a query string', () => {
	const url = 'https://e.example/a#/route?utm_source=x';
	assert.deepEqual(stripTracking(url), { url: url, removed: [] });
});

test('tracker names are matched regardless of case', () => {
	assert.deepEqual(
		stripTracking('https://e.example/a?WT_MC=x&ICID=y'),
		{ url: 'https://e.example/a?ICID=y', removed: ['WT_MC'] }
	);
});

test('a tracker without a value is removed too', () => {
	assert.deepEqual(
		stripTracking('https://e.example/a?fbclid&id=1'),
		{ url: 'https://e.example/a?id=1', removed: ['fbclid'] }
	);
});

test('a malformed escape does not throw', () => {
	assert.deepEqual(
		stripTracking('https://e.example/a?bad=%zz&wt_mc=1'),
		{ url: 'https://e.example/a?bad=%zz', removed: ['wt_mc'] }
	);
});

test('prefix families cover names that did not exist yet', () => {
	assert.deepEqual(
		stripTracking('https://e.example/a?utm_whatever_new=1&hsa_grp=2&x=3'),
		{ url: 'https://e.example/a?x=3', removed: ['utm_whatever_new', 'hsa_grp'] }
	);
});

// --- Scheme allowlist -------------------------------------------------------
// A feed decides what the article link is, and FreshRSS only HTML-escapes it on
// the way in (SimplePie Sanitize.php, CONSTRUCT_IRI). The scheme is never
// checked, so the extension has to do it before putting anything into a code a
// person is asked to point a camera at.

const { isWebLink } = require('../static/script.js');

test('http and https are the only schemes that reach a code', () => {
	assert.equal(isWebLink('https://e.example/a'), true);
	assert.equal(isWebLink('http://e.example/a'), true);
	assert.equal(isWebLink('HTTPS://e.example/a'), true);
});

test('script-bearing and local schemes are rejected', () => {
	for (const hostile of [
		'javascript:alert(document.domain)',
		'JavaScript:alert(1)',
		'data:text/html,<script>alert(1)</script>',
		'vbscript:msgbox(1)',
		'file:///etc/passwd',
		'blob:https://e.example/1234',
	]) {
		assert.equal(isWebLink(hostile), false, hostile);
	}
});

// Leading and embedded whitespace or control characters are the classic way to
// smuggle a scheme past a naive string check. The URL parser normalises them
// away first, so the check sees the real scheme.
test('whitespace and control characters do not smuggle a scheme through', () => {
	const NL = String.fromCharCode(10);
	const TAB = String.fromCharCode(9);
	const CR = String.fromCharCode(13);
	for (const hostile of [
		NL + 'javascript:alert(1)',
		TAB + 'javascript:alert(1)',
		CR + 'javascript:alert(1)',
		'   javascript:alert(1)',
		'java' + NL + 'script:alert(1)',
		'java' + TAB + 'script:alert(1)',
		' JaVaScRiPt:alert(1)',
	]) {
		assert.equal(isWebLink(hostile), false, JSON.stringify(hostile));
	}
});

// The raw string is what ends up in the code, so the raw string is what is
// checked. Resolving against the page first would approve these: a phone
// parsing the code on its own reads a different origin than the check saw.
test('a link that only looks absolute next to the page is rejected', () => {
	for (const relative of [
		'https:evil.example/x',      // same special scheme as the page: parsed as relative
		'//evil.example/x',          // scheme-relative
		'evil.example/x',            // bare host, which scanners prepend http:// to
		'/article/1',                // path-relative
		'not a url',
		'://',
		'%6aavascript:alert(1)',
		'',
		'?utm_source=1',             // query-only: used to yield an empty code
	]) {
		assert.equal(isWebLink(relative), false, JSON.stringify(relative));
	}
});

test('an http(s) URL without a host is rejected', () => {
	assert.equal(isWebLink('https://'), false);
	// Not a typo: the parser reads the first path segment as the host, so this is
	// an absolute URL to the single-label host `path` and is allowed through.
	assert.equal(isWebLink('http:///path'), true);
});

// --- Bidi controls ----------------------------------------------------------
// The URL is printed under the code so that a person can read what the code
// carries. That only works if the printed order is the stored order, and CSS
// does not deliver it: `unicode-bidi: bidi-override` overrides the implicit
// algorithm while the explicit formatting characters keep reordering the line.
// So they are replaced with their code point before the text is shown.

const { escapeBidi } = require('../static/script.js');

const BACKSLASH = String.fromCharCode(92);
// Every character the escaping is meant to catch: ALM, LRM, RLM, the
// LRE/RLE/PDF/LRO/RLO embeddings and the LRI/RLI/FSI/PDI isolates.
const CONTROLS = [0x061C, 0x200E, 0x200F, 0x202A, 0x202B, 0x202C, 0x202D, 0x202E,
	0x2066, 0x2067, 0x2068, 0x2069];

test('a right-to-left override is printed as its code point, not applied', () => {
	const rlo = String.fromCharCode(0x202E);
	assert.equal(
		escapeBidi('https://e.example/' + rlo + 'gnp.kp'),
		'https://e.example/' + BACKSLASH + 'u202Egnp.kp'
	);
});

test('every bidi control character is caught', () => {
	for (const code of CONTROLS) {
		const expected = BACKSLASH + 'u' + code.toString(16).toUpperCase().padStart(4, '0');
		assert.equal(escapeBidi(String.fromCharCode(code)), expected, expected);
	}
});

// Only the reordering characters go; a URL is allowed to contain anything else.
test('text without bidi controls is returned unchanged', () => {
	for (const harmless of [
		'https://e.example/a?q=1#top',
		'https://übung.example/münchen',
		'https://e.example/' + String.fromCodePoint(0x1F600),
		'https://e.example/' + String.fromCharCode(0x200B),	// zero-width space
		'',
	]) {
		assert.equal(escapeBidi(harmless), harmless, JSON.stringify(harmless));
	}
});

// The same tracker twice must not be named twice in the overlay.
test('repeated tracker names are reported once', () => {
	assert.deepEqual(
		stripTracking('https://e.example/a?utm_source=x&utm_source=y&id=1'),
		{ url: 'https://e.example/a?id=1', removed: ['utm_source'] }
	);
});
