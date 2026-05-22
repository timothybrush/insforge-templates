# Template Cover Images

Cover images for marketplace templates. Each `registry.json` entry's `cover`
field must point at a file in this directory.

## Conventions

- **Filename:** `<slug>.png` matching the template's directory name.
- **Dimensions:** 1280 × 800 (16:10). The frontend renders at varying sizes;
  anything significantly off-ratio will letterbox.
- **File size budget:** ≤ 1 MB. Larger files block the validate CI.
- **Format:** PNG preferred; SVG accepted for vector art.

## Replacing a placeholder

Overwrite the file in place. CI checks file size on every PR (≤ 1 MB).
Dimensions are advisory — not currently enforced.
