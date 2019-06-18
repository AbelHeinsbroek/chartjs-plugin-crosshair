# Options

The plugin options can be changed at 2 different levels and with the following priority:

- per chart: `options.plugins.deferred.*`
- globally: `Chart.defaults.global.plugins.deferred.*`

Available options:

| Name | Type | Default
| ---- | ---- | ----
| [`delay`](#delay) | `Number` | `0`
| [`xOffset`](#xoffset) | `Number/String` | `0`
| [`yOffset`](#yoffset) | `Number/String` | `0`

> **Note:** default options defer the chart loading until the first line of pixels of the canvas appears in the viewport

## `delay`
Number of milliseconds to delay the loading after the chart is considered inside the viewport.

## `xOffset`
Number of pixels (or percent of the canvas width) from which the chart is considered inside the viewport.

## `yOffset`
Number of pixels (or percent of the canvas height) from which the chart is considered inside the viewport.
