/**
 * KiraBoard - Dashboard Builder Library
 * 
 * A library for building and generating dashboard configurations
 * with customizable widgets.
 * 
 * @module kiraboard
 * @example
 * // ESM
 * import { WIDGETS, generateDashboardHtml, generateDashboardCss } from 'kiraboard';
 * 
 * // CommonJS
 * const { WIDGETS, generateDashboardHtml } = require('kiraboard');
 * 
 * // Browser (UMD)
 * <script src="https://unpkg.com/kiraboard"></script>
 * const { WIDGETS } = KiraBoard;
 */

// Widget definitions
export { 
  WIDGETS, 
  getWidgetCategories, 
  getWidget, 
  getWidgetTypes 
} from './widgets.js';

// Builder utilities
export {
  escapeHtml,
  processWidgetHtml,
  generateDashboardCss,
  generateEditJs,
  generateWidgetHtml,
  generateWidgetJs,
  generateDashboardHtml,
  generateDashboardJs,
  generateReadme
} from './builder.js';

// Re-export defaults for convenience
import { WIDGETS } from './widgets.js';
import builder from './builder.js';

// Version (will be replaced during build)
export const VERSION = '0.1.0';

// Default export for convenience
export default {
  VERSION,
  WIDGETS,
  ...builder
};
