declare module 'qrcode' {
  interface QRCodeOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    type?: 'image/png' | 'image/jpeg' | 'image/webp';
    quality?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    width?: number;
    height?: number;
  }

  function toDataURL(text: string, options?: QRCodeOptions): Promise<string>;
  function toBuffer(text: string, options?: QRCodeOptions): Promise<Buffer>;
  function toString(text: string, options?: QRCodeOptions): Promise<string>;

  export { toDataURL, toBuffer, toString };
} 