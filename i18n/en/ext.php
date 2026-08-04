<?php

return array(
	'share_via_qr_code' => array(
		'open' => 'Show QR code',
		'close' => 'Close',
		'favourite' => 'Mark as favourite and close',
		'unfavourite' => 'Remove from favourites',
		'title' => 'Share via QR code',
		'error' => 'The QR code library could not be loaded. Reload the page and try again.',
		'too_long' => 'This link is too long to fit into a QR code.',
		'removed_one' => '1 tracking parameter removed: {params}',
		'removed_many' => '{count} tracking parameters removed: {params}',
		'target' => array(
			'article' => 'Article',
			'cleaned' => 'Cleaned',
			'original' => 'Original',
			'internal' => 'FreshRSS view',
		),
		'conf' => array(
			'default_target' => 'Preselected link',
			'default_target_help' => 'Which link the overlay shows first. The others stay one click away.',
			'qr_size' => 'QR code size',
			'qr_size_help' => 'Edge length in pixels, %d to %d. Larger codes are easier to scan from a distance; on narrow windows the code shrinks to fit anyway.',
		),
	),
);
