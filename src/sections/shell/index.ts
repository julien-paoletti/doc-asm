import './shell.css';
import type { SectionPlugin } from '../../types.js';
import { icon } from '../../utils/icons.js';
import { createShellEditor } from './editor.js';

export interface ShellData extends Record<string, unknown> {
  label: string;
  command: string;
}

export const ShellPlugin: SectionPlugin<ShellData> = {
  typeId: 'shell',
  label: 'Shell command',
  icon: icon('terminal2'),
  defaultData: {
    label: '',
    command: '',
  },
  createEditor: createShellEditor,
};
