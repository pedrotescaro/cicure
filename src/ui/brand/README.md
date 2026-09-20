# cicure vector wordmark

`cicurePaths.ts` contains outlines generated directly from the installed
`@expo-google-fonts/comfortaa/700Bold/Comfortaa_700Bold.ttf` (Comfortaa Bold 700),
not traced or approximated letter shapes. The source font SHA-256 is included in
the generated file. The geometry preserves the original advances and GPOS
kerning and scales uniformly to fit a fixed view box.

The source font is copyright 2011 The Comfortaa Project Authors and licensed
under SIL Open Font License 1.1; its license is available in
`node_modules/@expo-google-fonts/comfortaa/LICENSE_FONT`. This vector wordmark is
rendered artwork, not a modified or renamed font.

To regenerate after deliberately updating the source font, install Python 3 and
`fonttools`, then run `python scripts/generate-cicure-logo.py`. To check the
committed artifact without writing, use `python scripts/generate-cicure-logo.py
--check`. FontTools is development tooling only and is not bundled in the app.

Each letter retains all source contours, including the i dot, the e's inner
edge, and the overlapping contours of u/r. The fill uses the font's nonzero
winding. Contour lengths are measured from the actual quadratic curves;
`strokeDashoffset` consumes those lengths in order rather than fading complete
letters. The outlines disappear into the solid fill at the end, preserving the
real weight of Comfortaa Bold.

`AnimatedLogo` accepts shared `drawProgress` and `fillProgress` values in 0..1.
Its caller owns timing, splash handoff and reduced-motion behavior. Setting both
values directly to 1 renders the completed logo without movement. Width is
bounded to the viewport and height always follows the original proportions;
neither layout nor letter spacing is animated. Motion settings live in
`src/ui/motion.ts` and the default red comes from `src/ui/theme.ts`.
