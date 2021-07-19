import {Chart, Interaction} from 'chart.js';

import Interpolate from './interpolate.js';
import TracePlugin from './trace.js';

// install plugins
Chart.register(TracePlugin)
Interaction.modes.interpolate = Interpolate