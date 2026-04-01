import './styles/reset.css';
import './styles/app.css';
import './styles/editor-layout.css';
import 'highlight.js/styles/atom-one-dark.css';

import { registerPlugin } from './sections/registry.js';
import { HeadingPlugin } from './sections/heading/index.js';
import { TextPlugin } from './sections/text/index.js';
import { ShellPlugin } from './sections/shell/index.js';
import { CodePlugin } from './sections/code/index.js';
import { ChecklistPlugin } from './sections/checklist/index.js';
import { KeyValuePlugin } from './sections/keyvalue/index.js';
import { CalloutPlugin } from './sections/callout/index.js';
import { SeparatorPlugin } from './sections/separator/index.js';
import { mountApp } from './components/app-shell.js';

registerPlugin(HeadingPlugin);
registerPlugin(TextPlugin);
registerPlugin(ShellPlugin);
registerPlugin(CodePlugin);
registerPlugin(ChecklistPlugin);
registerPlugin(KeyValuePlugin);
registerPlugin(CalloutPlugin);
registerPlugin(SeparatorPlugin);

mountApp('#app');
