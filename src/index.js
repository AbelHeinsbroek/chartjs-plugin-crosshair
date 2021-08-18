import {Chart, Interaction} from 'chart.js';

import Interpolate from './interpolate.js';
import TracePlugin from './trace.js';
import FastTooltip from './tooltip.js';
import Sync from './sync.js';

// install plugins
Interpolate(Interaction);
TracePlugin(Chart);
FastTooltip(Chart);
Sync(Chart);