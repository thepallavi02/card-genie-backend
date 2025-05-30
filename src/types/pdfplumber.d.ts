declare module 'pdfplumber' {
  export interface PDFPage {
    extractText(): Promise<string>;
  }

  export interface PDFDocument {
    pages: PDFPage[];
  }

  export function open(pdfPath: string): Promise<PDFDocument>;
} 