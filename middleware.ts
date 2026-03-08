// OpenNext (AWS Lambda) does not yet support Next.js 16's proxy.ts convention.
// This file re-exports the auth proxy logic so OpenNext can pick it up as
// standard Next.js middleware. In Next.js 16 native deployments (Docker),
// proxy.ts takes precedence; this file is kept for Lambda compatibility.
export { proxy as default, config } from './proxy';
