'use strict';

const assert = require('node:assert/strict');

const VIEWPORT_WIDTHS = Object.freeze([320, 390, 768, 1024, 1440]);

// Playwright's visibility check permits opacity:0. Inspect the whole ancestor
// chain so disabled page JavaScript cannot leave essential SSR content hidden.
async function assertOpaque(locator, name) {
  assert.equal(await locator.count(), 1, `${name}: expected one essential element.`);
  const result = await locator.evaluate(element => {
    let opacity = 1;
    const hidden = [];
    for (let parent = element; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (style.display === 'none' || ['hidden', 'collapse'].includes(style.visibility)
        || style.contentVisibility === 'hidden') hidden.push(parent.tagName.toLowerCase());
      opacity *= Number(style.opacity);
    }
    const rect = element.getBoundingClientRect();
    return { opacity, hidden, width: rect.width, height: rect.height };
  });
  assert.deepEqual(result.hidden, [], `${name}: an ancestor hides essential content.`);
  assert.ok(Number.isFinite(result.opacity) && result.opacity >= 0.9,
    `${name}: effective opacity ${result.opacity} must be at least 0.9.`);
  assert.ok(result.width > 0 && result.height > 0, `${name}: essential content has no painted box.`);
  return result;
}

async function assertNoHorizontalOverflow(page, label) {
  const sizes = await page.evaluate(() => ({
    viewport: innerWidth,
    content: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0),
  }));
  assert.ok(sizes.content <= sizes.viewport + 1,
    `${label}: ${sizes.content}px content exceeds ${sizes.viewport}px viewport.`);
}

function monetaryAmount(text) {
  const digits = text.replace(/[^\d.,]/g, '').replace(/[.,]\d{2}$/, '').replace(/\D/g, '');
  assert.ok(digits, 'Expected a rendered monetary amount.');
  return Number(digits);
}

async function setRangeWithKeyboard(input, target) {
  const min = Number(await input.getAttribute('min'));
  const max = Number(await input.getAttribute('max'));
  const step = Number(await input.getAttribute('step'));
  assert.ok(Number.isFinite(target) && target >= min && target <= max && step > 0);
  const fromMinimum = target - min <= max - target;
  const presses = (fromMinimum ? target - min : max - target) / step;
  assert.ok(Number.isInteger(presses), 'Keyboard target must respect the declared range step.');
  await input.focus();
  assert.equal(await input.evaluate(element => element === document.activeElement), true);
  await input.press(fromMinimum ? 'Home' : 'End');
  for (let index = 0; index < presses; index += 1) {
    await input.press(fromMinimum ? 'ArrowRight' : 'ArrowLeft');
  }
  assert.equal(await input.inputValue(), String(target));
}

async function installAmountFeedbackProbe(context, selector) {
  await context.addInitScript(({ selector }) => {
    window.__landingAmountAnimations = [];
    const nativeAnimate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const animation = nativeAnimate.call(this, frames, options);
      if (this.matches(selector)) {
        window.__landingAmountAnimations.push({
          duration: typeof options === 'number' ? options : options?.duration,
          frames,
          state: animation.playState,
          focusedId: document.activeElement?.id || null,
        });
      }
      return animation; // Observe the real animation; do not replace or finish it.
    };
  }, { selector });
}

async function assertAmountFeedback(page, { outputSelector, inputSelector, nextValue, nextAmount }) {
  const output = page.locator(outputSelector);
  const input = page.locator(inputSelector);
  assert.equal(await output.count(), 1);
  assert.equal(await page.evaluate(() => window.__landingAmountAnimations.length), 0,
    'Amount feedback must not run on mount.');
  assert.equal(await output.evaluate(element => element.getAnimations().length), 0);
  const before = monetaryAmount(await output.innerText());
  await input.focus();
  await input.press('ArrowRight');
  assert.equal(await input.inputValue(), String(nextValue));
  assert.equal(monetaryAmount(await output.innerText()), nextAmount);
  assert.notEqual(nextAmount, before);
  await page.waitForFunction(() => window.__landingAmountAnimations.length > 0);
  const calls = await page.evaluate(() => window.__landingAmountAnimations);
  assert.equal(calls.length, 1, 'One changed amount should trigger one feedback animation.');
  assert.equal(calls[0].duration, 180);
  assert.equal(calls[0].state, 'running');
  assert.equal(calls[0].focusedId, await input.getAttribute('id'));
  assert.ok(Array.isArray(calls[0].frames) && calls[0].frames.length >= 2);
  assert.match(calls[0].frames[0].transform, /translateY\(3px\)/);
  assert.match(calls[0].frames.at(-1).transform, /translateY\(0(?:px)?\)/);
  assert.ok(calls[0].frames.every(frame => frame.opacity == null || Number(frame.opacity) >= 0.9),
    'Amount feedback must preserve readable opacity.');
  await page.waitForFunction(selector => document.querySelector(selector).getAnimations()
    .every(animation => animation.playState !== 'running'), outputSelector);
  assert.equal(await input.evaluate(element => element === document.activeElement), true,
    'Feedback must not move keyboard focus.');
  await assertOpaque(output, 'Completed amount feedback');
}

module.exports = { VIEWPORT_WIDTHS, assertOpaque, assertNoHorizontalOverflow,
  monetaryAmount, setRangeWithKeyboard, installAmountFeedbackProbe, assertAmountFeedback };
