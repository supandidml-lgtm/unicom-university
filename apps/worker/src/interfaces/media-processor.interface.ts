export interface TranscriptSegment {
  startTimeSeconds: number;
  endTimeSeconds: number;
  text: string;
}

export interface VideoTranscriptionResult {
  durationSeconds: number;
  fullTranscriptText: string;
  segments: TranscriptSegment[];
}

export interface PdfExtractionResult {
  totalPages: number;
  fullText: string;
  pages: Array<{
    pageNumber: number;
    text: string;
  }>;
}

export interface IMediaProcessor {
  transcribeVideo(fileBuffer: Buffer | string): Promise<VideoTranscriptionResult>;
  extractPdfText(fileBuffer: Buffer | string): Promise<PdfExtractionResult>;
}
