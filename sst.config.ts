// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'llm-chatbot',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage),
      home: 'aws',
    };
  },
  async run() {
    // Secrets are stored in AWS SSM Parameter Store.
    // Set them before deploying:
    //   npx sst secret set AnthropicApiKey "sk-ant-..." --stage production
    //   npx sst secret set BetterAuthSecret "$(openssl rand -base64 32)" --stage production
    //   npx sst secret set DatabaseUrl "postgresql://user:pass@host:5432/db" --stage production
    //   npx sst secret set WeatherApiKey "..." --stage production
    //   npx sst secret set BaseUrl "https://your-cloudfront-url.cloudfront.net" --stage production
    //
    // After first deploy, capture the printed URL and set BaseUrl, then redeploy.
    const anthropicApiKey = new sst.Secret('AnthropicApiKey');
    const betterAuthSecret = new sst.Secret('BetterAuthSecret');
    const databaseUrl = new sst.Secret('DatabaseUrl');
    const weatherApiKey = new sst.Secret('WeatherApiKey');
    const baseUrl = new sst.Secret('BaseUrl');

    const web = new sst.aws.Nextjs('LlmChatbot', {
      link: [anthropicApiKey, betterAuthSecret, databaseUrl, weatherApiKey, baseUrl],
      environment: {
        // Non-secret config — override per stage as needed
        LLM_PROVIDER: 'anthropic',
        MODEL_NAME: 'claude-sonnet-4-5-20250929',
        TITLE_MODEL_NAME: 'claude-haiku-4-5-20251001',
        MODEL_TEMPERATURE: '0.3',
        MODEL_MAX_TOKENS: '4096',
        DATABASE_SSL: 'true',
        COOKIE_SECURE: 'true',
        // COOKIE_DOMAIN: '.example.com',  // Uncomment for cross-subdomain cookies

        // Secrets — resolved at deploy time from SST secret store.
        // Needed because OpenNext's Lambda may not receive SST_RESOURCE_* vars.
        ANTHROPIC_API_KEY: anthropicApiKey.value,
        BETTER_AUTH_SECRET: betterAuthSecret.value,
        DATABASE_URL: databaseUrl.value,
        WEATHER_API_KEY: weatherApiKey.value,
        BASE_URL: baseUrl.value,
      },
      server: {
        timeout: '60 seconds',
      },
    });

    return {
      url: web.url,
    };
  },
});
