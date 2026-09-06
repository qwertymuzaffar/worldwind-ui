---
'worldwind-kit': minor
'react-worldwind': minor
'ngx-worldwind': minor
---

A drawing tool (`DrawTool`, `<DrawTool>`, `ww-draw-tool`): draw points, lines and polygons, select them, drag their vertices, delete, and round-trip GeoJSON. A clustering layer (`ClusterLayer`, `<ClusterLayer>`, `ww-cluster-layer`) that shows thousands of points as count markers which split on zoom. Fullscreen and screenshot buttons on the navigation controls, backed by `toggleFullscreen`, `captureScreenshot` and `downloadScreenshot` in the kit.

Changing a WMS or WMTS layer's TIME now gives the layer a tile set per instant, so stepping back to an instant already fetched is immediate. The go-to box placeholder no longer clips.
