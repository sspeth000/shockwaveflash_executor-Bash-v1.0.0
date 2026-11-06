globalThis.BashSwfToolkitReady = import("./vendor/swf-toolkit/dist/browser-entry.js")
  .then((module) => {
    globalThis.BashSwfToolkitInspect = module.inspectSwfBytes;
    return true;
  })
  .catch((error) => {
    console.warn("Browser SWF toolkit bundle is not available; using the built-in analyzer.", error);
    return false;
  });
