/**
 * Utility for media file type detection
 */
export class MediaUtil {
  /**
   * Check whether a file path points to an image or video based on its extension
   * @param {string} path - The file path to check
   * @returns {boolean} True if the file is an image or video
   */
  static isMediaFile(path) {
    if (!path) return false;
    const ext = path.split(".")?.pop()?.split("?")[0]?.toLowerCase();
    return ext in (CONST.IMAGE_FILE_EXTENSIONS ?? {})
      || ext in (CONST.VIDEO_FILE_EXTENSIONS ?? {});
  }
}
