import type { Tool } from '../types';
import { ANDROLOGY } from './andrology';
import { EMBRYOLOGY } from './embryology';
import { HISTOLOGY, ONCOLOGY } from './pathology';
import { REPRODUCTION } from './reproduction';
import { DRUG } from './drug';

export const TOOLS: Tool[] = [
  ...ANDROLOGY, ...EMBRYOLOGY, ...HISTOLOGY, ...REPRODUCTION, ...ONCOLOGY, ...DRUG,
];

export const toolById = (id: string) => TOOLS.find((t) => t.id === id);

export const toolsInSection = (section: string) =>
  TOOLS.filter((t) => t.section === section || t.also?.includes(section as Tool['section']))
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured));

export const featuredOf = (section: string) =>
  TOOLS.find((t) => t.section === section && t.featured);
