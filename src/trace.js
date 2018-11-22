export default function(Chart) {
  var helpers = Chart.helpers

  var defaultOptions = {
    callbacks: {
      beforeZoom: function(start, end) {
        return true
      },
      afterZoom: function(start, end) {
      }
    }
  }

  var tracePlugin = {

    id: 'trace',

    afterInit: function(chart) {

      if(chart.config.type != 'scatter') { return }

      if (chart.options.plugins.trace === undefined) {
        chart.options.plugins.trace = defaultOptions
      }

      chart.tracer = {
        enabled: false,
        x: null,
        originalData: [],
        originalXRange: {},
        dragStarted: false,
        dragStartX: null,
        dragEndX: null,
        suppressTooltips: false,
        reset: function() {
          this.resetZoom(chart, false, false)
        }.bind(this)
      }

      chart.tracer.traceEventHandler = function(e) {
         this.handleSyncEvent(chart, e)
      }.bind(this)

      chart.tracer.resetZoomEventHandler = function(e) {
         if(e.chartId != chart.id) {
           this.resetZoom(chart, true)
         }
      }.bind(this)

       window.addEventListener('trace-event', chart.tracer.traceEventHandler)
       window.addEventListener('reset-zoom-event', chart.tracer.resetZoomEventHandler)

    },

    destroy: function(chart) {
      window.removeEventListener('trace-event', chart.tracer.traceEventHandler)
      window.removeEventListener('reset-zoom-event', chart.tracer.resetZoomEventHandler)
    },

    getXScale: function(chart) {
      return chart.scales[chart.getDatasetMeta(0).xAxisID]
    },
    getYScale: function(chart) {
      return chart.scales[chart.getDatasetMeta(0).yAxisID]
    },

    handleSyncEvent: function(chart, e) {

       var xScale = this.getXScale(chart)

       if(e.chartId == chart.id) {
         return
       }

       // Safari fix
       var buttons = (e.original.native.buttons === undefined ? e.original.native.which : e.original.native.buttons);
       if(e.original.type == 'mouseup') {
         buttons = 0
       }

       var newEvent = {
         type: e.original.type,
         chart: chart,
         x: xScale.getPixelForValue(e.xValue),
         y: e.original.y,
         native: {
           buttons: buttons
         },
         stop: true
       }
         chart.controller.eventHandler(newEvent)
     },

    afterEvent: function(chart, e) {

      if(chart.config.type != 'scatter') { return }

      var xScale = this.getXScale(chart);
      var yScale = this.getYScale(chart);

      // fix for Safari
      var buttons = (e.native.buttons === undefined ? e.native.which : e.native.buttons);
      if(e.native.type == 'mouseup') {
        buttons = 0
      }

      // fire event for all other linked charts
      if(!e.stop) {
        var event = new CustomEvent('trace-event')
        event.chartId = chart.id
        event.original = e
        event.xValue = xScale.getValueForPixel(e.x)
        window.dispatchEvent(event)
      }

      // suppress tooltips for linked charts
      chart.tracer.suppressTooltips = e.stop

      chart.tracer.enabled = (e.type != 'mouseout' && (e.x > xScale.getPixelForValue(xScale.min) && e.x < xScale.getPixelForValue(xScale.max))) 

      if(!chart.tracer.enabled) {
        if(e.x > xScale.getPixelForValue(xScale.max)) { chart.update() }
        return true
      }

      // handle drag to zoom
      if(buttons == 1 && !chart.tracer.dragStarted) {
        chart.tracer.dragStartX = e.x
        chart.tracer.dragStarted = true
      }

      // handle drag to zoom
      if(chart.tracer.dragStarted && buttons == 0) {
        chart.tracer.dragStarted = false

        var start = xScale.getValueForPixel(chart.tracer.dragStartX)
        var end = xScale.getValueForPixel(chart.tracer.x)

        if(Math.abs(chart.tracer.dragStartX - chart.tracer.x) > 1) {
          this.doZoom(chart, start, end)
        }
        chart.update()
      }

      chart.tracer.x = e.x


      chart.draw()

    },

    afterDraw: function(chart) {

      if(!chart.tracer.enabled) { return }

      if(chart.tracer.dragStarted) {
        this.drawZoombox(chart)
      } else {
        this.drawTraceLine(chart)
        this.interpolateValues(chart)
        this.drawTracePoints(chart)
      }

      return true
    },

    beforeTooltipDraw: function(chart) {
      //suppress tooltips on dragging
      return !chart.tracer.dragStarted && !chart.tracer.suppressTooltips
    },

    resetZoom: function(chart) {

      var stop = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      var update = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

      if(update) {
        for(var datasetIndex in chart.data.datasets) {
          var dataset = chart.data.datasets[datasetIndex]
          dataset.data = chart.tracer.originalData.shift(0)
        }

        var range = "ticks"

        if(chart.options.scales.xAxes[0].time) {
          range = "time"
        }
        // reset original xRange
        if(chart.tracer.originalXRange.min) {
          chart.options.scales.xAxes[0][range].min = chart.tracer.originalXRange.min
          chart.tracer.originalXRange.min = null
        } else {
          delete chart.options.scales.xAxes[0][range].min
        }
        if(chart.tracer.originalXRange.max) {
          chart.options.scales.xAxes[0][range].max = chart.tracer.originalXRange.max
          chart.tracer.originalXRange.max = null
        } else {
          delete chart.options.scales.xAxes[0][range].max
        }
      }

      if(chart.tracer.button && chart.tracer.button.parentNode) {
        chart.tracer.button.parentNode.removeChild(chart.tracer.button)
        chart.tracer.button = false
      }


      if(!stop && update) {
        var event = new CustomEvent('reset-zoom-event')
        event.chartId = chart.id
        window.dispatchEvent(event)
      }
      if(update) {
        var anim = chart.options.animation
        chart.options.animation = false
        chart.update()
        chart.options.animation = anim
      }
    },

    doZoom: function(chart, start, end) {

      // swap start/end if user dragged from right to left
      if(start > end) {
        var tmp = start
        start = end
        end = tmp
      }

      // notify delegate
      var beforeZoomCallback = helpers.getValueOrDefault(chart.options.plugins.trace.callbacks ? chart.options.plugins.trace.callbacks.beforeZoom : undefined, defaultOptions.callbacks.beforeZoom)

      if (!beforeZoomCallback(start, end)) {
        return false
      }

      if(chart.options.scales.xAxes[0].type == 'time') {

        if(chart.options.scales.xAxes[0].time.min && chart.tracer.originalData.length == 0) {
          chart.tracer.originalXRange.min = chart.options.scales.xAxes[0].time.min
        }
        if(chart.options.scales.xAxes[0].time.max && chart.tracer.originalData.length == 0) {
          chart.tracer.originalXRange.max = chart.options.scales.xAxes[0].time.max
        }

      } else {

        if(chart.options.scales.xAxes[0].ticks.min && chart.tracer.originalData.length == undefined) {
          chart.tracer.originalXRange.min = chart.options.scales.xAxes[0].ticks.min
        }
        if(chart.options.scales.xAxes[0].ticks.max && chart.tracer.originalData.length == undefined) {
          chart.tracer.originalXRange.max = chart.options.scales.xAxes[0].ticks.max
        }


      }

      if(!chart.tracer.button) {
        // add restore zoom button
        var button = document.createElement("button")
        var buttonLabel = document.createTextNode("Reset Zoom")
        button.appendChild(buttonLabel)
        button.className = 'reset-zoom el-button el-button--small'
        button.addEventListener('click', function() {this.resetZoom(chart)}.bind(this))
        chart.canvas.parentNode.appendChild(button)
        chart.tracer.button = button
      }

      var xScale = this.getXScale(chart)


      // set axis scale
      if(chart.options.scales.xAxes[0].time) {
        chart.options.scales.xAxes[0].time.min = start
        chart.options.scales.xAxes[0].time.max = end
      } else {
        chart.options.scales.xAxes[0].ticks.min = start
        chart.options.scales.xAxes[0].ticks.max = end
      }

      // make a copy of the original data for later restoration
      var storeOriginals = (chart.tracer.originalData.length == 0) ? true : false

      // filter dataset
      for(var datasetIndex in chart.data.datasets) {

        var dataset = chart.data.datasets[datasetIndex]
        var newData = []

        var index = 0
        var started = false
        var stop = false

        var oldDataset = []

        if(storeOriginals) {
          chart.tracer.originalData[datasetIndex] = dataset.data
        }

        for(var oldDataIndex in dataset.data) {

          var oldData = dataset.data[oldDataIndex]

          // append one value outside of bounds
          if(oldData.x >= start && !started && index > 0) {
            newData.push(dataset.data[index-1])
            started = true
          }
          if(oldData.x >= start && oldData.x <= end) {
            newData.push(oldData)
          }
          if(oldData.x > end && !stop && index < dataset.data.length) {
            newData.push(oldData)
            stop = true
          }
          index+=1
        }
        dataset.data = newData
      }

      chart.update()

      var afterZoomCallback = helpers.getValueOrDefault(chart.options.plugins.trace.callbacks ? chart.options.plugins.trace.callbacks.afterZoom : undefined, defaultOptions.callbacks.afterZoom)

      afterZoomCallback()
    },

    drawZoombox: function(chart) {

      var yScale = this.getYScale(chart);

      chart.ctx.beginPath()
      chart.ctx.rect(chart.tracer.dragStartX, yScale.getPixelForValue(yScale.max), chart.tracer.x - chart.tracer.dragStartX, yScale.getPixelForValue(yScale.min)-yScale.getPixelForValue(yScale.max))
      chart.ctx.lineWidth = 1
      chart.ctx.strokeStyle = '#48F'
      chart.ctx.fillStyle = 'rgba(66,133,244,0.2)'
      chart.ctx.fill()
      chart.ctx.fillStyle = ''
      chart.ctx.stroke()
      chart.ctx.closePath()
    },

    drawTraceLine: function(chart) {

      var yScale = this.getYScale(chart);

      chart.ctx.beginPath();
      chart.ctx.moveTo(chart.tracer.x, yScale.getPixelForValue(yScale.max));
      chart.ctx.lineWidth = 1
      chart.ctx.strokeStyle = "#F66";
      chart.ctx.lineTo(chart.tracer.x, yScale.getPixelForValue(yScale.min));
      chart.ctx.stroke();

    },

    drawTracePoints: function(chart) {

      for(var chartIndex in chart.data.datasets) {

        var dataset = chart.data.datasets[chartIndex]
        var meta = chart.getDatasetMeta(chartIndex)

        var yScale = chart.scales[meta.yAxisID]
        
        if(meta.hidden || !dataset.interpolate) {
          continue
        }

        chart.ctx.beginPath();
        chart.ctx.arc(chart.tracer.x, yScale.getPixelForValue(dataset.interpolatedValue), 3, 0, 2*Math.PI, false)
        chart.ctx.fillStyle = 'white'
        chart.ctx.lineWidth = 2
        chart.ctx.strokeStyle = dataset.borderColor
        chart.ctx.fill()
        chart.ctx.stroke()

      }

    },

    interpolateValues: function(chart) {

      for(var chartIndex in chart.data.datasets) {

        var dataset = chart.data.datasets[chartIndex]

        var meta = chart.getDatasetMeta(chartIndex)

        var xScale = chart.scales[meta.xAxisID]
        var xValue = xScale.getValueForPixel(chart.tracer.x)

        if(meta.hidden || !dataset.interpolate) {
          continue
        }

        var data = dataset.data
        var index = data.findIndex(function(o) { return o.x >= xValue })
        var prev = data[index-1]
        var next = data[index]

        if(chart.data.datasets[chartIndex].steppedLine && prev) {
          dataset.interpolatedValue = prev.y
        } else if(prev && next) {
          var slope = (next.y-prev.y)/(next.x-prev.x)
          dataset.interpolatedValue = prev.y + (xValue - prev.x) * slope
        } else {
          dataset.interpolatedValue = NaN
        }
      }

    }

  }

  Chart.plugins.register(tracePlugin);
}
