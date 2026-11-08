import { md5 } from "@noble/hashes/legacy";

const CHECKSUM_CHUNK_BYTES = 1024 * 1024;

/** MD5 is retained only for the media API's existing file-integrity contract. */
export async function calculateFileMd5(file: Blob): Promise<string> {
  const hash = md5.create();
  try {
    for (let offset = 0; offset < file.size; offset += CHECKSUM_CHUNK_BYTES) {
      const buffer = await file
        .slice(offset, Math.min(offset + CHECKSUM_CHUNK_BYTES, file.size))
        .arrayBuffer();
      hash.update(new Uint8Array(buffer));
    }
    return Array.from(hash.digest(), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  } finally {
    hash.destroy();
  }
}
