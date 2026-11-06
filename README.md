# Bash SWF Patcher

A browser-only SWF inspection workspace hosted as a static site:

https://sspeth000.github.io/shockwaveflash_executor-Bash-v1.0.0/

## Browser-only behavior

- Reads the selected SWF with the browser File API. The file is not sent to a server.
- Parses the SWF header, frame information, and tag stream.
- Supports FWS, zlib-compressed CWS, and LZMA-compressed ZWS files in the browser.
- Uses a browser-safe subset of `swf-toolkit` for SWF tag parsing, nested sprite inspection, and AVM1/AVM2 marker detection.
- Uses the browser Compression Streams API for CWS and the toolkit's pure TypeScript LZMA decoder for ZWS.
- Keeps the Node-only filesystem and zlib wrapper out of the static site.

## Current limitation

This is a **read-only client-side analyzer**. It does not reconstruct an original editable FLA, compile ActionScript, inject bytecode, execute an external child, modify the uploaded SWF, or produce a patched SWF. Arbitrary SWFs cannot be guaranteed to round-trip through decompilation and recompilation.

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


## Loader compatibility check

After local analysis, select the separate child SWF file. The interface parses both files locally, checks each root timeline for an End tag, detects the child AVM family, and verifies that the parent and child runtime families match the selected loader. It also displays basic child metadata. This is a metadata-only preflight: it does not launch Ruffle, prove that the child renders correctly, invoke a compiler, inject bytecode, execute the child, change either uploaded file, or create an output download. To verify playback, open the child SWF independently in Ruffle.
