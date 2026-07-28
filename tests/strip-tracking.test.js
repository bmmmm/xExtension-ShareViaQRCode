'use strict';

// Run with `node --test tests/`. No dependencies, no test framework.
const test = require('node:test');
const assert = require('node:assert/strict');

const { stripTracking } = require('../static/script.js');

const HEISE = 'https://www.heise.de/news/Mathematiker-11378210.html';

test('removes the tracker that actually occurs in these feeds', () => {
	assert.deepEqual(
		stripTracking(HEISE + '?wt_mc=rss.red.ho.ho.atom.beitrag.beitrag'),
		{ url: HEISE, removed: ['wt_mc'] },
	);
});

test('a URL without a query string is returned untouched', () => {
	assert.deepEqual(stripTracking(HEISE), { url: HEISE, removed: [] });
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
		{ url: 'https://e.example/a?seite=3&id=7', removed: ['utm_source', 'wt_mc', 'fbclid'] },
	);
});

test('the question mark goes when every parameter was a tracker', () => {
	assert.deepEqual(
		stripTracking('https://e.example/a?utm_source=rss&utm_medium=feed'),
		{ url: 'https://e.example/a', removed: ['utm_source', 'utm_medium'] },
	);
});

// Re-serialising through URL/URLSearchParams would turn %20 into + here.
test('kept pairs keep their original encoding byte for byte', () => {
	assert.deepEqual(
		stripTracking('https://e.example/s?q=a%20b%2Bc&wt_mc=x&t=%C3%A4'),
		{ url: 'https://e.example/s?q=a%20b%2Bc&t=%C3%A4', removed: ['wt_mc'] },
	);
});

test('the fragment is preserved', () => {
	assert.deepEqual(
		stripTracking('https://e.example/a?wt_mc=x&id=1#section-2'),
		{ url: 'https://e.example/a?id=1#section-2', removed: ['wt_mc'] },
	);
	assert.deepEqual(
		stripTracking('https://e.example/a?wt_mc=x#top'),
		{ url: 'https://e.example/a#top', removed: ['wt_mc'] },
	);
});

test('a question mark inside a hash route is not a query string', () => {
	const url = 'https://e.example/a#/route?utm_source=x';
	assert.deepEqual(stripTracking(url), { url: url, removed: [] });
});

test('tracker names are matched regardless of case', () => {
	assert.deepEqual(
		stripTracking('https://e.example/a?WT_MC=x&ICID=y'),
		{ url: 'https://e.example/a?ICID=y', removed: ['WT_MC'] },
	);
});

test('a tracker without a value is removed too', () => {
	assert.deepEqual(
		stripTracking('https://e.example/a?fbclid&id=1'),
		{ url: 'https://e.example/a?id=1', removed: ['fbclid'] },
	);
});

test('a malformed escape does not throw', () => {
	assert.deepEqual(
		stripTracking('https://e.example/a?bad=%zz&wt_mc=1'),
		{ url: 'https://e.example/a?bad=%zz', removed: ['wt_mc'] },
	);
});

test('prefix families cover names that did not exist yet', () => {
	assert.deepEqual(
		stripTracking('https://e.example/a?utm_whatever_new=1&hsa_grp=2&x=3'),
		{ url: 'https://e.example/a?x=3', removed: ['utm_whatever_new', 'hsa_grp'] },
	);
});
