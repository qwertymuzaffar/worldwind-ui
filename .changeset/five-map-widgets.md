---
'worldwind-kit': minor
'react-worldwind': minor
'ngx-worldwind': minor
---

Five new widgets: ScaleBar, Compass, Attribution, Legend and TimeSlider (`ww-scale-bar`, `ww-compass`, `ww-attribution`, `ww-legend`, `ww-time-slider` in Angular), plus `top-center` and `bottom-center` panel positions.

Layers gained `attribution`, `legend` and `timeDimension` options; layers created from WMS/WMTS capabilities fill them in from the document. The kit adds `setLayerTime` / `LayerManager.setTime` (change a WMS or WMTS layer's TIME after creation), `globe.trackScale`, `computeScaleBar`, `collectAttributions`, `collectLegends`, `parseTimeDimension`, `resolveTimeDimension` and friends. React adds `useScaleBar`, `useAttributions` and `useLegends`.
