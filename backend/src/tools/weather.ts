import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { config } from "../config.js";

export const weatherTool = tool(
  async ({ location }) => {
    const url = `${config.weather.baseUrl}/current.json?key=${config.weather.apiKey}&q=${encodeURIComponent(location)}`;

    const response = await fetch(url);
    if (!response.ok) {
      return `Unable to fetch weather for "${location}". Please check the location name.`;
    }

    const data = await response.json();
    return `Current weather in ${data.location.name}, ${data.location.country}:
- Temperature: ${data.current.temp_f}°F (${data.current.temp_c}°C)
- Condition: ${data.current.condition.text}
- Humidity: ${data.current.humidity}%
- Wind: ${data.current.wind_mph} mph ${data.current.wind_dir}`;
  },
  {
    name: "get_weather",
    description:
      "Get current weather information for a location. Use this when users ask about weather, temperature, or conditions for a city or place.",
    schema: z.object({
      location: z
        .string()
        .describe("City name, US zip code, or coordinates (lat,lon)"),
    }),
  }
);
