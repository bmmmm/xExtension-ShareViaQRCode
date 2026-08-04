<?php

return array(
	'share_via_qr_code' => array(
		'open' => 'QR-Code anzeigen',
		'close' => 'Schliessen',
		'favourite' => 'Favorisieren und schliessen',
		'unfavourite' => 'Aus den Favoriten entfernen',
		'title' => 'Per QR-Code teilen',
		'error' => 'Die QR-Code-Bibliothek konnte nicht geladen werden. Seite neu laden und erneut versuchen.',
		'too_long' => 'Dieser Link ist zu lang für einen QR-Code.',
		'removed_one' => '1 Tracking-Parameter entfernt: {params}',
		'removed_many' => '{count} Tracking-Parameter entfernt: {params}',
		'target' => array(
			'article' => 'Artikel',
			'cleaned' => 'Bereinigt',
			'original' => 'Original',
			'internal' => 'FreshRSS-Ansicht',
		),
		'conf' => array(
			'default_target' => 'Vorausgewählter Link',
			'default_target_help' => 'Welchen Link das Overlay zuerst zeigt. Die anderen bleiben einen Klick entfernt.',
			'qr_size' => 'Grösse des QR-Codes',
			'qr_size_help' => 'Kantenlänge in Pixeln, %d bis %d. Grössere Codes lassen sich aus mehr Abstand scannen; in schmalen Fenstern verkleinert sich der Code ohnehin.',
		),
	),
);
