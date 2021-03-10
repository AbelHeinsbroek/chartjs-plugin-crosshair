export default function(Chart, Helpers) {
	var defaultOptions = {
		line: {
			color: '#F66',
			width: 1,
			dashPattern: []
		},
		sync: {
			enabled: true,
			group: 1,
			suppressTooltips: false
		},
		zoom: {
			enabled: true,
			zoomboxBackgroundColor: 'rgba(66,133,244,0.2)',
			zoomboxBorderColor: '#48F',
			zoomButtonText: 'Reset Zoom',
			zoomButtonClass: 'reset-zoom',
		},
		snap: {
			enabled: false,
		},
		callbacks: {
			beforeZoom: function(start, end) {
				return true;
			},
			afterZoom: function(start, end) {
			}
		}
	};

	var crosshairPlugin = {

		id: 'crosshair',

		afterInit: function(chart) {

			let xAxes = Object.keys(chart.config.options.scales).filter(function(key){
				return chart.config.options.scales[key].axis === 'x';
			})

			if (xAxes.length === 0) {
				return
			}

			var xScaleType = chart.config.options.scales[xAxes[0]].type

			if (xScaleType !== 'linear' && xScaleType !== 'time' && xScaleType !== 'category' && xScaleType !== 'logarithmic' && xScaleType !== 'timeseries') {
				return;
			}

			if (chart.options.plugins.crosshair === undefined) {
				chart.options.plugins.crosshair = defaultOptions;
			}

			chart.crosshair = {
				enabled: false,
				x: null,
				originalData: [],
				originalXRange: {},
				dragStarted: false,
				dragStartX: null,
				dragEndX: null,
				suppressTooltips: false,
				reset: function() {
					this.resetZoom(chart, false, false);
				}.bind(this)
			};

			var syncEnabled = this.getOption(chart, 'sync', 'enabled');
			if (syncEnabled) {
				chart.crosshair.syncEventHandler = function(e) {
					this.handleSyncEvent(chart, e);
				}.bind(this);

				chart.crosshair.resetZoomEventHandler = function(e) {

					var syncGroup = this.getOption(chart, 'sync', 'group');

					if (e.chartId !== chart.id && e.syncGroup === syncGroup) {
						this.resetZoom(chart, true);
					}
				}.bind(this);

				window.addEventListener('sync-event', chart.crosshair.syncEventHandler);
				window.addEventListener('reset-zoom-event', chart.crosshair.resetZoomEventHandler);
			}

			chart.panZoom = this.panZoom.bind(this, chart);
		},

		destroy: function(chart) {
			var syncEnabled = this.getOption(chart, 'sync', 'enabled');
			if (syncEnabled) {
				window.removeEventListener('sync-event', chart.crosshair.syncEventHandler);
				window.removeEventListener('reset-zoom-event', chart.crosshair.resetZoomEventHandler);
			}
		},

		panZoom: function(chart, increment) {
			if (chart.crosshair.originalData.length === 0) {
				return;
			}
			var diff = chart.crosshair.end - chart.crosshair.start;
			var min = chart.crosshair.min;
			var max = chart.crosshair.max;
			if (increment < 0) { // left
				chart.crosshair.start = Math.max(chart.crosshair.start + increment, min);
				chart.crosshair.end = chart.crosshair.start === min ? min + diff : chart.crosshair.end + increment;
			} else { // right
				chart.crosshair.end = Math.min(chart.crosshair.end + increment, chart.crosshair.max);
				chart.crosshair.start = chart.crosshair.end === max ? max - diff : chart.crosshair.start + increment;
			}

			this.doZoom(chart, chart.crosshair.start, chart.crosshair.end);
		},

		getOption: function(chart, category, name) {
			return Helpers.valueOrDefault(chart.options.plugins.crosshair[category] ? chart.options.plugins.crosshair[category][name] : undefined, defaultOptions[category][name]);
		},
		getXScale: function(chart) {
			return chart.data.datasets.length ? chart.scales[chart.getDatasetMeta(0).xAxisID] : null;
		},
		getYScale: function(chart) {
			return chart.scales[chart.getDatasetMeta(0).yAxisID];
		},

		handleSyncEvent: function(chart, e) {

			var syncGroup = this.getOption(chart, 'sync', 'group');

			// stop if the sync event was fired from this chart
			if (e.chartId === chart.id) {
				return;
			}

			// stop if the sync event was fired from a different group
			if (e.syncGroup !== syncGroup) {
				return;
			}

			var xScale = this.getXScale(chart);

			if (!xScale) {
				return;
			}

			// Safari fix
			var buttons = (e.original.event.native.buttons === undefined ? e.original.event.native.which : e.original.event.native.buttons);
			if (e.original.type === 'mouseup') {
				buttons = 0;
			}

			var newEvent = {
				type: e.original.event.type,
				chart: chart,
				x: xScale.getPixelForValue(e.xValue),
				y: e.original.event.y,
				native: {
					buttons: buttons
				},
				stop: true,
			};

			chart._eventHandler(newEvent);
		},

		afterEvent: function(chart, e) {

			let xAxes = Object.keys(chart.config.options.scales).filter(function(key){
				return chart.config.options.scales[key].axis === 'x';
			})

			if (xAxes.length === 0) {
				return
			}

			var xScaleType = chart.config.options.scales[xAxes[0]].type

			if (xScaleType !== 'linear' && xScaleType !== 'time' && xScaleType !== 'category' && xScaleType !== 'logarithmic' && xScaleType !== 'timeseries') {
				return;
			}

			var xScale = this.getXScale(chart);

			if (!xScale) {
				return;
			}

			// fix for Safari
			var buttons = (e.event.native.buttons === undefined ? e.event.native.which : e.event.native.buttons);
			if (e.event.native.type === 'mouseup') {
				buttons = 0;
			}

			var syncEnabled = this.getOption(chart, 'sync', 'enabled');
			var syncGroup = this.getOption(chart, 'sync', 'group');

			// fire event for all other linked charts
			if (!e.event.stop && syncEnabled) {
				var event = new CustomEvent('sync-event');
				event.chartId = chart.id;
				event.syncGroup = syncGroup;
				event.original = e;
				event.xValue = xScale.getValueForPixel(e.event.x);
				window.dispatchEvent(event);
			}

			// suppress tooltips for linked charts
			var suppressTooltips = this.getOption(chart, 'sync', 'suppressTooltips');

			chart.crosshair.suppressTooltips = e.event.stop && suppressTooltips;

			chart.crosshair.enabled = (e.event.type !== 'mouseout' && (e.event.x > xScale.getPixelForValue(xScale.min) && e.event.x < xScale.getPixelForValue(xScale.max)));

			if (!chart.crosshair.enabled) {

				// TODO: This makes the lib to enter in loop, is there a reason for this?

				/*if (e.event.x > xScale.getPixelForValue(xScale.max)) {
					chart.update();
				}*/

				return true;
			}

			// handle drag to zoom
			var zoomEnabled = this.getOption(chart, 'zoom', 'enabled');


			if (buttons === 1 && !chart.crosshair.dragStarted && zoomEnabled) {
				chart.crosshair.dragStartX = e.event.x;
				chart.crosshair.dragStarted = true;
			}

			// handle drag to zoom
			if (chart.crosshair.dragStarted && buttons === 0) {

				chart.crosshair.dragStarted = false;

				var start = xScale.getValueForPixel(chart.crosshair.dragStartX);
				var end = xScale.getValueForPixel(chart.crosshair.x);

				if (Math.abs(chart.crosshair.dragStartX - chart.crosshair.x) > 1) {
					this.doZoom(chart, start, end);
				}

				chart.update();
			}

			chart.crosshair.x = e.event.x;

			chart.draw();

		},

		afterDraw: function(chart) {

			if (!chart.crosshair.enabled) {
				return;
			}

			if (chart.crosshair.dragStarted) {
				this.drawZoombox(chart);
			} else {
				this.drawTraceLine(chart);
				this.interpolateValues(chart);
				this.drawTracePoints(chart);
			}

			return true;
		},

		beforeTooltipDraw: function(chart) {
			// suppress tooltips on dragging
			return !chart.crosshair.dragStarted && !chart.crosshair.suppressTooltips;
		},

		resetZoom: function(chart) {

			let xAxes = Object.keys(chart.config.options.scales).filter(function(key){
				return chart.config.options.scales[key].axis === 'x';
			})

			if (xAxes.length === 0) {
				return
			}

			var xScale = chart.config.options.scales[xAxes[0]]

			var stop = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
			var update = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

			if (update) {
				for (var datasetIndex = 0; datasetIndex < chart.data.datasets.length; datasetIndex++) {
					var dataset = chart.data.datasets[datasetIndex];
					dataset.data = chart.crosshair.originalData.shift(0);
				}

				var range = 'ticks';

				if (xScale.time) {
					range = 'time';
				}
				// reset original xRange
				if (chart.crosshair.originalXRange.min) {
					xScale[range].min = chart.crosshair.originalXRange.min;
					chart.crosshair.originalXRange.min = null;
				} else {
					delete xScale[range].min;
				}
				if (chart.crosshair.originalXRange.max) {
					xScale[range].max = chart.crosshair.originalXRange.max;
					chart.crosshair.originalXRange.max = null;
				} else {
					delete xScale[range].max;
				}
			}

			if (chart.crosshair.button && chart.crosshair.button.parentNode) {
				chart.crosshair.button.parentNode.removeChild(chart.crosshair.button);
				chart.crosshair.button = false;
			}

			var syncEnabled = this.getOption(chart, 'sync', 'enabled');

			if (!stop && update && syncEnabled) {

				var syncGroup = this.getOption(chart, 'sync', 'group');

				var event = new CustomEvent('reset-zoom-event');
				event.chartId = chart.id;
				event.syncGroup = syncGroup;
				window.dispatchEvent(event);
			}
			if (update) {
				var anim = chart.options.animation;
				chart.options.animation = false;
				chart.update();
				chart.options.animation = anim;
			}
		},

		doZoom: function(chart, start, end) {

			// swap start/end if user dragged from right to left
			if (start > end) {
				var tmp = start;
				start = end;
				end = tmp;
			}

			// notify delegate
			var beforeZoomCallback = this.getOption(chart, 'callbacks', 'beforeZoom');

			if (typeof beforeZoomCallback === 'function' && !beforeZoomCallback(start, end)) {
				return false;
			}

			let xAxesIndexes = Object.keys(chart.config.options.scales).filter(function(key){
				return chart.config.options.scales[key].axis === 'x';
			})

			if (xAxesIndexes.length === 0) {
				return
			}

			var xScale = chart.config.options.scales[xAxesIndexes[0]]

			if (xScale.type === 'time') {

				if (xScale.time.min && chart.crosshair.originalData.length === 0) {
					chart.crosshair.originalXRange.min = xScale.time.min;
				}
				if (xScale.time.max && chart.crosshair.originalData.length === 0) {
					chart.crosshair.originalXRange.max = xScale.time.max;
				}

			} else {

				if (xScale.ticks.min && chart.crosshair.originalData.length === undefined) {
					chart.crosshair.originalXRange.min = xScale.ticks.min;
				}
				if (xScale.ticks.max && chart.crosshair.originalData.length === undefined) {
					chart.crosshair.originalXRange.max = xScale.ticks.max;
				}


			}

			if (!chart.crosshair.button) {
				// add restore zoom button
				var button = document.createElement('button');

				var buttonText = this.getOption(chart, 'zoom', 'zoomButtonText')
				var buttonClass = this.getOption(chart, 'zoom', 'zoomButtonClass')

				var buttonLabel = document.createTextNode(buttonText);
				button.appendChild(buttonLabel);
				button.className = buttonClass;
				button.addEventListener('click', function() {
					this.resetZoom(chart);
				}.bind(this));
				chart.canvas.parentNode.appendChild(button);
				chart.crosshair.button = button;
			}

			// set axis scale
			if (xScale.time) {
				xScale.time.min = start;
				xScale.time.max = end;
			} else {
				xScale.ticks.min = start;
				xScale.ticks.max = end;
			}

			// make a copy of the original data for later restoration
			var storeOriginals = (chart.crosshair.originalData.length === 0) ? true : false;
			// filter dataset
      
			for (var datasetIndex = 0; datasetIndex < chart.data.datasets.length; datasetIndex++) {

				var newData = [];

				var index = 0;
				var started = false;
				var stop = false;
				if (storeOriginals) {
					chart.crosshair.originalData[datasetIndex] = chart.data.datasets[datasetIndex].data;
				}

				var sourceDataset = chart.crosshair.originalData[datasetIndex];

				for (var oldDataIndex = 0; oldDataIndex < sourceDataset.length; oldDataIndex++) {

					var oldData = sourceDataset[oldDataIndex];

					var oldDataX = this.getRightValue(oldData, chart)

					// append one value outside of bounds
					if (oldDataX >= start && !started && index > 0) {
						newData.push(sourceDataset[index - 1]);
						started = true;
					}
					if (oldDataX >= start && oldDataX <= end) {
						newData.push(oldData);
					}
					if (oldDataX > end && !stop && index < sourceDataset.length) {
						newData.push(oldData);
						stop = true;
					}
					index += 1;
				}

				chart.data.datasets[datasetIndex].data = newData;
			}

			chart.crosshair.start = start;
			chart.crosshair.end = end;

			if (storeOriginals) {
				var xAxes = this.getXScale(chart);
				chart.crosshair.min = xAxes.min;
				chart.crosshair.max = xAxes.max;
			}

			chart.update();

			var callbacks = chart.config.options.plugins.crosshair.callbacks

			if (callbacks && typeof callbacks.afterZoom === 'function') {
				callbacks.afterZoom(start, end);
			}
		},

		drawZoombox: function(chart) {

			var yScale = this.getYScale(chart);

			var borderColor = this.getOption(chart, 'zoom', 'zoomboxBorderColor');
			var fillColor = this.getOption(chart, 'zoom', 'zoomboxBackgroundColor');

			chart.ctx.beginPath();
			chart.ctx.rect(chart.crosshair.dragStartX, yScale.getPixelForValue(yScale.max), chart.crosshair.x - chart.crosshair.dragStartX, yScale.getPixelForValue(yScale.min) - yScale.getPixelForValue(yScale.max));
			chart.ctx.lineWidth = 1;
			chart.ctx.strokeStyle = borderColor;
			chart.ctx.fillStyle = fillColor;
			chart.ctx.fill();
			chart.ctx.fillStyle = '';
			chart.ctx.stroke();
			chart.ctx.closePath();
		},

		drawTraceLine: function(chart) {

			var yScale = this.getYScale(chart);

			var lineWidth = this.getOption(chart, 'line', 'width');
			var color = this.getOption(chart, 'line', 'color');
			var dashPattern = this.getOption(chart, 'line', 'dashPattern');
			var snapEnabled = this.getOption(chart, 'snap', 'enabled');

			var lineX = chart.crosshair.x;
			var isHoverIntersectOff = true // TODO: chart.config.options.hover.intersect === false;

			if (snapEnabled && isHoverIntersectOff && chart.active.length) {
				lineX = chart.active[0]._view.x;
			}

			chart.ctx.beginPath();
			chart.ctx.setLineDash(dashPattern);
			chart.ctx.moveTo(lineX, yScale.getPixelForValue(yScale.max));
			chart.ctx.lineWidth = lineWidth;
			chart.ctx.strokeStyle = color;
			chart.ctx.lineTo(lineX, yScale.getPixelForValue(yScale.min));
			chart.ctx.stroke();
			chart.ctx.setLineDash([]);

		},

		drawTracePoints: function(chart) {

			for (var chartIndex = 0; chartIndex < chart.data.datasets.length; chartIndex++) {

				var dataset = chart.data.datasets[chartIndex];
				var meta = chart.getDatasetMeta(chartIndex);

				var yScale = chart.scales[meta.yAxisID];

				if (meta.hidden || !dataset.interpolate) {
					continue;
				}

				chart.ctx.beginPath();
				chart.ctx.arc(chart.crosshair.x, yScale.getPixelForValue(dataset.interpolatedValue), 3, 0, 2 * Math.PI, false);
				chart.ctx.fillStyle = 'white';
				chart.ctx.lineWidth = 2;
				chart.ctx.strokeStyle = dataset.borderColor;
				chart.ctx.fill();
				chart.ctx.stroke();

			}

		},

		interpolateValues: function(chart) {

			for (var chartIndex = 0; chartIndex < chart.data.datasets.length; chartIndex++) {

				var dataset = chart.data.datasets[chartIndex];

				var meta = chart.getDatasetMeta(chartIndex);

				var xScale = chart.scales[meta.xAxisID];
				var xValue = xScale.getValueForPixel(chart.crosshair.x);

				if (meta.hidden || !dataset.interpolate) {
					continue;
				}

				var data = dataset.data;
				var index = data.findIndex(function(o) {
					return o.x >= xValue;
				});
				var prev = data[index - 1];
				var next = data[index];

				if (chart.data.datasets[chartIndex].steppedLine && prev) {
					dataset.interpolatedValue = prev.y;
				} else if (prev && next) {
					var slope = (next.y - prev.y) / (next.x - prev.x);
					dataset.interpolatedValue = prev.y + (xValue - prev.x) * slope;
				} else {
					dataset.interpolatedValue = NaN;
				}
			}

		},
		getRightValue: function(rawValue, chart) {
			// Null and undefined values first
			if (rawValue === null || rawValue === undefined) {
				return NaN;
			}
			// isNaN(object) returns true, so make sure NaN is checking for a number; Discard Infinite values
			if ((typeof rawValue === 'number' || rawValue instanceof Number) && !isFinite(rawValue)) {
				return NaN;
			}

			// If it is in fact an object, dive in one more level
			if (rawValue) {
				const position = chart.config.options.position

				if (position === 'top' || position === 'bottom') {
					return this.getRightValue(rawValue.y, chart);
				} else if (rawValue.y !== undefined) {
					if (rawValue.x !== undefined) {
						return this.getRightValue(rawValue.x, chart);
					}
				}
			}

			// Value is good, return it
			return rawValue;
		}

	};

	if (Chart.register) {
		Chart.register(crosshairPlugin);
	} else if (Chart.Chart && Chart.Chart.register) {
		Chart.Chart.register(crosshairPlugin);
	} else {
		throw new Error('Cannot register crosshair plugin');
	}
}
