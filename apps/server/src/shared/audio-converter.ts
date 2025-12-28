import { Decoder, Demuxer, Encoder, Muxer } from "node-av/api";
import { FF_ENCODER_AAC } from "node-av/constants";

/**
 * Audio conversion utilities using node-av (native FFmpeg bindings)
 * Converts various audio formats to m4a (AAC) for iOS compatibility
 *
 * Uses in-memory buffers - no temp files or system ffmpeg required
 */

const SUPPORTED_INPUT_EXTENSIONS = [".opus", ".ogg", ".wav", ".mp3", ".webm"];
const OUTPUT_EXTENSION = ".m4a";

export class AudioConversionError extends Error {
  constructor(
    message: string,
    public readonly code: "CONVERSION_FAILED" | "NO_AUDIO_STREAM"
  ) {
    super(message);
    this.name = "AudioConversionError";
  }
}

/**
 * Check if a file needs conversion based on its extension
 */
export function needsConversion(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  return SUPPORTED_INPUT_EXTENSIONS.includes(ext);
}

/**
 * Get the output filename with .m4a extension
 */
export function getM4aFilename(originalFilename: string): string {
  const lastDot = originalFilename.lastIndexOf(".");
  const baseName =
    lastDot > 0 ? originalFilename.slice(0, lastDot) : originalFilename;
  return `${baseName}${OUTPUT_EXTENSION}`;
}

export type ConversionResult = {
  data: Uint8Array;
  filename: string;
};

/**
 * Convert audio file to m4a format using node-av (native FFmpeg bindings)
 *
 * @param input - Raw audio data as Uint8Array
 * @param originalFilename - Original filename (used to determine input format)
 * @returns Converted audio data and new filename
 * @throws AudioConversionError if conversion fails
 */
export async function convertToM4a(
  input: Uint8Array<ArrayBufferLike>,
  originalFilename: string
): Promise<ConversionResult> {
  // If already m4a, return as-is
  if (originalFilename.toLowerCase().endsWith(".m4a")) {
    return { data: input, filename: originalFilename };
  }

  let demuxer: Demuxer | null = null;
  let decoder: Decoder | null = null;
  let muxer: Muxer | null = null;

  try {
    // Open input from buffer
    demuxer = await Demuxer.open(Buffer.from(input));

    const audioStream = demuxer.audio();
    if (!audioStream) {
      throw new AudioConversionError(
        "No audio stream found in input file",
        "NO_AUDIO_STREAM"
      );
    }

    // Create decoder from input stream
    decoder = await Decoder.create(audioStream);

    // Create AAC encoder
    const encoder = await Encoder.create(FF_ENCODER_AAC, {
      decoder, // Copy sample rate, channels from decoder
      bitrate: "128k",
    });

    // Collect output chunks in memory
    const chunks: Buffer[] = [];
    muxer = await Muxer.open(
      {
        write: (buffer: Buffer) => {
          chunks.push(Buffer.from(buffer));
          return buffer.length;
        },
        seek: (offset: bigint) => offset,
      },
      {
        format: "ipod", // ipod format = m4a container
        options: {
          // Fragmented MP4 flags required for writing to memory buffers
          // Without these, the moov atom won't be written correctly
          movflags: "frag_keyframe+empty_moov+default_base_moof",
        },
      }
    );

    // Add audio stream to output
    const outputIndex = muxer.addStream(encoder, {
      inputStream: audioStream,
    });

    // Transcode: demux → decode → encode → mux
    for await (const packet of demuxer.packets(audioStream.index)) {
      for await (const frame of decoder.frames(packet)) {
        for await (const encodedPacket of encoder.packets(frame)) {
          await muxer.writePacket(encodedPacket, outputIndex);
        }
      }
    }

    // Flush encoder
    const flushResult = encoder.flushPackets();
    if (
      flushResult &&
      typeof flushResult[Symbol.asyncIterator] === "function"
    ) {
      for await (const packet of flushResult) {
        await muxer.writePacket(packet, outputIndex);
      }
    }

    // Close muxer (writes trailer automatically)
    await muxer.close();
    muxer = null;

    return {
      data: new Uint8Array(Buffer.concat(chunks)),
      filename: getM4aFilename(originalFilename),
    };
  } catch (error) {
    if (error instanceof AudioConversionError) {
      throw error;
    }
    throw new AudioConversionError(
      `Conversion failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      "CONVERSION_FAILED"
    );
  } finally {
    try {
      decoder?.close();
    } catch {
      // ignore cleanup errors
    }

    try {
      await demuxer?.close();
    } catch {
      // ignore cleanup errors
    }

    try {
      await muxer?.close();
    } catch {
      // ignore cleanup errors
    }
  }
}
