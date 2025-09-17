# Security Hardening Notes

This project enforces strict secret management for authentication and push messaging. Use this guide when provisioning or rotating credentials.

## JWT secret lifecycle

- **Strength requirements:** `JWT_SECRET` must be at least 32 characters. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- **Expiration & algorithm:** API tokens are signed with HS256 and expire after 15 minutes by default. Override with `JWT_EXPIRATION` only if coordinated across all services.
- **Rotation procedure:**
  1. Generate the replacement secret and store it securely (password manager or secret manager).
  2. Add the new value to the environment (e.g., staging, then production) as `JWT_SECRET_NEW`.
  3. Deploy code that reads `JWT_SECRET_NEW` and accepts both secrets during a grace period *or* schedule a maintenance window.
  4. Update the `JWT_SECRET` variable to the new value, redeploy, and invalidate outstanding tokens (force logout) via cache flush or session revocation.
  5. Remove `JWT_SECRET_NEW` once the rollout is complete.

## VAPID keys (web push)

- **Strength requirements:** `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` must each be at least 32 characters. Blank or short values disable push delivery.
- **Generation:** run `npm run generate-vapid` locally, copy the values into your secret store, then distribute to each environment.
- **Rotation:**
  1. Generate a new key pair with `npm run generate-vapid` and record the result securely.
  2. Update the environment variables atomically (public + private key + contact email) and restart the API server.
  3. Notify clients about the rotation so that service workers resubscribe if necessary.

## Third-party / internal tokens

- Store values such as `INTERNAL_API_KEY` exclusively in environment variables or a secret manager. Leave them unset in source control and provision per environment.
- Audit secret usage at least quarterly and rotate alongside JWT/VAPID credentials during security reviews.
