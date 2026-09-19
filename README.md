# LinguaCoach

Voice-first AI language coaching app.

## Current architecture

- Next.js + TypeScript
- Browser WebRTC voice connection
- OpenAI Realtime for low-latency speech-to-speech conversation
- Short-lived Realtime client secrets minted server-side
- Structured post-session coaching analysis through the Responses API
- Local preference persistence for language, level, and scenario
- Health endpoint and CI build workflow
- Production-oriented security headers and environment separation

## Local development

1. Copy `.env.example` to `.env.local`.
2. Set `OPENAI_API_KEY` in `.env.local`.
3. Install dependencies:

```bash
npm install
```

4. Start the development server:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

Never commit `.env.local` or an OpenAI API key.

## Health check

With the server running:

```text
GET /api/health
```

The endpoint reports service configuration without exposing secrets.

## Product direction

LinguaCoach is being developed as an AI speaking partner plus personal language coach:

1. Natural realtime conversation
2. Gentle in-flow corrections
3. Scenario-based roleplay
4. Session feedback and vocabulary
5. Personalized learning history
6. Accounts, persistence, billing, and production deployment

## Production checklist

- [x] Voice MVP architecture
- [x] Secure server-side API key handling
- [x] Realtime client-secret flow
- [x] Structured coaching analysis
- [x] Responsive voice UI
- [x] CI build
- [ ] Authentication and user accounts
- [ ] Persistent database and learning history
- [ ] Usage metering and rate limiting
- [ ] Billing/subscriptions
- [ ] Automated tests and end-to-end voice tests
- [ ] Production deployment and observability
- [ ] Privacy policy, terms, and data retention controls
