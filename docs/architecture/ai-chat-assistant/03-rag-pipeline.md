# AI Chat Assistant — RAG Pipeline Details

**Document:** 03-rag-pipeline.md
**Part of:** [AI Chat Assistant Architecture](./00-master-overview.md)
**Status:** Design Proposal
**Date:** 2026-02-19

---

## 1. Overview

The Retrieval-Augmented Generation (RAG) pipeline enables the AI assistant to answer factual questions about LifePlace by retrieving relevant content from company documentation before generating a response. This document covers the complete pipeline: document ingestion, chunking, embedding, storage, retrieval, and integration with the PydanticAI agent.

**Key architectural decision:** Use pgvector inside the existing PostgreSQL database on Fly.io rather than introducing a separate vector database. This eliminates new infrastructure, allows JOINs between document chunks and domain models, and keeps the operational footprint minimal.

---

## 2. Pipeline Architecture

```
                           INGESTION (offline, on-demand)
                           ┌─────────────────────────────────┐
                           │                                 │
  Company Docs (Markdown)  │  1. Read file                   │
  ─────────────────────────│  2. Split into chunks            │
  faq.md                   │  3. Generate embeddings          │
  cancellation-policy.md   │  4. Store in DocumentChunk       │
  venue-guide.md           │  5. Update search_vector (FTS)   │
  booking-process.md       │                                 │
  etc.                     └─────────────────────────────────┘

                           RETRIEVAL (per user query, real-time)
                           ┌─────────────────────────────────┐
                           │                                 │
  User query ──────────────│  1. Generate query embedding     │
                           │  2. pgvector cosine similarity   │  ── Top 40
                           │  3. PostgreSQL FTS ranking       │  ── Top 40
                           │  4. Reciprocal Rank Fusion       │
                           │  5. Return top 5 merged results  │
                           │                                 │
                           └─────────────────────────────────┘
                                          │
                                          ▼
                           Injected as context into LLM prompt
```

---

## 3. Document Sources

### 3.1 What Gets Ingested

| Document | Category | Contents |
|----------|----------|----------|
| `faq.md` | faq | Frequently asked questions and answers |
| `cancellation-policy.md` | policy | Cancellation terms, refund rules, admin fees |
| `payment-terms.md` | policy | Deposit requirements, payment schedules, late fees |
| `booking-process.md` | process | Step-by-step booking flow explanation |
| `venue-guide.md` | venue | Venue descriptions, capacities, amenities, rules |
| `package-guide.md` | package | Package descriptions, inclusions, pricing context |
| `event-day-guide.md` | process | What to expect on event day, timelines |
| `catering-info.md` | general | Catering options, dietary accommodations |
| `terms-and-conditions.md` | policy | Legal terms (summarized for chat, full linked) |

### 3.2 What Does NOT Get Ingested

Live data from the database (packages, venues, pricing, availability) is **not** embedded into the vector store. This data changes frequently and is accessed via tools instead (see [02-tool-schema-design.md](./02-tool-schema-design.md)).

The RAG pipeline handles **static, rarely-changing content only**. This prevents stale pricing or availability information from being served to users.

### 3.3 Document Storage Location

Source documents live in the repository:

```
backend/core/domains/ai_chat/documents/
├── faq.md
├── cancellation-policy.md
├── payment-terms.md
├── booking-process.md
├── venue-guide.md
├── package-guide.md
├── event-day-guide.md
├── catering-info.md
└── terms-and-conditions.md
```

These are version-controlled. Changes trigger re-ingestion via management command.

---

## 4. Document Ingestion

### 4.1 Chunking Strategy

**Method:** Recursive character splitting with section-awareness.

**Parameters:**
- Chunk size: 400-512 tokens (~1000-1500 characters)
- Overlap: 10-20% (50-100 tokens)
- Split hierarchy: Markdown headers (`##`, `###`) → paragraphs (`\n\n`) → sentences (`. `) → characters

**Why these parameters:**
- 400-512 tokens aligns with text-embedding-3-small's sweet spot for retrieval quality
- Overlap ensures context at chunk boundaries isn't lost
- Section-aware splitting preserves semantic coherence (a FAQ answer stays in one chunk)

```python
# services/embedding_service.py

class EmbeddingService:
    CHUNK_SIZE = 1200       # characters (~400 tokens)
    CHUNK_OVERLAP = 150     # characters (~50 tokens)

    @staticmethod
    def chunk_markdown(content: str, source_document: str) -> list[dict]:
        """
        Split markdown content into chunks, respecting section boundaries.

        Returns list of:
        {
            'content': str,           # The chunk text
            'source_document': str,   # Filename
            'source_section': str,    # Nearest ## header
            'chunk_index': int,       # Order within document
        }
        """
        chunks = []
        current_section = ''
        chunk_index = 0

        # First, split by markdown headers (## and ###)
        sections = re.split(r'(?=^#{2,3}\s)', content, flags=re.MULTILINE)

        for section in sections:
            # Extract section header
            header_match = re.match(r'^(#{2,3})\s+(.+)', section)
            if header_match:
                current_section = header_match.group(2).strip()

            # If section fits in one chunk, keep it whole
            if len(section) <= EmbeddingService.CHUNK_SIZE:
                if section.strip():
                    chunks.append({
                        'content': section.strip(),
                        'source_document': source_document,
                        'source_section': current_section,
                        'chunk_index': chunk_index,
                    })
                    chunk_index += 1
            else:
                # Split long sections by paragraphs, then by sentences
                sub_chunks = EmbeddingService._split_long_section(
                    section, current_section, source_document, chunk_index
                )
                chunks.extend(sub_chunks)
                chunk_index += len(sub_chunks)

        return chunks

    @staticmethod
    def _split_long_section(text, section, source_doc, start_index):
        """Split a long section into overlapping chunks."""
        paragraphs = text.split('\n\n')
        chunks = []
        current_chunk = ''
        chunk_index = start_index

        for paragraph in paragraphs:
            if len(current_chunk) + len(paragraph) > EmbeddingService.CHUNK_SIZE:
                if current_chunk.strip():
                    chunks.append({
                        'content': current_chunk.strip(),
                        'source_document': source_doc,
                        'source_section': section,
                        'chunk_index': chunk_index,
                    })
                    chunk_index += 1
                    # Keep overlap from end of previous chunk
                    overlap = current_chunk[-EmbeddingService.CHUNK_OVERLAP:]
                    current_chunk = overlap + '\n\n' + paragraph
                else:
                    current_chunk = paragraph
            else:
                current_chunk += '\n\n' + paragraph if current_chunk else paragraph

        # Final chunk
        if current_chunk.strip():
            chunks.append({
                'content': current_chunk.strip(),
                'source_document': source_doc,
                'source_section': section,
                'chunk_index': chunk_index,
            })

        return chunks
```

### 4.2 Embedding Generation

**Model:** OpenAI `text-embedding-3-small`
- Dimensions: 1536 (default, no reduction for simplicity at this scale)
- Cost: $0.02 per 1M tokens
- For entire document corpus (~50-100 chunks): **under $0.01 total**

```python
# services/embedding_service.py (continued)

from openai import AsyncOpenAI
from django.conf import settings

class EmbeddingService:
    _client = None

    @classmethod
    def _get_client(cls):
        if cls._client is None:
            cls._client = AsyncOpenAI()
        return cls._client

    @staticmethod
    async def generate_embedding(text: str) -> list[float]:
        """Generate a single embedding vector."""
        client = EmbeddingService._get_client()
        response = await client.embeddings.create(
            model=settings.AI_CHAT_CONFIG['EMBEDDING_MODEL'],
            input=text,
        )
        return response.data[0].embedding

    @staticmethod
    async def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts in one API call.
        OpenAI supports up to 2048 inputs per batch request.
        """
        client = EmbeddingService._get_client()
        response = await client.embeddings.create(
            model=settings.AI_CHAT_CONFIG['EMBEDDING_MODEL'],
            input=texts,
        )
        return [item.embedding for item in response.data]
```

### 4.3 Storage

```python
# services/embedding_service.py (continued)

    @staticmethod
    async def ingest_document(file_path: str, category: str = 'general'):
        """
        Full ingestion pipeline for a single document.

        1. Read markdown file
        2. Split into chunks
        3. Generate embeddings (batched)
        4. Upsert into DocumentChunk table
        5. Update full-text search vectors
        """
        from ..models import DocumentChunk
        from asgiref.sync import sync_to_async

        # Read file
        with open(file_path, 'r') as f:
            content = f.read()

        source_document = os.path.basename(file_path)

        # Chunk
        chunks = EmbeddingService.chunk_markdown(content, source_document)

        if not chunks:
            return 0

        # Generate embeddings (batch)
        texts = [c['content'] for c in chunks]
        embeddings = await EmbeddingService.generate_embeddings_batch(texts)

        # Upsert into database
        @sync_to_async
        def _upsert():
            # Delete existing chunks for this document (full re-index)
            DocumentChunk.objects.filter(source_document=source_document).delete()

            objects = []
            for chunk_data, embedding in zip(chunks, embeddings):
                objects.append(DocumentChunk(
                    content=chunk_data['content'],
                    embedding=embedding,
                    source_document=chunk_data['source_document'],
                    source_section=chunk_data['source_section'],
                    chunk_index=chunk_data['chunk_index'],
                    category=category,
                ))

            created = DocumentChunk.objects.bulk_create(objects)

            # Update full-text search vectors
            from django.contrib.postgres.search import SearchVector
            DocumentChunk.objects.filter(
                source_document=source_document
            ).update(
                search_vector=SearchVector('content', config='english')
            )

            return len(created)

        return await _upsert()

    @staticmethod
    async def ingest_all_documents():
        """Ingest all documents from the documents directory."""
        docs_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'documents'
        )

        # Category mapping from filename
        category_map = {
            'faq': 'faq',
            'cancellation': 'policy',
            'payment': 'policy',
            'terms': 'policy',
            'booking': 'process',
            'event-day': 'process',
            'venue': 'venue',
            'package': 'package',
            'catering': 'general',
        }

        total = 0
        for filename in sorted(os.listdir(docs_dir)):
            if not filename.endswith('.md'):
                continue

            file_path = os.path.join(docs_dir, filename)
            category = 'general'
            for prefix, cat in category_map.items():
                if filename.startswith(prefix):
                    category = cat
                    break

            count = await EmbeddingService.ingest_document(file_path, category)
            logger.info(f"Ingested {filename}: {count} chunks (category: {category})")
            total += count

        logger.info(f"Total chunks ingested: {total}")
        return total
```

### 4.4 Management Command

```python
# management/commands/ingest_documents.py
import asyncio
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Ingest company documents into the RAG vector store'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            help='Ingest a single file instead of all documents',
        )
        parser.add_argument(
            '--category',
            type=str,
            default='general',
            help='Category for single file ingestion',
        )

    def handle(self, *args, **options):
        from core.domains.ai_chat.services.embedding_service import EmbeddingService

        if options['file']:
            count = asyncio.run(
                EmbeddingService.ingest_document(options['file'], options['category'])
            )
            self.stdout.write(f"Ingested {count} chunks from {options['file']}")
        else:
            count = asyncio.run(EmbeddingService.ingest_all_documents())
            self.stdout.write(f"Ingested {count} total chunks")
```

Usage:
```bash
# Ingest all documents
python manage.py ingest_documents

# Ingest a single file
python manage.py ingest_documents --file documents/faq.md --category faq
```

---

## 5. Retrieval: Hybrid Search

### 5.1 Why Hybrid Search

Vector similarity search alone misses keyword-specific matches. Full-text search alone misses semantic similarity. Combining both with Reciprocal Rank Fusion (RRF) yields 18-22% better retrieval quality than either alone.

**Example where hybrid wins:**
- Query: "What is the cancellation admin fee percentage?"
- Vector search finds semantically similar content about cancellation policies
- FTS finds the exact term "admin fee percentage" in a different chunk
- RRF merges both result sets, ranking chunks that appear in both lists highest

### 5.2 Implementation

```python
# services/rag_service.py
import logging
from django.db import connection
from asgiref.sync import sync_to_async

logger = logging.getLogger(__name__)

class RAGService:
    """
    Hybrid search combining pgvector cosine similarity
    with PostgreSQL full-text search via Reciprocal Rank Fusion.
    """

    # RRF constant (standard value from literature)
    RRF_K = 60

    # Number of candidates from each search method before fusion
    CANDIDATE_LIMIT = 40

    @staticmethod
    async def hybrid_search(
        query: str,
        category: str | None = None,
        limit: int = 5,
    ) -> list[dict]:
        """
        Execute hybrid search: vector similarity + full-text search.

        Args:
            query: Natural language search query.
            category: Optional category filter (faq, policy, process, venue, package, general).
            limit: Maximum number of results to return.

        Returns:
            List of dicts with keys: id, content, source_document, source_section,
            category, rrf_score
        """
        from .embedding_service import EmbeddingService

        # Generate query embedding
        query_embedding = await EmbeddingService.generate_embedding(query)

        # Execute hybrid search in database
        @sync_to_async
        def _search():
            category_filter = ""
            params = [query_embedding, query_embedding, query, query]

            if category:
                category_filter = "AND category = %s"
                # Insert category filter into both subqueries
                params = [query_embedding, category, query_embedding, query, category, query, limit]
            else:
                params = [query_embedding, query_embedding, query, query, limit]

            # Build SQL with optional category filter
            sql = f"""
            SELECT
                merged.id,
                merged.content,
                merged.source_document,
                merged.source_section,
                merged.category,
                SUM(1.0 / (merged.rank + {RAGService.RRF_K})) AS rrf_score
            FROM (
                -- Vector similarity search (cosine distance)
                (
                    SELECT
                        id, content, source_document, source_section, category,
                        RANK() OVER (ORDER BY embedding <=> %s::vector) AS rank
                    FROM ai_chat_documentchunk
                    WHERE 1=1 {category_filter.replace('%s', '%s') if category else ''}
                    ORDER BY embedding <=> %s::vector
                    LIMIT {RAGService.CANDIDATE_LIMIT}
                )
                UNION ALL
                -- Full-text search (PostgreSQL tsvector)
                (
                    SELECT
                        id, content, source_document, source_section, category,
                        RANK() OVER (
                            ORDER BY ts_rank_cd(search_vector, plainto_tsquery('english', %s)) DESC
                        ) AS rank
                    FROM ai_chat_documentchunk
                    WHERE plainto_tsquery('english', %s) @@ search_vector
                    {"AND category = %s" if category else ""}
                    ORDER BY rank
                    LIMIT {RAGService.CANDIDATE_LIMIT}
                )
            ) merged
            GROUP BY merged.id, merged.content, merged.source_document,
                     merged.source_section, merged.category
            ORDER BY rrf_score DESC
            LIMIT %s;
            """

            with connection.cursor() as cursor:
                if category:
                    cursor.execute(sql, [
                        query_embedding, category,
                        query_embedding,
                        query, query, category,
                        limit
                    ])
                else:
                    cursor.execute(sql, [
                        query_embedding,
                        query_embedding,
                        query, query,
                        limit
                    ])

                columns = [col[0] for col in cursor.description]
                results = [dict(zip(columns, row)) for row in cursor.fetchall()]

            return results

        results = await _search()

        if not results:
            logger.debug(f"Hybrid search returned 0 results for query: {query[:100]}")

        return results

    @staticmethod
    async def get_context_for_query(
        query: str,
        category: str | None = None,
        limit: int = 5,
    ) -> str:
        """
        Retrieve and format context for injection into the LLM prompt.

        Returns a formatted string like:
            [Source: faq.md > Cancellation Policy]
            Content of the chunk here...

            [Source: payment-terms.md > Deposit Requirements]
            Content of another chunk...
        """
        results = await RAGService.hybrid_search(query, category, limit)

        if not results:
            return ""

        context_parts = []
        for result in results:
            source = result['source_document']
            section = result.get('source_section', '')
            header = f"[Source: {source}"
            if section:
                header += f" > {section}"
            header += "]"

            context_parts.append(f"{header}\n{result['content']}")

        return "\n\n---\n\n".join(context_parts)
```

### 5.3 Simplified Alternative

If the raw SQL approach above proves hard to maintain, a simpler two-step Python approach works:

```python
@staticmethod
async def hybrid_search_simple(query, category=None, limit=5):
    """Simpler hybrid search without raw SQL — two ORM queries + Python RRF."""
    from ..models import DocumentChunk
    from pgvector.django import CosineDistance
    from django.contrib.postgres.search import SearchQuery, SearchRank

    query_embedding = await EmbeddingService.generate_embedding(query)

    @sync_to_async
    def _search():
        base_qs = DocumentChunk.objects.all()
        if category:
            base_qs = base_qs.filter(category=category)

        # Vector search
        vector_results = list(
            base_qs.annotate(
                distance=CosineDistance('embedding', query_embedding)
            ).order_by('distance')[:40].values_list('id', flat=True)
        )

        # FTS search
        search_query = SearchQuery(query, config='english')
        fts_results = list(
            base_qs.filter(
                search_vector=search_query
            ).annotate(
                rank=SearchRank('search_vector', search_query)
            ).order_by('-rank')[:40].values_list('id', flat=True)
        )

        # RRF fusion
        scores = {}
        for rank, doc_id in enumerate(vector_results):
            scores[doc_id] = scores.get(doc_id, 0) + 1.0 / (rank + 60)
        for rank, doc_id in enumerate(fts_results):
            scores[doc_id] = scores.get(doc_id, 0) + 1.0 / (rank + 60)

        # Sort by RRF score, take top N
        top_ids = sorted(scores, key=scores.get, reverse=True)[:limit]

        # Fetch full objects preserving order
        chunks = {c.id: c for c in DocumentChunk.objects.filter(id__in=top_ids)}
        return [
            {
                'id': doc_id,
                'content': chunks[doc_id].content,
                'source_document': chunks[doc_id].source_document,
                'source_section': chunks[doc_id].source_section,
                'category': chunks[doc_id].category,
                'rrf_score': scores[doc_id],
            }
            for doc_id in top_ids
            if doc_id in chunks
        ]

    return await _search()
```

---

## 6. Integration with PydanticAI Agent

The RAG pipeline is exposed to the agent via the `search_faq` tool (defined in [02-tool-schema-design.md](./02-tool-schema-design.md)). The agent decides when to call it based on the user's query.

**When the agent calls `search_faq`:**
1. Tool receives the query string and optional category
2. Calls `RAGService.hybrid_search()`
3. Returns top 5 results with content, source, and relevance score
4. Agent reads the results and synthesizes an answer
5. Agent cites the source document in its response

**The agent does NOT get RAG context automatically injected.** It must explicitly call the `search_faq` tool. This is intentional:
- Prevents wasting context window on irrelevant FAQ content for package curation queries
- Lets the agent decide whether a question needs documentation lookup
- Keeps the system prompt clean and focused

---

## 7. pgvector Configuration

### 7.1 Index Tuning

The HNSW index parameters in the DocumentChunk model:

```python
HnswIndex(
    name='docchunk_embedding_hnsw',
    fields=['embedding'],
    m=16,               # Connections per node (default, good for <10K vectors)
    ef_construction=64,  # Build quality (default, good balance)
    opclasses=['vector_cosine_ops'],  # Cosine distance
)
```

For the expected document corpus size (~50-200 chunks), these defaults are more than sufficient. Tuning becomes relevant at 100K+ vectors.

### 7.2 Query-Time Settings

For improved recall on filtered queries (pgvector 0.8.0+):

```python
# In RAGService, before executing filtered queries:
with connection.cursor() as cursor:
    cursor.execute("SET hnsw.iterative_scan = relaxed_order;")
    cursor.execute("SET hnsw.ef_search = 100;")  # Default 40, increase for better recall
    # ... execute search query
```

### 7.3 PostgreSQL Extensions Required

```sql
-- Required (added via VectorExtension migration)
CREATE EXTENSION IF NOT EXISTS vector;

-- Already available in standard PostgreSQL (no extra install)
-- Full-text search: tsvector, tsquery, plainto_tsquery
-- GIN index: for search_vector field
```

---

## 8. Document Authoring Guidelines

For optimal RAG retrieval, company documents should follow these formatting guidelines:

### 8.1 Structure

```markdown
# Document Title

Brief introduction paragraph.

## Section Header

Clear, self-contained content. Each section should be understandable
on its own without reading previous sections.

### Subsection (FAQ format works best)

**Q: What is the cancellation policy?**

A: Events cancelled more than 30 days before the event date receive
a full refund minus a 10% admin fee. Events cancelled within 30 days
are subject to the following schedule: ...
```

### 8.2 Best Practices

1. **Self-contained sections:** Each `##` section should make sense on its own. Avoid "as mentioned above" references.
2. **FAQ format preferred:** Q&A pairs chunk naturally and retrieve well.
3. **Specific numbers:** Include actual figures (prices, percentages, days) rather than vague references.
4. **No markdown tables for critical data:** Tables often chunk poorly. Use lists instead.
5. **Keep sections under 1500 characters:** Sections longer than this will be split, potentially breaking context.
6. **Use consistent terminology:** Match terms used on the website and in the booking flow.

---

## 9. Re-Ingestion Strategy

### 9.1 When to Re-Ingest

- **Document content changes:** Edit the markdown file, then run `python manage.py ingest_documents`
- **New documents added:** Add to `documents/` directory, update `category_map` in `ingest_all_documents()`, run command
- **Embedding model changes:** If upgrading to a different embedding model, all documents must be re-embedded (dimensions may change)

### 9.2 Automation

Add to CI/CD pipeline (optional, only if documents change frequently):

```yaml
# In .github/workflows/ci-cd.yml, after backend deploy:
- name: Re-ingest RAG documents
  if: contains(github.event.commits.*.modified, 'backend/core/domains/ai_chat/documents/')
  run: |
    fly ssh console -a lifeplace-api -C "python manage.py ingest_documents"
```

For now, manual re-ingestion via management command is sufficient given the low frequency of document changes.

---

## 10. Monitoring and Debugging

### 10.1 Logging

```python
# RAGService logs at DEBUG level for every search
logger.debug(f"Hybrid search: query='{query[:100]}', results={len(results)}, top_score={results[0]['rrf_score'] if results else 'N/A'}")

# EmbeddingService logs ingestion
logger.info(f"Ingested {filename}: {count} chunks (category: {category})")
```

### 10.2 Admin Interface

Register DocumentChunk in Django admin for inspection:

```python
# admin.py
@admin.register(DocumentChunk)
class DocumentChunkAdmin(admin.ModelAdmin):
    list_display = ['source_document', 'source_section', 'chunk_index', 'category', 'created_at']
    list_filter = ['category', 'source_document']
    search_fields = ['content', 'source_section']
    readonly_fields = ['embedding', 'search_vector', 'created_at', 'updated_at']
```

### 10.3 Quality Metrics

Track retrieval quality over time:
- Log `rrf_score` of top result for each search
- If top score is consistently below 0.01, the query pattern is not well-covered by documents
- Periodically review low-score queries to identify documentation gaps

---

## 11. Cost Estimate

| Operation | Volume | Cost |
|-----------|--------|------|
| Initial document embedding | ~100 chunks × ~400 tokens | ~$0.001 |
| Per-user-query embedding | 1 query × ~50 tokens | ~$0.000001 |
| Monthly query volume (1000 queries) | 1000 × ~50 tokens | ~$0.001 |
| Re-ingestion (full corpus) | ~100 chunks × ~400 tokens | ~$0.001 |
| **Total monthly RAG cost** | | **< $0.01** |

The RAG pipeline cost is negligible. The LLM response generation (GPT-4.1-mini) is the dominant cost factor, not embeddings or retrieval.

---

## References

- [01-backend-architecture.md](./01-backend-architecture.md) — DocumentChunk model definition
- [02-tool-schema-design.md](./02-tool-schema-design.md) — `search_faq` tool that calls this pipeline
- [pgvector documentation](https://github.com/pgvector/pgvector)
- [pgvector-python Django integration](https://github.com/pgvector/pgvector-python)
- [Hybrid search with PostgreSQL](https://jkatz05.com/post/postgres/hybrid-search-postgres-pgvector/)
