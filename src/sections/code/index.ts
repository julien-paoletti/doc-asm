import './code.css';
import type { SectionPlugin } from '../../types.js';
import { icon } from '../../utils/icons.js';
import { createCodeEditor } from './editor.js';

export interface CodeData extends Record<string, unknown> {
  language: string;
  filename: string;
  code: string;
}

export const CodePlugin: SectionPlugin<CodeData> = {
  typeId: 'code',
  label: 'Code block',
  icon: icon('code'),
  defaultData: {
    language: 'typescript',
    filename: '',
    code: '',
  },
  createEditor: createCodeEditor,
};
