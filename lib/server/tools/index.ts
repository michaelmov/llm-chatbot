import { weatherTool, weatherForecastTool } from './weather';
import { dateTimeTool } from './datetime';

// Export all tools as an array for the agent
export const tools = [weatherTool, weatherForecastTool, dateTimeTool];

// Also export individually for testing/flexibility
export { weatherTool, weatherForecastTool, dateTimeTool };
