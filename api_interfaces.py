import base64

from flask import Flask, jsonify, request

app = Flask(__name__)


@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    pdf_base64 = data.get("content_base64")
    filename = data.get("filename")

    # ここで GCP Document AI 呼び出しや解析を行う
    # （仮で base64 長さとダミーテキストを返す）
    if pdf_base64:
        pdf_bytes = base64.b64decode(pdf_base64)
        result = {
            "ok": True,
            "filename": filename,
            "size": len(pdf_bytes),
            "text": "Dummy OCR text result ...",
        }
    else:
        result = {"ok": False, "error": "No content provided"}

    return jsonify(result)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
