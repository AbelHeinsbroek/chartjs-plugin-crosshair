import Chart from 'chart.js';

import Interpolate from './interpolate.js';
import TracePlugin from './trace.js';

// install plugins
Interpolate(Chart);
TracePlugin(Chart);
