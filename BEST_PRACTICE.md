
## OAuth 2.0 Best-Practice Playbook

Use this checklist when hardening a production OAuth 2.0 deployment. Each item builds on the demo defenses and extends them with operational guidance.

### 1. Flows & Client Profiles
- Prefer Authorization Code + PKCE for every public client (web SPA, mobile, native). Treat PKCE as mandatory, not optional.
- Use confidential clients with client secrets or mutual TLS for back-end services. Store secrets in a dedicated secrets manager and rotate on a defined schedule.
- Enforce `response_type=code` only; never allow the implicit flow for new integrations.

### 2. Request Integrity Controls
- Generate cryptographically strong `state` (CSRF) and `nonce` (OIDC replay protection) values per request; persist server-side until verified.
- Validate redirect URIs with an allow-list per client. Require exact matches (including scheme, host, port, and path) and re-check during the token exchange.
- Reject authorization requests that lack PKCE parameters (`code_challenge`, `code_challenge_method`) or that reuse stale verifier values.

### 3. Token Lifecycle Hygiene
- Keep authorization codes short-lived (≤10 minutes), single-use, and immediately invalidate after redemption.
- Issue access tokens with tight TTLs (≤60 minutes) and pair them with refresh tokens protected by sender-constrained mechanisms (DPoP, mTLS) where possible.
- Store tokens server-side (sessions or database) and only surface opaque session identifiers via HttpOnly+Secure cookies with SameSite=Lax/Strict depending on UX needs.
- Hash or encrypt refresh tokens at rest and record the audience, scopes, and device metadata for auditing and rapid revocation.

### 4. API & Scope Governance
- Apply the principle of least privilege with granular scopes (`profile:read`, `email:read`, etc.) and deny requests for unused scopes by default.
- Use incremental authorization (a.k.a. consent step-up) for risky operations and short-lived, purpose-built scopes for webhooks or background jobs.
- Propagate scopes through downstream services so that each resource server enforces the same contract that the authorization server issued.

### 5. Transport & Session Security
- Terminate TLS 1.2+ everywhere; disable plaintext HTTP and redirect stray requests to HTTPS with HSTS enabled.
- Pin certificates or trust stores on native clients. For SPAs, validate the auth server origin before invoking `fetch` to prevent mixed-content injection.
- Attach the Secure flag to cookies in production, enforce SameSite wherever possible, and strip cookies from cross-domain redirects unless explicitly required.

### 6. Observability & Incident Response
- Log high-level events (authorization success/failure, token issuance, refresh, revocation) with correlation IDs but redact tokens, verifiers, and passwords.
- Build automated anomaly detection: multiple failed verifier checks, unusual scope requests, geo-velocity anomalies, and refresh-token reuse.
- Provide a manual and automated revocation path (admin UI + API) so security teams can invalidate tokens on compromise.

### 7. Developer & Operational Discipline
- Separate environments (dev/stage/prod) with distinct client IDs/secrets and redirect URIs to avoid cross-environment leakage.
- Run contract tests that cover PKCE enforcement, state validation, whitelist enforcement, and token storage before every release.
- Document integration requirements for partners so misconfigured clients fail fast (e.g., publish OpenID Connect discovery metadata and RFC-compliant error codes).

Following these practices ensures the “secure” side of this demo aligns with real-world OAuth 2.0 guidance from the IETF (RFC 6749, 7636, 8252, 9126) and hardens deployments against the most common authorization attacks.


