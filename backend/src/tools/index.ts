import { weatherTool, weatherForecastTool } from "./weather.js";

// Export all tools as an array for the agent
export const tools = [weatherTool, weatherForecastTool];

// Also export individually for testing/flexibility
export { weatherTool, weatherForecastTool };
