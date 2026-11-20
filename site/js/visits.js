// Visit counter: one GoatCounter pixel per page load (no GoatCounter script, no cookies). The owner's
// device, recognised by the stored ratings configuration, is not counted. Nothing here may break the page.
import { loadConfig } from './feedback.js';

const COUNT_URL = 'https://api-prasa.goatcounter.com/count';

export function countVisit(storage, makeImage = () => new Image(), random = Math.random) {
  try {
    if (storage && loadConfig(storage)) return false;
    const img = makeImage();
    img.src = `${COUNT_URL}?p=%2F&rnd=${Math.floor(random() * 1e9)}`;
    return true;
  } catch {
    return false;
  }
}
