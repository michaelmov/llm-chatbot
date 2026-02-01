import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { config } from "../config.js";

function getConditionEmoji(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes("sunny") || c.includes("clear")) return "☀️";
  if (c.includes("partly cloudy")) return "⛅";
  if (c.includes("cloudy") || c.includes("overcast")) return "☁️";
  if (c.includes("mist") || c.includes("fog")) return "🌫️";
  if (c.includes("rain") || c.includes("drizzle")) return "🌧️";
  if (c.includes("thunder") || c.includes("storm")) return "⛈️";
  if (c.includes("snow") || c.includes("sleet") || c.includes("blizzard")) return "❄️";
  if (c.includes("wind")) return "💨";
  return "🌡️";
}

export const weatherTool = tool(
  async ({ location }) => {
    const url = `${config.weather.baseUrl}/current.json?key=${config.weather.apiKey}&q=${encodeURIComponent(location)}`;

    const response = await fetch(url);
    if (!response.ok) {
      return `Unable to fetch weather for "${location}". Please check the location name.`;
    }

    const data = await response.json();
    const emoji = getConditionEmoji(data.current.condition.text);
    return `Current weather in ${data.location.name}, ${data.location.country}:
- Temperature: ${data.current.temp_f}°F (${data.current.temp_c}°C)
- Condition: ${emoji} ${data.current.condition.text}
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
