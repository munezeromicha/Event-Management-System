import QRCode from "qrcode";

export const generateQRCode = async (data: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(data);
  } catch (error) {
    throw new Error("Error generating QR code");
  }
};
