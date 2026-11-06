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
