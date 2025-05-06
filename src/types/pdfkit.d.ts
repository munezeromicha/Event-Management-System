declare module 'pdfkit' {
  class PDFDocument {
    constructor(options?: any);
    pipe(stream: any): void;
    end(): void;
    text(text: string, x?: number, y?: number, options?: any): void;
    image(path: string, x?: number, y?: number, options?: any): void;
    font(path: string): void;
    fontSize(size: number): void;
    moveDown(lines?: number): void;
    moveUp(lines?: number): void;
    save(): void;
    [key: string]: any;
  }

  export = PDFDocument;
} 