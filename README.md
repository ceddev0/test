# webpage-watcher

A small Node.js app that scrapes configured webpages on a cron schedule,
monitors specific parts of each page via XPath, and sends an email alert
whenever the monitored content changes.

## Setup

```bash
npm install
cp config/config.example.json config/config.json
cp .env.example .env
```

Edit `config/config.json` to list the pages you want to watch, and edit
`.env` with your SMTP credentials and alert email addresses.

### Config format (`config/config.json`)

```json
{
  "watches": [
    {
      "name": "Example Page Title",
      "url": "https://example.com",
      "xpath": "//h1",
      "cron": "*/15 * * * *"
    }
  ]
}
```

- `name` — a label used in logs, state, and alert emails.
- `url` — the page to fetch.
- `xpath` — the XPath expression selecting the content to monitor.
- `cron` — a standard cron expression controlling how often this page is checked.

### Environment variables (`.env`)

See `.env.example` for the full list: SMTP connection settings
(`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`) and the
alert email addresses (`ALERT_EMAIL_FROM`, `ALERT_EMAIL_TO`).

## Usage

Run continuously, checking each watch on its configured cron schedule:

```bash
npm start
```

Run every configured watch once immediately (useful for testing your config
and XPath expressions):

```bash
npm run check
```

## How it works

On each check, the app fetches the page, extracts the text content matching
the configured XPath, and compares it against the last-seen value stored in
`data/state.json`. If the value differs from the previous run, an email
alert is sent via SMTP (using [nodemailer](https://nodemailer.com/)) and the
new value is saved as the baseline for the next comparison. The first check
for a given watch only records a baseline; it does not send an alert.
