export interface MediaChunk {
  chunkId: string;
  materialId: string;
  text: string;
  pageNumber?: number;
  timestampStartSeconds?: number;
  timestampEndSeconds?: number;
  tokenCount: number;
}

export class MediaChunkingService {
  /**
   * Splits raw text into semantic chunks with overlap for precise AI question grounding
   */
  chunkText(
    materialId: string,
    text: string,
    options: { chunkSizeWords?: number; overlapWords?: number } = {},
  ): MediaChunk[] {
    const chunkSize = options.chunkSizeWords || 100;
    const overlap = options.overlapWords || 20;

    const words = text.trim().split(/\s+/);
    if (words.length === 0 || text.trim().length === 0) return [];

    const chunks: MediaChunk[] = [];
    let startIdx = 0;
    let chunkIndex = 1;

    while (startIdx < words.length) {
      const endIdx = Math.min(startIdx + chunkSize, words.length);
      const chunkWords = words.slice(startIdx, endIdx);
      const chunkContent = chunkWords.join(" ");

      chunks.push({
        chunkId: `chk-${materialId}-${chunkIndex}`,
        materialId,
        text: chunkContent,
        tokenCount: chunkWords.length,
      });

      if (endIdx >= words.length) break;
      startIdx += chunkSize - overlap;
      chunkIndex++;
    }

    return chunks;
  }
}
