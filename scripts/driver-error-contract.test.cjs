"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const compile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText;

function declarations(file, names) {
  const source = read(file);
  const parsed = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const found = new Map();
  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      names.includes(node.name.getText(parsed))
    ) {
      found.set(node.name.getText(parsed), node.initializer.getText(parsed));
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  assert.equal(
    found.size,
    names.length,
    "Execute declarations from current source",
  );
  return [...found]
    .map(([name, value]) => `const ${name} = ${value};`)
    .join("\n");
}

function hubComponent() {
  const state = [];
  let cursor = 0;
  let effects = [];
  let profileResponse = () => Promise.reject(new Error("Fixture unavailable"));
  const react = {
    createElement: (type, props, ...children) => ({
      type,
      props: { ...props, children },
    }),
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [
        state[index],
        (value) => {
          state[index] = value;
        },
      ];
    },
    useEffect: (effect) => {
      effects.push(effect);
    },
  };
  const services = { getDeviceProfile: () => profileResponse() };
  const exports = {};
  vm.runInNewContext(
    compile(read("apps/driver/components/DeviceHubModal.tsx")),
    {
      exports,
      process: { env: { NEXT_PUBLIC_PLAYER_URL: "http://127.0.0.1:3999" } },
      require(name) {
        if (name === "react") return react;
        if (name === "@tad/services") return services;
        if (name === "clsx") return () => "fixture";
        if (name === "sonner") return { toast: {} };
        if (name === "date-fns")
          return { formatDistanceToNow: () => "fixture" };
        return new Proxy({}, { get: () => "fixture-icon" });
      },
    },
  );
  return {
    response: (handler) => {
      profileResponse = handler;
    },
    render(deviceId = "device-a") {
      cursor = 0;
      effects = [];
      return exports.default({ isOpen: true, deviceId, onClose() {} });
    },
    async load() {
      effects.forEach((effect) => effect());
      await new Promise(setImmediate);
    },
  };
}

function alerts(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(alerts);
  return [
    ...(tree.props?.role === "alert" ? [tree] : []),
    ...alerts(tree.props?.children),
  ];
}

test("failed DeviceHub fetch renders a recoverable error instead of dereferencing null", async () => {
  const hub = hubComponent();
  hub.render();
  await hub.load();
  const errors = alerts(hub.render());
  assert.equal(errors.length, 1);
  assert.match(errors[0].props.children.join(""), /Error al cargar el perfil/);
});

test("failed reload cannot retain the previous device profile", async () => {
  const hub = hubComponent();
  hub.response(async () => ({ device_id: "device-a", status: "online" }));
  hub.render();
  await hub.load();
  assert.equal(alerts(hub.render()).length, 0);
  hub.response(() => Promise.reject(new Error("Device B unavailable")));
  hub.render("device-b");
  await hub.load();
  assert.equal(alerts(hub.render("device-b")).length, 1);
});

test("device command handlers require a loaded profile", async () => {
  const source = declarations("apps/driver/components/DeviceHubModal.tsx", [
    "handleCommand",
    "handleUnlinkCampaign",
  ]);
  let sends = 0;
  const exports = {};
  vm.runInNewContext(
    compile(
      source + "\nexports.handlers = [handleCommand, handleUnlinkCampaign];",
    ),
    {
      exports,
      profile: null,
      deviceId: "device-fixture",
      sendCommand: async () => {
        sends++;
      },
      removeCampaignFromDevice: async () => {
        sends++;
      },
      setCommandLoading() {},
      setTimeout() {},
      toast: { success() {}, error() {}, warning() {} },
      loadProfile() {},
    },
  );
  for (const handler of exports.handlers) await handler("fixture-command");
  assert.equal(sends, 0);
});

test("driver hub accepts unknown responses and preserves numeric fields and slot bounds", () => {
  const source = declarations("apps/driver/hooks/useDriverHub.ts", [
    "MAX_DRIVER_SLOTS",
    "toNumber",
    "normalizeHubData",
  ]);
  const exports = {};
  vm.runInNewContext(
    compile(source + "\nexports.normalize = normalizeHubData;"),
    { exports },
  );
  for (const payload of [null, undefined, "invalid", 42]) {
    assert.equal(exports.normalize(payload).driverName, "Conductor");
    assert.equal(exports.normalize(payload).activeSlots, 0);
  }
  const normalized = exports.normalize({
    driverId: "fixture",
    balance: "123.5",
    activeAds: "22",
    adsPlayed: Infinity,
  });
  assert.equal(normalized.driverId, "fixture");
  assert.equal(normalized.balance, 123.5);
  assert.equal(normalized.activeSlots, 15);
  assert.equal(normalized.adsPlayed, 0);
  assert.equal(exports.normalize({ activeAds: -3 }).activeSlots, 0);
});

test("error status helpers retain authorization and subscription responses without accepting malformed data", () => {
  const driver = {};
  const admin = {};
  vm.runInNewContext(compile(read("apps/driver/lib/error-response.ts")), {
    exports: driver,
  });
  vm.runInNewContext(compile(read("apps/admin/lib/error-message.ts")), {
    exports: admin,
    require: () => ({ getErrorMessage() {} }),
  });
  for (const status of [401, 402, 403, 500]) {
    const response = { status, data: { message: "Fixture" } };
    assert.equal(driver.getErrorResponse({ response }), response);
    assert.equal(admin.getErrorStatus({ response }), status);
  }
  for (const malformed of [
    null,
    undefined,
    "failure",
    { response: null },
    { response: 401 },
  ]) {
    assert.equal(driver.getErrorResponse(malformed), undefined);
    assert.equal(admin.getErrorStatus(malformed), undefined);
  }
  assert.equal(
    admin.getErrorStatus({ response: { status: "401" } }),
    undefined,
  );
});

test("device forms preserve API messages and safely handle malformed error responses", async () => {
  const shared = {};
  vm.runInNewContext(compile(read("packages/services/error-message.ts")), {
    exports: shared,
  });
  for (const portal of ["admin", "driver"]) {
    for (const error of [
      Object.assign(new Error("Connection interrupted"), {
        response: undefined,
      }),
      {
        response: { data: { message: ["Driver required", "Serial required"] } },
      },
    ]) {
      const source = declarations(`apps/${portal}/components/DeviceModal.tsx`, [
        "handleSubmit",
      ]);
      const exports = {};
      let displayed;
      vm.runInNewContext(compile(source + "\nexports.submit = handleSubmit;"), {
        exports,
        Error,
        device: null,
        formData: {},
        createDevice: async () => {
          throw error;
        },
        getErrorMessage: shared.getErrorMessage,
        setError: (value) => {
          displayed = value;
        },
        setLoading() {},
      });
      await exports.submit();
      assert.equal(
        displayed,
        shared.getErrorMessage(error),
        `${portal} displays a useful string error`,
      );
    }
  }
});
