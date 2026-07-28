<?php
declare(strict_types=1);

final class ShareViaQRCodeExtension extends Minz_Extension {
	private const TARGETS = ['cleaned', 'original', 'internal'];

	private const DEFAULTS = [
		'default_target' => 'cleaned',
		'qr_size' => 400,
		'qr_background' => '#ffffff',
		'qr_background_alpha' => 100,
		'backdrop_alpha' => 65,
	];

	private const SIZE_MIN = 200;
	private const SIZE_MAX = 800;

	/**
	 * Below this WCAG contrast ratio against the black modules a camera starts
	 * to struggle, and below full opacity the page shows through them.
	 */
	private const MIN_CONTRAST = 7.0;
	private const MIN_ALPHA = 85;

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
		parent::init();

		$this->registerTranslates();

		if (!Minz_Request::isPost()) {
			return;
		}

		$target = Minz_Request::paramString('default_target');
		$this->setUserConfigurationValue(
			'default_target',
			in_array($target, self::TARGETS, true) ? $target : self::DEFAULTS['default_target'],
		);
		$this->setUserConfigurationValue('qr_size', self::clampInt(
			Minz_Request::paramIntNull('qr_size'), self::SIZE_MIN, self::SIZE_MAX, self::DEFAULTS['qr_size'],
		));
		$this->setUserConfigurationValue('qr_background', self::sanitiseColour(
			Minz_Request::paramString('qr_background'),
		));
		$this->setUserConfigurationValue('qr_background_alpha', self::clampInt(
			Minz_Request::paramIntNull('qr_background_alpha'), 0, 100, self::DEFAULTS['qr_background_alpha'],
		));
		$this->setUserConfigurationValue('backdrop_alpha', self::clampInt(
			Minz_Request::paramIntNull('backdrop_alpha'), 0, 100, self::DEFAULTS['backdrop_alpha'],
		));

		Minz_Request::good(_t('feedback.conf.updated'), [
			'c' => 'extension', 'a' => 'configure', 'params' => ['e' => $this->getName()],
		]);
	}

	/**
	 * The stored settings, validated. Values written by an earlier version or by
	 * hand are clamped here as well, so the view and the JS context can trust them.
	 *
	 * @return array{default_target:string, qr_size:int, qr_background:string,
	 *     qr_background_alpha:int, backdrop_alpha:int}
	 */
	public function settings(): array {
		$target = $this->getUserConfigurationString('default_target') ?? '';

		return [
			'default_target' => in_array($target, self::TARGETS, true) ? $target : self::DEFAULTS['default_target'],
			'qr_size' => self::clampInt(
				$this->getUserConfigurationInt('qr_size'),
				self::SIZE_MIN, self::SIZE_MAX, self::DEFAULTS['qr_size'],
			),
			'qr_background' => self::sanitiseColour($this->getUserConfigurationString('qr_background') ?? ''),
			'qr_background_alpha' => self::clampInt(
				$this->getUserConfigurationInt('qr_background_alpha'),
				0, 100, self::DEFAULTS['qr_background_alpha'],
			),
			'backdrop_alpha' => self::clampInt(
				$this->getUserConfigurationInt('backdrop_alpha'),
				0, 100, self::DEFAULTS['backdrop_alpha'],
			),
		];
	}

	/** @return list<string> the reasons why the current colours may not scan, empty if they are fine */
	public function scanWarnings(): array {
		$settings = $this->settings();
		$warnings = [];

		if (self::contrastWithBlack($settings['qr_background']) < self::MIN_CONTRAST) {
			$warnings[] = _t('ext.share_via_qr_code.conf.warn_contrast');
		}
		if ($settings['qr_background_alpha'] < self::MIN_ALPHA) {
			$warnings[] = _t('ext.share_via_qr_code.conf.warn_alpha');
		}

		return $warnings;
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

	/** A missing value falls back to the default; a value out of range is pulled to the nearest bound. */
	private static function clampInt(?int $value, int $min, int $max, int $default): int {
		if ($value === null) {
			return $default;
		}
		return max($min, min($max, $value));
	}

	private static function sanitiseColour(string $value): string {
		return preg_match('/^#[0-9a-f]{6}$/i', $value) === 1
			? strtolower($value)
			: self::DEFAULTS['qr_background'];
	}

	/** WCAG contrast ratio of an opaque colour against the black QR modules. */
	private static function contrastWithBlack(string $hex): float {
		$channel = static function (int $value): float {
			$s = $value / 255;
			return $s <= 0.03928 ? $s / 12.92 : (($s + 0.055) / 1.055) ** 2.4;
		};
		$luminance = 0.2126 * $channel((int) hexdec(substr($hex, 1, 2)))
			+ 0.7152 * $channel((int) hexdec(substr($hex, 3, 2)))
			+ 0.0722 * $channel((int) hexdec(substr($hex, 5, 2)));

		return ($luminance + 0.05) / 0.05;
	}
}
