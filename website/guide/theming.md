# Theming

The widgets share one stylesheet, `react-worldwind/styles.css` or `ngx-worldwind/styles.css` (both are the kit's `worldwind-kit/styles.css`). It is written against a handful of custom properties on `:root`, so a theme is a few lines of CSS.

| Property | Default | Used for |
| --- | --- | --- |
| `--wwui-font` | system UI stack | Widget text |
| `--wwui-font-size` | `13px` | Base size |
| `--wwui-bg` | `rgba(15, 23, 42, 0.82)` | Panel background (blurred) |
| `--wwui-fg` | `#f1f5f9` | Text |
| `--wwui-muted` | `#94a3b8` | Labels, hints |
| `--wwui-accent` | `#38bdf8` | Checkboxes, sliders, focus rings, active buttons |
| `--wwui-border` | `rgba(255, 255, 255, 0.14)` | Panel and button borders |
| `--wwui-hover` | `rgba(255, 255, 255, 0.08)` | Button hover |
| `--wwui-radius` | `10px` | Panel corners |
| `--wwui-shadow` | soft dark shadow | Panels |
| `--wwui-gap` | `12px` | Distance from the globe's edges |
| `--wwui-control-size` | `34px` | Square buttons |

## A light theme

```css
.my-map {
  --wwui-bg: rgba(255, 255, 255, 0.9);
  --wwui-fg: #0f172a;
  --wwui-muted: #64748b;
  --wwui-accent: #2563eb;
  --wwui-border: rgba(15, 23, 42, 0.12);
  --wwui-hover: rgba(15, 23, 42, 0.06);
  --wwui-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);
}
```

Scope the overrides to the globe's container (the example above) or set them on `:root` for the whole app. Panels use `backdrop-filter: blur()`, so a translucent background keeps the globe visible underneath.

## Class names

Every element carries a stable `wwui-*` class (`wwui-panel`, `wwui-button`, `wwui-layer-switcher`, `wwui-goto`, `wwui-coords`, `wwui-measure`, …), so anything the properties don't cover can be restyled directly. Widgets also accept a `className` (React) or `panelClass` (Angular) for the panel.

## Small screens

Below 720px the stylesheet lets panels shrink to the viewport, wraps the coordinates readout, and caps the layer switcher's height with scrolling. Apps typically show fewer widgets on phones; the demos hide the projection switcher and the status panel there.
