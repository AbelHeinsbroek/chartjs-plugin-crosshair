export default function(Chart) {

	Chart.Interaction.modes.interpolate = function(chart, e, options) {


		var items = [];

		for (var datasetIndex = 0; datasetIndex < chart.data.datasets.length; datasetIndex++) {


			// check for interpolate setting
			if (!chart.data.datasets[datasetIndex].interpolate) {
				continue;
			}

			var meta = chart.getDatasetMeta(datasetIndex);
			// do not interpolate hidden charts
			if (meta.hidden) {
				continue;
			}


			var xScale = chart.scales[meta.xAxisID];
			var yScale = chart.scales[meta.yAxisID];

			var xValue = xScale.getValueForPixel(e.x);


			var data = chart.data.datasets[datasetIndex].data;

			var index = data.findIndex(function(o) {
				return o.x >= xValue;
			});

			if (index === -1) {
				continue;
			}


			// linear interpolate value
			var prev = data[index - 1];
			var next = data[index];

			if (prev && next) {
				var slope = (next.y - prev.y) / (next.x - prev.x);
				var interpolatedValue = prev.y + (xValue - prev.x) * slope;
			}

			if (chart.data.datasets[datasetIndex].steppedLine && prev) {
				interpolatedValue = prev.y;
			}

			if (isNaN(interpolatedValue)) {
				continue;
			}

			var yPosition = yScale.getPixelForValue(interpolatedValue);

			// do not interpolate values outside of the axis limits
			if (isNaN(yPosition)) {
				continue;
			}

			// create a 'fake' event point

			var fakePoint = {

				value: interpolatedValue,
				xValue: xValue,

				tooltipPosition: function() {
					return this._model;
				},
				hasValue: function() {
					return true;
				},
				_model: {
					x: e.x,
					y: yPosition
				},
				_datasetIndex: datasetIndex,
				_index: items.length,
				_xScale: {
					getLabelForIndex: function(indx) {
						return items[indx].xValue;
					}
				},
				_yScale: {
					getLabelForIndex: function(indx) {
						return items[indx].value;
					}
				},
				_chart: chart
			};

			items.push(fakePoint);
		}


		// add other, not interpolated, items
		var xItems = Chart.Interaction.modes.x(chart, e, options);
		for (index = 0; index < xItems.length; index++) {
			var item = xItems[index];
			if (!chart.data.datasets[item._datasetIndex].interpolate) {
				items.push(item);
			}
		}

		return items;
	};
}
