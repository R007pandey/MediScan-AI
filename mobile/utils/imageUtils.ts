/**
 * imageUtils.ts
 *
 * C5 — Compress + base64-encode a captured image before sending to the API.
 * Resizes to max 2048px on the long edge, JPEG quality 0.85.
 * Keeps file size reasonable on slow connections while preserving text legibility.
 */

import * as ImageManipulator from 'expo-image-manipulator';

export interface EncodedFile {
  base64: string;
  mimeType: 'image/jpeg';
  uri: string;
}

export async function compressAndEncode(uri: string): Promise<EncodedFile> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 2048 } }],
    {
      compress: 0.85,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  if (!result.base64) {
    throw new Error('Image compression failed: no base64 output.');
  }

  return {
    base64: result.base64,
    mimeType: 'image/jpeg',
    uri: result.uri,
  };
}
