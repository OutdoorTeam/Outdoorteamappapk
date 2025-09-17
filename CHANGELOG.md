# Changelog

## [Unreleased]

### Security
- Enabled API and authentication rate limiting across environments with emergency opt-out via `DISABLE_RATE_LIMIT`, tightening throttling defaults and adding integration coverage.
- Enforced strong JWT and VAPID secret handling (15-minute HS256 tokens, env-only secrets) with automated coverage and updated environment templates.
