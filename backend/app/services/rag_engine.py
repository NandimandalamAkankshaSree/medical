import re
import math
from collections import Counter
from typing import List, Dict, Any, Optional

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

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

class PurePythonTFIDF:
    def __init__(self):
        self.idf: Dict[str, float] = {}
        self.corpus_tfidf: List[Dict[str, float]] = []

    def _tokenize(self, text: str) -> List[str]:
        return [w.lower() for w in re.findall(r'\b\w+\b', text) if len(w) > 2]

    def fit_transform(self, corpus: List[str]):
        n_docs = len(corpus)
        doc_tokens = [self._tokenize(doc) for doc in corpus]
        doc_freq: Dict[str, int] = Counter()
        for tokens in doc_tokens:
            for term in set(tokens):
                doc_freq[term] += 1
        
        self.idf = {term: math.log((1 + n_docs) / (1 + freq)) + 1.0 for term, freq in doc_freq.items()}
        
        self.corpus_tfidf = []
        for tokens in doc_tokens:
            counts = Counter(tokens)
            total = len(tokens) or 1
            vec = {term: (counts[term] / total) * self.idf.get(term, 1.0) for term in counts}
            norm = math.sqrt(sum(v * v for v in vec.values())) or 1.0
            self.corpus_tfidf.append({term: v / norm for term, v in vec.items()})

    def search(self, query: str, top_k: int = 3) -> List[tuple[int, float]]:
        q_tokens = self._tokenize(query)
        if not q_tokens or not self.corpus_tfidf:
            return []
        q_counts = Counter(q_tokens)
        total = len(q_tokens) or 1
        q_vec = {term: (q_counts[term] / total) * self.idf.get(term, 1.0) for term in q_counts}
        norm = math.sqrt(sum(v * v for v in q_vec.values())) or 1.0
        q_unit = {term: v / norm for term, v in q_vec.items()}

        scores = []
        for idx, doc_vec in enumerate(self.corpus_tfidf):
            score = sum(q_unit[t] * doc_vec[t] for t in q_unit if t in doc_vec)
            scores.append((idx, score))
        
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:top_k]

class RAGEngine:
    """
    Source-Grounded Medical Document RAG Engine with metadata filtering,
    strict document isolation, and citation generation.
    """
    _chunks_by_doc: Dict[int, List[DocumentChunk]] = {}
    _vectorizers_by_doc: Dict[int, Any] = {}
    _matrices_by_doc: Dict[int, Any] = {}
    _pure_tfidf_by_doc: Dict[int, PurePythonTFIDF] = {}

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
            if HAS_SKLEARN:
                try:
                    vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
                    matrix = vectorizer.fit_transform(corpus)
                    cls._vectorizers_by_doc[document_id] = vectorizer
                    cls._matrices_by_doc[document_id] = matrix
                except Exception:
                    pass
            
            # Always ensure pure python tfidf index is ready as fallback
            pure_tfidf = PurePythonTFIDF()
            pure_tfidf.fit_transform(corpus)
            cls._pure_tfidf_by_doc[document_id] = pure_tfidf

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
        if not chunks:
            return []

        results = []
        vectorizer = cls._vectorizers_by_doc.get(document_id)
        matrix = cls._matrices_by_doc.get(document_id)

        if HAS_SKLEARN and vectorizer is not None and matrix is not None:
            try:
                query_vec = vectorizer.transform([query])
                sim_scores = cosine_similarity(query_vec, matrix).flatten()
                top_indices = np.argsort(sim_scores)[::-1][:top_k]

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
                print(f"Notice: sklearn retrieve failed, falling back to pure Python: {e}")

        # Pure Python fallback retrieval
        pure_tfidf = cls._pure_tfidf_by_doc.get(document_id)
        if pure_tfidf:
            matches = pure_tfidf.search(query, top_k=top_k)
            for idx, score in matches:
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
