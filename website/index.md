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
  - icon: ♻️
    title: Lifecycle WorldWind never had
    details: GlobeController.destroy() stops the render loop, removes the listeners WorldWind leaks, drops the layers and releases WebGL.
  - icon: 🗺️
    title: Declarative layers and shapes
    details: Built-in, WMS, WMTS, GeoJSON and KML layers; placemarks, paths, polygons and surface shapes from plain data, updated in place.
  - icon: 🎛️
    title: Widgets that just work
    details: Layer switcher, navigation, go-to search, coordinates readout, measuring tool and projection switcher, sharing one stylesheet.
  - icon: 🧪
    title: Tested where it counts
    details: Unit tests against a WebGL-free fake, and browser tests against the deployed demos with software WebGL.
  - icon: 📦
    title: Bundler-proof
    details: A Vite plugin that keeps WorldWind's bundle working after production builds, or a CDN script loader.
  - icon: 🔏
    title: Token-free releases
    details: Changesets, npm trusted publishing with provenance, and demos redeployed on every push.
---

<div class="wwui-badges">
  <a href="https://www.npmjs.com/package/worldwind-kit"><img src="https://img.shields.io/npm/v/worldwind-kit?label=worldwind-kit" alt="worldwind-kit on npm" /></a>
  <a href="https://www.npmjs.com/package/react-worldwind"><img src="https://img.shields.io/npm/v/react-worldwind?label=react-worldwind" alt="react-worldwind on npm" /></a>
  <a href="https://www.npmjs.com/package/ngx-worldwind"><img src="https://img.shields.io/npm/v/ngx-worldwind?label=ngx-worldwind" alt="ngx-worldwind on npm" /></a>
  <a href="https://github.com/qwertymuzaffar/worldwind-ui/actions/workflows/ci.yml"><img src="https://github.com/qwertymuzaffar/worldwind-ui/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
  <img src="https://img.shields.io/npm/l/worldwind-kit" alt="MIT license" />
</div>

## Install

::: code-group

```sh [React]
npm install react-worldwind @nasaworldwind/worldwind
```

```sh [Angular]
npm install ngx-worldwind @nasaworldwind/worldwind
```

```sh [Any framework]
npm install worldwind-kit @nasaworldwind/worldwind
```

:::

Then follow [Getting started](/guide/getting-started); a globe is about ten lines.

## See it live

The published packages, running here. Drag to rotate, scroll to zoom, click a pin, try the measuring tool.

<DemoFrame />

## Why this exists

WorldWind's own API is imperative, untyped and has no teardown. These packages add a documented TypeScript surface, declarative layers and shapes that update in place, a real `destroy()`, one shared gesture recognizer per globe, a Vite plugin for the bundling bug WorldWind trips over, and a fake WorldWind so components can be tested in jsdom. The [Concepts](/guide/concepts) page explains the design in a few minutes.
