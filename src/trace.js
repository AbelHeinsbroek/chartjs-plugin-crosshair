import {valueOrDefault} from 'chart.js/helpers';

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

export default {

  id: 'crosshair',

  afterInit: function(chart) {
    
    if (!chart.config.options.scales.x) {
      return
    }

    var xScaleType = chart.config.options.scales.x.type

    if (xScaleType !== 'linear' && xScaleType !== 'time' && xScaleType !== 'category' && xScaleType !== 'logarithmic') {
      return;
    }

    if (chart.options.plugins.crosshair === undefined) {
      chart.options.plugins.crosshair = defaultOptions;
    }

    chart.crosshair = {
      enabled: false,
      suppressUpdate: false,
      x: null,
      originalData: [],
      originalXRange: {},
      dragStarted: false,
      dragStartX: null,
      dragEndX: null,
      suppressTooltips: false,
      ignoreNextEvents: 0,
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
    return valueOrDefault(chart.options.plugins.crosshair[category] ? chart.options.plugins.crosshair[category][name] : undefined, defaultOptions[category][name]);
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
    var buttons = (e.original.native.buttons === undefined ? e.original.native.which : e.original.native.buttons);
    if (e.original.type === 'mouseup') {
      buttons = 0;
    }


    var newEvent = {
      type: e.original.type == "click" ? "mousemove" : e.original.type,  // do not transmit click events to prevent unwanted changing of synced charts. We do need to transmit a event to stop zooming on synced charts however.
      chart: chart,
      x: xScale.getPixelForValue(e.xValue),
      y: e.original.y,
      native: {
        buttons: buttons
      },
      stop: true
    };
    chart._eventHandler(newEvent);
  },

  afterEvent: function(chart, event) {

    if (chart.config.options.scales.x.length == 0) {
      return
    }

    let e = event.event

    var xScaleType = chart.config.options.scales.x.type

    if (xScaleType !== 'linear' && xScaleType !== 'time' && xScaleType !== 'category' && xscaleType !== 'logarithmic') {
      return;
    }

    var xScale = this.getXScale(chart);

    if (!xScale) {
      return;
    }

    if(chart.crosshair.ignoreNextEvents > 0) {
      chart.crosshair.ignoreNextEvents -= 1
      return;
    }

    // fix for Safari
    var buttons = (e.native.buttons === undefined ? e.native.which : e.native.buttons);
    if (e.native.type === 'mouseup') {
      buttons = 0;
    }

    var syncEnabled = this.getOption(chart, 'sync', 'enabled');
    var syncGroup = this.getOption(chart, 'sync', 'group');

    // fire event for all other linked charts
    if (!e.stop && syncEnabled) {
      var event = new CustomEvent('sync-event');
      event.chartId = chart.id;
      event.syncGroup = syncGroup;
      event.original = e;
      event.xValue = xScale.getValueForPixel(e.x);
      window.dispatchEvent(event);
    }

    // suppress tooltips for linked charts
    var suppressTooltips = this.getOption(chart, 'sync', 'suppressTooltips');

    chart.crosshair.suppressTooltips = e.stop && suppressTooltips;

    chart.crosshair.enabled = (e.type !== 'mouseout' && (e.x > xScale.getPixelForValue(xScale.min) && e.x < xScale.getPixelForValue(xScale.max)));

    if (!chart.crosshair.enabled && !chart.crosshair.suppressUpdate) {
      if (e.x > xScale.getPixelForValue(xScale.max)) {
        // suppress future updates to prevent endless redrawing of chart
        chart.crosshair.suppressUpdate = true
        chart.update('none');
      }
      chart.crosshair.dragStarted = false // cancel zoom in progress
      return false;
    }
    chart.crosshair.suppressUpdate = false

    // handle drag to zoom
    var zoomEnabled = this.getOption(chart, 'zoom', 'enabled');

    if (buttons === 1 && !chart.crosshair.dragStarted && zoomEnabled) {
      chart.crosshair.dragStartX = e.x;
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
      chart.update('none');
    }

    chart.crosshair.x = e.x;


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

    var stop = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    var update = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

    if (update) {
      if (chart.crosshair.originalData.length > 0) {
        // reset original data
        for (var datasetIndex = 0; datasetIndex < chart.data.datasets.length; datasetIndex++) {
          var dataset = chart.data.datasets[datasetIndex];
          dataset.data = chart.crosshair.originalData.shift(0);
        }
      }

      // reset original xRange
      if (chart.crosshair.originalXRange.min) {
        chart.options.scales.x.min = chart.crosshair.originalXRange.min;
        chart.crosshair.originalXRange.min = null;
      } else {
        delete chart.options.scales.x.min;
      }
      if (chart.crosshair.originalXRange.max) {
        chart.options.scales.x.max = chart.crosshair.originalXRange.max;
        chart.crosshair.originalXRange.max = null;
      } else {
        delete chart.options.scales.x.max;
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
      chart.update('none');
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
    var beforeZoomCallback = valueOrDefault(chart.options.plugins.crosshair.callbacks ? chart.options.plugins.crosshair.callbacks.beforeZoom : undefined, defaultOptions.callbacks.beforeZoom);

    if (!beforeZoomCallback(start, end)) {
      return false;
    }

    chart.crosshair.dragStarted = false

    if (chart.options.scales.x.min && chart.crosshair.originalData.length === 0) {
      chart.crosshair.originalXRange.min = chart.options.scales.x.min;
    }
    if (chart.options.scales.x.max && chart.crosshair.originalData.length === 0) {
      chart.crosshair.originalXRange.max = chart.options.scales.x.max;
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
    chart.options.scales.x.min = start;
    chart.options.scales.x.max = end;

    // make a copy of the original data for later restoration

    var storeOriginals = (chart.crosshair.originalData.length === 0) ? true : false;


    var filterDataset = (chart.config.options.scales.x.type !== 'category')

    if(filterDataset) {


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
          // var oldDataX = this.getXScale(chart).getRightValue(oldData)
          var oldDataX = oldData.x !== undefined ? oldData.x : NaN

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
    }

    chart.crosshair.start = start;
    chart.crosshair.end = end;


    if (storeOriginals) {
      var xAxes = this.getXScale(chart);
      chart.crosshair.min = xAxes.min;
      chart.crosshair.max = xAxes.max;
    }

    chart.crosshair.ignoreNextEvents = 2 // ignore next 2 events to prevent starting a new zoom action after updating the chart

    chart.update('none');


    var afterZoomCallback = this.getOption(chart, 'callbacks', 'afterZoom');

    afterZoomCallback(start, end);
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

    if (snapEnabled && chart._active.length) {
      lineX = chart._active[0].element.x;
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

  }

};

