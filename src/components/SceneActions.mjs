import { MODULE_ID } from "../constants/General.mjs";
import { SETTINGS_KEYS } from "../constants/Settings.mjs";
import { LogUtil } from "./LogUtil.mjs";

const HARDCODED_DEFAULTS = {
  backgroundColor: "#000000",
  tokenVision: false,
  "fog.exploration": false,
  initial: { scale: 1 },
};

/**
 * Handles scene creation and image sharing actions
 */
export class SceneActions {

  /**
   * Show Foundry's native Create Scene dialog pre-filled with the media name,
   * then create the scene with sensible defaults for quick use.
   * @param {string} mediaPath - The URL/path to the image or video file
   */
  static async createQuickScene(mediaPath) {
    try {
      const name = SceneActions.#getFileNameFromPath(mediaPath);
      const { width, height } = await SceneActions.#getMediaDimensions(mediaPath);
      const savedDefaults = game.settings.get(MODULE_ID, SETTINGS_KEYS.SCENE_DEFAULTS) ?? {};
      const defaults = foundry.utils.isEmpty(savedDefaults) ? HARDCODED_DEFAULTS : savedDefaults;

      const scene = await Scene.implementation.createDialog(foundry.utils.mergeObject({
        ...defaults,
        name,
        background: { src: mediaPath },
        width,
        height,
      }, {}));
      await scene?.view();
      LogUtil.log("Scene created", [name, mediaPath]);
    } catch (err) {
      LogUtil.error("QUICK_SCENES.notifications.sceneCreateError", { error: err });
    }
  }

  /**
   * Show an image or video to all connected players via ImagePopout
   * @param {string} mediaPath - The URL/path to the image or video file
   */
  static showToPlayers(mediaPath) {
    try {
      const title = SceneActions.#getFileNameFromPath(mediaPath);
      Journal.showImage(mediaPath, { title });
      LogUtil.log("Shown to players", [title, mediaPath]);
    } catch (err) {
      LogUtil.error("QUICK_SCENES.notifications.showError", { error: err });
    }
  }

  /**
   * Send an image or video to the chat log as a clickable message.
   * Clicking the image in chat opens an ImagePopout for fullscreen viewing.
   * @param {string} mediaPath - The URL/path to the image or video file
   */
  static async sendToChat(mediaPath) {
    try {
      const isVideo = foundry.helpers.media.VideoHelper.hasVideoExtension(mediaPath);
      const mediaTag = isVideo
        ? `<video src="${mediaPath}" controls data-qsc-media></video>`
        : `<img src="${mediaPath}" data-qsc-media>`;
      await ChatMessage.create({
        content: `<div class="qsc-chat-image">${mediaTag}</div>`,
      });
      LogUtil.log("Sent to chat", [title, mediaPath]);
    } catch (err) {
      LogUtil.error("QUICK_SCENES.notifications.chatError", { error: err });
    }
  }

  /**
   * Attach click-to-expand handlers on chat messages containing module images.
   * Called from renderChatMessage hook.
   * @param {object} message - The ChatMessage document
   * @param {HTMLElement} element - The rendered HTML element
   */
  static onRenderChatMessage(message, element) {
    const container = element instanceof HTMLElement ? element : element?.[0];
    container?.querySelectorAll("[data-qsc-media]")?.forEach(el => {
      el.addEventListener("click", (event) => {
        event.preventDefault();
        const src = el.getAttribute("src");
        const title = el.closest(".qsc-chat-image")?.querySelector("strong")?.textContent ?? "";
        new ImagePopout({ src, window: { title } }).render(true);
      });
    });
  }

  /**
   * Extract a clean display name from a file path.
   * Removes extension, replaces underscores and hyphens with spaces.
   * @param {string} path - The full file path or URL
   * @returns {string} The cleaned filename
   */
  static #getFileNameFromPath(path) {
    const filename = path?.split("/")?.pop() ?? "Untitled";
    const withoutExt = filename.replace(/\.[^.]+$/, "") || "Untitled";
    return withoutExt.replace(/[_-]/g, " ");
  }

  /**
   * Load media (image or video) and return its natural dimensions
   * @param {string} src - The media URL
   * @returns {Promise<{width: number, height: number}>}
   */
  static #getMediaDimensions(src) {
    const isVideo = foundry.helpers.media.VideoHelper.hasVideoExtension(src);
    if (isVideo) return SceneActions.#getVideoDimensions(src);
    return SceneActions.#getImageDimensions(src);
  }

  /**
   * @param {string} src - The image URL
   * @returns {Promise<{width: number, height: number}>}
   */
  static #getImageDimensions(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  /**
   * @param {string} src - The video URL
   * @returns {Promise<{width: number, height: number}>}
   */
  static #getVideoDimensions(src) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight });
      video.onerror = () => reject(new Error(`Failed to load video: ${src}`));
      video.src = src;
    });
  }
}
