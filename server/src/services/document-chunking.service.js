/**
 * Text extraction and cleaning service for RAG document processing.
 * Removes PDF noise: headers, footers, page numbers, and broken hyphenation.
 */
export function cleanDocumentText(rawText) {
  if (typeof rawText !== "string") return "";

  return (
    rawText
      // Remove repeated page numbers (e.g., "Page 1 of 24", "--- 12 ---")
      .replace(/(?:Page\s+\d+\s+of\s+\d+|\b\d+\s*\/\s*\d+\b|---\s*\d+\s*---)/gi, "")
      // Fix broken hyphenated words at line breaks (e.g., "infor-\nmation" -> "information")
      .replace(/(\w+)-\s*\n\s*(\w+)/g, "$1$2")
      // Normalize line breaks
      .replace(/\r\n/g, "\n")
      // Collapse multiple empty lines
      .replace(/\n{3,}/g, "\n\n")
      // Remove trailing whitespace
      .trim()
  );
}

/**
 * Split document text into overlapping chunks while detecting chapter boundaries.
 */
export function chunkTextWithBoundaries(text, chunkSize = 500, overlap = 100) {
  const clean = cleanDocumentText(text);
  if (!clean) return [];

  const chunks = [];
  let currentChapter = 1;

  // Split into paragraphs first to avoid cutting mid-sentence whenever possible
  const paragraphs = clean.split(/\n\s*\n/);
  let currentBuffer = "";

  for (const para of paragraphs) {
    // Check if paragraph introduces a new chapter header
    const chapterMatch = para.match(/^(?:Chapter|Section|Part)\s+(\d+)/i);
    if (chapterMatch) {
      currentChapter = parseInt(chapterMatch[1], 10);
    }

    if ((currentBuffer + "\n\n" + para).length > chunkSize && currentBuffer.length > 0) {
      chunks.push({
        text: currentBuffer.trim(),
        chapter: currentChapter,
        spoilerLevel: currentChapter > 3 ? "mild" : "none",
      });

      // Maintain overlap by keeping end of previous buffer
      currentBuffer = currentBuffer.slice(-overlap) + "\n\n" + para;
    } else {
      currentBuffer = currentBuffer ? currentBuffer + "\n\n" + para : para;
    }
  }

  if (currentBuffer.trim().length > 0) {
    chunks.push({
      text: currentBuffer.trim(),
      chapter: currentChapter,
      spoilerLevel: currentChapter > 5 ? "major" : currentChapter > 3 ? "mild" : "none",
    });
  }

  return chunks;
}
