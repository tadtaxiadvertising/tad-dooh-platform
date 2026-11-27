const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const ROOT = path.resolve(__dirname, '..');
const appRequire = createRequire(path.join(ROOT, 'apps/advertiser/package.json'));
const React = appRequire('react');
const { renderToStaticMarkup } = appRequire('react-dom/server');
const runtime = appRequire('react/jsx-runtime');
const framer = appRequire('framer-motion');
const ts = appRequire('typescript');
let reducedMotion = false;
let renderedElements = [];

// Keep real React SSR, Motion SSR styles and calculation sources. Only the
// motion preference, decorative icons and JSX observation are controlled here.
const icons = new Proxy({}, {
  get: () => props => React.createElement('svg', { ...props, 'aria-hidden': true }),
});
const observedRuntime = Object.fromEntries(Object.entries(runtime).map(([key, value]) => [
  key, key === 'jsx' || key === 'jsxs' ? (...args) => {
    const element = value(...args);
    renderedElements.push(element);
    return element;
  } : value,
]));
const allowedSources = new Set([
  'apps/advertiser/components/onboarding/BenefitsStep.tsx',
  'apps/advertiser/components/onboarding/SimulatorStep.tsx',
  'apps/advertiser/components/onboarding/OnboardingWizard.tsx',
  'apps/advertiser/components/onboarding/SuccessStep.tsx',
  'apps/advertiser/components/advertiser/simulatorPricing.ts',
  'packages/impact-calculator/index.ts',
  'packages/impact-calculator/sources.ts',
].map(name => path.join(ROOT, name)));
const modules = new Map();

function loadSource(filename) {
  assert.ok(allowedSources.has(filename), 'Unexpected source import: ' + filename);
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const imports = {
    react: React,
    'react/jsx-runtime': observedRuntime,
    'framer-motion': { ...framer, useReducedMotion: () => reducedMotion },
    'lucide-react': icons,
    clsx: { default: appRequire('clsx') },
  };
  const requireSafe = name => {
    if (Object.hasOwn(imports, name)) return imports[name];
    if (name === '@tad/impact-calculator') return loadSource(path.join(ROOT, 'packages/impact-calculator/index.ts'));
    if (name.startsWith('.')) {
      const base = path.resolve(path.dirname(filename), name);
      const target = [base + '.ts', base + '.tsx'].find(item => allowedSources.has(item));
      assert.ok(target, 'Unexpected relative import: ' + name);
      return loadSource(target);
    }
    throw new Error('Unexpected dependency: ' + name);
  };
  new Function('exports', 'require', 'module', compiled)(module.exports, requireSafe, module);
  return module.exports;
}

const benefits = loadSource(path.join(ROOT, 'apps/advertiser/components/onboarding/BenefitsStep.tsx')).default;
const simulator = loadSource(path.join(ROOT, 'apps/advertiser/components/onboarding/SimulatorStep.tsx')).default;
const wizard = loadSource(path.join(ROOT, 'apps/advertiser/components/onboarding/OnboardingWizard.tsx')).OnboardingWizard;
const pricing = loadSource(path.join(ROOT, 'apps/advertiser/components/advertiser/simulatorPricing.ts'));
const success = loadSource(path.join(ROOT, 'apps/advertiser/components/onboarding/SuccessStep.tsx')).default;

function text(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(text).join('');
  return text(node.props?.children);
}

function render(Component, props, reduced = false) {
  reducedMotion = reduced;
  renderedElements = [];
  const html = renderToStaticMarkup(React.createElement(Component, props));
  return {
    html,
    elements: renderedElements.slice(),
    find(tag, predicate) {
      const element = renderedElements.find(node =>
        (node.type === tag || node.type === framer.motion[tag]) && predicate(node.props));
      assert.ok(element, 'Missing rendered ' + tag);
      return element.props;
    },
  };
}

test('benefits explains planning milestones without unverified results or guaranteed attention', () => {
  let next = 0;
  const page = render(benefits, { onNext: () => next++ });
  for (const claim of ['3.4X', '500K+', '120+', 'ROI promedio', 'garantizan la atención']) {
    assert.ok(!page.html.includes(claim), 'Unsupported promise remains: ' + claim);
  }
  const steps = page.find('ol', props => props['aria-label'] === 'Pasos para planificar');
  assert.equal(React.Children.count(steps.children), 3);
  assert.ok(text(steps.children).includes('revisión'), 'Planning must end in review, not a guaranteed activation');
  page.find('button', props => text(props.children) === 'Simular mi campaña').onClick();
  assert.equal(next, 1, 'Existing next-step callback is retained');
});

for (const reduced of [false, true]) {
  test('onboarding editorial is visible in SSR with reduced motion ' + reduced, () => {
    for (const [Component, props] of [
      [benefits, { onNext() {} }],
      [simulator, { config: { screens: 3, months: 2, frequencySeconds: 30, includeProduction: false }, onChange() {}, onNext() {}, onPrev() {} }],
    ]) {
      const page = render(Component, props, reduced);
      assert.ok(!page.html.includes('opacity:0'), 'SSR content must not wait for an entrance animation');
      assert.ok(!page.html.includes('visibility:hidden'), 'SSR content must be readable');
      if (reduced) {
        for (const node of page.elements) {
          for (const interaction of ['whileHover', 'whileTap']) {
            assert.equal(node.props[interaction]?.scale, undefined, 'Reduced motion suppresses control scaling');
            assert.equal(node.props[interaction]?.y, undefined, 'Reduced motion suppresses control translation');
          }
        }
      }
    }
  });

  test('wizard and composed planning steps stay readable in SSR with reduced motion ' + reduced, () => {
    for (const [step, Component, props] of [
      [1, benefits, { onNext() {} }],
      [2, simulator, { config: { screens: 3, months: 2, frequencySeconds: 30, includeProduction: false }, onChange() {}, onNext() {}, onPrev() {} }],
    ]) {
      const page = render(wizard, { step, totalSteps: 4,
        onNext() {}, onPrev() {}, onClose() {},
        stepLabels: ['Beneficios', 'Simulador', 'Compromiso', 'Revisión'],
        children: React.createElement(Component, props) }, reduced);
      assert.ok(!page.html.includes('opacity:0'), 'An ancestor may not hide essential planning content');
      assert.ok(!page.html.includes('visibility:hidden'));
      assert.ok(page.html.includes(step === 1 ? 'Simular mi campaña' : 'Presupuesto ilustrativo'));
      const progress = page.find('ol', node => node['aria-label'] === 'Progreso de incorporación');
      assert.equal(React.Children.count(progress.children), 4);
      const current = page.elements.filter(node => node.type === 'li' && node.props['aria-current'] === 'step');
      assert.equal(current.length, 1);
      assert.equal(text(current[0].props.children), `${step}. ${step === 1 ? 'Beneficios' : 'Simulador'}`);
      if (reduced) for (const node of page.elements) {
        assert.equal(node.props.whileHover?.scale, undefined);
        assert.equal(node.props.whileTap?.scale, undefined);
        assert.equal(node.props.initial?.x, undefined);
      }
    }
  });
}

test('wizard back action retains the existing close and previous-step callbacks', () => {
  let closed = 0;
  let previous = 0;
  const props = { totalSteps: 4, onNext() {}, onPrev: () => previous++, onClose: () => closed++,
    children: React.createElement('p', null, 'Contenido de planificación') };
  const first = render(wizard, { ...props, step: 1 });
  first.find('button', node => node['aria-label'] === 'Volver al acceso').onClick();
  assert.equal(closed, 1);
  assert.equal(previous, 0);
  const second = render(wizard, { ...props, step: 2 });
  second.find('button', node => node['aria-label'] === 'Volver al paso anterior').onClick();
  assert.equal(closed, 1);
  assert.equal(previous, 1);
});

test('onboarding simulator keeps inherited custom screens and allows explicit city review', () => {
  let config = { screens: 12, months: 4, frequencySeconds: 30, includeProduction: false };
  let city = 'stgo';
  const props = () => ({
    config, city, onCityChange: value => { city = value; },
    onChange: patch => { config = { ...config, ...patch }; },
    onNext() {}, onPrev() {},
  });
  let page = render(simulator, props());
  assert.equal(page.find('input', input => input['aria-label'] === 'Número de pantallas personalizado').value, 12);
  assert.equal(page.find('input', input => input.type === 'range').value, 4);
  assert.equal(page.find('input', input => input.type === 'checkbox').checked, false);
  const select = page.find('select', element => element.id === 'onboarding-campaign-city');
  assert.equal(select.value, 'stgo');
  select.onChange({ target: { value: 'sd' } });
  page = render(simulator, props());
  assert.equal(page.find('select', element => element.id === 'onboarding-campaign-city').value, 'sd');
  assert.equal(config.screens, 12);
  assert.equal(config.months, 4);
});

test('simulator keeps live model quotes, deliberate production opt-in and existing navigation', () => {
  let config = { screens: 3, months: 2, frequencySeconds: 30, includeProduction: false };
  let next = 0;
  let prev = 0;
  const props = () => ({
    config, onChange: patch => { config = { ...config, ...patch }; },
    onNext: () => next++, onPrev: () => prev++,
  });
  const assertQuote = page => {
    const amount = page.find('output', output => output['aria-label'] === 'Presupuesto ilustrativo');
    assert.equal(text(amount.children), pricing.estimateCampaign(config).total.toLocaleString());
    assert.equal(pricing.estimateCampaign(config).screensCost,
      pricing.SCREEN_MONTHLY_RATE * config.screens * config.months,
      'Displayed monthly unit rate must reconcile to the illustrative subtotal');
    const unitLabels = page.elements
      .filter(element => element.type === 'span')
      .map(element => text(element.props.children));
    assert.ok(unitLabels.some(label =>
      label.startsWith('Pantallas (') &&
      label.includes(`RD$${pricing.SCREEN_MONTHLY_RATE.toLocaleString()}`)),
    'Onboarding must display the same unit rate used to calculate the subtotal');
    // TAD commercial rate is confirmed: RD$2,500 base and a 40% discount
    // only after a real driver's code is verified by the server.
    assert.ok(page.html.includes('La tarifa base es RD$2,500'), 'Display the confirmed base rate');
    assert.ok(page.html.includes('sin ITBIS'), 'Disclose pre-tax amounts');
    assert.ok(page.html.includes('verificación del código por el servidor'),
      'Driver discount may not be granted from a URL alone');
    assert.ok(page.html.includes('La producción creativa opcional'),
      'Creative production must be quoted separately');
    assert.ok(page.html.includes('no contrata, cobra ni reserva pantallas'),
      'An illustrative simulation cannot activate a contract or charge');
    assert.ok(page.html.includes('ilustrativ'), 'Quote must remain educational');
  };
  let page = render(simulator, props());
  for (const claim of ['RD$45,000', 'Resérvalo', 'Disponibilidad limitada', 'Asegurar este plan']) {
    assert.ok(!page.html.includes(claim), 'Unsupported sales pressure remains: ' + claim);
  }
  assertQuote(page);
  assert.equal(page.find('input', input => input.type === 'checkbox').checked, false);
  page.find('button', button => text(button.children) === '5').onClick();
  assert.equal(config.screens, 5);
  assert.equal(config.frequencySeconds, pricing.FIXED_FREQUENCY_SECONDS);
  page = render(simulator, props());
  assertQuote(page);
  page.find('input', input => input.type === 'range').onChange({ target: { value: '4' } });
  assert.equal(config.months, 4);
  page = render(simulator, props());
  const withoutProduction = pricing.estimateCampaign(config).total;
  page.find('input', input => input.type === 'checkbox').onChange({ target: { checked: true } });
  page = render(simulator, props());
  assertQuote(page);
  assert.equal(pricing.estimateCampaign(config).total - withoutProduction, pricing.estimateCampaign(config).productionFee);
  assert.ok(page.html.includes('Producción creativa:'), 'Selected production has a separate line item');
  page.find('input', input => input.type === 'checkbox').onChange({ target: { checked: false } });
  page = render(simulator, props());
  assertQuote(page);
  assert.equal(pricing.estimateCampaign(config).total, withoutProduction);
  page.find('button', button => text(button.children).includes('Continuar')).onClick();
  page.find('button', button => text(button.children).includes('Ajustar simulación')).onClick();
  assert.equal(next, 1);
  assert.equal(prev, 1);
});


test('driver code discount appears only after server quote verification', () => {
  const impact = loadSource(path.join(ROOT, 'packages/impact-calculator/index.ts'));
  const config = { screens: 3, months: 2, frequencySeconds: 30, includeProduction: true };
  const offer = impact.calculateAdvertiserOffer({
    screens: config.screens, months: config.months,
    includeProduction: true, verifiedDriverCode: true,
  });
  let changedCode = null;
  const props = {
    config, onChange() {}, onNext() {}, onPrev() {},
    referralCode: 'DRIVER_TEST_1',
    onReferralCodeChange(code) { changedCode = code; },
  };
  const pending = render(simulator, {
    ...props, verifiedOffer: offer, quoteStatus: 'checking',
  });
  const amountOf = page => text(page.find('output',
    node => node['aria-label'] === 'Presupuesto ilustrativo').children);
  assert.equal(amountOf(pending), pricing.estimateCampaign(config).total.toLocaleString(),
    'The offer must not be displayed while verification is pending');
  const verified = render(simulator, {
    ...props, verifiedOffer: offer, quoteStatus: 'verified',
  });
  assert.equal(amountOf(verified), offer.subtotal.toLocaleString());
  assert.ok(verified.html.includes('40 %'));
  assert.ok(verified.html.includes('6,000'), 'The verified discount must be itemized');
  assert.ok(verified.html.includes('Código verificado'));
  const invalid = render(simulator, {
    ...props, verifiedOffer: null, quoteStatus: 'invalid',
  });
  assert.equal(amountOf(invalid), pricing.estimateCampaign(config).total.toLocaleString());
  assert.ok(invalid.html.includes('Código no válido'));
  verified.find('input', node => node.id === 'advertiser-driver-code')
    .onChange({ target: { value: 'DRIVER_TEST_2' } });
  assert.equal(changedCode, 'DRIVER_TEST_2');
});


test('wizard disables back navigation while submitting or after successful registration', () => {
  for (const step of [3, 4]) {
    let navigated = 0;
    const page = render(wizard, { step, totalSteps: 4, navigationLocked: true,
      onNext() {}, onPrev() { navigated++; }, onClose() { navigated++; },
      children: React.createElement('p', null, 'Fixture') });
    const back = page.find('button', node => node['aria-label'] === 'Volver al paso anterior');
    assert.equal(back.disabled, true);
    back.onClick();
    assert.equal(navigated, 0);
  }
});


test('registration receipt distinguishes recorded pre-tax subtotal from pending confirmation', () => {
  const props = { companyName: 'Fixture', screens: 12, months: 4, impressions: 123 };
  const verified = render(success, { onContinue() {}, campaignData: { ...props, budget: 120000 } });
  assert.ok(verified.html.includes('Subtotal registrado (sin ITBIS)'));
  assert.ok(verified.html.includes((120000).toLocaleString('es-DO')));
  assert.ok(!verified.html.includes('Pendiente de confirmación'));
  for (const campaignData of [{ ...props, budget: null }, undefined]) {
    const pending = render(success, { onContinue() {}, campaignData });
    assert.ok(pending.html.includes('Pendiente de confirmación'));
    assert.ok(pending.html.includes('sin volver a registrarte'));
    assert.doesNotMatch(pending.html, /RD\$\s*0/);
    assert.ok(pending.html.includes('Ir a iniciar sesión'));
  }
});
