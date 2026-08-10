import { expect, test } from '../fixtures/test';

type NavigationLinks = {
  home: string | null;
  docs: string[];
  showcases: string[];
  reports: string[];
};

test.describe('Platform navigation URLs @hosting-navigation @regression', () => {
  test('uses the configured host topology from every application surface', async ({ page, baseUrls }) => {
    const surfaces = [
      ['Portal', `${baseUrls.portal}/`],
      ['Documentation', `${baseUrls.docs}/docs/overview`],
      ['Angular Showcase', `${baseUrls.angular}/state/signals`],
      ['React Showcase', `${baseUrls.react}/state/zustand`],
      ['Vanilla JS Showcase', `${baseUrls.vanilla}/simple`],
      ['Test & Coverage workspace', `${baseUrls.portal}/reports/index.html`],
      ['Automation report', `${baseUrls.portal}/automation/`],
      ['Security report', `${baseUrls.portal}/security/`]
    ] as const;

    const expected = {
      home: `${baseUrls.portal}/`,
      docsOrigin: new URL(baseUrls.docs).origin,
      docsPrefix: `${baseUrls.docs}/docs/`,
      showcases: [`${baseUrls.vanilla}/`, `${baseUrls.angular}/`, `${baseUrls.react}/`],
      reports: [`${baseUrls.portal}/reports/index.html`, `${baseUrls.portal}/automation/`, `${baseUrls.portal}/security/`]
    };

    for (const [surface, url] of surfaces) {
      await test.step(surface, async () => {
        await page.goto(url);
        const shell = page.locator('validation-platform-shell');
        await expect(shell).toBeVisible();
        const links = await shell.evaluate<NavigationLinks>((element) => {
          const root = element.shadowRoot;
          const groups = root ? [...root.querySelectorAll('.platform-nav-group')] : [];
          return {
            home: root?.querySelector<HTMLAnchorElement>('.platform-navigation > .platform-nav-link')?.href ?? null,
            docs: groups[0] ? [...groups[0].querySelectorAll('a')].map((link) => link.href) : [],
            showcases: groups[1] ? [...groups[1].querySelectorAll('a')].map((link) => link.href) : [],
            reports: groups[2] ? [...groups[2].querySelectorAll('a')].map((link) => link.href) : []
          };
        });

        expect(links.home, `${surface} Home URL`).toBe(expected.home);
        expect(links.docs.length, `${surface} Docs menu`).toBeGreaterThan(0);
        expect(links.docs.every((href) => href.startsWith(expected.docsPrefix)), `${surface} Docs URLs`).toBe(true);
        expect(new Set(links.docs.map((href) => new URL(href).origin)), `${surface} Docs origins`).toEqual(new Set([expected.docsOrigin]));
        expect(links.showcases, `${surface} Showcase URLs`).toEqual(expected.showcases);
        expect(links.reports, `${surface} Reports URLs`).toEqual(expected.reports);
      });
    }

    await test.step('Portal content links', async () => {
      await page.goto(`${baseUrls.portal}/`);
      const documentationLinks = await page.locator('[data-vre-url-base="docs"]').evaluateAll(
        (links) => links.map((link) => (link as HTMLAnchorElement).href)
      );
      expect(documentationLinks).toEqual([
        `${baseUrls.docs}/docs/overview`,
        `${baseUrls.docs}/docs/core-package`,
        `${baseUrls.docs}/docs/angular`,
        `${baseUrls.docs}/docs/react-overview`
      ]);
    });
  });
});
