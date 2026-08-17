# CLAUDE.md

Guidance for Claude and other contributors working in this repository.

## Project

`watcher` — a small Node.js app that scrapes configured URLs on a cron
schedule, monitors XPath-selected content for changes, and sends an email
alert via SMTP when a change is detected. See `README.md` for setup and
usage.

## Commit conventions

This repo uses [Conventional Commits](https://www.conventionalcommits.org/).
Every commit title must follow:

```
<type>(<optional scope>): <short summary>
```

Common types:

- `feat` — a new feature
- `fix` — a bug fix
- `docs` — documentation only changes
- `refactor` — code change that neither fixes a bug nor adds a feature
- `test` — adding or correcting tests
- `chore` — tooling, dependencies, or other maintenance
- `ci` — CI/CD configuration changes

Rules:

- Subject line in the imperative mood ("add", not "added"/"adds"), no
  trailing period, ideally under ~72 characters.
- Use the body (separated by a blank line) to explain *why* when it's not
  obvious from the diff.
- Keep commits focused — one logical change per commit.

## Development

```bash
yarn install
cp config/config.example.json config/config.json
cp .env.example .env
```

- `yarn start` — run continuously on the configured cron schedules.
- `yarn check` — run every configured watch once immediately (useful for
  testing config and XPath expressions).

There is currently no lint or test suite configured in `package.json`; don't
assume one exists.
