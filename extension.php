<?php
declare(strict_types=1);

final class ShareViaQRCodeExtension extends Minz_Extension {
	#[\Override]
	public function init(): void {
		parent::init();

		$this->registerTranslates();
		$this->registerHook(Minz_HookType::JsVars, [$this, 'jsVars']);

		Minz_View::appendStyle($this->getFileUrl('style.css'));
		Minz_View::appendScript($this->getFileUrl('script.js'));
	}

	/**
	 * Everything happens client-side, so labels and the URL of the lazily loaded
	 * QR library have to travel through the JS context.
	 *
	 * @param array<string,mixed> $vars
	 * @return array<string,mixed>
	 */
	public function jsVars(array $vars): array {
		$vars['share_via_qr_code'] = [
			// getFileUrl() HTML-escapes the separator for use in an attribute;
			// here the URL ends up in JSON and is used verbatim by the loader.
			'lib_url' => html_entity_decode($this->getFileUrl('vendor/qrcode.js'), ENT_QUOTES),
			'i18n' => [
				'open' => _t('ext.share_via_qr_code.open'),
				'close' => _t('ext.share_via_qr_code.close'),
				'title' => _t('ext.share_via_qr_code.title'),
				'target_article' => _t('ext.share_via_qr_code.target.article'),
				'target_cleaned' => _t('ext.share_via_qr_code.target.cleaned'),
				'target_original' => _t('ext.share_via_qr_code.target.original'),
				'target_internal' => _t('ext.share_via_qr_code.target.internal'),
				'removed_one' => _t('ext.share_via_qr_code.removed_one'),
				'removed_many' => _t('ext.share_via_qr_code.removed_many'),
				'error' => _t('ext.share_via_qr_code.error'),
			],
		];
		return $vars;
	}
}
