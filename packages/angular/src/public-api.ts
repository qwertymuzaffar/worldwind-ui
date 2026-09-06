/**
 * @module ngx-worldwind
 */
export * from 'worldwind-kit';

export { WwGlobeComponent } from './lib/globe.component';
export { injectCameraState, injectGlobe, injectHoverPick, injectLayers, injectProjection } from './lib/inject';
export {
  WwCustomLayerComponent,
  WwGeoJsonLayerComponent,
  WwKmlLayerComponent,
  WwLayerBase,
  WwLayerComponent,
  WwRenderableLayerComponent,
  WwWmsLayerComponent,
  WwWmtsLayerComponent,
} from './lib/layers';
export {
  WwGeographicTextComponent,
  WwPathComponent,
  WwPlacemarkComponent,
  WwPolygonComponent,
  WwShapeBase,
  WwStyledShapeBase,
  WwSurfaceCircleComponent,
  WwSurfacePolygonComponent,
  WwSurfacePolylineComponent,
} from './lib/shapes';
export { WwCameraDirective } from './lib/camera.directive';
export { WwPanelComponent, type WwPanelPosition } from './lib/ui/panel.component';
export { WwLayerSwitcherComponent } from './lib/ui/layer-switcher.component';
export { WwNavigationControlsComponent } from './lib/ui/navigation-controls.component';
export { WwGoToBoxComponent } from './lib/ui/goto-box.component';
export { WwCoordinatesComponent } from './lib/ui/coordinates.component';
export { WwMeasureToolComponent } from './lib/ui/measure-tool.component';
export { WwProjectionSwitcherComponent } from './lib/ui/projection-switcher.component';
export { WwPopupComponent, type WwPopupAnchor } from './lib/ui/popup.component';
export { WwScaleBarComponent } from './lib/ui/scale-bar.component';
export { WwCompassComponent } from './lib/ui/compass.component';
export { WwAttributionComponent } from './lib/ui/attribution.component';
export { WwLegendComponent } from './lib/ui/legend.component';
export { WwTimeSliderComponent } from './lib/ui/time-slider.component';

import { WwCameraDirective } from './lib/camera.directive';
import { WwGlobeComponent } from './lib/globe.component';
import {
  WwCustomLayerComponent,
  WwGeoJsonLayerComponent,
  WwKmlLayerComponent,
  WwLayerComponent,
  WwRenderableLayerComponent,
  WwWmsLayerComponent,
  WwWmtsLayerComponent,
} from './lib/layers';
import {
  WwGeographicTextComponent,
  WwPathComponent,
  WwPlacemarkComponent,
  WwPolygonComponent,
  WwSurfaceCircleComponent,
  WwSurfacePolygonComponent,
  WwSurfacePolylineComponent,
} from './lib/shapes';
import { WwCoordinatesComponent } from './lib/ui/coordinates.component';
import { WwGoToBoxComponent } from './lib/ui/goto-box.component';
import { WwLayerSwitcherComponent } from './lib/ui/layer-switcher.component';
import { WwMeasureToolComponent } from './lib/ui/measure-tool.component';
import { WwProjectionSwitcherComponent } from './lib/ui/projection-switcher.component';
import { WwPopupComponent } from './lib/ui/popup.component';
import { WwNavigationControlsComponent } from './lib/ui/navigation-controls.component';
import { WwPanelComponent } from './lib/ui/panel.component';
import { WwScaleBarComponent } from './lib/ui/scale-bar.component';
import { WwCompassComponent } from './lib/ui/compass.component';
import { WwAttributionComponent } from './lib/ui/attribution.component';
import { WwLegendComponent } from './lib/ui/legend.component';
import { WwTimeSliderComponent } from './lib/ui/time-slider.component';

/** Every component and directive, for `imports: [...WORLDWIND_COMPONENTS]`.
 * @category Globe
 */
export const WORLDWIND_COMPONENTS = [
  WwGlobeComponent,
  WwLayerComponent,
  WwWmsLayerComponent,
  WwWmtsLayerComponent,
  WwRenderableLayerComponent,
  WwCustomLayerComponent,
  WwGeoJsonLayerComponent,
  WwKmlLayerComponent,
  WwPlacemarkComponent,
  WwPathComponent,
  WwPolygonComponent,
  WwSurfacePolylineComponent,
  WwSurfacePolygonComponent,
  WwSurfaceCircleComponent,
  WwGeographicTextComponent,
  WwCameraDirective,
  WwPanelComponent,
  WwLayerSwitcherComponent,
  WwNavigationControlsComponent,
  WwGoToBoxComponent,
  WwCoordinatesComponent,
  WwMeasureToolComponent,
  WwProjectionSwitcherComponent,
  WwPopupComponent,
  WwScaleBarComponent,
  WwCompassComponent,
  WwAttributionComponent,
  WwLegendComponent,
  WwTimeSliderComponent,
] as const;
