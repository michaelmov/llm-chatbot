import { withSST } from '@opennextjs/aws/helpers/withSST.js';

export default withSST({
  default: {
    override: {
      wrapper: 'aws-lambda-streaming',
    },
  },
});
