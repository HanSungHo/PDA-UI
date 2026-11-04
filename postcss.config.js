// https://github.com/michael-ciniawsky/postcss-load-config

import autoprefixer from 'autoprefixer';
// import rtlcss from 'postcss-rtlcss'
// import { Mode } from 'postcss-rtlcss/options'

/**
 * Puts Quasar's framework CSS into the lowest cascade layer.
 *
 * Quasar's .q-btn / .q-field rules have the same specificity as the .ds-* base-component rules.
 * In a production build the CSS chunks load in a different order than in dev, so Quasar could win
 * (e.g. transparent buttons, 56px dropdowns on the Android WebView). Layered styles always lose to
 * un-layered ones, so app and base CSS now beat Quasar regardless of load order.
 */
const quasarCssLayer = () => ({
  postcssPlugin: 'quasar-css-layer',
  Once(root, { AtRule }) {
    const file = (root.source?.input.file ?? '').replaceAll('\\', '/');
    if (!/\/node_modules\/quasar\/(src\/css|dist)\//.test(file)) return;

    const layer = new AtRule({ name: 'layer', params: 'quasar' });
    const hoisted = [];
    for (const node of [...root.nodes]) {
      if (node.type === 'atrule' && /^(charset|import)$/i.test(node.name)) hoisted.push(node);
      else layer.append(node);
    }
    root.removeAll();
    root.append(...hoisted, layer);
  },
});
quasarCssLayer.postcss = true;

export default {
  plugins: [
    quasarCssLayer(),
    // https://github.com/postcss/autoprefixer
    autoprefixer({
      overrideBrowserslist: [
        'last 4 Chrome versions',
        'last 4 Firefox versions',
        'last 4 Edge versions',
        'last 4 Safari versions',
        'last 4 Android versions',
        'last 4 ChromeAndroid versions',
        'last 4 FirefoxAndroid versions',
        'last 4 iOS versions',
      ],
    }),

    // https://github.com/elchininet/postcss-rtlcss
    // If you want to support RTL css, then
    // 1. yarn/pnpm/bun/npm install postcss-rtlcss
    // 2. optionally set quasar.config.js > framework > lang to an RTL language
    // 3. uncomment the following line (and its import statement above):
    // rtlcss({ mode: Mode.Override })
  ],
};
