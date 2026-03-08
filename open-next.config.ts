import type { OpenNextConfig } from '@opennextjs/aws/types/open-next.js';

const config: OpenNextConfig = {
  default: {
    override: {
      // Required for SSE (Server-Sent Events) streaming to work on Lambda.
      // Uses Lambda Function URL response streaming instead of buffered responses.
      wrapper: 'aws-lambda-streaming',
    },
  },
};

export default config;
