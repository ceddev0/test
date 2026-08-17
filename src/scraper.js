const axios = require('axios');
const { JSDOM } = require('jsdom');
const xpath = require('xpath');

async function fetchXPathContent(url, xpathExpression) {
  const response = await axios.get(url, {
    headers: { 'User-Agent': 'webpage-watcher/1.0' },
    timeout: 15000,
  });

  const dom = new JSDOM(response.data);
  const nodes = xpath.select(xpathExpression, dom.window.document);

  if (!nodes || nodes.length === 0) {
    throw new Error(`XPath "${xpathExpression}" matched no nodes at ${url}`);
  }

  return nodes
    .map((node) => (node.textContent !== undefined ? node.textContent : String(node)))
    .join('\n')
    .trim();
}

module.exports = { fetchXPathContent };
