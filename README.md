# watcher

A small Node.js app that fetches configured URLs on a cron schedule,
monitors specific content via XPath, and sends an email alert whenever the
monitored content changes. Watches are stored in MongoDB and managed
through a small built-in CRUD API (a Koa server).

## Setup

```bash
yarn install
cp config/config.example.json config/config.json
cp .env.example .env
```

You'll also need a MongoDB instance to connect to. For local development
you can run one with Docker:

```bash
docker run -d --name watcher-mongo -p 27017:27017 mongo
```

Edit `.env` with your MongoDB connection, SMTP credentials, and alert email
addresses. `config/config.json` is optional — see below.

### Config format (`config/config.json`)

Watches live in MongoDB and are normally managed through the CRUD API (see
[Watch management API](#watch-management-api)). `config/config.json` is
only used to **seed** the `watches` collection the first time the app
starts against an empty database — it's a convenience for getting started,
not the source of truth once watches exist in MongoDB.

```json
{
  "watches": [
    {
      "name": "Example Watch",
      "url": "https://example.com",
      "xpath": "//h1",
      "cron": "*/15 * * * *"
    }
  ]
}
```

- `name` — *optional*. A label used in logs, state, and alert emails. If
  omitted, the watch's `<title>` from the page's first successful fetch is
  captured and used as the name instead.
- `url` — the URL to fetch.
- `xpath` — the XPath expression selecting the content to monitor.
- `cron` — a standard cron expression controlling how often this watch is checked.

### Environment variables (`.env`)

See `.env.example` for the full list.

- `MONGODB_URI` / `MONGODB_DB` — MongoDB connection string and database
  name. Fetch results (used to detect changes) and the watch list are both
  stored here.
- `PORT` — port the watch management API listens on (default `3000`).
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` — SMTP
  connection used to send change alert emails.
- `ALERT_EMAIL_FROM`, `ALERT_EMAIL_TO` — envelope addresses for alert emails.
- `CONFIG_PATH` — optional path to the seed config file (defaults to
  `config/config.json`).

#### Gmail SMTP setup

To send alert emails through Gmail's SMTP relay:

1. Enable 2-Step Verification on the Google account (required for App Passwords).
2. Create an [App Password](https://support.google.com/accounts/answer/185833)
   for the account — your regular Gmail password will not work.
3. Set:

   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=your-account@gmail.com
   SMTP_PASS=your-16-character-app-password
   ```

   Port `587` with `SMTP_SECURE=false` also works (STARTTLS instead of
   implicit TLS).

## Usage

Run continuously, checking each watch on its configured cron schedule, and
start the watch management API:

```bash
yarn start
```

Run every configured watch once immediately (useful for testing your config
and XPath expressions); this does not start the API server:

```bash
yarn check
```

## Watch management API

While running (`yarn start`), watches can be created, read, updated, and
deleted through a small Koa-based REST API on `PORT` (default `3000`).
Creating or updating a watch immediately (re)schedules its cron job;
deleting one stops it.

| Method | Path           | Description                       |
| ------ | -------------- | ---------------------------------- |
| GET    | `/watches`     | List all watches                   |
| GET    | `/watches/:id` | Get a single watch                 |
| POST   | `/watches`     | Create a watch                     |
| PUT    | `/watches/:id` | Update a watch                     |
| DELETE | `/watches/:id` | Delete a watch                     |

`name` is optional on create/update — see [Config format](#config-format-configconfigjson).

```bash
# Create a watch (name omitted — will be filled in from the page title)
curl -X POST http://localhost:3000/watches \
  -H 'Content-Type: application/json' \
  -d '{"url": "https://example.com", "xpath": "//h1", "cron": "*/15 * * * *"}'

# List watches
curl http://localhost:3000/watches

# Update a watch's cron schedule
curl -X PUT http://localhost:3000/watches/<id> \
  -H 'Content-Type: application/json' \
  -d '{"cron": "0 * * * *"}'

# Delete a watch
curl -X DELETE http://localhost:3000/watches/<id>
```

(A frontend for this API may be added later.)

## How it works

On each check, the app fetches the URL and extracts the text content
matching the configured XPath. If the watch has no `name` yet, the page's
`<title>` from this first fetch is captured and saved as the watch's name.

The extracted value is compared against the most recent previously-stored
result for that watch in MongoDB. If it differs, an email alert is sent via
SMTP (using [nodemailer](https://nodemailer.com/)). Either way, the new
value is stored as a fresh result, becoming the baseline for the next
comparison. The first check for a given watch only records a baseline; it
does not send an alert.
