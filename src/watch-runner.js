const { fetchDocument, extractXPathContent, extractPageTitle } = require('./fetcher');
const { getLastResult, saveResult } = require('./results');
const { sendChangeAlert } = require('./mailer');
const { setWatchName } = require('./watches');

async function checkWatch(watch) {
  const label = () => watch.name || watch.url;

  let document;
  try {
    document = await fetchDocument(watch.url);
  } catch (err) {
    console.error(`[${label()}] Failed to fetch ${watch.url}: ${err.message}`);
    return;
  }

  if (!watch.name) {
    const title = extractPageTitle(document);
    if (title) {
      watch.name = title;
      await setWatchName(watch.id, title);
      console.log(`[${title}] Captured page title as watch name.`);
    }
  }

  let newValue;
  try {
    newValue = extractXPathContent(document, watch.xpath);
  } catch (err) {
    console.error(`[${label()}] Failed to extract content: ${err.message}`);
    return;
  }

  const lastResult = await getLastResult(watch.id);

  if (lastResult && lastResult.value !== newValue) {
    console.log(`[${label()}] Change detected, sending alert.`);
    try {
      await sendChangeAlert({
        name: label(),
        url: watch.url,
        previousValue: lastResult.value,
        newValue,
      });
    } catch (err) {
      console.error(`[${label()}] Failed to send alert email: ${err.message}`);
    }
  } else if (!lastResult) {
    console.log(`[${label()}] Baseline captured.`);
  } else {
    console.log(`[${label()}] No change.`);
  }

  await saveResult(watch.id, newValue);
}

module.exports = { checkWatch };
