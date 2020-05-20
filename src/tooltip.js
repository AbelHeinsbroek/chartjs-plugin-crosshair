
export default function(Chart) {

  var placement=function(){"use strict";var e={size:["height","width"],clientSize:["clientHeight","clientWidth"],offsetSize:["offsetHeight","offsetWidth"],maxSize:["maxHeight","maxWidth"],before:["top","left"],marginBefore:["marginTop","marginLeft"],after:["bottom","right"],marginAfter:["marginBottom","marginRight"],scrollOffset:["pageYOffset","pageXOffset"]};function t(e){return{top:e.top,bottom:e.bottom,left:e.left,right:e.right}}return function(o,r,f,a,i){void 0===f&&(f="bottom"),void 0===a&&(a="center"),void 0===i&&(i={}),(r instanceof Element||r instanceof Range)&&(r=t(r.getBoundingClientRect()));var n=Object.assign({top:r.bottom,bottom:r.top,left:r.right,right:r.left},r),s={top:0,left:0,bottom:window.innerHeight,right:window.innerWidth};i.bound&&((i.bound instanceof Element||i.bound instanceof Range)&&(i.bound=t(i.bound.getBoundingClientRect())),Object.assign(s,i.bound));var l=getComputedStyle(o),m={},b={};for(var g in e)m[g]=e[g]["top"===f||"bottom"===f?0:1],b[g]=e[g]["top"===f||"bottom"===f?1:0];o.style.position="absolute",o.style.maxWidth="",o.style.maxHeight="";var d=parseInt(l[b.marginBefore]),c=parseInt(l[b.marginAfter]),u=d+c,p=s[b.after]-s[b.before]-u,h=parseInt(l[b.maxSize]);(!h||p<h)&&(o.style[b.maxSize]=p+"px");var x=parseInt(l[m.marginBefore])+parseInt(l[m.marginAfter]),y=n[m.before]-s[m.before]-x,z=s[m.after]-n[m.after]-x;(f===m.before&&o[m.offsetSize]>y||f===m.after&&o[m.offsetSize]>z)&&(f=y>z?m.before:m.after);var S=f===m.before?y:z,v=parseInt(l[m.maxSize]);(!v||S<v)&&(o.style[m.maxSize]=S+"px");var w=window[m.scrollOffset],O=function(e){return Math.max(s[m.before],Math.min(e,s[m.after]-o[m.offsetSize]-x))};f===m.before?(o.style[m.before]=w+O(n[m.before]-o[m.offsetSize]-x)+"px",o.style[m.after]="auto"):(o.style[m.before]=w+O(n[m.after])+"px",o.style[m.after]="auto");var B=window[b.scrollOffset],I=function(e){return Math.max(s[b.before],Math.min(e,s[b.after]-o[b.offsetSize]-u))};switch(a){case"start":o.style[b.before]=B+I(n[b.before]-d)+"px",o.style[b.after]="auto";break;case"end":o.style[b.before]="auto",o.style[b.after]=B+I(document.documentElement[b.clientSize]-n[b.after]-c)+"px";break;default:var H=n[b.after]-n[b.before];o.style[b.before]=B+I(n[b.before]+H/2-o[b.offsetSize]/2-d)+"px",o.style[b.after]="auto"}o.dataset.side=f,o.dataset.align=a}}();

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
      chart.preventNextRender = (e.type == 'mouseover')
      // update tooltip
      if (Chart.plugins.notify(chart, 'beforeTooltipDraw')) {
        this.updateTooltip(chart, e)
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

    updateTooltip: function(chart, e) {

      // update tooltip
      chart.tooltip.update()
      var model = chart.tooltip._model
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
      tooltipDiv.style.top = (e.y - 15) + "px";
      tooltipDiv.style.left = (e.x + 15) + "px";
      //placement(tooltipDiv, {'top': e.y - 15, 'left': e.x-15, 'right': e.x+15}, 'right', 'start', {
        //bound: bounds}
      //)

    }


  }


	Chart.plugins.register(FastTooltipPlugin);
}
