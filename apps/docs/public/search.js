const input = document.querySelector('#docs-search');
const resultsPanel = document.querySelector('#docs-search-results');
const clearButton = document.querySelector('#docs-search-clear');
let documentsPromise;
let activeIndex = -1;

function syncClearButton() {
  clearButton.hidden = input.value.length === 0;
}

function loadDocuments() {
  documentsPromise ??= fetch('/docs/search-index.json', { cache: 'force-cache' })
    .then((response) => {
      if (!response.ok) throw new Error(`Search index returned ${response.status}`);
      return response.json();
    })
    .then((payload) => payload.documents ?? []);
  return documentsPromise;
}

function termsFor(value) {
  return value.toLocaleLowerCase().trim().split(/\s+/u).filter(Boolean);
}

function score(document, terms) {
  if (!terms.every((term) => document.searchableText.includes(term))) return 0;
  const title = document.title.toLocaleLowerCase();
  const heading = document.heading.toLocaleLowerCase();
  return terms.reduce((total, term) => total
    + (title === term ? 30 : title.includes(term) ? 14 : 0)
    + (heading === term ? 24 : heading.includes(term) ? 12 : 0)
    + document.searchableText.split(term).length - 1, 0);
}

function highlightedText(value, terms) {
  const fragment = document.createDocumentFragment();
  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'));
  if (escaped.length === 0) {
    fragment.append(value);
    return fragment;
  }
  const expression = new RegExp(`(${escaped.join('|')})`, 'giu');
  value.split(expression).forEach((part) => {
    if (terms.some((term) => part.toLocaleLowerCase() === term)) {
      const mark = document.createElement('mark');
      mark.textContent = part;
      fragment.append(mark);
    } else {
      fragment.append(part);
    }
  });
  return fragment;
}

function closeResults() {
  resultsPanel.hidden = true;
  input.setAttribute('aria-expanded', 'false');
  input.removeAttribute('aria-activedescendant');
  activeIndex = -1;
}

function scrollActiveNavigationLink() {
  const activeLink = document.querySelector('.docs-navigation a[aria-current="page"], .docs-navigation a.active');
  activeLink?.scrollIntoView({ block: 'center', inline: 'nearest' });
}

function setActive(index) {
  const options = [...resultsPanel.querySelectorAll('[role="option"]')];
  if (options.length === 0) return;
  activeIndex = (index + options.length) % options.length;
  options.forEach((option, optionIndex) => option.classList.toggle('active', optionIndex === activeIndex));
  const active = options[activeIndex];
  input.setAttribute('aria-activedescendant', active.id);
  active.scrollIntoView({ block: 'nearest' });
}

function renderResults(matches, query) {
  resultsPanel.replaceChildren();
  const terms = termsFor(query);
  if (matches.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'search-empty';
    empty.textContent = 'No documentation matches found.';
    resultsPanel.append(empty);
  } else {
    matches.forEach((match, index) => {
      const link = document.createElement('a');
      link.id = `docs-search-option-${index}`;
      link.setAttribute('role', 'option');
      link.href = `/docs/${match.slug}?search=${encodeURIComponent(query)}${match.anchor ? `#${match.anchor}` : ''}`;
      const context = document.createElement('small');
      context.textContent = `${match.section} - ${match.title}`;
      const heading = document.createElement('strong');
      heading.append(highlightedText(match.heading, terms));
      const excerpt = document.createElement('span');
      excerpt.append(highlightedText(match.excerpt, terms));
      link.append(context, heading, excerpt);
      resultsPanel.append(link);
    });
  }
  resultsPanel.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  activeIndex = -1;
}

async function search() {
  const query = input.value.trim();
  if (query.length < 2) {
    closeResults();
    return;
  }
  const terms = termsFor(query);
  const documents = await loadDocuments();
  const matches = documents
    .map((document) => ({ ...document, score: score(document, terms) }))
    .filter((document) => document.score > 0)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, 12);
  if (input.value.trim() === query) renderResults(matches, query);
}

input.addEventListener('focus', () => { void loadDocuments(); if (input.value.trim().length >= 2) void search(); });
input.addEventListener('input', () => { syncClearButton(); void search(); });
input.addEventListener('keydown', (event) => {
  const options = [...resultsPanel.querySelectorAll('[role="option"]')];
  if (event.key === 'ArrowDown') { event.preventDefault(); setActive(activeIndex + 1); }
  if (event.key === 'ArrowUp') { event.preventDefault(); setActive(activeIndex - 1); }
  if (event.key === 'Enter' && activeIndex >= 0) { event.preventDefault(); options[activeIndex]?.click(); }
  if (event.key === 'Escape') closeResults();
});
document.addEventListener('click', (event) => {
  if (!event.composedPath().includes(input) && !event.composedPath().includes(resultsPanel)) closeResults();
});
clearButton.addEventListener('click', () => {
  input.value = '';
  syncClearButton();
  closeResults();
  input.focus();
});

function codeText(pre) {
  const code = pre.querySelector('code');
  return code?.innerText ?? pre.innerText ?? '';
}

async function copyToClipboard(value) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  document.body.append(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function enhanceCodeBlocks() {
  document.querySelectorAll('#docs-content pre').forEach((pre, index) => {
    if (pre.parentElement?.classList.contains('docs-code-block')) {
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'docs-code-block';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'docs-copy-button';
    button.title = 'Click to copy';
    button.setAttribute('aria-label', 'Click to copy code block');
    button.innerHTML = '<span class="docs-copy-icon" aria-hidden="true"></span><span class="docs-copy-check" aria-hidden="true"></span><span class="docs-copy-label">Copy</span>';
    let resetTimer;
    button.addEventListener('click', async () => {
      await copyToClipboard(codeText(pre));
      button.classList.add('copied');
      button.title = 'Copied';
      button.setAttribute('aria-label', 'Code copied');
      button.querySelector('.docs-copy-label').textContent = 'Copied';
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        button.classList.remove('copied');
        button.title = 'Click to copy';
        button.setAttribute('aria-label', 'Click to copy code block');
        button.querySelector('.docs-copy-label').textContent = 'Copy';
      }, 10000);
    });

    pre.replaceWith(wrapper);
    wrapper.append(button, pre);
    pre.id ||= `docs-code-block-${index + 1}`;
  });
}

const initialQuery = new URLSearchParams(location.search).get('search')?.trim();
if (initialQuery) {
  input.value = initialQuery;
  const terms = termsFor(initialQuery);
  const article = document.querySelector('#docs-content');
  const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.parentElement?.closest('mark,script,style') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    if (terms.some((term) => node.textContent.toLocaleLowerCase().includes(term))) {
      node.replaceWith(highlightedText(node.textContent, terms));
    }
  });
}
syncClearButton();
requestAnimationFrame(scrollActiveNavigationLink);
enhanceCodeBlocks();
