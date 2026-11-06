# Vendored browser-safe swf-toolkit modules

This directory contains a focused subset of [recepasan/swf-toolkit](https://github.com/recepasan/swf-toolkit), used for local, read-only SWF inspection.

Included upstream modules:
- SWF tag parsing and tag metadata
- AVM2 ABC data structures used by tag parsing
- Binary reader/writer primitives
- Pure TypeScript LZMA decoder for ZWS files

The Node-only SWF file wrapper and Node zlib integration are intentionally not included. This project handles file input through the browser File API, CWS decompression through the browser Compression Streams API, and ZWS decompression through the toolkit's pure TypeScript LZMA decoder.

The browser entry point is `src/browser-entry.ts`. Run `npm install` and `npm run build:swf-toolkit-browser` to emit the static ES modules under `dist/`.

Upstream project: https://github.com/recepasan/swf-toolkit  
License: MIT, see [LICENSE](./LICENSE).

This integration is inspection-only. It does not compile or inject ActionScript, modify parent SWFs, or create patched executables.
