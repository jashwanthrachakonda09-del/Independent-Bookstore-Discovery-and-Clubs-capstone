export interface User {
  _id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  accountStatus: "active" | "suspended" | "pending";
  isSystemAdmin: boolean;
  createdAt: string;
}

export interface Bookstore {
  _id: string;
  name: string;
  slug: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  contactPhone: string;
  contactEmail: string;
  storePolicy: string;
  pickupHours: string;
  holdDurationHours: number;
}

export interface InventoryStoreSummary {
  inventoryId?: string;
  storeId: string;
  storeName: string;
  condition: string;
  format: string;
  quantityOnHand: number;
  quantityReserved: number;
  availableQuantity: number;
  price: number;
  pickupWindows?: string;
  store?: Bookstore;
}

export interface Book {
  _id: string;
  title: string;
  authors: string[];
  isbn?: string;
  publisher?: string;
  publicationYear?: number;
  description: string;
  genres: string[];
  themes: string[];
  moods: string[];
  readingLength: number | null;
  readingLengthUnit: string;
  formats: string[];
  coverImage?: string;
  similarityScore?: number;
  matchReasons?: string[];
  missingInfo?: string[];
  inventorySummary?: {
    totalAvailable: number;
    isReservable: boolean;
    stores: InventoryStoreSummary[];
  };
}

export interface Reservation {
  _id: string;
  readerId: string | { _id: string; name: string; email: string };
  bookId: Book;
  storeId: Bookstore;
  quantity: number;
  condition: string;
  format: string;
  status: "pending" | "confirmed" | "collected" | "cancelled" | "expired";
  expiresAt: string;
  createdAt: string;
  collectedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface ReadingList {
  _id: string;
  name: string;
  description?: string;
  visibility: "private" | "public";
  isDefaultSystemList?: boolean;
  books: {
    _id: string;
    bookId: Book;
    addedAt: string;
    notes?: string;
    order: number;
  }[];
}

export interface ReadingProgress {
  _id: string;
  readerId: string;
  bookId: Book;
  status: "want_to_read" | "reading" | "completed" | "abandoned";
  currentPage: number;
  currentChapter: number;
  spoilerMode: "spoiler_free" | "progress_limited" | "full_book";
  maximumPermittedChapter: number;
  maximumPermittedPage: number;
  visibility: "private" | "club";
  privateNotes?: string;
  updatedAt: string;
}

export interface Club {
  _id: string;
  name: string;
  slug: string;
  description: string;
  genres: string[];
  themes: string[];
  expectedGroupSize: number;
  readingLengthLimit: number;
  membershipPolicy: "open" | "approval_required";
  discussionRules: string;
  spoilerPolicy: "strict_no_spoilers" | "chapter_synchronized" | "unrestricted_post_meeting";
  timezone: string;
  currentBookId?: Book;
  createdBy?: { _id: string; name: string };
  memberCount?: number;
  nextMeeting?: Meeting;
  userMembership?: {
    isMember: boolean;
    isModerator: boolean;
  };
}

export interface Meeting {
  _id: string;
  clubId: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  bookId?: Book;
  readingTarget: string;
  agenda?: string;
  status: "upcoming" | "completed" | "cancelled";
}

export interface Discussion {
  _id: string;
  clubId: string;
  meetingId?: string;
  authorId: { _id: string; name: string };
  content: string;
  hasSpoilers: boolean;
  spoilerChapter: number;
  spoilerSummary?: string;
  status: "visible" | "hidden" | "flagged";
  moderationReason?: string;
  isSpoilerForViewer?: boolean;
  maskedContent?: string | null;
  createdAt: string;
}

export interface Citation {
  sourceTitle: string;
  sourceType: string;
  chapter?: number;
  pageNumber?: number;
  referenceText: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  citations?: Citation[];
  timestamp?: string;
}

export interface AgentProposalCandidate {
  bookId: string;
  title: string;
  author: string;
  matchReasons: string[];
  readingLength: number | null;
  availableStock: number;
  meetsGroupSize: boolean;
  readingTimeSuitability: string;
  clubFitNotes: string;
  missingInfo: string[];
  warnings: string[];
}

export interface AgentProposal {
  proposalId: string;
  proposal: {
    rankedCandidates: AgentProposalCandidate[];
    recommendedCandidateId: string | null;
    summary: string;
    unresolvedConstraints: string[];
  };
  steps: {
    toolName: string;
    input: any;
    output?: any;
    error?: string;
    durationMs: number;
    status: string;
  }[];
}
