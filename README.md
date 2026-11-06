# Bash SWF Patcher

A browser-only SWF inspection workspace hosted as a static site:

https://sspeth000.github.io/shockwaveflash_executor-Bash-v1.0.0/

## Browser-only behavior

- Reads the selected SWF with the browser File API. The file is not sent to a server.
- Parses the SWF header, frame information, and tag stream.
- Supports uncompressed FWS and zlib-compressed CWS files in browsers with the Compression Streams API.
- Detects common ActionScript bytecode tags, including DoABC and DoAction.
- Rejects unsupported LZMA-compressed ZWS files with a clear message.

## Current limitation

This is currently a **client-side analyzer**, not yet a working loader injector. It does not reconstruct an original editable FLA, modify AVM1/AVM2 bytecode, compile ActionScript, or produce a patched SWF.

A real browser-only injector still needs a compiled bootstrap payload and a verified method to register and execute it in supported parent SWFs. Arbitrary SWFs cannot be guaranteed to round-trip through decompilation and recompilation. The planned output name for a successful patch is `originalname[execinstalled].swf`.

There is no need to run Flask or install Python for the static browser analyzer.

## AVM1 and AVM2 Test Panel pairs

The external child is the **Test Panel** in both variants. Each parent loader is matched with a child source targeting the same ActionScript virtual machine.

| Runtime | Parent loader source | Separate child source | Child output filename |
| --- | --- | --- | --- |
| AVM1 / AS2 | `loader/avm1/ExternalSwfLoader.as` | `TestPanel/avm1/TestPanel.as` | `TestPanel-AVM1.swf` |
| AVM2 / AS3 | `loader/avm2/ExternalSwfLoader.as` | `TestPanel/avm2/TestPanel.as` | `TestPanel-AVM2.swf` |

Both Test Panels display **“It worked!”** and have a draggable title bar.

### AVM1 / ActionScript 2

- Compile `loader/avm1/ExternalSwfLoader.as` into an AVM1 parent with an AS2-compatible compiler.
- Use `TestPanel/avm1/TestPanel.as` as the first-frame script of a separate AS2 movie and publish it as `TestPanel-AVM1.swf`.
- The loader's fully qualified class name is `loader.avm1.ExternalSwfLoader`.
- Example parent timeline call:

```actionscript
var testPanel:MovieClip = loader.avm1.ExternalSwfLoader.load(
    this,
    "TestPanel-AVM1.swf"
);
```

### AVM2 / ActionScript 3

- Compile `loader/avm2/ExternalSwfLoader.as` into an AVM2 parent.
- Compile `TestPanel/avm2/TestPanel.as` as the document class of a separate child movie and publish it as `TestPanel-AVM2.swf`.
- The loader's fully qualified class name is `loader.avm2.ExternalSwfLoader`.
- Example parent document-class usage:

```actionscript
addChild(new loader.avm2.ExternalSwfLoader("TestPanel-AVM2.swf"));
```

The child SWF must be hosted beside the parent SWF (or at the URL supplied to the loader). Browser and player security rules may restrict cross-origin loading; a suitable cross-domain policy may be required.

## Runtime detection

The browser parser checks the SWF `FileAttributes` AS3 flag and `DoABC` tags for AVM2. If those are absent, it checks `DoAction` and `DoInitAction` tags, including nested sprite timelines, for AVM1. It then selects the matching loader source in the interface. If no decisive marker is present, the runtime selector remains editable so the user can choose manually.

This is runtime detection and source selection only. It does not inject or compile the loader.

## Project files

- `index.html`: GitHub Pages entry point
- `public/`: browser interface, styling, and SWF parser
- `loader/avm1/`: AVM1 parent loader source
- `loader/avm2/`: AVM2 parent loader source
- `TestPanel/avm1/`: AVM1 external Test Panel source
- `TestPanel/avm2/`: AVM2 external Test Panel source
- `server/`: legacy prototype; not used by the browser interface

Flash SWF has two standard ActionScript virtual-machine generations: AVM1 (ActionScript 1–2) and AVM2 (ActionScript 3). The parent and child should use matching generations. The ActionScript files in this repository are source files, not compiled SWFs; they still need to be compiled with their matching toolchains and tested in the intended player, including Ruffle if that is the target.
