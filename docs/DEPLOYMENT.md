# Deployment & Operations Runbook

## Production deploy (UK-region host, e.g. AWS eu-west-2 EC2/Lightsail)

```bash
# on the server
cp .env.production.example .env.production   # fill: DB_PASSWORD, SESSION_SECRET (openssl rand -hex 32), APP_URL, POSTMARK_SERVER_TOKEN
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec app npx prisma db seed   # first deploy only (products/rules/settings/admin)
```

Put TLS in front (Caddy is the least-ops option: `reverse_proxy 127.0.0.1:3000` + automatic certificates + HSTS). The session cookie switches to `Secure` automatically when `APP_URL` is https; the app refuses to boot in production without a real `SESSION_SECRET`.

## Backups & disaster recovery (client NFR §7.5)
- The `backup` service pg_dumps **daily** to `./backups/`, keeping 14 dumps. Ship that folder off-host (S3 sync cron / snapshot policy).
- **Restore drill** (run it before go-live, then quarterly):
  ```bash
  docker compose -f docker-compose.prod.yml stop app
  docker compose -f docker-compose.prod.yml exec -T db pg_restore -U postgres -d membership --clean --if-exists < backups/membership-<stamp>.dump
  docker compose -f docker-compose.prod.yml start app
  ```
- Uploaded files live in the `app_storage` volume — include it in host snapshots (or swap `src/server/storage.ts` to S3).

## Provider go-live status
| Provider | Status | To go live |
|---|---|---|
| Email (Postmark) | **REAL — built in.** Set `POSTMARK_SERVER_TOKEN` and mail delivers (outbox stays as audit log) | Verify sender signature/domain |
| Cards (Stripe) | Simulated adapter | Implement charge + webhook in `src/server/enrolment.ts` seam (`mockCardPayment`), verify signatures, reconcile |
| Direct Debit (GoCardless) | Simulated adapter (schedule/collection/AT_RISK logic already real) | Mandate flow + collection webhooks into `collectNextInstalment` |
| E-signature (Dropbox Sign/DocuSign) | Simulated (state machine + stored contract real) | Envelope create + signed-webhook into `markSigned` |

## Go-live checklist
- [ ] Client answers questionnaire → update seed/settings (`docs/ARCHITECTURE.md §6`)
- [ ] Real contract wording replaces the flagged placeholder (`src/server/enrolment.ts contractHtml`)
- [ ] Stripe + GoCardless + e-sign adapters implemented against sandbox, then live keys
- [ ] `POSTMARK_SERVER_TOKEN` set; sender domain verified
- [ ] TLS + HSTS via reverse proxy; `APP_URL` https
- [ ] Restore drill performed and timed
- [ ] Data migration of existing members as `MIGRATION_CREDIT` ledger entries (day-one wallet truth)
- [ ] Privacy policy reviewed by client's legal advisor (`/privacy`)
- [ ] Penetration test / OWASP ASVS L1 pass
