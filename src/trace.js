export default function(Chart) {
	var helpers = Chart.helpers;

	var defaultOptions = {
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

			if (chart.config.options.scales.xAxes.length == 0) {
				return
			}

			// create crosshairDiv
			var crosshairDiv = document.createElement('div')
			crosshairDiv.className = 'chartjs-crosshair'
			chart.canvas.parentNode.insertBefore(crosshairDiv, chart.canvas.nextSibling)
			crosshairDiv.style.display = 'none'

			var zoomDiv = document.createElement('div')
			zoomDiv.className = 'chartjs-zoombox'
			chart.canvas.parentNode.insertBefore(zoomDiv, chart.canvas.nextSibling)
			zoomDiv.style.display = 'none'

			var xScaleType = chart.config.options.scales.xAxes[0].type

			if (xScaleType !== 'linear' && xScaleType !== 'time' && xScaleType !== 'category' && xscaleType !== 'logarithmic') {
				return;
			}

			if (chart.options.plugins.crosshair === undefined) {
				chart.options.plugins.crosshair = defaultOptions;
			}

			chart.crosshair = {
				crosshairDiv: crosshairDiv,
				zoomDiv: zoomDiv,
				tracePointDivs: [],
				x: 0,
				visible: true,
				dragStarted: false,
				dragStartX: 0,
				zoomStack: []
			};
		},

		afterDatasetsUpdate: function(chart, dataset) {
			// remove existing tracepoints
			for(var index in chart.crosshair.tracePointDivs) {
				const el = chart.crosshair.tracePointDivs[index]
				el.parentNode.removeChild(el)
			}
			chart.crosshair.tracePointDivs = []
			// add tracepointdivs
			for (var chartIndex = 0; chartIndex < chart.data.datasets.length; chartIndex++) {
				var tracePointDiv = document.createElement('div')
				tracePointDiv.className = 'chartjs-tracepoint' 
				tracePointDiv.style.display = 'none' // hide by default
				chart.canvas.parentNode.insertBefore(tracePointDiv, chart.canvas.nextSibling)
				chart.crosshair.tracePointDivs.push(tracePointDiv)
			}
		},

		afterEvent: function(chart, e) {

			var xScale = this.getXScale(chart)
			var yScale = this.getYScale(chart)
			if (e.x < xScale.left || e.x > xScale.right) {
				chart.crosshair.crosshairDiv.style.display = 'none'
        for(var index in chart.crosshair.tracePointDivs) {
          chart.crosshair.tracePointDivs[index].style.display = 'none'
        }
				return true
			}

			chart.crosshair.x = e.x

			// fix for Safari
			var buttons = (e.native.buttons === undefined ? e.native.which : e.native.buttons);
			if (e.native.type === 'mouseup') {
				buttons = 0;
			}

			if (buttons === 1 && !chart.crosshair.dragStarted) {
				chart.crosshair.dragStartX = e.x
				chart.crosshair.dragStarted = true
			}

			// handle drag to zoom
			if (chart.crosshair.dragStarted && buttons === 0) {
				chart.crosshair.dragStarted = false;

				var start = xScale.getValueForPixel(chart.crosshair.dragStartX);
				var end = xScale.getValueForPixel(chart.crosshair.x);

				if (Math.abs(chart.crosshair.dragStartX - chart.crosshair.x) > 1) {
					this.doZoom(chart, start, end);
				}
			}


			this.updateCrosshair(chart)
			this.updateTracePoints(chart)
			this.updateZoomBox(chart)

			return true
		},
		doZoom: function(chart, start, end) {

			// swap start/end if user dragged from right to left
			if (start > end) {
				var tmp = start;
				start = end;
				end = tmp;
			}

			var beforeZoomCallback = helpers.getValueOrDefault(chart.options.plugins.crosshair.callbacks ? chart.options.plugins.crosshair.callbacks.beforeZoom : undefined, defaultOptions.callbacks.beforeZoom);

			if (!beforeZoomCallback(start, end)) {
				return false;
			}
			// clip dataset

			for (var datasetIndex = 0; datasetIndex < chart.data.datasets.length; datasetIndex++) {
				var newData = [];

				var index = 0;
				var started = false;
				var stop = false;

				var sourceDataset = chart.data.datasets[datasetIndex].data

				for (var oldDataIndex = 0; oldDataIndex < sourceDataset.length; oldDataIndex++) {
					var oldData = sourceDataset[oldDataIndex];
					var oldDataX = this.getXScale(chart).getRightValue(oldData)

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



			chart.options.scales.xAxes[0].ticks.min = start
			chart.options.scales.xAxes[0].ticks.max = end


			chart.update(0)

			var afterZoomCallback = this.getOption(chart, 'callbacks', 'afterZoom');
			afterZoomCallback(start, end);

		},
		updateZoomBox: function(chart) {

			var yScale = this.getYScale(chart);
			const top = yScale.getPixelForValue(yScale.max)
			const bottom = yScale.getPixelForValue(yScale.min)

			if(!chart.crosshair.dragStarted) {
				chart.crosshair.zoomDiv.style.display = 'none'
			} else {
				chart.crosshair.zoomDiv.style.display = 'block'

				if(chart.crosshair.dragStartX < chart.crosshair.x) {
					chart.crosshair.zoomDiv.style.left = chart.crosshair.dragStartX + 'px'
					chart.crosshair.zoomDiv.style.width = (chart.crosshair.x-chart.crosshair.dragStartX) + 'px'
				} else {
					chart.crosshair.zoomDiv.style.left = chart.crosshair.x + 'px'
					chart.crosshair.zoomDiv.style.width = (chart.crosshair.dragStartX-chart.crosshair.x) + 'px'
				}
				chart.crosshair.zoomDiv.style.top = top + 'px'
				chart.crosshair.zoomDiv.style.height = (bottom-top) + 'px'
			}
		},
		updateTracePoints: function(chart) {
			// get chart tooltip info
			var active = chart.tooltip._active

			for(var pointIndex in active) {
				const activePoint = active[pointIndex]
				const dataset = chart.data.datasets[activePoint._datasetIndex];
				const meta = chart.getDatasetMeta(activePoint._datasetIndex)

				if (meta.hidden || !dataset.interpolate) {
					continue
				}

				const model = activePoint._model
				chart.crosshair.tracePointDivs[pointIndex].style.display = "block"
				chart.crosshair.tracePointDivs[pointIndex].style.left = model.x + "px"
				chart.crosshair.tracePointDivs[pointIndex].style.top = model.y + "px"
				chart.crosshair.tracePointDivs[pointIndex].style.borderColor = dataset.borderColor;

			}

		},

		updateCrosshair: function(chart) {

			var yScale = this.getYScale(chart);

			const top = yScale.getPixelForValue(yScale.max)
			const bottom = yScale.getPixelForValue(yScale.min)

			chart.crosshair.crosshairDiv.style.display = 'block'
			chart.crosshair.crosshairDiv.style.left = chart.crosshair.x + "px"
			chart.crosshair.crosshairDiv.style.top = top + "px"
			chart.crosshair.crosshairDiv.style.height = (bottom-top) + "px"

		},

		destroy: function(chart) {
		},

		getOption: function(chart, category, name) {
			return helpers.getValueOrDefault(chart.options.plugins.crosshair[category] ? chart.options.plugins.crosshair[category][name] : undefined, defaultOptions[category][name]);
		},

		getXScale: function(chart) {
			return chart.data.datasets.length ? chart.scales[chart.getDatasetMeta(0).xAxisID] : null;
		},
		getYScale: function(chart) {
			return chart.scales[chart.getDatasetMeta(0).yAxisID];
		},

	};


	Chart.plugins.register(crosshairPlugin);
}
