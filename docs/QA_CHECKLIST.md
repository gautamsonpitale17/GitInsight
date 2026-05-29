# GitInsight QA checklist

Manual verification targets for releases. Automated/unit coverage noted where applicable.

## Typography & copy

- [x] All chart titles use sentence case (section titles and chart subheadings; stat labels use sentence case)
- [x] No placeholder text (`Lorem ipsum`, `undefined`, `NaN`) visible in any state
- [x] Empty states display for all sections when data is missing

## Links & media

- [x] All external links open in `_blank` with `rel="noopener noreferrer"`
- [x] GitHub avatar has a fallback (initials circle) if the URL fails to load

## Charts & layout

- [x] Heatmap tooltip doesn't clip outside the viewport (fixed positioning + clamping)
- [x] Dark mode: backgrounds, borders, and text use theme tokens (no white-on-white / black-on-black)
- [x] Mobile: no horizontal overflow (`overflow-x: hidden` on root)

## Accessibility

- [x] All form inputs have labels (including visually hidden)
- [x] Tab order is logical (sidebar before main; drawer uses `inert` when closed)

## Reliability

- [x] No console errors or warnings in production build (`npm run build`)
- [x] API errors surface to the user via `SectionMessage` / toasts (no silent section failures)

## Build

- [x] `npm run build` completes without application errors
- [x] Upstash Redis warnings suppressed when env vars are unset (noop cache client)

## Performance (Lighthouse)

Run against production build (`npm run build && npm run start`) on a representative `/[username]` page:

| Category       | Target |
|----------------|--------|
| Performance    | ≥ 90   |
| Accessibility  | ≥ 95   |
| SEO            | ≥ 90   |

Optimizations applied: metadata/OG, image `sizes`, reduced layout shift, semantic headings, skip-friendly structure.

## How to verify

```bash
npm run build
npm run start
# Lighthouse in Chrome DevTools (Incognito), mobile + desktop
```
