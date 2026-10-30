// Библиотеки открытых проектов для офлайн-файла BOPASI.html: NiiVue (BSD-2), SeqViz + seqparse (MIT), React (MIT)
import { Niivue, SLICE_TYPE, DRAG_MODE } from '@niivue/niivue';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { SeqViz } from 'seqviz';
import { parseFile } from 'seqparse';
window.SCILIB = { Niivue, SLICE_TYPE, DRAG_MODE, React, createRoot, SeqViz, parseFile };
