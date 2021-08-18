export default function(Chart) {

  var helpers = Chart.helpers

  var FastTooltipPlugin = {
    id:'fasttooltip',

    afterInit: function(chart) {
      var tooltipDiv = document.createElement('div') 
      tooltipDiv.className = 'chartjs-fasttooltip'
      tooltipDiv.className = 'chartjs-fasttooltip'
      tooltipDiv.style.display='none'

      chart.canvas.parentNode.insertBefore(tooltipDiv, chart.canvas.nextSibling)
      chart.fasttooltip = {
        tooltipDiv: tooltipDiv
      }
    },

    afterEvent: function(chart, e) {
      // prevent redrawing of chart if tooltips are disabled
      chart.preventNextRender = (e.type == 'mousemove')
      // update tooltip

      if (chart.notifyPlugins('beforeTooltipDraw', {cancelable: true})) {
        this.updateTooltip(chart, e)
      } else {
        // hide tooltip
        chart.fasttooltip.tooltipDiv.style.display = 'none'
      }
    },
    afterDatasetsUpdate: function(chart) {
      chart.preventNextRender = false
    },

    beforeRender: function(chart) {
			if(chart.preventNextRender) {
				chart.preventNextRender = false
				return false
			}
			return true
    },

		getXScale: function(chart) {
			return chart.data.datasets.length ? chart.scales[chart.getDatasetMeta(0).xAxisID] : null;
		},
		getYScale: function(chart) {
			return chart.scales[chart.getDatasetMeta(0).yAxisID];
		},

    updateTooltip: function(chart, evt) {

      let e = evt.event

      // update tooltip
      chart.tooltip.update()
      var model = chart.tooltip
      var tooltipDiv = chart.fasttooltip.tooltipDiv

      if (chart.tooltip._active.length == 0) {
        chart.fasttooltip.tooltipDiv.style.display = 'none'
        return
      } else {
        chart.fasttooltip.tooltipDiv.style.display = 'block'
      }

			var xScale = this.getXScale(chart);
			var yScale = this.getYScale(chart);
      var bounds = {
       'top': yScale.getPixelForValue(yScale.max),
       'bottom': yScale.getPixelForValue(yScale.min),
       'left': xScale.getPixelForValue(xScale.min),
      }

      var html = "<span class='tooltip-title'>"+model.title[0]+"</span>"

      for(var el in model.body) {
        html += "<span class='tooltip-result'><span class='tooltip-result-box' style='background:"+model.labelColors[el].backgroundColor+";border-color:"+model.labelColors[el].borderColor+";'></span>"+model.body[el].lines[0]+"</span>"
      }

      tooltipDiv.innerHTML = html

      // check if tooltipDiv falls outside window
      tooltipDiv.style.left = (e.x + 15) + "px";
      tooltipDiv.style.top = (e.y - 15) + "px";

      var rect = tooltipDiv.getBoundingClientRect()
      var offBounds = (rect.x+rect.width) > window.innerWidth


      if (offBounds) {
        tooltipDiv.style.left = (e.x - 15 - rect.width) + "px";
      }
    }


  }


	Chart.register(FastTooltipPlugin);
}
