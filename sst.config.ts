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
    //   npx sst secret set AnthropicApiKey "sk-ant-..."
    //   npx sst secret set BetterAuthSecret "$(openssl rand -base64 32)"
    //   npx sst secret set DatabaseUrl "postgresql://user:pass@host:5432/db"
    //   npx sst secret set WeatherApiKey "..."
    //   npx sst secret set BaseUrl "https://your-cloudfront-url.cloudfront.net"
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
        MODEL_TEMPERATURE: '0.3',
        MODEL_MAX_TOKENS: '4096',
        DATABASE_SSL: 'true',
        COOKIE_SECURE: 'true',
        // COOKIE_DOMAIN: '.example.com',  // Uncomment for cross-subdomain cookies
      },
    });

    return {
      url: web.url,
    };
  },
});
