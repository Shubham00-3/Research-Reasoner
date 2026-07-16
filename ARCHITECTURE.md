# Architecture

ResearchReasoner is a research discovery and reasoning workspace.

## Data Flow

1. A user searches for a topic.
2. The backend queries real providers such as arXiv and Semantic Scholar.
3. Paper metadata is normalized with provenance fields.
4. The graph service builds explainable relationships.
5. Neo4j stores papers, authors, topics, relationships, content, and embeddings.
6. The chat service retrieves relevant papers and content.
7. Groq generates answers from retrieved context.

## Trust Model

Every paper should expose:

- `sourceType`
- `sourceProvider`
- `externalId`
- `isVerified`
- `citationCountVerified`
- `provenance`

Production mode must not mix demo records into real research results.

## Retrieval

The current retrieval stack combines:

- keyword search,
- local cosine similarity over stored embeddings,
- graph traversal,
- LLM synthesis over retrieved context.

The next production milestone is chunk-level embeddings and source-snippet citation grounding.
