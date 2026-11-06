from pathlib import Path
from flask import Flask, jsonify, request
from werkzeug.utils import secure_filename

ROOT = Path(__file__).resolve().parents[1]
UPLOADS = ROOT / "work" / "uploads"
UPLOADS.mkdir(parents=True, exist_ok=True)
app = Flask(__name__, static_folder=str(ROOT / "public"), static_url_path="")
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024

@app.get("/")
def home():
    return app.send_static_file("index.html")

@app.post("/patch")
def patch():
    upload = request.files.get("swf")
    child_url = (request.form.get("childUrl") or "./TestPanel.swf").strip()
    if upload is None or not upload.filename:
        return jsonify(error="Choose a parent SWF first."), 400
    filename = secure_filename(upload.filename)
    if not filename.lower().endswith(".swf"):
        return jsonify(error="Only .swf files are accepted."), 400
    if not (child_url.startswith("https://") or child_url.startswith("http://") or child_url.startswith("./")):
        return jsonify(error="Child URL must be an http(s) URL or a relative path."), 400
    source = UPLOADS / filename
    upload.save(source)
    with source.open("rb") as stream:
        signature = stream.read(3)
    if signature not in (b"FWS", b"CWS", b"ZWS"):
        source.unlink(missing_ok=True)
        return jsonify(error="The uploaded file does not have a recognized SWF signature."), 400
    output_name = f"{Path(filename).stem}[execinstalled].swf"
    return jsonify(stage="validated", source=filename, output=output_name, childUrl=child_url,
        error="Upload passed basic validation, but the FFDec decompile/import and ActionScript compile adapter is not connected. No output SWF was generated."), 501

@app.get("/health")
def health():
    return jsonify(ok=True, service="Bash SWF Patcher starter")

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=False)
