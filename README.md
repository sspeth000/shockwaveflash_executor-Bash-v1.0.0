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

This is currently a **client-side analyzer**, not yet a working loader injector. It does not reconstruct an original editable FLA, modify AVM1/AVM2 bytecode, or produce a patched SWF.

A real browser-only injector still needs a compiled AS3 bootstrap payload and a verified method to register and execute it in supported parent SWFs. Arbitrary SWFs cannot be guaranteed to round-trip through decompilation and recompilation. The output name planned for a successful patch is `originalname[execinstalled].swf`.

There is no need to run Flask or install Python for the static browser analyzer.

## Project files

- `index.html`: GitHub Pages entry point
- `public/`: browser interface, styling, and SWF parser
- `loader/ExternalSwfLoader.as`: AS3 loader source reference
- `TestPanel/TestPanel.as`: separate draggable child-panel source reference
- `server/`: legacy prototype; not used by the browser interface

## AVM loader variants

Flash SWF has two standard ActionScript virtual-machine generations:

- **AVM1 / ActionScript 1–2:** `loader/avm1/ExternalSwfLoader.as`. This is an AS2 helper using `MovieClipLoader`. Include it in an AVM1 parent and call `loader.ExternalSwfLoader.load(this, "TestPanel-AVM1.swf")`.
- **AVM2 / ActionScript 3:** `loader/avm2/ExternalSwfLoader.as`. This is an AS3 `Sprite` class using `flash.display.Loader`. Compile it into an AVM2 parent.

There is no third standard AVM generation in ordinary Adobe Flash SWF. AVM1 and AVM2 are the supported targets here. The parent and external child should use compatible AVM generations; an AVM1 parent should not be assumed to load an AVM2 child, or vice versa. These are source files, not compiled loader SWFs. They still need to be compiled with their matching ActionScript toolchain and integrated into a parent project.

## Automatic AVM selection

The browser parser checks the SWF `FileAttributes` AS3 flag and `DoABC` tags for AVM2. If those are absent, it checks `DoAction` and `DoInitAction` tags, including nested sprite timelines, for AVM1. It then selects the matching loader source in the interface. If no decisive marker is present, the runtime selector remains editable so the user can choose manually. This is runtime detection and source selection only; it does not yet inject or compile the loader.
