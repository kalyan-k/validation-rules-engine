import assert from 'node:assert/strict';
import test from 'node:test';
import { renderMarkdown } from './markdown.js';

test('renders headings, lists, links, and fenced code', () => {
  const html = renderMarkdown('# Guide\n\n- One\n- Two\n\n[Showcase](/showcase)\n\n```ts\nconst ready = true;\n```');
  assert.match(html, /<h1 id="guide">Guide<\/h1>/);
  assert.match(html, /<ul>/);
  assert.match(html, /href="\/showcase"/);
  assert.match(html, /data-language="ts"/);
});

test('escapes source HTML and rejects unsafe link schemes', () => {
  const html = renderMarkdown('<script>alert(1)</script>\n\n[unsafe](javascript:alert(1))');
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /href="#"/);
});
