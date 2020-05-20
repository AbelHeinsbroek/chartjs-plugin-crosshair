import Chart from 'chart.js';

import Interpolate from './interpolate.js';
import TracePlugin from './trace.js';
import FastTooltip from './tooltip.js';
import Sync from './sync.js';

// install plugins
Interpolate(Chart);
TracePlugin(Chart);
FastTooltip(Chart);
Sync(Chart);