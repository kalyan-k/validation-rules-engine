export function renderMarkdown(markdown: string): string {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n');
  const output: string[] = [];
  let paragraph: string[] = [];
  let listType: 'ul' | 'ol' | undefined;
  let codeLanguage = '';
  let codeLines: string[] | undefined;
  let index = 0;

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      output.push(`<p>${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };
  const closeList = (): void => {
    if (listType) {
      output.push(`</${listType}>`);
      listType = undefined;
    }
  };

  while (index < lines.length) {
    const line = lines[index] ?? '';

    if (line.startsWith('```')) {
      flushParagraph();
      closeList();
      if (codeLines) {
        output.push(`<pre><code${codeLanguage ? ` data-language="${escapeHtml(codeLanguage)}"` : ''}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines = undefined;
        codeLanguage = '';
      } else {
        codeLanguage = line.slice(3).trim();
        codeLines = [];
      }
      index += 1;
      continue;
    }
    if (codeLines) {
      codeLines.push(line);
      index += 1;
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      closeList();
      index += 1;
      continue;
    }

    if (isTableHeader(line) && isTableSeparator(lines[index + 1] ?? '')) {
      flushParagraph();
      closeList();
      const tableLines = [line, lines[index + 1] ?? ''];
      index += 2;
      while (index < lines.length && isTableRow(lines[index] ?? '')) {
        tableLines.push(lines[index] ?? '');
        index += 1;
      }
      output.push(renderTable(tableLines));
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1]?.length ?? 2;
      const text = heading[2] ?? '';
      output.push(`<h${level} id="${slugify(text)}">${inline(text)}</h${level}>`);
      index += 1;
      continue;
    }

    const unordered = /^[-*]\s+(.+)$/.exec(line);
    const ordered = /^\d+\.\s+(.+)$/.exec(line);
    if (unordered || ordered) {
      flushParagraph();
      const nextType = unordered ? 'ul' : 'ol';
      if (listType !== nextType) {
        closeList();
        listType = nextType;
        output.push(`<${nextType}>`);
      }
      output.push(`<li>${inline((unordered ?? ordered)?.[1] ?? '')}</li>`);
      index += 1;
      continue;
    }

    if (line.startsWith('> ')) {
      flushParagraph();
      closeList();
      output.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
      index += 1;
      continue;
    }
    paragraph.push(line.trim());
    index += 1;
  }

  flushParagraph();
  closeList();
  if (codeLines) {
    output.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  }
  return output.join('\n');
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|');
}

function isTableHeader(line: string): boolean {
  return isTableRow(line);
}

function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
    return false;
  }
  return trimmed
    .slice(1, -1)
    .split('|')
    .every((cell) => /^\s*:?-{3,}:?\s*$/u.test(cell));
}

function splitTableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/u, '')
    .replace(/\|$/u, '')
    .split('|')
    .map((cell) => cell.trim());
}

function renderTable(tableLines: string[]): string {
  const [headerLine = '', _separator, ...bodyLines] = tableLines;
  const headers = splitTableCells(headerLine);
  const body = bodyLines.map((row) => splitTableCells(row));
  return [
    '<div class="docs-table-wrap"><table>',
    '<thead><tr>',
    ...headers.map((cell) => `<th>${inline(cell)}</th>`),
    '</tr></thead>',
    '<tbody>',
    ...body.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`),
    '</tbody>',
    '</table></div>'
  ].join('');
}

function inline(value: string): string {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, (_match, label: string, href: string) => {
      const safeHref = /^(?:https?:\/\/|\/|#)/.test(href) ? href : '#';
      return `<a href="${escapeHtml(safeHref)}">${label}</a>`;
    });
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
