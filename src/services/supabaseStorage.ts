import { uploadToSupabaseStorage, deleteFromSupabaseStorage, STORAGE_BUCKETS, isSupabaseConfigured } from '../lib/supabase.ts';

/**
 * Service providing high-level helper functions for Supabase Storage operations across the app.
 */
export const SupabaseStorageService = {
  /**
   * Check if Supabase Storage is configured in the environment.
   */
  isConfigured: (): boolean => isSupabaseConfigured(),

  /**
   * Upload a trade execution screenshot (e.g. entry chart, exit chart).
   * 
   * @param file File object, Blob, or base64 image string.
   * @param tradeId Optional trade identifier for naming/folder organization.
   * @returns Public CDN URL of the uploaded screenshot.
   */
  uploadTradeScreenshot: async (file: File | Blob | string, tradeId?: string): Promise<string> => {
    const timestamp = Date.now();
    const cleanTradeId = tradeId ? tradeId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'unassigned';
    const destinationPath = `trades/${cleanTradeId}/${timestamp}_chart.png`;
    return await uploadToSupabaseStorage(file, STORAGE_BUCKETS.TRADE_ATTACHMENTS, destinationPath);
  },

  /**
   * Upload a daily journal chart or attachment.
   * 
   * @param file File object, Blob, or base64 image string.
   * @param noteId Optional journal note identifier.
   * @returns Public CDN URL of the uploaded image.
   */
  uploadJournalScreenshot: async (file: File | Blob | string, noteId?: string): Promise<string> => {
    const timestamp = Date.now();
    const cleanNoteId = noteId ? noteId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'general';
    const destinationPath = `journal/${cleanNoteId}/${timestamp}_attachment.png`;
    return await uploadToSupabaseStorage(file, STORAGE_BUCKETS.JOURNAL_ASSETS, destinationPath);
  },

  /**
   * Upload a user profile avatar image.
   * 
   * @param file File object, Blob, or base64 image string.
   * @param userId User identifier.
   * @returns Public CDN URL of the uploaded avatar.
   */
  uploadAvatar: async (file: File | Blob | string, userId: string): Promise<string> => {
    const cleanUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const destinationPath = `avatars/${cleanUserId}_avatar.png`;
    return await uploadToSupabaseStorage(file, STORAGE_BUCKETS.AVATARS, destinationPath);
  },

  /**
   * Upload a generic image/document to Supabase Storage.
   * 
   * @param file File object, Blob, or base64 string.
   * @param bucket Storage bucket name.
   * @param path Custom path within the bucket.
   * @returns Public CDN URL.
   */
  uploadGenericFile: async (
    file: File | Blob | string,
    bucket: string = STORAGE_BUCKETS.SCREENSHOTS,
    path?: string
  ): Promise<string> => {
    return await uploadToSupabaseStorage(file, bucket, path);
  },

  /**
   * Delete a journal attachment or screenshot from Supabase Storage.
   */
  deleteJournalAttachment: async (fileUrl: string): Promise<boolean> => {
    if (!fileUrl) return false;
    return await deleteFromSupabaseStorage(fileUrl, STORAGE_BUCKETS.JOURNAL_ASSETS);
  },

  /**
   * Delete multiple attachments or screenshots from Supabase Storage.
   */
  deleteMultipleJournalAttachments: async (fileUrls: string[]): Promise<void> => {
    if (!fileUrls || !fileUrls.length) return;
    await Promise.allSettled(
      fileUrls.map((url) => deleteFromSupabaseStorage(url, STORAGE_BUCKETS.JOURNAL_ASSETS))
    );
  },
};
