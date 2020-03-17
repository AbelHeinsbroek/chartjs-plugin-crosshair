# Options

The plugin options can be changed at 2 different levels and with the following priority:

- per chart: `options.plugins.crosshair.*`
- globally: `Chart.defaults.global.plugins.crosshair.*`

## Interpolate tooltip mode

This plugin exposes the `interpolation` tooltip mode, which allows for
linear interpolation of values between data points.

The `interpolation` mode can be enabled by setting the tooltips mode to
`interpolate`

```js
options: {
  ...
  tooltips: {
    mode: 'interpolate',
    intersect: false
  }
}
```

## Crosshair Options

### Crosshair line options

| Name | Type | Default
| ---- | ---- | ----
| [`color`](#color) | `String` | `#F66`
| [`width`](#width) | `Number` | `1`


#### `color`
The color of the crosshair line, defaults to red (#F666)
#### `width`
The width of the crosshair line in pixels

### Chart interaction syncing
The plugin allows for syncing crosshairs over multiple charts

| Name | Type | Default
| ---- | ---- | ----
| [`enabled`](#enabled) | `Boolean` | `true`
| [`group`](#group) | `Number` | `1`
| [`suppressTooltips`](#tooltips) | `Boolean` | `false`


#### `enabled`
Enable or disable syncing of crosshairs between charts of the same group
#### `group`
Limit crosshair syncing to charts belonging to the same 'group'
#### `suppressTooltips`
Allows for suppressing tooltips when showing a synced crosshair

### Zooming
The plugin allows for horizontal zooming by clicking and dragging over
the chart.

| Name | Type | Default
| ---- | ---- | ----
| [`enabled`](#enabled) | `Boolean` | `true`
| [`zoomboxBackgroundColor`](#zoomboxBackgroundColor) | `String` | `rgba(66,133,244,0.2)`
| [`zoomboxBorderColor`](#zoomboxBorderColor) | `String` | `#48F`
| [`zoomButtonText`](#zoomButtonText) | `String` | `Reset Zoom`
| [`zoomButtonClass`](#zoomButtonClass) | `String` | `reset-zoom`

#### `enabled`
Enable or disable zooming by drag and drop

#### `zoomboxBackgroundColor`
Background color of the zoombox

#### `zoomboxBorderColor`
Border color of the zoombox

#### `zoomButtonText`
Text of the button to reset the chart to original axis ranges.

#### `zoomButtonClass`
Class of the button to reset the chart to original axis ranges.

### Callbacks

The plugin exposes to callbacks to handle zooming

#### `beforeZoom(start,end)`
Called before zooming, return false to prevent the zoom
#### `afterZoom(start,end)`
Called after zooming, can for example be used for reloading data at a higher
resolution
