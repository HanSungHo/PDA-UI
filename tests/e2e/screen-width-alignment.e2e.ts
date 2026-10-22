import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

const evidenceRoot = join(
  process.cwd(),
  'local',
  'screens',
  'screen-width-alignment',
  'evidence',
  'verification',
);
const viewports = [
  { name: 'phone', width: 350, height: 992 },
  { name: 'design-frame', width: 360, height: 992 },
  { name: 'wide', width: 1280, height: 900 },
  { name: 'desktop-review', width: 1660, height: 920 },
];
const screens = [
  {
    name: 'een-setting',
    route:
      '/een-setting?lotId=LOT-260927-001&factoryName=GUMI&facility=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&processStep=PHOTO-EXPOSURE',
    shell: '.een-setting-shell',
    gutterTarget: '.een-setting-summary',
    footer: '.een-setting-footer',
    alignedControls: [],
    heading: 'EEN 설정',
  },
  {
    name: 'een-delete',
    route:
      '/een-delete?itemId=een-photo-exposure&lotId=LOT-260927-001&factoryName=GUMI&facility=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&eenId=EEN-0001&tagId=TAG-001',
    shell: '.een-delete-shell',
    gutterTarget: '.een-delete-card',
    footer: '.een-delete-footer',
    alignedControls: [],
    heading: 'EEN 삭제',
  },
  {
    name: 'een-modify',
    route:
      '/een-modify?itemId=een-photo-exposure&lotId=LOT-260927-001&factoryName=GUMI&facility=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&processStep=PHOTO-EXPOSURE',
    shell: '.een-modify-shell',
    gutterTarget: '.een-modify-card',
    footer: '.een-modify-footer',
    alignedControls: [],
    heading: 'EEN 수정',
  },
  {
    name: 'remote-cvd',
    route: '/remote-cvd?mock=1',
    shell: '.remote-cvd',
    gutterTarget: '.remote-cvd__card',
    footer: '.remote-cvd__footer',
    alignedControls: [
      {
        field: '.remote-cvd__equipment-input',
        control: '.remote-cvd__equipment-input .q-field__control',
        action: '.remote-cvd__equipment-cancel',
      },
      {
        field: '.remote-cvd__port-select',
        control: '.remote-cvd__port-select .q-field__control',
        action: '.remote-cvd__port-clear',
      },
      {
        field: '.remote-cvd__comment-row > .remote-cvd__field',
        control: '.remote-cvd__comment-row .q-field__control',
        action: '.remote-cvd__comment-read',
      },
    ],
    heading: 'Remote Start',
  },
  {
    name: 'remote-furnace-kj',
    route: '/remote-furnace-kj',
    shell: '.remote-furnace-kj-shell',
    gutterTarget: '.remote-furnace-kj-form',
    footer: '.remote-furnace-kj-footer',
    alignedControls: [
      {
        field: '.remote-furnace-kj-port-select',
        control: '.remote-furnace-kj-port-select .q-field__control',
        action: '.remote-furnace-kj-reset',
      },
    ],
    heading: 'KJ Furnace 자동화',
  },
];

test('keeps all five screens fluid with 12px content gutters at phone and wide viewports', async ({
  page,
}) => {
  await page.route('**/hifos/gettagid', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: { TAGLIST: 'TAG-001\tDesigner Review and approve before production' },
        }),
      }),
    });
  });

  for (const screen of screens) {
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`/#${screen.route}`);
      await expect(page.getByRole('heading', { name: screen.heading })).toBeVisible();

      if (screen.name === 'remote-furnace-kj') {
        const header = await page.locator('.remote-furnace-kj-header').boundingBox();
        const title = await page.locator('.remote-furnace-kj-header h1').boundingBox();
        expect(header).not.toBeNull();
        expect(title).not.toBeNull();
        expect(
          Math.abs(header!.x + header!.width / 2 - (title!.x + title!.width / 2)),
        ).toBeLessThanOrEqual(1);
      }

      const layout = await page.evaluate(
        ({ shellSelector, targetSelector, footerSelector, alignedControls }) => {
          const shell = document.querySelector<HTMLElement>(shellSelector);
          const target = document.querySelector<HTMLElement>(targetSelector);
          const footer = document.querySelector<HTMLElement>(footerSelector);
          if (!shell || !target || !footer) return null;

          const shellBounds = shell.getBoundingClientRect();
          const targetBounds = target.getBoundingClientRect();
          const footerBounds = footer.getBoundingClientRect();
          return {
            viewportWidth: document.documentElement.clientWidth,
            shellWidth: shellBounds.width,
            targetLeft: targetBounds.left,
            targetRight: document.documentElement.clientWidth - targetBounds.right,
            targetParentPaddingLeft: Number.parseFloat(
              getComputedStyle(target.parentElement!).paddingLeft,
            ),
            targetParentPaddingRight: Number.parseFloat(
              getComputedStyle(target.parentElement!).paddingRight,
            ),
            footerLeft: footerBounds.left,
            footerRight: document.documentElement.clientWidth - footerBounds.right,
            footerWidth: footerBounds.width,
            footerCenter: footerBounds.left + footerBounds.width / 2,
            actionWidths: [...footer.querySelectorAll<HTMLElement>('button')].map(
              (button) => button.getBoundingClientRect().width,
            ),
            alignedControls: alignedControls.map(({ field, control, action }) => {
              const fieldElement = document.querySelector<HTMLElement>(field);
              const controlElement = document.querySelector<HTMLElement>(control);
              const actionElement = document.querySelector<HTMLElement>(action);
              if (!fieldElement || !controlElement || !actionElement) return null;
              const fieldBounds = fieldElement.getBoundingClientRect();
              const controlBounds = controlElement.getBoundingClientRect();
              const actionBounds = actionElement.getBoundingClientRect();
              return {
                controlWithinField:
                  controlBounds.top >= fieldBounds.top &&
                  controlBounds.bottom <= fieldBounds.bottom,
                centerDifference: Math.abs(
                  controlBounds.top +
                    controlBounds.height / 2 -
                    (actionBounds.top + actionBounds.height / 2),
                ),
              };
            }),
          };
        },
        {
          shellSelector: screen.shell,
          targetSelector: screen.gutterTarget,
          footerSelector: screen.footer,
          alignedControls: screen.alignedControls,
        },
      );

      expect(layout, `${screen.name} should render its shell and content`).not.toBeNull();
      expect(layout!.shellWidth).toBe(layout!.viewportWidth);
      expect(layout!.targetLeft).toBe(12);
      expect(layout!.targetRight).toBeGreaterThanOrEqual(12);
      expect(layout!.targetParentPaddingLeft).toBe(12);
      expect(layout!.targetParentPaddingRight).toBe(12);
      expect(layout!.footerWidth).toBeLessThanOrEqual(360);
      expect(layout!.actionWidths.length).toBeGreaterThan(0);
      expect(Math.max(...layout!.actionWidths)).toBeLessThanOrEqual(164);
      for (const alignedControl of layout!.alignedControls) {
        expect(
          alignedControl,
          `${screen.name} inline field and action should render`,
        ).not.toBeNull();
        expect(alignedControl!.controlWithinField).toBe(true);
        expect(alignedControl!.centerDifference).toBeLessThanOrEqual(1);
      }
      if (viewport.width > 360) {
        expect(Math.abs(layout!.footerCenter - viewport.width / 2)).toBeLessThanOrEqual(1);
      } else {
        expect(layout!.footerLeft).toBe(0);
        expect(layout!.footerRight).toBe(0);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        viewport.width,
      );

      mkdirSync(evidenceRoot, { recursive: true });
      await page.screenshot({
        path: join(evidenceRoot, `${screen.name}-${viewport.name}-${viewport.width}px.png`),
        fullPage: true,
      });
    }
  }
});

test('keeps both EEN Delete textareas inside the information card', async ({ page }) => {
  await page.setViewportSize({ width: 953, height: 686 });
  await page.goto(
    '/#/een-delete?itemId=een-photo-exposure&lotId=LOT-260927-001&factoryName=GUMI&facility=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&eenId=EEN-0001&tagId=TAG-001',
  );
  await expect(page.getByRole('heading', { name: 'EEN 삭제' })).toBeVisible();

  const textareaBounds = await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('.een-delete-card');
    const controls = [
      ...document.querySelectorAll<HTMLElement>('.een-delete-textarea .q-field__control'),
    ];
    if (!card || controls.length !== 2) return null;

    const cardBounds = card.getBoundingClientRect();
    return {
      cardBottom: cardBounds.bottom,
      controls: controls.map((control) => {
        const bounds = control.getBoundingClientRect();
        return { top: bounds.top, bottom: bounds.bottom, height: bounds.height };
      }),
    };
  });

  expect(textareaBounds).not.toBeNull();
  for (const control of textareaBounds!.controls) {
    expect(control.height).toBe(100);
    expect(control.bottom).toBeLessThanOrEqual(textareaBounds!.cardBottom - 12);
  }
});

test('keeps Remote CVD actions in the short viewport while its content scrolls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 350, height: 844 });
  await page.goto('/#/remote-cvd?mock=1');
  await expect(page.getByRole('heading', { name: 'Remote Start' })).toBeVisible();

  const layout = await page.evaluate(() => {
    const content = document.querySelector<HTMLElement>('.remote-cvd__content');
    const footer = document.querySelector<HTMLElement>('.remote-cvd__footer');
    if (!content || !footer) return null;
    const footerBounds = footer.getBoundingClientRect();
    return {
      contentScrolls: content.scrollHeight > content.clientHeight,
      footerBottom: footerBounds.bottom,
    };
  });

  expect(layout).not.toBeNull();
  expect(layout!.contentScrolls).toBe(true);
  expect(layout!.footerBottom).toBeLessThanOrEqual(844);
});

test('keeps the comment unit inside the input and aligns its read action', async ({ page }) => {
  for (const width of [350, 360, 1280]) {
    await page.setViewportSize({ width, height: 1572 });
    await page.goto('/#/remote-cvd?mock=1');
    const input = page.locator('#remote-cvd-comment-count');
    await expect(input).toHaveValue(/개$/);
    const row = page.locator('.remote-cvd__comment-row');
    const control = await row.locator('.q-field__control').boundingBox();
    const button = await row.getByRole('button', { name: '읽기' }).boundingBox();
    expect(control).not.toBeNull();
    expect(button).not.toBeNull();
    expect(Math.abs(control!.y - button!.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(control!.height - button!.height)).toBeLessThanOrEqual(1);
    expect(button!.x - (control!.x + control!.width)).toBeCloseTo(8, 0);
  }
});

test('matches Figma typography on all five aligned screens', async ({ page }) => {
  const typographyCases = [
    {
      route:
        '/een-setting?lotId=LOT-260927-001&factoryName=GUMI&facility=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&processStep=PHOTO-EXPOSURE',
      viewport: { width: 360, height: 872 },
      checks: [
        ['.een-setting-header h1', 18, 700, 28],
        ['.een-setting-label', 14, 500, 20],
        ['.een-setting-field output', 16, 400, 24],
        ['.een-setting-action .ds-btn__label', 16, 700, 28],
      ],
    },
    {
      route:
        '/een-delete?itemId=een-photo-exposure&lotId=LOT-260927-001&factoryName=GUMI&facility=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&eenId=EEN-0001&tagId=TAG-001',
      viewport: { width: 360, height: 992 },
      checks: [
        ['.een-delete-header h1', 18, 700, 28],
        ['.een-delete-label', 14, 500, 20],
        ['.een-delete-value', 16, 400, 24],
        ['.een-delete-action .ds-btn__label', 16, 700, 28],
      ],
    },
    {
      route:
        '/een-modify?itemId=een-photo-exposure&lotId=LOT-260927-001&factoryName=GUMI&facility=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&processStep=PHOTO-EXPOSURE',
      viewport: { width: 360, height: 992 },
      checks: [
        ['.een-modify-header h1', 18, 700, 28],
        ['.een-modify-value .q-field__native', 16, 400, 24],
        ['.een-modify-action .ds-btn__label', 16, 700, 28],
      ],
    },
    {
      route: '/remote-cvd?mock=1',
      viewport: { width: 350, height: 1572 },
      checks: [
        ['.remote-cvd__header h1', 18, 700, 28],
        ['.remote-cvd__port-clear .ds-btn__label', 14, 700, 20],
        ['.remote-cvd__door-open .ds-btn__label', 14, 700, 20],
      ],
    },
    {
      route: '/remote-furnace-kj',
      viewport: { width: 350, height: 992 },
      checks: [
        ['.remote-furnace-kj-header h1', 18, 700, 28],
        ['.remote-furnace-kj-reset .ds-btn__label', 14, 700, 20],
        ['.remote-furnace-kj-action--no-batch .ds-btn__label', 16, 700, 28],
        ['.remote-furnace-kj-action .ds-btn__label', 16, 700, 28],
      ],
    },
  ] as const;

  for (const screen of typographyCases) {
    await page.setViewportSize(screen.viewport);
    await page.goto(`/#${screen.route}`);

    for (const [selector, fontSize, fontWeight, lineHeight] of screen.checks) {
      const element = page.locator(selector).first();
      await expect(element).toBeVisible();
      const style = await element.evaluate((node) => {
        const computed = getComputedStyle(node);
        return {
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          lineHeight: computed.lineHeight,
          letterSpacing:
            computed.letterSpacing === 'normal' ? 0 : Number.parseFloat(computed.letterSpacing),
        };
      });

      expect(style, `${screen.route} ${selector}`).toEqual({
        fontSize: `${fontSize}px`,
        fontWeight: String(fontWeight),
        lineHeight: `${lineHeight}px`,
        letterSpacing: 0,
      });
    }
  }
});
