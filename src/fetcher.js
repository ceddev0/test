const axios = require('axios');
const { JSDOM } = require('jsdom');
const xpath = require('xpath');

async function fetchDocument(url) {
  const response = await axios.get(url, {
    headers: { 'User-Agent': 'watcher/1.0' },
    timeout: 15000,
  });

  return new JSDOM(response.data).window.document;
}

function extractXPathContent(document, xpathExpression) {
  const nodes = xpath.select(xpathExpression, document);

  if (!nodes || nodes.length === 0) {
    throw new Error(`XPath "${xpathExpression}" matched no nodes.`);
  }

  return nodes
    .map((node) => (node.textContent !== undefined ? node.textContent : String(node)))
    .join('\n')
    .trim();
}

function extractPageTitle(document) {
  const title = document.querySelector('title');
  const text = title ? title.textContent.trim() : '';
  return text || null;
}

module.exports = { fetchDocument, extractXPathContent, extractPageTitle };
