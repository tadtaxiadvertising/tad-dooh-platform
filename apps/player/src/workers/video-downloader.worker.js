// ─── TAD DOOH Player — Video Downloader Web Worker ───
// Offloads video asset downloads off the main UI thread.
// Vite copies this to dist/ as a raw module worker (tsc is bypassed for .js).

const DB_NAME = 'tad_player_download_queue';
const DB_VERSION = 1;
const STORE = 'tasks';

// Enforce the same per-asset cap as BUSINESS_RULES.MAX_VIDEO_SIZE_BYTES (55MB).
// Oversized media is aborted with an explicit status instead of silently
// filling the tablet's disk (audit finding A3).
const MAX_VIDEO_SIZE_BYTES = 57_671_680;

/** @type {IDBDatabase | null} */
let database = null;

/**
 * @returns {Promise<IDBDatabase>}
 */
function openDatabase() {
  if (database) {
    return Promise.resolve(database);
  }

  return new Promise(function (resolve, reject) {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function () {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = function () {
      database = request.result;
      resolve(database);
    };

    request.onerror = function () {
      reject(request.error);
    };
  });
}

/**
 * @returns {Promise<Array>}
 */
function allTasks() {
  return openDatabase().then(function (db) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const request = store.getAll();

      request.onsuccess = function () {
        resolve(request.result || []);
      };
      request.onerror = function () {
        reject(request.error);
      };
    });
  });
}

/**
 * @param {Object} task
 */
function putTask(task) {
  return openDatabase().then(function (db) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const request = store.put(task);

      request.onsuccess = function () {
        resolve();
      };
      request.onerror = function () {
        reject(request.error);
      };
    });
  });
}

/**
 * @param {string} id
 * @param {string} status
 * @returns {Promise<Object|undefined>}
 */
function updateTaskStatus(id, status) {
  return openDatabase().then(function (db) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const getReq = store.get(id);

      getReq.onsuccess = function () {
        const task = getReq.result;
        if (!task) {
          resolve(undefined);
          return;
        }
        task.status = status;
        const putReq = store.put(task);
        putReq.onsuccess = function () {
          resolve(task);
        };
        putReq.onerror = function () {
          reject(putReq.error);
        };
      };
      getReq.onerror = function () {
        reject(getReq.error);
      };
    });
  });
}

/**
 * @param {Object} data
 */
function postMessage(data) {
  self.postMessage(data);
}

/**
 * @param {Object} message
 */
async function handleSyncAssets(message) {
  const payload = message.payload || {};
  const candidateAssets = Array.isArray(payload.assets) ? payload.assets : [];

  if (candidateAssets.length === 0) {
    postMessage({
      type: 'ERROR',
      requestId: message.requestId,
      ok: false,
      message: 'Invalid SYNC_ASSETS payload: no assets',
    });
    return;
  }

  const selectedAssets = candidateAssets
    .filter(function (asset) {
      return Boolean(asset && asset.url && asset.filename);
    })
    .slice(0, 15);

  /** @type {Map<string, Object>} */
  const existingMap = new Map();
  try {
    const existingTasks = await allTasks();
    existingTasks.forEach(function (task) {
      existingMap.set(task.url, task);
    });
  } catch (_) {
    // fresh DB — no existing tasks
  }

  let enqueued = 0;
  let skipped = 0;
  const tasks = [];

  for (let i = 0; i < selectedAssets.length; i++) {
    const asset = selectedAssets[i];
    const existingTask = existingMap.get(asset.url);

    if (existingTask && (existingTask.status === 'done' || existingTask.status === 'downloading')) {
      skipped++;
      tasks.push(existingTask);
      continue;
    }

    const task = {
      id: asset.url,
      deviceId: payload.deviceId || '',
      url: asset.url,
      filename: asset.filename,
      checksum: asset.checksum || null,
      status: 'pending',
      createdAt: Date.now(),
    };

    await putTask(task);
    tasks.push(task);
    enqueued++;
  }

  postMessage({
    type: 'SYNC_ASSETS_RESULT',
    requestId: message.requestId,
    ok: true,
    tasks: tasks,
    enqueued: enqueued,
    skipped: skipped,
  });
}

/**
 * @param {Object} message
 */
async function handleDownloadAssets(message) {
  const payload = message.payload || {};

  if (
    typeof payload.concurrency !== 'number' ||
    Number.isNaN(payload.concurrency) ||
    payload.concurrency < 1
  ) {
    postMessage({
      type: 'ERROR',
      requestId: message.requestId,
      ok: false,
      message: 'Invalid concurrency for DOWNLOAD_ASSETS',
    });
    return;
  }

  try {
    const pending = (await allTasks()).filter(function (task) {
      return task.status === 'pending';
    });

    for (let i = 0; i < pending.length; i++) {
      const task = pending[i];
      await updateTaskStatus(task.id, 'downloading');

      postMessage({
        type: 'PROGRESS',
        requestId: message.requestId,
        taskId: task.id,
        filename: task.filename,
        status: 'downloading',
      });

      try {
        const response = await fetch(task.url);

        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }

        const expectedSize = Number(response.headers.get('content-length') || 0);
        if (expectedSize > MAX_VIDEO_SIZE_BYTES) {
          throw new Error('Asset exceeds MAX_VIDEO_SIZE_BYTES (' + expectedSize + ' bytes)');
        }

        const blob = await response.blob();
        if (blob.size > MAX_VIDEO_SIZE_BYTES) {
          throw new Error('Asset exceeds MAX_VIDEO_SIZE_BYTES (' + blob.size + ' bytes)');
        }

        await updateTaskStatus(task.id, 'done');
      } catch (error) {
        await updateTaskStatus(task.id, 'error');

        postMessage({
          type: 'PROGRESS',
          requestId: message.requestId,
          taskId: task.id,
          filename: task.filename,
          status: 'error',
        });

        console.warn('[video-downloader-worker] download failed', error);
      }
    }

    const tasks = await allTasks();

    postMessage({
      type: 'DOWNLOAD_STATUS',
      requestId: message.requestId,
      ok: true,
      tasks: tasks,
      finished: tasks.filter(function (t) {
        return t.status === 'done';
      }).length,
      failed: tasks.filter(function (t) {
        return t.status === 'error';
      }).length,
    });
  } catch (error) {
    postMessage({
      type: 'ERROR',
      requestId: message.requestId,
      ok: false,
      message: error && error.message ? error.message : 'Unknown download failure',
    });
  }
}

/**
 * @param {Object} message
 */
async function handleGetStatus(message) {
  try {
    const tasks = await allTasks();

    postMessage({
      type: 'DOWNLOAD_STATUS',
      requestId: message.requestId,
      ok: true,
      tasks: tasks,
      finished: tasks.filter(function (t) {
        return t.status === 'done';
      }).length,
      failed: tasks.filter(function (t) {
        return t.status === 'error';
      }).length,
    });
  } catch (error) {
    postMessage({
      type: 'ERROR',
      requestId: message.requestId,
      ok: false,
      message: error && error.message ? error.message : 'Unknown status failure',
    });
  }
}

self.addEventListener('message', function (event) {
  const message = event.data;

  if (!message || !message.type) {
    return;
  }

  switch (message.type) {
    case 'SYNC_ASSETS':
      handleSyncAssets(message);
      break;
    case 'DOWNLOAD_ASSETS':
      handleDownloadAssets(message);
      break;
    case 'GET_STATUS':
      handleGetStatus(message);
      break;
    default:
      break;
  }
});