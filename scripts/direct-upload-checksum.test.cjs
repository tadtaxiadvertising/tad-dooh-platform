"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const { createHash, webcrypto } = require("node:crypto");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const servicesRequire = createRequire(
  path.join(root, "packages/services/package.json"),
);

function loadSource(relative, requireModule, globals = {}) {
  const filename = path.join(root, relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(
    compiled,
    {
      exports: loaded.exports,
      module: loaded,
      require: requireModule,
      Uint8Array,
      ArrayBuffer,
      ...globals,
    },
    { filename },
  );
  return loaded.exports;
}

function loadServices() {
  const services = loadSource(
    "packages/services/error-message.ts",
    servicesRequire,
  );
  if (fs.existsSync(path.join(root, "packages/services/file-checksum.ts"))) {
    Object.assign(
      services,
      loadSource("packages/services/file-checksum.ts", servicesRequire),
    );
  }
  return services;
}

function uploadFixture(
  portal,
  { confirmStatus = 200, storageStatus = 200 } = {},
) {
  const services = loadServices();
  const requests = [];
  const sent = [];
  const errors = [];
  const successes = [];
  const progress = [];
  const state = [];
  const react = {
    useState(initial) {
      const index = state.push(initial) - 1;
      return [
        initial,
        (value) => {
          state[index] =
            typeof value === "function" ? value(state[index]) : value;
        },
      ];
    },
    useCallback: (fn) => fn,
    useRef: (value) => ({ current: value }),
  };
  class FixtureXhr {
    constructor() {
      this.listeners = {};
      this.headers = {};
      this.upload = {
        addEventListener: (name, handler) => {
          this.progressListener = handler;
        },
      };
      this.status = storageStatus;
      this.statusText = storageStatus === 200 ? "OK" : "Storage rejected";
    }
    addEventListener(name, handler) {
      this.listeners[name] = handler;
    }
    open(method, url) {
      this.method = method;
      this.url = url;
    }
    setRequestHeader(name, value) {
      this.headers[name] = value;
    }
    send(file) {
      assert.equal(this.method, "PUT");
      assert.equal(this.url, "https://storage.fixture.invalid/signed");
      sent.push(file);
      queueMicrotask(() => {
        this.progressListener?.({ lengthComputable: true, loaded: file.size });
        this.listeners.load();
      });
    }
    abort() {
      this.listeners.abort?.();
    }
  }
  const fetch = async (url, options = {}) => {
    requests.push({ url, options });
    assert.equal(options.headers.Authorization, "Bearer fixture-token");
    if (
      url.startsWith("https://api.fixture.invalid/api/v1/media/upload-url?")
    ) {
      return {
        ok: true,
        json: async () => ({
          uploadUrl: "https://storage.fixture.invalid/signed",
          path: "fixture/object.png",
        }),
      };
    }
    assert.equal(url, "https://api.fixture.invalid/api/v1/media/confirm");
    return {
      ok: confirmStatus === 200,
      status: confirmStatus,
      json: async () =>
        confirmStatus === 200
          ? {
              id: "fixture-media-id",
              filename: "fixture.png",
              cdnUrl: "https://cdn.fixture.invalid/object.png",
              verified: true,
            }
          : { message: "Checksum rejected by backend" },
    };
  };
  const requireModule = (name) => {
    if (name === "react") return react;
    if (name === "@tad/services" || name === "@/lib/error-message")
      return services;
    throw new Error(`Unexpected hook import: ${name}`);
  };
  const hook = loadSource(
    `apps/${portal}/hooks/useDirectUpload.ts`,
    requireModule,
    {
      crypto: webcrypto,
      XMLHttpRequest: FixtureXhr,
      AbortController,
      fetch,
      document: { cookie: "" },
      localStorage: {
        getItem: (key) => (key === "sb-access-token" ? "fixture-token" : null),
      },
      process: {
        env: { NEXT_PUBLIC_API_URL: "https://api.fixture.invalid/api/v1" },
      },
    },
  );
  const result = hook.useDirectUpload({
    onSuccess: (value) => successes.push(value),
    onError: (value) => errors.push(value),
    onProgress: (value) => progress.push(value),
  });
  return { ...result, requests, sent, errors, successes, progress, state };
}

test("native WebCrypto reproduces the unsupported MD5 algorithm", async () => {
  await assert.rejects(
    webcrypto.subtle.digest("MD5", Uint8Array.from([1, 2, 3])),
    { name: "NotSupportedError" },
  );
});

for (const portal of ["admin", "driver", "advertiser"]) {
  test(`${portal}: actual upload hook sends the MD5 bytes checksum and confirms the uploaded file`, async () => {
    const bytes = Buffer.from([0, 255, 128, 1, 13, 10, 42, 73]);
    const file = new File([bytes], "fixture.png", { type: "image/png" });
    const fixture = uploadFixture(portal);
    const uploaded = await fixture.upload(file, "fixture-campaign");
    assert.equal(fixture.sent.length, 1);
    assert.equal(fixture.sent[0], file);
    assert.equal(fixture.requests.length, 2);
    const confirm = JSON.parse(fixture.requests[1].options.body);
    assert.deepEqual(confirm, {
      path: "fixture/object.png",
      campaignId: "fixture-campaign",
      expectedSize: bytes.length,
      expectedHashMd5: createHash("md5").update(bytes).digest("hex"),
      filename: "fixture.png",
    });
    assert.equal(uploaded.mediaId, "fixture-media-id");
    assert.equal(uploaded.verified, true);
    assert.equal(fixture.successes.length, 1);
    assert.equal(fixture.successes[0], uploaded);
    assert.equal(fixture.errors.length, 0);
    assert.equal(fixture.progress.at(-1).percentage, 100);
    assert.equal(fixture.state[0], false);
  });

  test(`${portal}: storage failure never confirms a file and backend rejection never becomes success`, async () => {
    const file = new File(["fixture bytes"], "fixture.png", {
      type: "image/png",
    });
    const storageFailure = uploadFixture(portal, { storageStatus: 503 });
    await assert.rejects(storageFailure.upload(file), /Upload failed: 503/);
    assert.equal(storageFailure.requests.length, 1);
    assert.equal(storageFailure.successes.length, 0);
    assert.equal(storageFailure.errors.length, 1);
    assert.equal(storageFailure.state[0], false);

    const confirmationFailure = uploadFixture(portal, { confirmStatus: 409 });
    await assert.rejects(
      confirmationFailure.upload(file),
      /Checksum rejected by backend/,
    );
    assert.equal(confirmationFailure.requests.length, 2);
    assert.equal(confirmationFailure.successes.length, 0);
    assert.equal(confirmationFailure.errors.length, 1);
    assert.equal(confirmationFailure.state[0], false);
  });

  test(`${portal}: invalid MIME and existing size limit still reject before requesting storage`, async () => {
    const invalid = uploadFixture(portal);
    await assert.rejects(
      invalid.upload(
        new File(["fixture"], "fixture.pdf", { type: "application/pdf" }),
      ),
    );
    assert.equal(invalid.requests.length, 0);
    assert.equal(invalid.sent.length, 0);
    const tooLarge = uploadFixture(portal);
    const limit = (portal === "advertiser" ? 55 : 100) * 1024 * 1024;
    await assert.rejects(
      tooLarge.upload({
        name: "fixture.png",
        type: "image/png",
        size: limit + 1,
      }),
    );
    assert.equal(tooLarge.requests.length, 0);
    assert.equal(tooLarge.sent.length, 0);
  });
}

test("MD5 helper agrees with an independent Node oracle for standard text vectors", async () => {
  const { calculateFileMd5 } = loadServices();
  const vectors = [
    "",
    "a",
    "abc",
    "message digest",
    "abcdefghijklmnopqrstuvwxyz",
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    "12345678901234567890123456789012345678901234567890123456789012345678901234567890",
  ];
  for (const text of vectors) {
    const actual = await calculateFileMd5(new Blob([text]));
    assert.equal(actual, createHash("md5").update(text).digest("hex"), text);
  }
  assert.equal(
    await calculateFileMd5(new Blob([])),
    "d41d8cd98f00b204e9800998ecf8427e",
  );
  assert.equal(
    await calculateFileMd5(new Blob(["abc"])),
    "900150983cd24fb0d6963f7d28e17f72",
  );
});

test("MD5 reads binary files sequentially in bounded chunks across block and chunk boundaries", async () => {
  const { calculateFileMd5 } = loadServices();
  const oneMiB = 1024 * 1024;
  for (const size of [
    0,
    1,
    55,
    56,
    63,
    64,
    65,
    oneMiB - 1,
    oneMiB,
    oneMiB + 1,
    2 * oneMiB + 71,
  ]) {
    const bytes = Buffer.allocUnsafe(size);
    for (let index = 0; index < size; index++)
      bytes[index] = (index * 131 + 17) & 255;
    const reads = [];
    let reading = 0;
    let maxConcurrentReads = 0;
    const file = {
      size,
      arrayBuffer() {
        throw new Error("A complete-file allocation is forbidden");
      },
      slice(start, end) {
        reads.push({ start, end });
        return {
          async arrayBuffer() {
            reading++;
            maxConcurrentReads = Math.max(maxConcurrentReads, reading);
            await Promise.resolve();
            reading--;
            return bytes.buffer.slice(
              bytes.byteOffset + start,
              bytes.byteOffset + end,
            );
          },
        };
      },
    };
    assert.equal(
      await calculateFileMd5(file),
      createHash("md5").update(bytes).digest("hex"),
      `binary size ${size}`,
    );
    assert.ok(maxConcurrentReads <= 1);
    let readThrough = 0;
    for (const read of reads) {
      assert.equal(read.start, readThrough);
      assert.ok(read.end - read.start <= oneMiB);
      assert.ok(read.end <= size);
      readThrough = read.end;
    }
    assert.equal(readThrough, size);
  }
});

test("checksum file-read errors propagate and do not corrupt the next checksum", async () => {
  const { calculateFileMd5 } = loadServices();
  const readFailure = new Error("Fixture file cannot be read");
  const file = {
    size: 10,
    slice() {
      return {
        arrayBuffer: async () => {
          throw readFailure;
        },
      };
    },
  };
  await assert.rejects(
    calculateFileMd5(file),
    (error) => error === readFailure,
  );
  assert.equal(
    await calculateFileMd5(new Blob(["abc"])),
    createHash("md5").update("abc").digest("hex"),
  );
});
