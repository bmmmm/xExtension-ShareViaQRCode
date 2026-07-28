'use strict';

// Getting an article from the desktop browser onto a phone has no good path in
// FreshRSS: the article has to be starred, found again in the mobile app and
// opened there. A QR code on screen turns that into one camera glance and needs
// no service at all.
(function () {
	// Free in the default shortcut set; `q` is already `actualize`.
	const SHORTCUT = 'G';

	// Deliberately a denylist of known trackers, not a heuristic: everything
	// unknown stays. Measured against 363k real articles, `wt_mc` (Webtrekk) is
	// the tracker that actually occurs, while `utm_*` appears exactly once.
	// Functional parameters seen in the same corpus (`p`, `ts`, `id`, `v`,
	// `page`, `q`, `action`, `ref`) are safe by construction because they are
	// not on this list.
	const TRACKING_PARAMS = new Set([
		'wt_mc', 'wt_zmc', 'wtrid', 'wt_ref',
		'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid', 'gad_source', 'srsltid', '_ga', '_gl',
		'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_source', 'fb_ref',
		'msclkid', 'twclid', 'ttclid', 'igshid', 'igsh', 'rdt_cid', 'sccid',
		'yclid', 'ysclid', '_openstat',
		'mc_cid', 'mc_eid', 'mkt_tok',
		'_hsenc', '_hsmi', '__hssc', '__hstc', '__hsfp', 'hsctatracking',
		'vero_conv', 'vero_id', 'oly_anon_id', 'oly_enc_id',
		'pk_campaign', 'pk_kwd', 'pk_source', 'pk_medium', 'pk_content', 'pk_cid',
		'piwik_campaign', 'piwik_kwd',
		'mtm_campaign', 'mtm_kwd', 'mtm_source', 'mtm_medium', 'mtm_content',
		'mtm_cid', 'mtm_group', 'mtm_placement',
		'xtor', 's_kwcid', 'ef_id', 'ncid',
		'guccounter', 'guce_referrer', 'guce_referrer_sig',
		'at_medium', 'at_campaign', 'at_campaign_type',
		'at_custom1', 'at_custom2', 'at_custom3', 'at_custom4',
		'ref_src', 'ref_url',
	]);
	const TRACKING_PREFIXES = ['utm_', 'hsa_'];

	const FALLBACK_I18N = {
		open: 'Show QR code',
		close: 'Close',
		title: 'Share via QR code',
		error: 'The QR code library could not be loaded. Reload the page and try again.',
		removed_one: '1 tracking parameter removed: {params}',
		removed_many: '{count} tracking parameters removed: {params}',
		target_article: 'Article',
		target_cleaned: 'Cleaned',
		target_original: 'Original',
		target_internal: 'FreshRSS view',
	};

	const ICON_PATH =
		'M2,2h8v8H2z M4,4v4h4V4z M5,5h2v2H5z ' +
		'M14,2h8v8h-8z M16,4v4h4V4z M17,5h2v2h-2z ' +
		'M2,14h8v8H2z M4,16v4h4v-4z M5,17h2v2H5z ' +
		'M13,13h3v3h-3z M18,13h3v3h-3z M13,18h3v3h-3z M18,18h3v3h-3z';

	const SVG_NS = 'http://www.w3.org/2000/svg';

	let libPromise = null;
	let overlay = null;
	let lastFocused = null;

	function settings() {
		const vars = window.context && window.context.extensions;
		return (vars && vars.share_via_qr_code) || {};
	}

	function t(key) {
		const i18n = settings().i18n;
		return (i18n && i18n[key]) || FALLBACK_I18N[key];
	}

	function format(template, values) {
		return template.replace(/\{(\w+)\}/g, function (match, name) {
			return Object.prototype.hasOwnProperty.call(values, name) ? values[name] : match;
		});
	}

	function isTracking(name) {
		const lower = name.toLowerCase();
		return TRACKING_PARAMS.has(lower) || TRACKING_PREFIXES.some(prefix => lower.startsWith(prefix));
	}

	// Works on the raw string rather than on URL/URLSearchParams so that every
	// kept pair survives byte for byte. Re-serialising a URL would re-encode
	// spaces and reserved characters, which can change what the server sees.
	function stripTracking(raw) {
		// The fragment is cut off first: a hash route may carry its own `?`,
		// which is not a query string of the URL.
		const hashStart = raw.indexOf('#');
		const beforeHash = hashStart < 0 ? raw : raw.slice(0, hashStart);
		const tail = hashStart < 0 ? '' : raw.slice(hashStart);

		const queryStart = beforeHash.indexOf('?');
		if (queryStart < 0) {
			return { url: raw, removed: [] };
		}
		const head = beforeHash.slice(0, queryStart);
		const query = beforeHash.slice(queryStart + 1);

		const kept = [];
		const removed = [];
		query.split('&').forEach(function (pair) {
			if (pair === '') {
				return;
			}
			const separator = pair.indexOf('=');
			const encodedName = separator < 0 ? pair : pair.slice(0, separator);
			let name = encodedName;
			try {
				name = decodeURIComponent(encodedName.replace(/\+/g, ' '));
			} catch (e) {
				// A malformed escape means the name is not one of ours anyway.
			}
			if (isTracking(name)) {
				removed.push(name);
			} else {
				kept.push(pair);
			}
		});

		if (removed.length === 0) {
			return { url: raw, removed: [] };
		}
		return { url: head + (kept.length > 0 ? '?' + kept.join('&') : '') + tail, removed: removed };
	}

	// `?state=3&search=e:<id>` is FreshRSS' internal permalink for a single
	// article. `state=3` is required — the default filter only lists unread
	// articles, so without it a read article yields an empty page.
	function internalUrl(entryId) {
		const base = (window.context && window.context.urls && window.context.urls.index) || './';
		const url = new URL(base, window.location.href);
		url.searchParams.set('state', '3');
		url.searchParams.set('search', 'e:' + entryId);
		return url.href;
	}

	function loadLibrary() {
		if (window.qrcode) {
			return Promise.resolve(window.qrcode);
		}
		if (libPromise !== null) {
			return libPromise;
		}
		libPromise = new Promise(function (resolve, reject) {
			const url = settings().lib_url;
			if (!url) {
				reject(new Error('share_via_qr_code: no library URL in the JS context'));
				return;
			}
			const script = document.createElement('script');
			script.src = url;
			script.onload = function () {
				if (window.qrcode) {
					resolve(window.qrcode);
				} else {
					reject(new Error('share_via_qr_code: library loaded but exposes no global'));
				}
			};
			script.onerror = function () {
				reject(new Error('share_via_qr_code: library could not be fetched from ' + url));
			};
			document.head.appendChild(script);
		}).catch(function (error) {
			libPromise = null;	// Allow a retry on the next open.
			throw error;
		});
		return libPromise;
	}

	function buildQrSvg(qrcode, text) {
		qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'] || qrcode.stringToBytes;
		const qr = qrcode(0, 'M');	// Type 0 picks the smallest version that fits.
		qr.addData(text);
		qr.make();

		const count = qr.getModuleCount();
		const quietZone = 4;	// Mandated by the QR spec; without it scanners struggle.
		const size = count + quietZone * 2;

		let path = '';
		for (let row = 0; row < count; row++) {
			for (let column = 0; column < count; column++) {
				if (qr.isDark(row, column)) {
					path += 'M' + (column + quietZone) + ',' + (row + quietZone) + 'h1v1h-1z';
				}
			}
		}

		const svg = document.createElementNS(SVG_NS, 'svg');
		svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
		svg.setAttribute('shape-rendering', 'crispEdges');
		svg.setAttribute('role', 'img');
		svg.setAttribute('aria-label', t('title'));

		const background = document.createElementNS(SVG_NS, 'rect');
		background.setAttribute('width', String(size));
		background.setAttribute('height', String(size));
		background.setAttribute('fill', '#fff');
		svg.appendChild(background);

		const modules = document.createElementNS(SVG_NS, 'path');
		modules.setAttribute('d', path);
		modules.setAttribute('fill', '#000');
		svg.appendChild(modules);

		return svg;
	}

	function buildIcon() {
		const svg = document.createElementNS(SVG_NS, 'svg');
		svg.setAttribute('viewBox', '0 0 24 24');
		svg.setAttribute('width', '16');
		svg.setAttribute('height', '16');
		svg.setAttribute('aria-hidden', 'true');
		svg.setAttribute('focusable', 'false');

		const path = document.createElementNS(SVG_NS, 'path');
		path.setAttribute('d', ICON_PATH);
		path.setAttribute('fill', 'currentColor');
		path.setAttribute('fill-rule', 'evenodd');
		svg.appendChild(path);

		return svg;
	}

	function targetsFor(flux) {
		const raw = flux.getAttribute('data-link') || '';
		const entryId = flux.getAttribute('data-entry') || '';
		const cleaned = stripTracking(raw);
		const targets = [];

		if (raw !== '') {
			targets.push({
				label: cleaned.removed.length > 0 ? t('target_cleaned') : t('target_article'),
				url: cleaned.url,
				// The note describes this target only: next to the original it
				// would claim a removal that did not happen.
				note: cleaned.removed.length > 0,
			});
			if (cleaned.removed.length > 0) {
				targets.push({ label: t('target_original'), url: raw, note: false });
			}
		}
		if (entryId !== '') {
			targets.push({ label: t('target_internal'), url: internalUrl(entryId), note: false });
		}

		return { targets: targets, removed: cleaned.removed };
	}

	function closeOverlay() {
		if (overlay === null) {
			return;
		}
		overlay.remove();
		overlay = null;
		if (lastFocused !== null && document.contains(lastFocused)) {
			lastFocused.focus();
		}
		lastFocused = null;
	}

	function openOverlay(flux) {
		const model = targetsFor(flux);
		if (model.targets.length === 0) {
			return;
		}

		closeOverlay();
		lastFocused = document.activeElement;

		overlay = document.createElement('div');
		overlay.id = 'share-via-qr-code';
		overlay.addEventListener('click', function (ev) {
			if (ev.target === overlay) {
				closeOverlay();
			}
		});

		const dialog = document.createElement('div');
		dialog.className = 'qr-dialog';
		dialog.setAttribute('role', 'dialog');
		dialog.setAttribute('aria-modal', 'true');
		dialog.setAttribute('aria-label', t('title'));
		overlay.appendChild(dialog);

		const close = document.createElement('button');
		close.type = 'button';
		close.className = 'qr-close';
		close.textContent = '✕';
		close.title = t('close');
		close.setAttribute('aria-label', t('close'));
		close.addEventListener('click', closeOverlay);
		dialog.appendChild(close);

		const switcher = document.createElement('div');
		switcher.className = 'qr-targets';
		switcher.setAttribute('role', 'group');
		dialog.appendChild(switcher);

		const canvas = document.createElement('div');
		canvas.className = 'qr-canvas';
		dialog.appendChild(canvas);

		const urlText = document.createElement('p');
		urlText.className = 'qr-url';
		dialog.appendChild(urlText);

		let note = null;
		if (model.removed.length > 0) {
			note = document.createElement('p');
			note.className = 'qr-note';
			const template = model.removed.length === 1 ? t('removed_one') : t('removed_many');
			// Split on the placeholder so the parameter names can be marked up
			// as code without ever building HTML from a translated string.
			const parts = template.split('{params}');
			const values = { count: model.removed.length };
			note.appendChild(document.createTextNode(format(parts[0], values)));
			model.removed.forEach(function (name, index) {
				if (index > 0) {
					note.appendChild(document.createTextNode(', '));
				}
				const code = document.createElement('code');
				code.textContent = name;
				note.appendChild(code);
			});
			note.appendChild(document.createTextNode(format(parts[1] || '', values)));
			dialog.appendChild(note);
		}

		function show(target) {
			Array.prototype.forEach.call(switcher.children, function (button) {
				const selected = button.dataset.url === target.url;
				button.classList.toggle('active', selected);
				button.setAttribute('aria-pressed', selected ? 'true' : 'false');
			});
			urlText.textContent = target.url;
			if (note !== null) {
				note.hidden = !target.note;
			}
			canvas.textContent = '';
			loadLibrary().then(function (qrcode) {
				if (overlay === null || urlText.textContent !== target.url) {
					return;	// Closed or switched again while the library loaded.
				}
				canvas.textContent = '';
				canvas.appendChild(buildQrSvg(qrcode, target.url));
			}).catch(function (error) {
				console.error(error);
				if (overlay !== null) {
					canvas.textContent = t('error');
				}
			});
		}

		model.targets.forEach(function (target) {
			const button = document.createElement('button');
			button.type = 'button';
			button.textContent = target.label;
			button.dataset.url = target.url;
			button.addEventListener('click', function () {
				show(target);
			});
			switcher.appendChild(button);
		});

		document.body.appendChild(overlay);
		show(model.targets[0]);
		close.focus();
	}

	function addButton(flux) {
		const list = flux.querySelector('ul.horizontal-list.bottom');
		if (list === null || list.querySelector('.qr-share') !== null) {
			return;
		}

		const label = t('open') + ' (' + SHORTCUT + ')';
		const button = document.createElement('button');
		button.type = 'button';
		// Deliberately not `item-element`: that class carries a vertical padding
		// which the reading view's own footer links do not have, so the button
		// would stretch the line it joins.
		button.className = 'qr-share-button';
		button.title = label;
		button.setAttribute('aria-label', label);
		button.appendChild(buildIcon());
		button.addEventListener('click', function (ev) {
			ev.preventDefault();
			ev.stopPropagation();
			openOverlay(flux);
		});

		const item = document.createElement('li');
		item.className = 'item qr-share';
		item.appendChild(button);

		// Keep date and link at the end of the line, as in the core templates.
		list.insertBefore(item, list.querySelector('li.item.date, li.item.link'));
	}

	function addButtons(root) {
		if (root.classList && root.classList.contains('flux')) {
			addButton(root);
		}
		if (root.querySelectorAll) {
			root.querySelectorAll('.flux').forEach(addButton);
		}
	}

	function refreshLabels() {
		document.querySelectorAll('.qr-share-button').forEach(function (button) {
			const label = t('open') + ' (' + SHORTCUT + ')';
			button.title = label;
			button.setAttribute('aria-label', label);
		});
	}

	function shortcutIsTaken() {
		const shortcuts = window.context && window.context.shortcuts;
		if (!shortcuts) {
			return false;
		}
		return Object.keys(shortcuts).some(function (name) {
			return (shortcuts[name] || '').toUpperCase() === SHORTCUT;
		});
	}

	function onKeydown(ev) {
		if (overlay !== null) {
			if (ev.key === 'Escape') {
				closeOverlay();
				ev.preventDefault();
			}
			// Swallow everything else so the shortcuts of the stream behind the
			// overlay stay inert. Default actions such as Tab and Enter are left
			// alone, so the dialog itself stays operable.
			ev.stopPropagation();
			return;
		}

		if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.shiftKey ||
			(ev.target.closest && ev.target.closest('input, select, textarea'))) {
			return;
		}
		if ((ev.key || '').toUpperCase() !== SHORTCUT || shortcutIsTaken()) {
			return;
		}

		// Same fallback the core uses for its own nav actions.
		const flux = document.querySelector('.flux.current') || document.querySelector('.flux');
		if (flux !== null) {
			openOverlay(flux);
			ev.preventDefault();
			ev.stopPropagation();
		}
	}

	function init() {
		const stream = document.getElementById('stream');
		if (stream === null) {
			return;
		}
		addButtons(stream);

		// Articles arrive later through "load more" and through auto-loading.
		new MutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				mutation.addedNodes.forEach(function (node) {
					if (node.nodeType === Node.ELEMENT_NODE) {
						addButtons(node);
					}
				});
			});
		}).observe(stream, { childList: true, subtree: true });
	}

	// Stripping tracking parameters is the one part that can quietly break a
	// link, so it is covered by tests/strip-tracking.test.js. Under the test
	// runner there is no document and only the pure helpers are exported.
	if (typeof document === 'undefined') {
		module.exports = { stripTracking: stripTracking, isTracking: isTracking };
		return;
	}

	// The script is loaded asynchronously, so the global context may arrive
	// either before or after us: insert the buttons as soon as the DOM allows
	// and refresh their labels if the translations show up later.
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
	document.addEventListener('freshrss:globalContextLoaded', refreshLabels);
	window.addEventListener('keydown', onKeydown, true);
})();
