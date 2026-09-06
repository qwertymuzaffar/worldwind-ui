# Getting started

worldwind-ui is three npm packages built on [NASA WorldWind](https://worldwind.arc.nasa.gov/web/), the open-source WebGL virtual globe.

| Package | Use it when | Install |
| --- | --- | --- |
| `react-worldwind` | You build with React 18 or 19 | `npm i react-worldwind @nasaworldwind/worldwind` |
| `ngx-worldwind` | You build with Angular 22 | `npm i ngx-worldwind @nasaworldwind/worldwind` |
| `worldwind-kit` | You use another framework or none, or you write your own components | `npm i worldwind-kit @nasaworldwind/worldwind` |

`@nasaworldwind/worldwind` is a peer dependency in every case: the libraries never bundle WorldWind, so your app has exactly one copy.

## Your first globe

::: code-group

```tsx [React]
import 'react-worldwind/styles.css';
import { Globe, Layer, LayerSwitcher, NavigationControls } from 'react-worldwind';

export function Map() {
  return (
    <Globe style={{ height: 480 }} layers={['blue-marble-landsat', 'atmosphere']} view={{ latitude: 40, longitude: -74, range: 2e6 }}>
      <Layer kind="osm" enabled={false} />
      <LayerSwitcher />
      <NavigationControls />
    </Globe>
  );
}
```

```ts [Angular]
import { Component } from '@angular/core';
import { WORLDWIND_COMPONENTS } from 'ngx-worldwind';

@Component({
  selector: 'app-map',
  imports: [...WORLDWIND_COMPONENTS],
  template: `
    <ww-globe [options]="{ layers: ['blue-marble-landsat', 'atmosphere'], view: { latitude: 40, longitude: -74, range: 2e6 } }" style="height: 480px">
      <ww-layer kind="osm" [enabled]="false" />
      <ww-layer-switcher />
      <ww-navigation-controls />
    </ww-globe>
  `,
})
export class MapComponent {}
```

```ts [Kit]
import { GlobeController } from 'worldwind-kit';

const globe = await GlobeController.create(document.getElementById('map')!, {
  layers: ['blue-marble-landsat', 'atmosphere', 'compass'],
  view: { latitude: 40, longitude: -74, range: 2e6 },
});
globe.on('click', (event) => console.log(event.position));
```

:::

The globe fills its host element, so give that element a height. In Angular, add `@import 'ngx-worldwind/styles.css';` to your global styles for the widgets.

## Assets

WorldWind loads images (pushpins, compass, Blue Marble) relative to its own script location, which bundlers break. The libraries point it at a CDN copy matching the installed version by default; pass `assetBaseUrl` to self-host them.

## Next

- [React](./react) and [Angular](./angular) walk through every component.
- [Bundling WorldWind](./bundling) matters if you build with Vite 8.
- [Testing without WebGL](./testing) shows the fake WorldWind.
