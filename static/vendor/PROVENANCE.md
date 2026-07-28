# Provenance of the bundled QR library

`qrcode.js` is an **unmodified** copy of the `js/dist/qrcode.js` build from
[kazuhikoarase/qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator),
MIT licensed (see `qrcode.LICENSE`), with no dependencies of its own.

| | |
|---|---|
| Upstream | `https://github.com/kazuhikoarase/qrcode-generator` |
| Path | `js/dist/qrcode.js` |
| Tag | `js2.0.4` (the JS package tag — there is no `v2.0.4`) |
| Commit | `83b7e8fe3fddd3b0368dbafd6ce56995bd25e3c8` |
| Size | 56694 bytes |
| Git blob | `df13f829bf41f36b82f0ed85751ed3b4c39cfeb8` |
| SHA-256 | `79ec86f82856005b1c887905cfccfcfbec3821ca61c7fd5a952faa5f778f791c` |

## Verifying it yourself

Against this repository, offline — this is what CI runs on every push:

```sh
shasum -a 256 -c static/vendor/qrcode.js.sha256
```

Against upstream, over the network. The git blob id is content-addressed, so a
match proves the file is byte for byte what the upstream tag holds:

```sh
git hash-object static/vendor/qrcode.js
gh api 'repos/kazuhikoarase/qrcode-generator/contents/js/dist/qrcode.js?ref=js2.0.4' --jq .sha
```

## What the checksum does and does not prove

It proves the file has not changed since it was vendored, and any attempt to
change it shows up as a checksum line in the diff — which is loud in review.

It does **not** establish trust on its own: whoever can edit the library in this
repository can edit the checksum in the same commit. The upstream comparison
above is the check that does not depend on this repository being honest, which
is why the blob id is written down here rather than only a local hash.
