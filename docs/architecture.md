# Architecture & Technical Design Specification

## 1. Domain Entities & Database Schema

The application is modeled around independent bookstores, community clubs, and reader journeys with strict data normalization and auditability.

```mermaid
erDiagram
    USER ||--o{ SESSION : has
    USER ||--o{ STAFF_MEMBERSHIP : holds
    USER ||--o{ RESERVATION : places
    USER ||--o{ READING_LIST : creates
    USER ||--o{ READING_PROGRESS : tracks
    USER ||--o{ CLUB_MEMBERSHIP : joins
    USER ||--o{ DISCUSSION : posts
    USER ||--o{ CONVERSATION : conducts

    BOOKSTORE ||--o{ STAFF_MEMBERSHIP : employs
    BOOKSTORE ||--o{ INVENTORY : stocks
    BOOKSTORE ||--o{ RESERVATION : fulfills

    BOOK ||--o{ INVENTORY : listed_in
    BOOK ||--o{ RESERVATION : target_of
    BOOK ||--o{ CHUNK : vectorized_into
    BOOK ||--o{ CLUB : assigned_to

    CLUB ||--o{ CLUB_MEMBERSHIP : contains
    CLUB ||--o{ MEETING : schedules
    CLUB ||--o{ DISCUSSION : hosts
    CLUB ||--o{ AGENT_RUN : evaluates
```

### Key Models & Schemas:
- **`Book`**: Stores metadata (`title`, `authors`, `genres`, `themes`, `moods`, `readingLength`, `embedding` vector array 768/1536 dims).
- **`Inventory`**: Stores `quantityOnHand`, `quantityReserved`, and `availableQuantity`. Uses compound index `{ storeId: 1, bookId: 1 }` with uniqueness.
- **`Reservation`**: Tracks hold state (`pending`, `confirmed`, `collected`, `cancelled`, `expired`), hold expiration timestamp, and store pickup window.
- **`ReadingProgress`**: Tracks user's reading position (`currentChapter`, `currentPage`, `spoilerMode`, `status`).
- **`Discussion`**: Stores club posts with `hasSpoilers`, `spoilerChapter`, and `isSpoilerForViewer` evaluated dynamically upon fetch.
- **`AgentRun`**: Records bounded 3-tool executions with tool inputs, tool outputs, ranked candidate proposals, and moderator confirmation status.
- **`AuditLog`**: Append-only log of sensitive operations (inventory adjustments, status overrides, role grants).

---

## 2. Spoiler-Aware RAG Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor Reader
    participant Controller as book-chat.controller
    participant ProgressService as reading-progress.service
    participant RAG as spoiler-aware-rag.service
    participant VectorStore as MongoDB Chunks
    participant Ollama as Ollama qwen3:8b

    Reader->>Controller: POST /api/book-chat { bookId, message }
    Controller->>ProgressService: Get reader's current chapter & spoilerMode
    ProgressService-->>Controller: currentChapter = 4, spoilerMode = "progress_limited"
    Controller->>RAG: queryBookGrounded(bookId, message, { maxPermittedChapter: 4 })
    RAG->>VectorStore: Query embeddings WHERE bookId = bookId AND chapterNumber <= 4
    VectorStore-->>RAG: Filtered chapter chunks (1..4)
    RAG->>Ollama: Generate grounded answer with strict boundary & citation instructions
    Ollama-->>RAG: Grounded response + citations
    RAG->>RAG: Scan response against future plot knowledge; apply mask if necessary
    RAG-->>Controller: { reply, citations, maskedContent }
    Controller-->>Reader: JSON Response
```

---

## 3. Concurrency-Safe Atomic Reservation Flow

To prevent race conditions and overselling when multiple readers attempt to reserve the last available physical copy:

```mermaid
sequenceDiagram
    autonumber
    actor Reader A
    actor Reader B
    participant API as inventory-reservation.service
    participant DB as MongoDB Inventory Collection

    Note over DB: Current State: quantityOnHand: 1, quantityReserved: 0, availableQuantity: 1

    Reader A->>API: Reserve 1 Copy
    Reader B->>API: Reserve 1 Copy (Simultaneous)

    par Reader A Request
        API->>DB: findOneAndUpdate({ storeId, bookId, availableQuantity: { $gte: 1 } }, { $inc: { quantityReserved: 1, availableQuantity: -1 } })
        DB-->>API: SUCCESS (Document updated: availableQuantity: 0)
        API-->>Reader A: 201 Created (Reservation Confirmed)
    and Reader B Request
        API->>DB: findOneAndUpdate({ storeId, bookId, availableQuantity: { $gte: 1 } }, { $inc: { quantityReserved: 1, availableQuantity: -1 } })
        DB-->>API: NULL (Condition availableQuantity >= 1 failed!)
        API-->>Reader B: 409 Conflict: Insufficient stock available
    end
```

---

## 4. Bounded 3-Tool AI Agent Architecture

```mermaid
flowchart TD
    Start["Moderator inputs selection query<br/>(e.g., 'Cozy mystery under 350 pages')"] --> Step1
    
    subgraph Bounded Agent Execution Pipeline
        Step1["Tool 1: searchCatalogTool<br/>Semantic retrieval of candidate books"] --> Step2
        Step2["Tool 2: checkStockAndLengthTool<br/>Verifies live bookstore inventory & page length"] --> Step3
        Step3["Tool 3: compareClubConstraintsTool<br/>Evaluates club size, meeting pace, & warnings"]
    end

    Step3 --> Synthesis["LLM Synthesis (qwen3:8b)<br/>Produces Ranked Candidates & Reasoning"]
    Synthesis --> Proposal["Store AgentProposal in Database (pending)"]
    Proposal --> Review["Moderator Reviews Proposal & Tool Traces in UI"]
    Review --> Confirm{"Moderator Confirms?"}
    Confirm -->|Yes| UpdateBook["Assign selectedBookId to club.currentBookId<br/>Notify members"]
    Confirm -->|No / Adjust| ReRun["Refine query / Run again"]
```
