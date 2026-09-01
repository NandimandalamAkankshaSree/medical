import re
from typing import List, Dict, Any, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

class DocumentChunk:
    def __init__(
        self,
        chunk_id: str,
        patient_id: str,
        document_id: int,
        document_name: str,
        page_number: int,
        section_name: str,
        text: str
    ):
        self.chunk_id = chunk_id
        self.patient_id = patient_id
        self.document_id = document_id
        self.document_name = document_name
        self.page_number = page_number
        self.section_name = section_name
        self.text = text

class RAGEngine:
    """
    Source-Grounded Medical Document RAG Engine with metadata filtering,
    strict document isolation, and citation generation.
    """
    _chunks_by_doc: Dict[int, List[DocumentChunk]] = {}
    _vectorizers_by_doc: Dict[int, TfidfVectorizer] = {}
    _matrices_by_doc: Dict[int, Any] = {}

    @classmethod
    def index_document(
        cls,
        patient_id: str,
        document_id: int,
        document_name: str,
        pages: List[Dict[str, Any]]
    ):
        """
        Indexes a document by splitting into semantic chunks with page and section metadata.
        """
        chunks = []
        chunk_idx = 0

        for page in pages:
            page_num = page.get("page_number", 1)
            raw_text = page.get("text", "")

            # Split into paragraphs/sections
            paragraphs = [p.strip() for p in raw_text.split("\n\n") if p.strip()]
            if not paragraphs:
                paragraphs = [raw_text] if raw_text.strip() else []

            current_section = "General Overview"
            for para in paragraphs:
                if any(h in para.lower() for h in ["patient details", "patient information"]):
                    current_section = "Patient Information"
                elif any(h in para.lower() for h in ["laboratory results", "lab results", "investigations"]):
                    current_section = "Laboratory Results"
                elif any(h in para.lower() for h in ["findings", "doctor observations", "conclusion"]):
                    current_section = "Clinical Findings"
                elif any(h in para.lower() for h in ["recommendations", "treatment plan"]):
                    current_section = "Recommendations"

                # Sub-chunk if too long
                if len(para) > 400:
                    sub_parts = [para[i:i+350] for i in range(0, len(para), 300)]
                else:
                    sub_parts = [para]

                for sp in sub_parts:
                    chunk_idx += 1
                    chunks.append(DocumentChunk(
                        chunk_id=f"doc_{document_id}_c{chunk_idx}",
                        patient_id=patient_id,
                        document_id=document_id,
                        document_name=document_name,
                        page_number=page_num,
                        section_name=current_section,
                        text=sp
                    ))

        if chunks:
            cls._chunks_by_doc[document_id] = chunks
            corpus = [c.text for c in chunks]
            vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
            matrix = vectorizer.fit_transform(corpus)
            cls._vectorizers_by_doc[document_id] = vectorizer
            cls._matrices_by_doc[document_id] = matrix

    @classmethod
    def retrieve(
        cls,
        query: str,
        patient_id: str,
        document_id: int,
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Performs metadata-isolated retrieval on the selected document.
        Guarantees NO cross-report retrieval.
        """
        if document_id not in cls._chunks_by_doc:
            return []

        chunks = cls._chunks_by_doc[document_id]
        vectorizer = cls._vectorizers_by_doc.get(document_id)
        matrix = cls._matrices_by_doc.get(document_id)

        if not vectorizer or matrix is None or not chunks:
            return []

        try:
            query_vec = vectorizer.transform([query])
            sim_scores = cosine_similarity(query_vec, matrix).flatten()
            top_indices = np.argsort(sim_scores)[::-1][:top_k]

            results = []
            for idx in top_indices:
                score = float(sim_scores[idx])
                if score > 0.05 or len(results) == 0:
                    c = chunks[idx]
                    results.append({
                        "chunk_id": c.chunk_id,
                        "document_id": c.document_id,
                        "document_name": c.document_name,
                        "page_number": c.page_number,
                        "section_name": c.section_name,
                        "text": c.text,
                        "score": round(score, 4)
                    })
            return results
        except Exception as e:
            print(f"Error in RAG retrieval: {e}")
            return []
