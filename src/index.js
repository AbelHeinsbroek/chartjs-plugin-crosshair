import Chart from 'chart.js';
import Helpers from 'chart.js/helpers';

import Interpolate from './interpolate.js';
import TracePlugin from './trace.js';

// install plugins
Interpolate(Chart);
TracePlugin(Chart, Helpers || Chart.helpers);
