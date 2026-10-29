import type { T } from '@/lib/i18n';

export type SectionId = 'andrology' | 'embryology' | 'histology' | 'reproduction' | 'oncology' | 'drug-design';
export type Mode = 'browser' | 'web' | 'local' | 'desktop' | 'hpc' | 'docker' | 'paper';
export type Action = 'analyze' | 'create' | 'dock' | 'check' | 'calc';
export type Interactive =
  | 'bopasi' | 'bluetol' | 'rcpc' | 'duedate' | 'hcg' | 'tmsc' | 'gardner' | 'fertile' | 'constructor';

export interface FileCheck {
  /** допустимые расширения, без точки */
  ext: string[];
  minW?: number;
  minH?: number;
  maxMB?: number;
  /** для видео: длительность, с */
  minSec?: number;
  maxSec?: number;
  /** минимум файлов */
  minFiles?: number;
}

export interface Tool {
  id: string;
  section: SectionId;
  also?: SectionId[];
  name: string;
  tagline: T;
  full: T;
  features: T[];
  /** 1. какие файлы нужны */
  input: T[];
  /** 2. пошаговая инструкция */
  steps: T[];
  /** 3. локальный запуск */
  local?: { needs: string[]; cmds: string[]; notes?: T[] };
  /** 4. ограничения и ошибки */
  limits: T[];
  /** 5. что на выходе */
  output: T[];
  mode: Mode;
  action: Action;
  repo?: string;
  links?: { label: string; url: string }[];
  authors: string;
  license: string;
  tags: string[];
  featured?: boolean;
  interactive?: Interactive;
  check?: FileCheck;
  /** шаблон команды; {files} заменяется списком файлов */
  runCmd?: string;
}

export interface Section {
  id: SectionId;
  title: T;
  short: string; // краткая метка в навигации (по-русски не используется)
  lead: T;
  glyph: 'sperm' | 'embryo' | 'tissue' | 'calendar' | 'cell' | 'molecule';
}
