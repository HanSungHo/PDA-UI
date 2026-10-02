import { createApp } from './app.js';

const port = Number(process.env.PORT || 8080);
const app = createApp();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`ATOP26 mock server listening on http://localhost:${port}`);
});
