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
    shell: '.een-setting.ds-screen',
    gutterTarget: '.een-setting .ds-screen__card',
    footer: '.een-setting .ds-screen__footer',
    // BaseScreen owns the footer: it spans the viewport like every BaseScreen page.
    baseScreen: true,
    alignedControls: [],
    heading: 'EEN 설정',
  },
  {
    name: 'een-delete',
    route:
      '/een-delete?lotId=LOT-260927-001&eenId=EEN-0001&tagComment=Designer%20Review%20and%20approve%20before%20production&actionPoint=MOVEIN&factoryName=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&tagId=TAG-001&poDesc=PHOTO-EXPOSURE-DESC',
    shell: '.een-delete.ds-screen',
    gutterTarget: '.een-delete__card',
    footer: '.een-delete .ds-screen__footer',
    // BaseScreen owns the footer: it spans the viewport like every BaseScreen page.
    baseScreen: true,
    alignedControls: [],
    heading: 'EEN 삭제',
  },
  {
    name: 'een-modify',
    route:
      '/een-modify?lotId=LOT-260927-001&eenId=EEN-0001&tagComment=Designer%20Review%20and%20approve%20before%20production&actionPoint=MOVEIN&factoryName=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&tagId=TAG-001&poDesc=PHOTO-EXPOSURE-DESC',
    shell: '.een-modify.ds-screen',
    gutterTarget: '.een-modify__card',
    footer: '.een-modify .ds-screen__footer',
    // BaseScreen owns the footer: it spans the viewport like every BaseScreen page.
    baseScreen: true,
    alignedControls: [],
    heading: 'EEN 수정',
  },
  {
    name: 'remote-cvd',
    route: '/remote-cvd?mock=1',
    shell: '.remote-cvd.ds-screen',
    gutterTarget: '.remote-cvd .ds-screen__card',
    footer: '.remote-cvd .ds-screen__footer',
    // BaseScreen owns the footer: it spans the viewport like every BaseScreen page.
    baseScreen: true,
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
        field: '.remote-cvd__comment-count > .remote-cvd__field',
        control: '.remote-cvd__comment-count .q-field__control',
        action: '.remote-cvd__comment-read',
      },
    ],
    heading: 'Remote Start',
  },
  {
    name: 'remote-furnace-kj',
    route: '/remote-furnace-kj',
    shell: '.remote-furnace-kj.ds-screen',
    gutterTarget: '.remote-furnace-kj .ds-screen__card',
    footer: '.remote-furnace-kj .ds-screen__footer',
    // BaseScreen owns the footer: it spans the viewport like every BaseScreen page.
    baseScreen: true,
    alignedControls: [
      {
        field: '.remote-furnace-kj__port',
        control: '.remote-furnace-kj__port .q-field__control',
        action: '.remote-furnace-kj-reset',
      },
    ],
    heading: 'KJ Furnace 자동화',
  },
];

test('fits Remote CVD in the Figma 3868:21489 frame and scrolls only the LOT detail card', async ({
  page,
}) => {
  for (const width of [350, 360, 1280]) {
    await page.setViewportSize({ width, height: 720 });
    await page.goto('/#/remote-cvd?mock=1');
    await expect(page.getByRole('heading', { name: 'Remote Start', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(720);
    // Only the LOT detail card scrolls; the BaseScreen content itself has no overflow.
    const content = page.locator('.remote-cvd .ds-screen__content');
    expect(
      await content.evaluate((element) => element.scrollHeight - element.clientHeight),
    ).toBeLessThanOrEqual(0);

    const cards = page.locator('.remote-cvd .ds-screen__card');
    await expect(cards).toHaveCount(3);
    for (const card of await cards.all()) {
      const bounds = (await card.boundingBox())!;
      expect(bounds.x).toBe(12);
      expect(width - bounds.x - bounds.width).toBe(12);
    }
    // 36px header, 44px footer with 36px buttons (Figma 3868:21521).
    const header = (await page.locator('.remote-cvd .ds-screen__header').boundingBox())!;
    expect(header.height).toBe(36);
    const start = (await page.getByRole('button', { name: 'START', exact: true }).boundingBox())!;
    expect(start.height).toBe(36);
    expect(start.y + start.height).toBe(716);

    // PORT, 초기화 and DOOR OPEN share one 32px row.
    const port = (await page.locator('.remote-cvd__port-select .q-field__control').boundingBox())!;
    for (const name of ['초기화', 'DOOR OPEN']) {
      const button = (await page.getByRole('button', { name }).boundingBox())!;
      expect(button.height).toBe(32);
      expect(Math.abs(button.y - port.y)).toBeLessThanOrEqual(1);
    }

    // GOOD CHIPS (Android only) is reached by scrolling the LOT detail card.
    const detail = page.getByRole('region', { name: 'LOT 상세 정보' });
    await detail.hover();
    await page.mouse.wheel(0, 1000);
    await expect.poll(() => detail.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(page.getByText('GOOD CHIPS', { exact: true })).toBeInViewport();
    await expect(page.locator('#remote-cvd-q-time')).toBeInViewport();
  }
});

test('keeps Android-empty KJ and EEN Modify fields blank instead of showing Null', async ({
  page,
}) => {
  await page.setViewportSize({ width: 350, height: 992 });
  await page.goto('/#/remote-furnace-kj?mockCase=no-lot');
  await expect(page.getByRole('heading', { name: 'KJ Furnace 자동화' })).toBeVisible();
  const kjForm = page.getByRole('region', { name: 'Furnace LOT 정보' });
  await expect(kjForm).not.toContainText('Null');
  await expect(page.locator('#remote-furnace-kj-lot')).toHaveAttribute('placeholder', 'LOT No');
  await expect(page.locator('#remote-furnace-kj-batch')).toHaveAttribute('placeholder', 'BAT ID');
  await expect(page.locator('#remote-furnace-kj-recipe')).toHaveValue('');
  await expect(page.locator('#remote-furnace-kj-standard-machine')).toHaveValue('');
  await expect(page.locator('#remote-furnace-kj-equipment')).toHaveValue('');
  await expect(page.locator('#remote-furnace-kj-recipe')).toHaveJSProperty('placeholder', '');
  await expect(page.locator('#remote-furnace-kj-standard-machine')).toHaveJSProperty(
    'placeholder',
    '',
  );
  await expect(page.locator('#remote-furnace-kj-equipment')).toHaveJSProperty('placeholder', '');
  await expect(page.getByRole('combobox', { name: '진행 Rcp' })).toHaveJSProperty(
    'placeholder',
    '',
  );
  await expect(page.getByRole('combobox', { name: 'PORT' })).toHaveJSProperty('placeholder', '');

  await page.goto('/#/remote-furnace-kj?lotId=LOT-KJ-001&mockCase=external-machine');
  await page.reload();
  const externalMachineInput = page.locator('.remote-furnace-kj__machine-row input').nth(1);
  await expect(externalMachineInput).toBeVisible();
  await expect(externalMachineInput).toHaveValue('KJ-EXT-01');
  await expect
    .poll(() =>
      externalMachineInput.evaluate((element) => (element as HTMLInputElement).placeholder),
    )
    .toBe('');

  await page.goto('/#' + screens[2]!.route);
  await expect(page.getByRole('heading', { name: 'EEN 수정' })).toBeVisible();
  const eenDropdowns = page.locator('.een-modify .ds-dropdown-list input.q-select__focus-target');
  await expect(eenDropdowns).toHaveCount(2);
  await expect
    .poll(() =>
      eenDropdowns.evaluateAll((elements) =>
        elements.map((element) => (element as HTMLInputElement).placeholder),
      ),
    )
    .toEqual(['', '']);
});
test('stacks EEN Setting summary fields in one 32px column like Figma 3552:39095', async ({
  page,
}) => {
  for (const width of [350, 360, 1280]) {
    await page.setViewportSize({ width, height: 720 });
    await page.goto(`/#${screens[0]!.route}`, { waitUntil: 'domcontentloaded' });
    const summary = page.getByRole('region', { name: 'LOT 정보', exact: true });
    await expect(summary).toBeVisible();

    const control = async (field: string) => {
      const value = summary.locator(`[data-field="${field}"] .q-field__control`);
      await expect(value).toBeVisible();
      await expect(value).toHaveCSS('border-radius', '4px');
      return (await value.boundingBox())!;
    };
    const labelled = await Promise.all(['lotId', 'route', 'operation', 'product'].map(control));
    const processStep = await control('processStep');

    for (const [index, bounds] of labelled.entries()) {
      expect(bounds.height).toBe(32);
      expect(bounds.x).toBe(labelled[0]!.x);
      expect(bounds.width).toBe(labelled[0]!.width);
      if (index > 0) expect(bounds.y).toBeGreaterThan(labelled[index - 1]!.y);
    }
    // The caption-less process description spans the whole row.
    expect(processStep.height).toBe(32);
    expect(processStep.x).toBeLessThan(labelled[0]!.x);
    expect(processStep.x + processStep.width).toBe(labelled[0]!.x + labelled[0]!.width);
  }
});

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
        const header = await page.locator('.remote-furnace-kj .ds-screen__header').boundingBox();
        const title = await page.locator('.remote-furnace-kj .ds-screen__header h1').boundingBox();
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
      expect(layout!.actionWidths.length).toBeGreaterThan(0);
      if (!('baseScreen' in screen)) {
        expect(layout!.footerWidth).toBeLessThanOrEqual(360);
        expect(Math.max(...layout!.actionWidths)).toBeLessThanOrEqual(164);
      }
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
    '/#/een-delete?lotId=LOT-260927-001&eenId=EEN-0001&tagComment=Designer%20Review%20and%20approve%20before%20production&actionPoint=MOVEIN&factoryName=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&tagId=TAG-001&poDesc=PHOTO-EXPOSURE-DESC',
  );
  await expect(page.getByRole('heading', { name: 'EEN 삭제' })).toBeVisible();

  const textareaBounds = await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('.een-delete__card');
    const controls = [...document.querySelectorAll<HTMLElement>('.een-delete__card textarea')].map(
      (textarea) => textarea.closest<HTMLElement>('.q-field__control')!,
    );
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
    expect(control.bottom).toBeLessThanOrEqual(textareaBounds!.cardBottom - 8);
  }
});

// Figma 3868:21489: COMMENT [count] 개 [읽기] hug their content 8px apart, Q fills the rest of the
// row and RCP 조건 spans the card on its own row.
test('lays out the comment row as count, unit and read action, with Q filling the rest', async ({
  page,
}) => {
  for (const width of [350, 360, 1280]) {
    await page.setViewportSize({ width, height: 720 });
    await page.goto('/#/remote-cvd?LOTID=CVD-MOCK-001&mock=1');
    await expect(page.locator('#remote-cvd-comment-count')).toHaveValue('2');
    const row = page.locator('.remote-cvd__comment-count');
    const control = (await row.locator('.q-field__control').boundingBox())!;
    const unit = (await row.getByText('개', { exact: true }).boundingBox())!;
    const button = (await row.getByRole('button', { name: '읽기' }).boundingBox())!;
    const q = (await page.locator('.remote-cvd__q-time').boundingBox())!;
    const card = (await page.getByRole('region', { name: 'COMMENT 정보' }).boundingBox())!;

    expect(control.width).toBe(33);
    expect(unit.x - (control.x + control.width)).toBeCloseTo(8, 0);
    expect(button.x - (unit.x + unit.width)).toBeCloseTo(8, 0);
    expect(Math.abs(control.y - button.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(control.height - button.height)).toBeLessThanOrEqual(1);
    expect(q.x - (button.x + button.width)).toBeCloseTo(8, 0);
    // Q ends at the card's 12px content inset; the 1px border sits inside it.
    expect(card.x + card.width - (q.x + q.width)).toBeCloseTo(12, 0);
  }
});

test('fits Remote Furnace KJ in the Figma 3911:23764 frame with the batch card filling the rest', async ({
  page,
}) => {
  for (const width of [350, 360, 432, 1280]) {
    await page.setViewportSize({ width, height: 696 });
    await page.goto('/#/remote-furnace-kj?mockCase=no-lot');
    await expect(page.getByRole('heading', { name: 'KJ Furnace 자동화' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(696);

    const form = (await page.getByRole('region', { name: 'Furnace LOT 정보' }).boundingBox())!;
    expect(form.y).toBe(40);
    // 32px rows, 8px gaps and 8px padding with the 1px stroke inside it. LOT and Batch keep their
    // own rows at every width, as in Figma 432 (7790:82096): seven rows.
    expect(form.height).toBe(288);
    const batch = (await page.getByRole('region', { name: 'Batch LOT 목록' }).boundingBox())!;
    expect(batch.y).toBe(form.y + form.height + 8);
    const footerButton = (await page.getByRole('button', { name: '취소' }).boundingBox())!;
    // Figma: the 4px content inset plus the 4px footer inset.
    expect(batch.y + batch.height).toBe(footerButton.y - 8);
    await expect(page.getByRole('region', { name: 'Batch LOT 목록' })).toContainText('EMPTY');
  }
});

test('matches the Remote CVD and KJ Figma frames at 432 by 864', async ({ page }) => {
  const box = async (selector: string) => {
    const bounds = (await page.locator(selector).first().boundingBox())!;
    return [bounds.x, bounds.y, bounds.width, bounds.height].map(Math.round);
  };
  await page.setViewportSize({ width: 432, height: 864 });

  // Figma 7790:82034. The chamber row and RCP 조건 follow the Android data, so only the cards
  // and columns that do not depend on them are checked.
  await page.goto('/#/remote-cvd?LOTID=CVD-MOCK-001&mock=1');
  await expect(page.locator('#remote-cvd-comment-count')).toHaveValue('2');
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(864);
  expect(await box('.remote-cvd__lot-info')).toEqual([12, 40, 408, 208]);
  expect((await box('.remote-cvd__lot-card'))[1]).toBe(256);
  for (const id of ['#remote-cvd-standard-equipment', '#remote-cvd-equipment']) {
    const control = page
      .locator('.ds-field', { has: page.locator(id) })
      .locator('.q-field__control');
    expect(Math.round((await control.boundingBox())!.x)).toBe(93);
  }
  // PORT hugs its label: the control starts about 60px in, as in Figma.
  const port = (await box('.remote-cvd__port-select .q-field__control'))[0];
  expect(Math.abs(port - 60)).toBeLessThanOrEqual(2);
  // An empty chamber row leaves no gap: JOB CODE is the first row of the detail card.
  const jobCode = page.getByRole('textbox', { name: 'JOB CODE' });
  expect(Math.round((await jobCode.boundingBox())!.y)).toBeLessThanOrEqual(272);
  expect(await box('.remote-cvd .ds-screen__footer .ds-btn')).toEqual([12, 824, 131, 36]);

  // Figma 7790:82096: LOT and Batch on their own rows.
  await page.goto('/#/remote-furnace-kj?lotId=LOT-KJ-001');
  await expect(page.getByRole('heading', { name: 'KJ Furnace 자동화' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(864);
  expect(await box('.remote-furnace-kj__lot-card')).toEqual([12, 40, 408, 288]);
  expect(await box('.remote-furnace-kj__batch')).toEqual([12, 336, 408, 480]);
  for (const [id, y] of [
    ['#remote-furnace-kj-lot', 48],
    ['#remote-furnace-kj-batch', 88],
  ] as const) {
    const control = page
      .locator('.ds-field', { has: page.locator(id) })
      .locator('.q-field__control');
    expect((await control.boundingBox())!).toMatchObject({ x: 93, y, width: 319 });
  }
});

test('keeps EEN footer button labels centered at their design size', async ({ page }) => {
  const cases: {
    route: string;
    viewport: { width: number; height: number };
    selector: string;
    count: number;
    backgrounds?: string[];
  }[] = [
    {
      route:
        '/een-setting?lotId=LOT-260927-001&factoryName=GUMI&facility=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&processStep=PHOTO-EXPOSURE',
      viewport: { width: 360, height: 720 },
      selector: '.een-setting-action',
      count: 4,
      backgrounds: [
        'rgb(2, 176, 165)',
        'rgb(255, 255, 255)',
        'rgb(255, 255, 255)',
        'rgb(255, 255, 255)',
      ],
    },
    {
      route:
        '/een-modify?lotId=LOT-260927-001&eenId=EEN-0001&tagComment=Designer%20Review%20and%20approve%20before%20production&actionPoint=MOVEIN&factoryName=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&tagId=TAG-001&poDesc=PHOTO-EXPOSURE-DESC',
      viewport: { width: 360, height: 720 },
      selector: '.een-modify .ds-screen__actions .ds-btn',
      count: 2,
    },
    {
      route:
        '/een-modify?lotId=LOT-260927-001&eenId=EEN-0001&tagComment=Designer%20Review%20and%20approve%20before%20production&actionPoint=MOVEIN&factoryName=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&tagId=TAG-001&poDesc=PHOTO-EXPOSURE-DESC',
      viewport: { width: 350, height: 720 },
      selector: '.een-modify .ds-screen__actions .ds-btn',
      count: 2,
    },
    {
      route:
        '/een-delete?lotId=LOT-260927-001&eenId=EEN-0001&tagComment=Designer%20Review%20and%20approve%20before%20production&actionPoint=MOVEIN&factoryName=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&tagId=TAG-001&poDesc=PHOTO-EXPOSURE-DESC',
      viewport: { width: 360, height: 720 },
      selector: '.een-delete .ds-screen__actions .ds-btn',
      count: 2,
      backgrounds: ['rgb(2, 176, 165)', 'rgb(255, 255, 255)'],
    },
    {
      route:
        '/een-delete?lotId=LOT-260927-001&eenId=EEN-0001&tagComment=Designer%20Review%20and%20approve%20before%20production&actionPoint=MOVEIN&factoryName=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&tagId=TAG-001&poDesc=PHOTO-EXPOSURE-DESC',
      viewport: { width: 482, height: 896 },
      selector: '.een-delete .ds-screen__actions .ds-btn',
      count: 2,
      backgrounds: ['rgb(2, 176, 165)', 'rgb(255, 255, 255)'],
    },
  ];

  for (const screen of cases) {
    await page.setViewportSize(screen.viewport);
    await page.goto(`/#${screen.route}`);
    const buttons = page.locator(screen.selector);
    await expect(buttons).toHaveCount(screen.count);

    for (const [index, button] of (await buttons.all()).entries()) {
      await expect(button).toHaveCSS('border-radius', '4px');
      const expectedBackground = screen.backgrounds?.[index];
      if (expectedBackground)
        await expect(button).toHaveCSS('background-color', expectedBackground);
      const geometry = await button.evaluate((element) => {
        const buttonBounds = element.getBoundingClientRect();
        const label = element.querySelector<HTMLElement>('.ds-btn__label');
        if (!label) return null;

        const labelBounds = label.getBoundingClientRect();
        return {
          buttonHeight: buttonBounds.height,
          horizontalCenterDifference: Math.abs(
            buttonBounds.left + buttonBounds.width / 2 - (labelBounds.left + labelBounds.width / 2),
          ),
          verticalCenterDifference: Math.abs(
            buttonBounds.top + buttonBounds.height / 2 - (labelBounds.top + labelBounds.height / 2),
          ),
        };
      });

      expect(geometry).not.toBeNull();
      // Figma footer: 36px medium buttons inside the 44px BaseScreen footer.
      expect(geometry!.buttonHeight).toBe(36);
      expect(geometry!.horizontalCenterDifference).toBeLessThanOrEqual(1);
      expect(geometry!.verticalCenterDifference).toBeLessThanOrEqual(1);
    }
  }
});

test('uses the shared BaseButton keyboard focus indicator on EEN actions', async ({ page }) => {
  const cases = [
    {
      route:
        '/een-setting?lotId=LOT-260927-001&factoryName=GUMI&facility=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&processStep=PHOTO-EXPOSURE',
      selector: '.een-setting-action',
    },
    {
      route:
        '/een-delete?lotId=LOT-260927-001&eenId=EEN-0001&tagComment=Designer%20Review%20and%20approve%20before%20production&actionPoint=MOVEIN&factoryName=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&tagId=TAG-001&poDesc=PHOTO-EXPOSURE-DESC',
      selector: '.een-delete .ds-screen__actions .ds-btn',
    },
  ];

  for (const screen of cases) {
    await page.goto(`/#${screen.route}`);
    const actions = page.locator(screen.selector);
    await actions.first().focus();
    await page.keyboard.press('Tab');
    await expect(actions.nth(1)).toBeFocused();
    const focusState = await actions.nth(1).evaluate((element) => ({
      isFocusVisible: element.matches(':focus-visible'),
      indicator: getComputedStyle(element, '::before').boxShadow,
    }));
    expect(focusState.isFocusVisible).toBe(true);
    expect(focusState.indicator).not.toBe('none');
  }
});

test('preserves legacy Android labels and hints on migrated screens', async ({ page }) => {
  await page.goto(
    '/#/een-modify?lotId=LOT-260927-001&eenId=EEN-0001&tagComment=Designer%20Review%20and%20approve%20before%20production&actionPoint=MOVEIN&factoryName=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&tagId=TAG-001&poDesc=PHOTO-EXPOSURE-DESC',
  );
  await expect(page.locator('textarea[aria-label="Tag Comment"]')).toHaveAttribute(
    'placeholder',
    'Tag Comment',
  );

  await page.goto('/#/remote-cvd?mock=1');
  await expect(page.getByText('진행 Rcp', { exact: true })).toBeVisible();
  await expect(page.getByText('Q :', { exact: true })).toBeVisible();

  await page.goto('/#/remote-furnace-kj');
  await expect(page.locator('#remote-furnace-kj-lot')).toHaveAttribute('placeholder', 'LOT No');
  await expect(page.getByLabel('Batch', { exact: true })).toHaveAttribute('placeholder', 'BAT ID');
  await expect(page.getByText('진행 Rcp', { exact: true })).toBeVisible();
});
