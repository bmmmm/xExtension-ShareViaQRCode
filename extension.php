<?php
declare(strict_types=1);

final class ShareViaQRCodeExtension extends Minz_Extension {
	private const TARGETS = ['cleaned', 'original', 'internal'];

	private const DEFAULTS = [
		'default_target' => 'cleaned',
		'qr_size' => 400,
	];

	private const SIZE_MIN = 200;
	private const SIZE_MAX = 800;

	#[\Override]
	public function init(): void {
		parent::init();

		$this->registerTranslates();
		$this->registerHook(Minz_HookType::JsVars, [$this, 'jsVars']);

		Minz_View::appendStyle($this->getFileUrl('style.css'));
		Minz_View::appendScript($this->getFileUrl('script.js'));
	}

	#[\Override]
	public function handleConfigureAction(): void {
		parent::handleConfigureAction();

		// Extensions are only init()ed once they are enabled, while this action is
		// reached for any listed one, so the translations are registered here too.
		$this->registerTranslates();

		if (!Minz_Request::isPost()) {
			return;
		}

		// Every value falls back to what is already stored rather than to the
		// default, so a request carrying only some of the fields cannot silently
		// reset the rest.
		$current = $this->settings();

		$target = Minz_Request::paramString('default_target');
		if (!in_array($target, self::TARGETS, true)) {
			$target = $current['default_target'];
		}
		$size = self::clampInt(
			Minz_Request::paramIntNull('qr_size'), self::SIZE_MIN, self::SIZE_MAX, $current['qr_size'],
		);

		// Each call writes the whole user configuration back to disk, so only the
		// fields that actually moved are stored: saving the form untouched is
		// then no writes at all rather than one per setting.
		if ($target !== $current['default_target']) {
			$this->setUserConfigurationValue('default_target', $target);
		}
		if ($size !== $current['qr_size']) {
			$this->setUserConfigurationValue('qr_size', $size);
		}

		Minz_Request::good(_t('feedback.conf.updated'), [
			'c' => 'extension', 'a' => 'configure', 'params' => ['e' => urlencode($this->getName())],
		]);
	}

	/**
	 * The stored settings, validated. Values written by an earlier version or by
	 * hand are corrected on every read — never written back — so the view and
	 * the JS context can trust them while the file keeps what the user put there.
	 *
	 * @return array{default_target:string, qr_size:int}
	 */
	public function settings(): array {
		$target = $this->getUserConfigurationString('default_target') ?? '';

		return [
			'default_target' => in_array($target, self::TARGETS, true)
				? $target : self::DEFAULTS['default_target'],
			'qr_size' => self::clampInt(
				$this->getUserConfigurationInt('qr_size'),
				self::SIZE_MIN, self::SIZE_MAX, self::DEFAULTS['qr_size'],
			),
		];
	}

	/** @return list<string> */
	public function targets(): array {
		return self::TARGETS;
	}

	/** @return array{int, int} */
	public function sizeRange(): array {
		return [self::SIZE_MIN, self::SIZE_MAX];
	}

	/**
	 * Everything happens client-side, so the settings, the labels and the URL of
	 * the lazily loaded QR library have to travel through the JS context.
	 *
	 * @param array<string,mixed> $vars
	 * @return array<string,mixed>
	 */
	public function jsVars(array $vars): array {
		$vars['share_via_qr_code'] = [
			// getFileUrl() HTML-escapes the separator for use in an attribute;
			// here the URL ends up in JSON and is used verbatim by the loader.
			'lib_url' => html_entity_decode($this->getFileUrl('vendor/qrcode.js'), ENT_QUOTES),
			'settings' => $this->settings(),
			'i18n' => [
				'open' => _t('ext.share_via_qr_code.open'),
				'close' => _t('ext.share_via_qr_code.close'),
				'favourite' => _t('ext.share_via_qr_code.favourite'),
				'unfavourite' => _t('ext.share_via_qr_code.unfavourite'),
				'title' => _t('ext.share_via_qr_code.title'),
				'target_article' => _t('ext.share_via_qr_code.target.article'),
				'target_cleaned' => _t('ext.share_via_qr_code.target.cleaned'),
				'target_original' => _t('ext.share_via_qr_code.target.original'),
				'target_internal' => _t('ext.share_via_qr_code.target.internal'),
				'removed_one' => _t('ext.share_via_qr_code.removed_one'),
				'removed_many' => _t('ext.share_via_qr_code.removed_many'),
				'error' => _t('ext.share_via_qr_code.error'),
				'too_long' => _t('ext.share_via_qr_code.too_long'),
			],
		];
		return $vars;
	}

	/** A missing value falls back to $fallback; one out of range is pulled to the nearest bound. */
	private static function clampInt(?int $value, int $min, int $max, int $fallback): int {
		if ($value === null) {
			return $fallback;
		}
		return max($min, min($max, $value));
	}
}
