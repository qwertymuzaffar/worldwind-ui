---
layout: home
hero:
  name: worldwind-ui
  text: UI libraries for NASA WorldWind
  tagline: One typed core, thin adapters for React and Angular, ready-made widgets, and a fake WorldWind for tests.
  image:
    src: /screenshot.jpg
    alt: The React demo, a 3D globe with widgets
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: React demo
      link: /react/
      target: _self
    - theme: alt
      text: Angular demo
      link: /angular/
      target: _self
features:
  - title: Lifecycle WorldWind never had
    details: GlobeController.destroy() stops the render loop, removes the listeners WorldWind leaks, drops the layers and releases WebGL.
  - title: Declarative layers and shapes
    details: Built-in, WMS, WMTS, GeoJSON and KML layers; placemarks, paths, polygons and surface shapes from plain data, updated in place.
  - title: Widgets that just work
    details: Layer switcher, navigation, go-to search, coordinates readout, measuring tool and projection switcher, sharing one stylesheet.
  - title: Tested where it counts
    details: Unit tests against a WebGL-free fake, and browser tests against the deployed demos with software WebGL.
  - title: Bundler-proof
    details: A Vite plugin that keeps WorldWind's bundle working after production builds, or a CDN script loader.
  - title: Token-free releases
    details: Changesets, npm trusted publishing with provenance, and demos redeployed on every push.
---
