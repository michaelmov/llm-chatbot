import { weatherTool } from "./weather.js";

// Export all tools as an array for the agent
export const tools = [weatherTool];

// Also export individually for testing/flexibility
export { weatherTool };
