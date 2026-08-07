export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  children: Array<Node | string | null | undefined> = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'className') {
      node.className = String(value);
      continue;
    }
    if (key === 'htmlFor') {
      (node as HTMLLabelElement).htmlFor = String(value);
      continue;
    }
    if (key === 'textContent') {
      node.textContent = String(value);
      continue;
    }
    if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();
      node.addEventListener(eventName, value as EventListener);
      continue;
    }
    if (key === 'checked' || key === 'disabled' || key === 'selected') {
      (node as unknown as Record<string, unknown>)[key] = value;
      continue;
    }
    if (value === true) {
      node.setAttribute(key, '');
      continue;
    }
    node.setAttribute(key, String(value));
  }
  for (const child of children) {
    if (child == null) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function setHtml(node: HTMLElement, html: string): void {
  node.innerHTML = html;
}

export function setText(node: HTMLElement, text: string): void {
  node.textContent = text;
}

export interface NavItem {
  path: string;
  label: string;
}

export function bindNav(
  nav: HTMLElement,
  items: readonly NavItem[],
  activePath: string,
  navigate: (path: string) => void
): void {
  clear(nav);
  for (const item of items) {
    const active = item.path === activePath;
    const link = el('a', {
      className: `vr-showcase-nav__link${active ? ' active' : ''}`,
      href: item.path,
      'aria-current': active ? 'page' : undefined,
      onClick: (event: Event) => {
        event.preventDefault();
        navigate(item.path);
      }
    }, [item.label]);
    nav.append(link);
  }
}

export function pageShell(title: string, description: string, body: HTMLElement): HTMLElement {
  return el('div', { className: 'showcase-page' }, [
    el('header', { className: 'showcase-page-heading' }, [
      el('div', {}, [
        el('h1', { textContent: title }),
        el('p', { className: 'lead', textContent: description })
      ])
    ]),
    body
  ]);
}
