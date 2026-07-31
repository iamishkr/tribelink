import { supabase } from './supabase';
import { Platform } from 'react-native';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { File as ExpoFile } from 'expo-file-system';

export interface UploadOptions {
  uri: string;
  bucket: 'avatars' | 'covers' | 'chat-media';
  path: string;
  contentType?: string;
}

/**
 * Base64 to ArrayBuffer decoder helper (zero-dependency, cross-platform)
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = globalThis.atob ? globalThis.atob(base64) : '';
  if (binaryString) {
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let bufferLength = base64.length * 0.75;
  const len = base64.length;
  if (base64[len - 1] === '=') bufferLength--;
  if (base64[len - 2] === '=') bufferLength--;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arrayBuffer);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded1 = chars.indexOf(base64[i]);
    const encoded2 = chars.indexOf(base64[i + 1]);
    const encoded3 = chars.indexOf(base64[i + 2]);
    const encoded4 = chars.indexOf(base64[i + 3]);

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== 64 && encoded3 !== -1) {
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (encoded4 !== 64 && encoded4 !== -1) {
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
  }

  return arrayBuffer;
}

/**
 * High performance local file binary reader for Expo SDK 57.
 * Eliminates "Response.blob() performance overhead" warning on Android/iOS.
 */
export const getFileBytes = async (uri: string): Promise<ArrayBuffer | Blob | Uint8Array> => {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    return await response.blob();
  }
  try {
    const file = new ExpoFile(uri);
    return await file.bytes();
  } catch {
    const base64 = await FileSystemLegacy.readAsStringAsync(uri, {
      encoding: FileSystemLegacy.EncodingType.Base64,
    });
    return base64ToArrayBuffer(base64);
  }
};

/**
 * Safely extract relative storage path from a full Supabase storage public or signed URL
 */
export const extractStoragePathFromUrl = (url: string, bucket: string): string | null => {
  if (!url) return null;
  const cleanUrl = url.split('?')[0];

  const bucketMarker = `/${bucket}/`;
  const index = cleanUrl.indexOf(bucketMarker);
  if (index !== -1) {
    return cleanUrl.substring(index + bucketMarker.length);
  }

  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    return cleanUrl;
  }

  return null;
};

/**
 * Cross-platform image upload utility for Supabase Storage (Android, iOS, Web)
 * Expo SDK 57 Compliant
 */
export const uploadImage = async ({
  uri,
  bucket,
  path,
  contentType,
}: UploadOptions): Promise<string> => {
  const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const mime = contentType || (extension === 'png' ? 'image/png' : 'image/jpeg');

  try {
    const fileData = await getFileBytes(uri);

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, fileData, {
        contentType: mime,
        upsert: true,
      });

    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
  } catch (err: any) {
    console.error(`[Storage] Upload error for ${bucket}/${path}:`, err);
    throw new Error(err.message || 'Image upload failed.');
  }
};

/**
 * Delete image from Supabase Storage bucket.
 * Accepts full public URL, exact path, or userId.
 * Automatically cleans up all potential file extension variants (.jpg, .jpeg, .png, .webp).
 */
export const deleteImage = async (
  bucket: 'avatars' | 'covers' | 'chat-media',
  urlOrUserId: string
): Promise<void> => {
  if (!urlOrUserId) return;

  const extractedPath = extractStoragePathFromUrl(urlOrUserId, bucket);
  const targetsToDelete: string[] = [];

  if (extractedPath) {
    targetsToDelete.push(extractedPath);
    const dotIndex = extractedPath.lastIndexOf('.');
    if (dotIndex !== -1) {
      const stem = extractedPath.substring(0, dotIndex);
      ['jpg', 'jpeg', 'png', 'webp'].forEach(ext => {
        const variant = `${stem}.${ext}`;
        if (!targetsToDelete.includes(variant)) {
          targetsToDelete.push(variant);
        }
      });
    }
  } else {
    ['jpg', 'jpeg', 'png', 'webp'].forEach(ext => {
      targetsToDelete.push(`${urlOrUserId}.${ext}`);
    });
  }

  try {
    const { error } = await supabase.storage.from(bucket).remove(targetsToDelete);
    if (error) {
      console.warn(`[Storage] Delete warning for ${bucket}:`, error);
    }
  } catch (err) {
    console.error(`[Storage] Exception during deletion from ${bucket}:`, err);
  }
};

/**
 * Get Public URL for a storage object
 */
export const getPublicImageUrl = (bucket: 'avatars' | 'covers' | 'chat-media', path: string): string => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

/**
 * Get Signed URL for temporary access
 */
export const getSignedImageUrl = async (
  bucket: 'avatars' | 'covers' | 'chat-media',
  path: string,
  expiresInSeconds = 3600
): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error) throw error;
  return data.signedUrl;
};
