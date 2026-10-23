# Cicure vector identity

`CicureWordmark` combines the supplied icon's C and point with only `icure` from the original Comfortaa Bold outlines. It renders vector parts, never the reference screenshot or a flattened wordmark image. `size` is its visual height in dp; the width follows the fixed brand proportions. All header, login and onboarding instances share this component.

`monogramGeometry.ts` records the source icon checksum and its traced alpha contour. The original PNG remains preserved in `assets/cicure-monogram-source.png`; the icon and favicon keep that monogram.

`cicurePaths.ts` preserves the outlines, advances and kerning generated from the installed Comfortaa Bold font. Copyright 2011 The Comfortaa Project Authors, SIL OFL 1.1; see `node_modules/@expo-google-fonts/comfortaa/LICENSE_FONT`. These are rendered letter outlines, not a renamed or modified font. Regenerate deliberately with `python scripts/generate-cicure-logo.py`; verify with `--check`.

`AnimatedLogo` takes a shared `progress` in milliseconds. `brandTimeline.ts` defines its bounded stages: draw and turn the C once, reveal the point, move the symbol into position, reveal the five suffix letters in order, then hold the finished identity. SVG matrices and path properties animate on the UI thread; no font load can change its geometry mid-animation.

`AnimatedSplash` owns the timing and resource handoff. It exits only after both the reveal and `ready` are true. A delayed animation callback has a fallback that marks the reveal complete without bypassing readiness. Reduce Motion immediately selects the completed identity and waits only for resources. The normal sequence lasts 2200 ms plus a 240 ms exit.
