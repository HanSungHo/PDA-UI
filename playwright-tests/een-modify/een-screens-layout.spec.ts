import { expect, type Page, test } from '@playwright/test';

const context =
  'lotId=LOT-DEMO-01&eenId=EEN-0001&tagComment=Designer%20Review%20and%20approve%20before%20production' +
  '&actionPoint=MOVEIN&factoryName=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200' +
  '&tagId=TAG-001&poDesc=PHOTO-EXPOSURE-DESC';

const screens = [
  {
    name: 'EEN 설정',
    route: `/een-setting?${context}&facility=GUMI&processStep=PHOTO-EXPOSURE`,
    firstField: 'LOT No.',
    // Figma 3552:39095 / 7790:81708: a 208px LOT card, then the table card down to 4px above
    // the footer.
    cards: (width: number, height: number) => [
      [12, 40, width - 24, 208],
      [12, 256, width - 24, height - 44 - 4 - 256],
    ],
  },
  {
    name: 'EEN 삭제',
    route: `/een-delete?${context}`,
    firstField: 'LOT ID',
    // Figma 3552:39440 / 7790:83244: one 544px card.
    cards: (width: number) => [[12, 40, width - 24, 544]],
  },
  {
    name: 'EEN 수정',
    route: `/een-modify?${context}`,
    firstField: 'LOT ID',
    // Figma 3558:41872 / 7790:83265: one 544px card.
    cards: (width: number) => [[12, 40, width - 24, 544]],
  },
];

async function open(page: Page, route: string): Promise<void> {
  await page.goto('/#/main');
  await expect(page.getByText('HiFOS AR-DEMO')).toBeVisible();
  await page.evaluate((hash) => (window.location.hash = hash), route);
}

test.beforeEach(async ({ page, request }) => {
  await request.post('http://127.0.0.1:8080/mock/reset');
  await page.addInitScript(() => {
    localStorage.setItem(
      'server.info',
      JSON.stringify([
        {
          selectedServer: true,
          serverName: 'DEV-SERVER',
          serverType: 'DEV_SERVER',
          serverUrl: '127.0.0.1',
        },
      ]),
    );
  });
});

for (const { width, height } of [
  { width: 360, height: 720 },
  { width: 432, height: 864 },
]) {
  for (const screen of screens) {
    test(`${screen.name} matches the ${width} by ${height} Figma frame`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await open(page, screen.route);
      await expect(page.getByRole('heading', { name: screen.name })).toBeVisible();
      await expect(page.getByRole('textbox', { name: screen.firstField })).toHaveValue(
        'LOT-DEMO-01',
      );

      const cards = await page.locator('.ds-screen__card').evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          return [box.x, box.y, box.width, box.height];
        }),
      );
      expect(cards).toEqual(screen.cards(width, height));

      // The 65px label column: every labelled control starts at 12 + 8 + 65 + 8.
      const starts = await page
        .locator('.ds-screen__card .ds-field:has(.ds-field__label) .q-field__control')
        .evaluateAll((controls) => controls.map((control) => control.getBoundingClientRect().x));
      expect(starts.length).toBeGreaterThan(0);
      expect(new Set(starts)).toEqual(new Set([93]));

      // Medium (36px) footer actions and no page scroll.
      const buttons = await page
        .locator('.ds-screen__footer .ds-btn')
        .evaluateAll((elements) =>
          elements.map((element) => Math.round(element.getBoundingClientRect().height)),
        );
      expect(new Set(buttons)).toEqual(new Set([36]));
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(height);
    });
  }
}
