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
  const payload = ['<', 'script>alert(1)</', 'script>'].join('');
  const html = renderMarkdown(`${payload}\n\n[unsafe](javascript:alert(1))`);
  // Escaped output proves the raw tag was not emitted as executable HTML.
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /href="#"/);
});

test('renders markdown tables as HTML tables', () => {
  const html = renderMarkdown('| Route | Purpose |\n| --- | --- |\n| `/showcases/vanilla/` | Home |');
  assert.match(html, /<table>/);
  assert.match(html, /<th>Route<\/th>/);
  assert.match(html, /<td><code>\/showcases\/vanilla\/<\/code><\/td>/);
  assert.doesNotMatch(html, /\| Route \| Purpose \|/);
});
