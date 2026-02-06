import { weatherTool, weatherForecastTool } from './weather.js';
import { dateTimeTool } from './datetime.js';

// Export all tools as an array for the agent
export const tools = [weatherTool, weatherForecastTool, dateTimeTool];

// Also export individually for testing/flexibility
export { weatherTool, weatherForecastTool, dateTimeTool };
