# m{ai}geXR brand

Shared brand tokens and the mascot, copied into each repository.

These are separate git repositories with separate remotes, so there is no shared
parent to reference. **This folder is a copy.** When you change one, copy it to
the others — the list is at the bottom. Keeping four copies honest is the cost of
the repo layout; the alternative is a published package, which is worth doing if
this starts changing often.

Canonical reference: <https://maigexr.seacloud9.studio/>

## Files

| File | Use |
|---|---|
| `brand.json` | Machine-readable tokens. Use from Kotlin, Swift, or build scripts. |
| `brand.css` | The same tokens as CSS custom properties, for web and webview surfaces. |
| `maigexr-mascot.jpg` | Mascot, 400×400. |
| `maigexr-mascot-200.jpg` | Mascot, 200×200, for small or low-DPI use. |

## The wordmark

`m{ai}geXR` — the braces segment `{ai}` is cobalt, the rest takes the surrounding
text colour, white on dark chrome.

Two traps:

- **In JSX, `m{ai}geXR` does not work.** `{ai}` parses as an expression against
  an undefined variable and fails the build. Use a component, or `{'{ai}'}`.
- **Hashtags and handles cannot carry braces.** Use `maigeXR` there.

## Colour

Cobalt `#2050e0` is the accent. It is held lighter on dark (`#3f6bf0`) so it
keeps contrast against a near-black ground.

An older `#ec3013` accent set still appears in the site's stylesheet, overridden
later by the cobalt one. If you are reading tokens off the live site, take the
last definition.

## Type and shape

Archivo, 800 for headings with `-0.02em` tracking. Labels are uppercase at
`0.06em`. The system is **square-cornered**: `--brand-radius: 0px`. Rounding is a
deliberate departure, not the default.

## Copies live in

- `WebMaigeXr/brand/`
- `iOSMaigeXr/brand/`
- `AndroidMaigeXr/brand/`
- `mcp-webgpu/brand/`
