const nodemailer = require('nodemailer');

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

async function sendChangeAlert({ name, url, previousValue, newValue }) {
  const transport = createTransport();

  await transport.sendMail({
    from: process.env.ALERT_EMAIL_FROM,
    to: process.env.ALERT_EMAIL_TO,
    subject: `[watcher] Change detected: ${name}`,
    text: [
      `A monitored section of "${name}" changed.`,
      `URL: ${url}`,
      '',
      '--- Previous ---',
      previousValue || '(none)',
      '',
      '--- Current ---',
      newValue,
    ].join('\n'),
  });
}

module.exports = { sendChangeAlert };
