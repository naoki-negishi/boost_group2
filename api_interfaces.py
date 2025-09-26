import base64
import io
import json
import logging
import os
import re
import time
import uuid
from typing import Any, Dict, Iterable, List, Optional

import google.generativeai as genai
import requests
from flask import Flask, jsonify, request
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans

GOOGLE_DOCUMENT_AI_BASE_URL = "https://documentai.googleapis.com"
GOOGLE_LANGUAGE_BASE_URL = "https://language.googleapis.com"
GOOGLE_VERTEX_BASE_URL = "https://aiplatform.googleapis.com"

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def create_app() -> Flask:
    app = Flask(__name__)
    app.logger.setLevel(logging.INFO)
    app.config["JSON_AS_ASCII"] = False
    api_client = GcpLiteratureAPI.from_environment(app.logger)

    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "ok"})

    @app.route("/analyze", methods=["POST"])
    def analyze_document():
        payload = request.get_json(force=True) or {}
        try:
            result = api_client.analyze_document(payload)
            return jsonify(result)
        except Exception as exc:  # pylint: disable=broad-except
            logger.exception("Document analysis failed")
            return jsonify({"success": False, "error": str(exc)}), 500

    @app.route("/cluster", methods=["POST"])
    def perform_clustering():
        payload = request.get_json(force=True) or {}
        try:
            result = api_client.perform_clustering(payload)
            return jsonify(result)
        except Exception as exc:  # pylint: disable=broad-except
            logger.exception("Document analysis failed")
            return jsonify({"success": False, "error": str(exc)}), 500

    @app.route("/text-to-speech", methods=["POST"])
    def text_to_speech():
        raise NotImplementedError

    @app.route("/recommendations", methods=["POST"])
    def recommendations():
        raise NotImplementedError

    @app.route("/citations", methods=["POST"])
    def citations():
        raise NotImplementedError

    return app


class GcpLiteratureAPI:
    def __init__(
        self,
        base_url: Optional[str] = None,
        api_credentials_path: Optional[str] = None,
        language_hint: str = "en",
        summary_length: str = "MEDIUM",
        vertex_location: Optional[str] = None,
        embedding_model_name: str = "all-MiniLM-L6-v2",
        session: Optional[requests.Session] = None,
        timeout: int = 30,
        app_logger: Any = None,
    ) -> None:
        super().__init__()

        self.base_url = base_url or "https://your-aws-api.com"
        self.api_credentials: dict = self._load_api_credentials(api_credentials_path)
        self.timeout = timeout

        self.language_hint = language_hint
        self.summary_length = summary_length
        self.vertex_location = vertex_location
        self.session = session or requests.Session()

        self.gemini_pro = genai.GenerativeModel("models/gemini-2.5-flash")
        self.embedding_model = SentenceTransformer(embedding_model_name)

        self.app_logger = app_logger or logging.getLogger(__name__)
        self.app_logger.info("GcpLiteratureAPI initialized")

    @classmethod
    def from_environment(cls, logger) -> "GcpLiteratureAPI":
        return cls(
            # base_url=os.environ.get("API_BASE_URL"),
            api_credentials_path=os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"),
            # language_hint=os.environ.get("LANGUAGE_HINT", "en"),
            # summary_length=os.environ.get("SUMMARY_LENGTH", "MEDIUM"),
            # vertex_location=os.environ.get("VERTEX_LOCATION"),
            # embedding_model=os.environ.get("EMBEDDING_MODEL", "textembedding-gecko@003"),
            app_logger=logger,
        )

    @staticmethod
    def _load_api_credentials(path: Optional[str]) -> Dict[str, Any]:
        if not path or not os.path.isfile(path):
            raise ValueError("Google API credentials file path is not set or invalid.")
        try:
            with open(path, "r", encoding="utf-8") as file:
                return json.load(file)
        except Exception:
            raise RuntimeError("Failed to load Google API credentials file.")

    def analyze_document(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        start_time = time.time()

        filename = payload.get("filename", "document.pdf")
        self.app_logger.info(f"Analyzing document: {filename}")
        if payload.get("data"):
            pdf_bytes = base64.b64decode(payload.get("data"))
        else:
            return {"ok": False, "error": "No content provided"}
        mime_type = payload.get("file_type", "application/pdf")
        # options = payload.get("options") or {}

        # Call gemini-pro to summarize the PDF
        pdf_data = {
            "mime_type": mime_type,
            "data": pdf_bytes,
        }

        try:
            sum_prompt = "Summarize the main points of this PDF within 200 words."
            response = self.gemini_pro.generate_content([pdf_data, sum_prompt])
            summary = response.text if hasattr(response, "text") else ""
            self.app_logger.info(f"Gemini response: {summary}")
        except Exception as exc:  # pylint: disable=broad-except
            self.app_logger.error(f"Gemini API call failed: {exc}")

        try:
            abst_prompt = "Extract the exact abstract of the following paper."
            abstract_response = self.gemini_pro.generate_content(
                [pdf_data, abst_prompt]
            )
            abstract = (
                abstract_response.text if hasattr(abstract_response, "text") else ""
            )
            self.app_logger.info(f"Extracted abstract: \n{abstract}")
        except Exception as exc:  # pylint: disable=broad-except
            self.app_logger.error(f"Gemini API call for abstract failed: {exc}")

        # generate keywords and embeddings
        try:
            keyword_prompt = "Extract up to 3 concise keywords from the "\
                "following text. Return them as a single line,"\
                " comma-separated list only. For example: keyword1, keyword2,"\
                " keyword3"
            keyword_response = self.gemini_pro.generate_content(
                [summary, keyword_prompt]
            )
            raw = keyword_response.text.strip() if keyword_response.text else ""
            keywords = [kw.strip() for kw in re.split(r"[,;\n]", raw) if kw.strip()][:3]
            self.app_logger.info(f"Extracted keywords: \n{keywords}")
        except Exception as exc:  # pylint: disable=broad-except
            self.app_logger.error(f"Gemini API call for keywords failed: {exc}")

        reader = PdfReader(io.BytesIO(pdf_bytes))
        self.app_logger.info(reader.metadata)

        processing_time = time.time() - start_time

        return {
            "title": reader.metadata.title if reader.metadata.title else filename,
            "authors": [reader.metadata.author] if reader.metadata.author else [],
            "abstract": abstract,
            "keywords": keywords,
            "summary": summary,
            "metadata": {},
            "processing_info": {
                "processed_date": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "processing_time": round(processing_time, 3),
                "api_version": "gemini-2.5-flash",
            },
        }

    def perform_clustering(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        k = 20  # とりあえず仮
        km = KMeans(n_clusters=k, n_init="auto", random_state=0)
        # labels = km.fit_predict(emb)  # labels[i] がクラスタID

        papers = payload.get("papers") or []
        clusters: Dict[str, List[str]] = {}
        for paper in papers:
            keywords = paper.get("keywords") or []
            main_keyword = keywords[0] if keywords else "general"
            clusters.setdefault(main_keyword, []).append(paper.get("id"))

        cluster_list = []
        for index, (keyword, paper_ids) in enumerate(clusters.items()):
            cluster_list.append(
                {
                    "id": f"cluster_{index + 1}",
                    "name": self._capitalize(keyword),
                    "description": f"Papers related to {keyword} research",
                    "color": self.generate_cluster_color(index),
                    "papers": paper_ids,
                    "keywords": [keyword],
                    "similarity_score": 0.8,
                    "size": len(paper_ids),
                    "created_date": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }
            )

        return {
            "clusters": cluster_list,
            "algorithm_info": {
                "algorithm": "mock_keyword_clustering",
                "parameters": {"similarity_threshold": 0.7},
                "execution_time": 0.5,
            },
            "quality_metrics": {
                "silhouette_score": 0.7,
                "inertia": None,
                "num_clusters": len(cluster_list),
            },
        }

    def generate_audio_summary(self, payload: Dict[str, Any]) -> str:
        text = payload.get("text", "")
        return (
            f"data:audio/mp3;base64,mock_audio_data_{
                uuid.uuid4().hex}"
            if text
            else ""
        )

    def get_recommendations(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        recommendations = []
        for index, paper in enumerate(payload.get("user_library") or []):
            recommendations.append(
                {
                    "paper": paper,
                    "score": round(0.9 - index * 0.05, 3),
                    "reasons": ["Keyword overlap", "Citation similarity"],
                    "similar_papers": [],
                }
            )

        return {
            "recommendations": recommendations,
            "recommendation_info": {
                "algorithm": "collaborative_filtering",
                "total_candidates": len(recommendations),
                "filtered_count": len(recommendations),
                "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            },
        }

    def analyze_citations(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        paper_ids = payload.get("paper_ids") or []
        return {
            "citation_network": {paper_id: [] for paper_id in paper_ids},
            "metrics": {
                paper_id: {"h_index": 10, "i10_index": 5} for paper_id in paper_ids
            },
            "influential_papers": paper_ids[:3],
            "citation_trends": [
                {"year": year, "citations": 10 + year % 5} for year in range(2018, 2024)
            ],
            "analysis_date": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

    def process_document_ai(
        self, file_data: Any, mime_type: str = "application/pdf"
    ) -> Dict[str, Any]:
        processor_path = (
            f"projects/{self.project_id}/locations/{self.location}/processors/{
                self.processor_id}/processorVersions/{self.processor_version}"
            if self.processor_version
            else f"projects/{self.project_id}/locations/{self.location}/processors/{self.processor_id}"
        )
        url = f"{GOOGLE_DOCUMENT_AI_BASE_URL}/v1/{processor_path}:process"
        body = {
            "rawDocument": {
                "content": self.ensure_base64(file_data),
                "mimeType": mime_type,
            }
        }
        response = self._call_google_api(url, json=body)
        return response.get("document") or response

    def extract_metadata(
        self, document: Dict[str, Any], options: Dict[str, Any]
    ) -> Dict[str, Any]:
        metadata = {
            "title": "",
            "authors": [],
            "abstract": "",
            "findings": [],
            "confidence": document.get("confidence", 0),
            "pageCount": len(document.get("pages", []) or []),
            "wordCount": 0,
            "language": options.get("languageHint", self.language_hint),
            "documentType": document.get("documentType", "academic_paper"),
            "references": [],
        }
        text = document.get("text", "")
        metadata["wordCount"] = (
            len([word for word in re.split(r"\s+", text) if word]) if text else 0
        )

        for entity in document.get("entities", []) or []:
            entity_type = (entity.get("type") or "").lower()
            value = entity.get("mentionText") or entity.get("normalizedValue", {}).get(
                "text"
            )
            if not value:
                continue
            if entity_type == "title" and not metadata["title"]:
                metadata["title"] = value
            elif entity_type in {"author", "authors"}:
                metadata["authors"].append(value)
            elif entity_type == "abstract" and not metadata["abstract"]:
                metadata["abstract"] = value
            elif entity_type in {"finding", "conclusion"}:
                metadata["findings"].append(value)
            elif entity_type == "reference":
                metadata["references"].append(
                    {"text": value, "confidence": entity.get("confidence")}
                )
            elif entity_type == "language":
                metadata["language"] = value
            elif entity_type == "doc_type":
                metadata["documentType"] = value

        if not metadata["authors"]:
            metadata["authors"] = document.get("authors", []) or []
        if not metadata["abstract"] and text:
            metadata["abstract"] = "\n".join(text.splitlines()[:3])
        return metadata

    def ensure_base64(self, file_data: Any) -> str:
        if not file_data:
            return ""
        if isinstance(file_data, str):
            if self.is_base64(file_data):
                return file_data
            return base64.b64encode(file_data.encode("utf-8")).decode("ascii")
        if isinstance(file_data, (bytes, bytearray)):
            return base64.b64encode(bytes(file_data)).decode("ascii")
        raise TypeError("サポートされていないファイルデータ形式です。")

    @staticmethod
    def is_base64(value: str) -> bool:
        if not isinstance(value, str):
            return False
        stripped = re.sub(r"\s+", "", value)
        if not stripped:
            return False
        pattern = re.compile(
            r"^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$"
        )
        return bool(pattern.match(stripped))

    @staticmethod
    def generate_cluster_color(index: int) -> str:
        colors = [
            "#FF6B6B",
            "#4ECDC4",
            "#45B7D1",
            "#96CEB4",
            "#FFEAA7",
            "#DDA0DD",
            "#98D8C8",
            "#F7DC6F",
            "#BB8FCE",
            "#85C1E9",
            "#F8C471",
            "#82E0AA",
        ]
        return colors[index % len(colors)]

    @staticmethod
    def _capitalize(value: str) -> str:
        return value[:1].upper() + value[1:] if value else "General"

    @staticmethod
    def _extract_document_id(document: Dict[str, Any]) -> str:
        gviz = document.get("documentId", {}).get("gvizDocumentId", {}).get("docId")
        return gviz or uuid.uuid4().hex

    @staticmethod
    def _extract_processor_version(document: Dict[str, Any]) -> str:
        return document.get("revisionReference", {}).get(
            "latestProcessorVersion", "documentai_v1"
        )

    @staticmethod
    def _extract_summary_texts(items: Iterable[Any]) -> List[str]:
        texts: List[str] = []
        for item in items:
            if isinstance(item, dict):
                text = item.get("summaryText", {}).get("text") or item.get("text")
                if isinstance(text, str) and text.strip():
                    texts.append(text.strip())
            elif isinstance(item, str) and item.strip():
                texts.append(item.strip())
        return texts

    def _call_google_api(
        self, url: str, json: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        params = {"key": self.api_key}
        headers = {"Content-Type": "application/json"}
        response = self.session.post(
            url, headers=headers, json=json, params=params, timeout=60
        )
        if not response.ok:
            raise RuntimeError(
                f"Google API request failed: {response.status_code} {
                    response.reason} - {response.text}"
            )
        if not response.content:
            return {}
        try:
            return response.json()
        except ValueError as exc:  # pylint: disable=broad-except
            raise RuntimeError(
                "Google API response could not be parsed as JSON"
            ) from exc


app = create_app()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5000")))
