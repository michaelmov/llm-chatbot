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

function formatForecastDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
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

export const weatherForecastTool = tool(
  async ({ location, days = 5 }) => {
    const url = `${config.weather.baseUrl}/forecast.json?key=${config.weather.apiKey}&q=${encodeURIComponent(location)}&days=${days}&aqi=no&alerts=no`;

    const response = await fetch(url);
    if (!response.ok) {
      return `Unable to fetch weather forecast for "${location}". Please check the location name.`;
    }

    const data = await response.json();
    const forecastDays = data.forecast.forecastday;

    const header = `${days}-Day Weather Forecast for ${data.location.name}, ${data.location.country}:\n`;

    const dailyForecasts = forecastDays
      .map((day: { date: string; day: { maxtemp_f: number; maxtemp_c: number; mintemp_f: number; mintemp_c: number; condition: { text: string }; daily_chance_of_rain: number } }) => {
        const emoji = getConditionEmoji(day.day.condition.text);
        return `📅 ${formatForecastDate(day.date)}
   🌡️ High: ${day.day.maxtemp_f}°F (${day.day.maxtemp_c}°C) | Low: ${day.day.mintemp_f}°F (${day.day.mintemp_c}°C)
   ${emoji} ${day.day.condition.text}
   💧 Chance of rain: ${day.day.daily_chance_of_rain}%`;
      })
      .join("\n\n");

    return header + "\n" + dailyForecasts;
  },
  {
    name: "get_weather_forecast",
    description:
      "Get a multi-day weather forecast for a location. Use this when users ask about upcoming weather, forecast, or want to know weather for future days.",
    schema: z.object({
      location: z
        .string()
        .describe("City name, US zip code, or coordinates (lat,lon)"),
      days: z
        .number()
        .min(1)
        .max(5)
        .optional()
        .describe("Number of days to forecast (1-5). Defaults to 5."),
    }),
  }
);
