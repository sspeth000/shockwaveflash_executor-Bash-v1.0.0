# Bash SWF Patcher

A starter website for the external-SWF-loader workflow. View the pages site via
https://sspeth000.github.io/shockwaveflash_executor-Bash-v1.0.0/

## Workflow

1. Upload the parent SWF you own or are authorized to modify.
2. The processing service validates the SWF.
3. A future build adapter will decompile supported AS3 projects, integrate the loader, and compile the parent again.
4. The result will be named `originalname[execinstalled].swf`.
5. When the patched parent runs in Ruffle, its embedded loader requests the separate `TestPanel.swf`.

There is **no `main.swf`**. The uploaded SWF is the parent. `TestPanel.swf` is an external child SWF.

## Run locally

Requires Python 3.10+.

```bash
pip install -r requirements.txt
python server/app.py
```

Open http://127.0.0.1:8000.

## Current status

The website UI and upload validation endpoint are the starter implementation. The endpoint deliberately does not return a falsely labelled copy of the original SWF. The decompile/recompile adapter is not implemented yet.

Arbitrary SWF decompilation is not a guaranteed round trip: decompilers reconstruct approximate source, and projects may depend on libraries, compiler settings, assets, and APIs that cannot be recovered automatically. The next step is to target a known-good AS3 SWF and wire in FFDec plus an AS3 compiler.

## Files

- `public/`: browser interface
- `server/app.py`: local upload/validation server
- `TestPanel/TestPanel.as`: source for the separate draggable test panel
- `loader/ExternalSwfLoader.as`: AS3 loader source intended to be compiled into the parent project
