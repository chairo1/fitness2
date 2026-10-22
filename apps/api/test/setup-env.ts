// Runs before each e2e test file. Individual tests may override these.
process.env.JWT_SECRET ??= 'e2e-test-secret-not-for-production';
process.env.THROTTLE_AUTH_LIMIT ??= '1000';
