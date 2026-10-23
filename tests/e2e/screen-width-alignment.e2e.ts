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

test('keeps Remote CVD cards and footer at equal horizontal gutters while scrolling', async ({
  page,
}) => {
  for (const width of [350, 360, 1280]) {
    await page.setViewportSize({ width, height: 872 });
    await page.goto('/#/remote-cvd?mock=1');
    await expect(page.getByRole('heading', { name: 'Remote Start', exact: true })).toBeVisible();
    const cards = page.locator('.remote-cvd__card');
    for (const card of await cards.all()) {
      const bounds = (await card.boundingBox())!;
      expect(bounds.x).toBe(12);
      expect(width - bounds.x - bounds.width).toBe(12);
    }
    const actions = page.locator('.remote-cvd__footer button');
    const first = (await actions.first().boundingBox())!;
    const last = (await actions.last().boundingBox())!;
    expect(Math.abs(first.x - (width - last.x - last.width))).toBeLessThan(0.5);
    expect(first.x).toBeGreaterThanOrEqual(12);
    const content = page.locator('.remote-cvd__content');
    await content.hover();
    await page.mouse.wheel(0, 1000);
    await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await content.evaluate((element) => {
      element.scrollTop = 0;
    });
    await content.locator('input').first().focus();
    await page.keyboard.press('PageDown');
    await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  }
});

test('keeps Android-empty KJ and EEN Modify fields blank instead of showing Null', async ({
  page,
}) => {
  await page.setViewportSize({ width: 350, height: 992 });
  await page.goto('/#/remote-furnace-kj?mockCase=no-lot');
  await expect(page.getByRole('heading', { name: 'KJ Furnace 자동화' })).toBeVisible();
  const kjForm = page.locator('.remote-furnace-kj-form');
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
  const externalMachineInput = page.locator('.remote-furnace-kj-machine-row input').nth(1);
  await expect(externalMachineInput).toBeVisible();
  await expect(externalMachineInput).toHaveValue('KJ-EXT-01');
  await expect
    .poll(() =>
      externalMachineInput.evaluate((element) => (element as HTMLInputElement).placeholder),
    )
    .toBe('');

  await page.goto('/#' + screens[2]!.route);
  await expect(page.getByRole('heading', { name: 'EEN 수정' })).toBeVisible();
  const eenDropdowns = page.locator('.een-modify-select-wrap input.q-select__focus-target');
  await expect(eenDropdowns).toHaveCount(2);
  await expect
    .poll(() =>
      eenDropdowns.evaluateAll((elements) =>
        elements.map((element) => (element as HTMLInputElement).placeholder),
      ),
    )
    .toEqual(['', '']);
});
test('aligns EEN Setting summary fields and matches the field radius in both columns', async ({
  page,
}) => {
  for (const width of [350, 360, 1280]) {
    await page.setViewportSize({ width, height: 872 });
    await page.goto(`/#${screens[0]!.route}`, { waitUntil: 'domcontentloaded' });
    const summary = page.getByRole('region', { name: 'LOT 정보', exact: true });
    await expect(summary).toBeVisible();

    const bounds = async (field: string) => {
      const value = summary.locator(`[data-field="${field}"]`);
      await expect(value).toBeVisible();
      return (await value.boundingBox())!;
    };
    const lot = await bounds('lotId');
    const route = await bounds('route');
    const operation = await bounds('operation');
    const processStep = await bounds('processStep');
    await expect(summary.locator('[data-field="lotId"]')).toHaveCSS('border-radius', '4px');
    await expect(summary.locator('[data-field="processStep"]')).toHaveCSS('border-radius', '4px');

    for (const [left, right] of [
      [lot, route],
      [operation, processStep],
    ] as const) {
      expect(Math.abs(left.y - right.y)).toBeLessThan(0.5);
      expect(Math.abs(left.y + left.height - right.y - right.height)).toBeLessThan(0.5);
      expect(left.height).toBe(40);
      expect(right.height).toBe(40);
    }
    expect(operation.x).toBe(lot.x);
    expect(operation.width).toBe(lot.width);
    expect(processStep.x).toBe(route.x);
    expect(processStep.width).toBe(route.width);
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

test('keeps the Remote CVD legacy-only field and Q field above the footer at the design viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 350, height: 1572 });
  await page.goto('/#/remote-cvd?mock=1');

  await expect(page.getByText('GOOD CHIPS', { exact: true })).toBeVisible();
  await expect(page.getByText('Q :', { exact: true })).toBeVisible();
  await expect(page.locator('#remote-cvd-q-time')).toBeVisible();

  const layout = await page.evaluate(() => {
    const qInput = document.querySelector<HTMLElement>('#remote-cvd-q-time');
    const control = qInput?.closest('.ds-input')?.querySelector<HTMLElement>('.q-field__control');
    const goodChipsLabel = [
      ...document.querySelectorAll('.remote-cvd__lot-card .ds-field__label'),
    ].find((label) => label.textContent?.trim() === 'GOOD CHIPS');
    const goodChipsControl = goodChipsLabel
      ?.closest('.ds-field')
      ?.querySelector<HTMLElement>('.q-field__control');
    const footer = document.querySelector<HTMLElement>('.remote-cvd__footer');
    if (!control || !goodChipsControl || !footer) return null;
    const controlBounds = control.getBoundingClientRect();
    const goodChipsBounds = goodChipsControl.getBoundingClientRect();
    const footerBounds = footer.getBoundingClientRect();
    return {
      controlTop: controlBounds.top,
      controlBottom: controlBounds.bottom,
      goodChipsBottom: goodChipsBounds.bottom,
      footerTop: footerBounds.top,
    };
  });

  expect(layout).not.toBeNull();
  expect(layout!.controlTop).toBeGreaterThanOrEqual(60);
  expect(layout!.controlBottom).toBeLessThan(layout!.footerTop);
  expect(layout!.goodChipsBottom).toBeLessThan(layout!.footerTop);

  await page.screenshot({
    path: join(evidenceRoot, 'remote-cvd-bottom-scroll-350x1572.png'),
  });
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
      viewport: { width: 360, height: 872 },
      selector: '.een-setting-action',
      count: 4,
      backgrounds: [
        'rgb(2, 176, 165)',
        'rgba(0, 0, 0, 0)',
        'rgba(0, 0, 0, 0)',
        'rgb(255, 255, 255)',
      ],
    },
    {
      route:
        '/een-modify?itemId=een-photo-exposure&lotId=LOT-260927-001&factoryName=GUMI&facility=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&processStep=PHOTO-EXPOSURE',
      viewport: { width: 360, height: 992 },
      selector: '.een-modify-action',
      count: 2,
    },
    {
      route:
        '/een-modify?itemId=een-photo-exposure&lotId=LOT-260927-001&factoryName=GUMI&facility=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&processStep=PHOTO-EXPOSURE',
      viewport: { width: 350, height: 992 },
      selector: '.een-modify-action',
      count: 2,
    },
    {
      route:
        '/een-delete?itemId=een-photo-exposure&lotId=LOT-260927-001&factoryName=GUMI&facility=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&eenId=EEN-0001&tagId=TAG-001',
      viewport: { width: 360, height: 992 },
      selector: '.een-delete-action',
      count: 2,
      backgrounds: ['rgb(2, 176, 165)', 'rgb(255, 255, 255)'],
    },
    {
      route:
        '/een-delete?itemId=een-photo-exposure&lotId=LOT-260927-001&factoryName=GUMI&facility=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&eenId=EEN-0001&tagId=TAG-001',
      viewport: { width: 482, height: 896 },
      selector: '.een-delete-action',
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
      expect(geometry!.buttonHeight).toBe(44);
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
        '/een-delete?itemId=een-photo-exposure&lotId=LOT-260927-001&factoryName=GUMI&facility=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&eenId=EEN-0001&tagId=TAG-001',
      selector: '.een-delete-action',
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
    '/#/een-modify?itemId=een-photo-exposure&lotId=LOT-260927-001&factoryName=GUMI&facility=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&processStep=PHOTO-EXPOSURE',
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
