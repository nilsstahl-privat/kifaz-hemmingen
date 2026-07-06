// Minimaler Ersatz für firebase.database(), solange keine echten Firebase-Keys
// in js/config.js eingetragen sind. Bildet nur die Teilmenge der API nach, die
// diese App tatsächlich benutzt (ref/on/once/update/set/remove/push/child).
// Daten landen im localStorage des Browsers, damit die App auch offline und
// vor dem Firebase-Setup vollständig durchklickbar ist.
function createFakeDB() {
  const STORAGE_KEY = "kitaMittagsplanerFakeDB";
  let store = {};
  try {
    store = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch (e) {
    store = {};
  }
  const listeners = {}; // normalisierter Pfad -> [callback, ...]

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function parts(path) {
    return path.split("/").filter(Boolean);
  }

  function getAt(path) {
    let node = store;
    for (const p of parts(path)) {
      if (node == null) return null;
      node = node[p];
    }
    return node === undefined ? null : node;
  }

  function setAt(path, value) {
    const ps = parts(path);
    if (ps.length === 0) {
      store = value || {};
      save();
      notify(path);
      return;
    }
    let node = store;
    for (let i = 0; i < ps.length - 1; i++) {
      const p = ps[i];
      if (typeof node[p] !== "object" || node[p] === null) node[p] = {};
      node = node[p];
    }
    const last = ps[ps.length - 1];
    if (value === null || value === undefined) delete node[last];
    else node[last] = value;
    save();
    notify(path);
  }

  function makeSnap(path) {
    const val = getAt(path);
    return { val: () => val };
  }

  // Benachrichtigt Listener auf dem geänderten Pfad sowie allen Vorfahren-Pfaden,
  // da sich deren zusammengesetzter Wert ebenfalls geändert hat.
  function notify(path) {
    const ps = parts(path);
    for (let i = ps.length; i >= 0; i--) {
      const p = "/" + ps.slice(0, i).join("/");
      (listeners[p] || []).forEach(cb => cb(makeSnap(p)));
    }
  }

  function ref(path) {
    const normPath = "/" + parts(path).join("/");
    return {
      on(event, cb) {
        listeners[normPath] = listeners[normPath] || [];
        listeners[normPath].push(cb);
        cb(makeSnap(normPath));
        return cb;
      },
      off() {
        delete listeners[normPath];
      },
      once() {
        return Promise.resolve(makeSnap(normPath));
      },
      update(obj) {
        const current = getAt(normPath);
        const merged = Object.assign({}, (typeof current === "object" && current) || {}, obj);
        setAt(normPath, merged);
        return Promise.resolve();
      },
      set(value) {
        setAt(normPath, value);
        return Promise.resolve();
      },
      remove() {
        setAt(normPath, null);
        return Promise.resolve();
      },
      push() {
        const id = "id" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        const childRef = ref(normPath + "/" + id);
        childRef.key = id;
        return childRef;
      },
      child(childPath) {
        return ref(normPath + "/" + childPath);
      }
    };
  }

  return { ref };
}
