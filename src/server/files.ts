import JSZip from "jszip";
import { AppError } from "./errors";

/**
 * Upload validation (§48): extension allow-list, magic-byte sniffing (MIME is
 * never trusted), size limits, macro / script / zip-bomb rejection.
 */
export type FileKind = "docx" | "doc" | "xlsx" | "xls" | "pptx" | "ppt" | "pdf" | "png" | "jpg" | "webp" | "gif" | "csv" | "mp3";

const EXT: Record<string, FileKind> = {
  docx: "docx",
  doc: "doc",
  xlsx: "xlsx",
  xls: "xls",
  pptx: "pptx",
  ppt: "ppt",
  pdf: "pdf",
  png: "png",
  jpg: "jpg",
  jpeg: "jpg",
  webp: "webp",
  gif: "gif",
  csv: "csv",
  mp3: "mp3",
};

export const MIME: Record<FileKind, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  csv: "text/csv",
  mp3: "audio/mpeg",
};

const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const startsWith = (b: Buffer, sig: number[]) => sig.every((x, i) => b[i] === x);

export function safeFileName(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w.\- ]+/g, "")
      .replace(/\s+/g, "_")
      .slice(-120) || "file"
  );
}

export interface ValidatedFile {
  kind: FileKind;
  mime: string;
  name: string;
  bytes: Buffer;
  warnings: string[];
}

export async function validateUpload(
  file: { name: string; bytes: Buffer },
  allowed: FileKind[],
  maxBytes: number,
): Promise<ValidatedFile> {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  const kind = EXT[ext];
  if (!kind || !allowed.includes(kind)) {
    throw new AppError("VALIDATION", `Unsupported file type ".${ext}". Allowed: ${allowed.map((a) => `.${a}`).join(", ")}.`);
  }
  if (file.bytes.length === 0) throw new AppError("VALIDATION", "The file is empty.");
  if (file.bytes.length > maxBytes) throw new AppError("VALIDATION", `File is too large (max ${(maxBytes / 1_048_576).toFixed(0)} MB).`);
  const b = file.bytes;
  const warnings: string[] = [];
  const bad = () => new AppError("VALIDATION", "The file content does not match its extension. It may be corrupted or unsafe.");

  switch (kind) {
    case "docx":
    case "xlsx":
    case "pptx": {
      if (!startsWith(b, [0x50, 0x4b, 0x03, 0x04])) throw bad();
      let zip: JSZip;
      try {
        zip = await JSZip.loadAsync(b);
      } catch {
        throw bad();
      }
      const names = Object.keys(zip.files);
      const marker = { docx: "word/document.xml", xlsx: "xl/workbook.xml", pptx: "ppt/presentation.xml" }[kind];
      if (!names.includes(marker)) throw bad();
      if (names.some((n) => /vbaProject\.bin$|activeX|\.(exe|dll|js|vbs|bat|cmd|ps1)$/i.test(n))) {
        throw new AppError("VALIDATION", "Files containing macros, ActiveX or executable content are not allowed.");
      }
      // Zip-bomb guard: total uncompressed size and entry count.
      let total = 0;
      for (const n of names) {
        const f = zip.files[n] as unknown as { _data?: { uncompressedSize?: number } };
        total += f._data?.uncompressedSize ?? 0;
      }
      if (names.length > 5000 || total > 150 * 1_048_576) throw new AppError("VALIDATION", "The document is too complex to process safely.");
      break;
    }
    case "doc":
    case "xls":
    case "ppt":
      if (!startsWith(b, OLE)) throw bad();
      if (b.includes(Buffer.from("_VBA_PROJECT")) || b.includes(Buffer.from("VBA\u0000"))) {
        throw new AppError("VALIDATION", "Files containing macros are not allowed.");
      }
      break;
    case "pdf": {
      if (b.subarray(0, 1024).indexOf("%PDF-") === -1) throw bad();
      const text = b.toString("latin1");
      if (/\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia)\b/.test(text)) {
        throw new AppError("VALIDATION", "PDFs with embedded scripts, launch actions or attachments are not allowed.");
      }
      break;
    }
    case "png":
      if (!startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) throw bad();
      break;
    case "jpg":
      if (!startsWith(b, [0xff, 0xd8, 0xff])) throw bad();
      break;
    case "gif":
      if (b.subarray(0, 6).toString("ascii") !== "GIF87a" && b.subarray(0, 6).toString("ascii") !== "GIF89a") throw bad();
      break;
    case "webp":
      if (b.subarray(0, 4).toString("ascii") !== "RIFF" || b.subarray(8, 12).toString("ascii") !== "WEBP") throw bad();
      break;
    case "csv":
      if (b.includes(0)) throw bad();
      break;
    case "mp3":
      // An ID3 tag, or an MPEG audio frame header.
      if (!(b.subarray(0, 3).toString("latin1") === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0))) throw bad();
      break;
  }
  return { kind, mime: MIME[kind], name: safeFileName(file.name), bytes: b, warnings };
}

export async function readFormFile(form: FormData, field = "file"): Promise<{ name: string; bytes: Buffer }> {
  const f = form.get(field);
  if (!f || typeof f === "string") throw new AppError("VALIDATION", "Choose a file to upload.");
  const file = f as File;
  return { name: file.name, bytes: Buffer.from(await file.arrayBuffer()) };
}
