import {Chart, Interaction} from 'chart.js';

import Interpolate from './interpolate.js';
import TracePlugin from './trace.js';

// install plugins
Interpolate(Interaction);
TracePlugin(Chart);
