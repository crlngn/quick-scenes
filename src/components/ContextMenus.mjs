import { SceneActions } from "./SceneActions.mjs";
import { MediaUtil } from "./MediaUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";

/**
 * Manages context menu attachment to FilePicker and Journal sheet elements
 */
export class ContextMenus {

  /**
   * Attach context menus to FilePicker file and folder entries
   * Called from renderFilePicker hook
   * @param {object} app - The FilePicker application instance
   * @param {HTMLElement} element - The rendered HTML element
   */
  static attachToFilePicker(app, element) {
    if (!game.user?.isGM) return;
    const container = element instanceof HTMLElement ? element : element?.[0];
    if (!container) return;
    new ContextMenu(container, "li[data-file]", ContextMenus.#getMenuItems(), { fixed: true, jQuery: false });
    new ContextMenu(container, "li[data-directory]", ContextMenus.#getFolderMenuItems(app), { fixed: true, jQuery: false });
    LogUtil.log("Context menu attached to FilePicker");
  }

  /**
   * Attach context menu to journal image elements
   * Called from renderJournalEntrySheet hook
   * @param {object} app - The JournalEntrySheet application instance
   * @param {HTMLElement} element - The rendered HTML element
   */
  static attachToJournal(app, element) {
    if (!game.user?.isGM) return;
    const container = element instanceof HTMLElement ? element : element?.[0];
    if (!container) return;
    new ContextMenu(container, ".journal-page-content img", ContextMenus.#getMenuItems(), { fixed: true, jQuery: false });
    LogUtil.log("Context menu attached to JournalEntrySheet");
  }

  /**
   * Attach context menu to ImagePopout media elements
   * Called from renderImagePopout hook
   * @param {object} app - The ImagePopout application instance
   * @param {HTMLElement} element - The rendered HTML element
   */
  static attachToImagePopout(app, element) {
    if (!game.user?.isGM) return;
    const container = element instanceof HTMLElement ? element : element?.[0];
    if (!container) return;
    new ContextMenu(container, "figure img, figure video", ContextMenus.#getMenuItems(), { fixed: true, jQuery: false });
    LogUtil.log("Context menu attached to ImagePopout");
  }

  /**
   * Build the shared context menu items for Quick Scene and Show to Players
   * @returns {Array<object>} Array of ContextMenuEntry objects
   */
  static #getMenuItems() {
    return [
      {
        name: "QUICK_SCENES.contextMenu.quickScene",
        icon: '<i class="fas fa-map"></i>',
        condition: (target) => MediaUtil.isMediaFile(ContextMenus.#getMediaPath(target)),
        callback: (target) => SceneActions.createQuickScene(ContextMenus.#getMediaPath(target))
      },
      {
        name: "QUICK_SCENES.contextMenu.showPlayers",
        icon: '<i class="fas fa-eye"></i>',
        condition: (target) => MediaUtil.isMediaFile(ContextMenus.#getMediaPath(target)),
        callback: (target) => SceneActions.showToPlayers(ContextMenus.#getMediaPath(target))
      },
      {
        name: "QUICK_SCENES.contextMenu.sendToChat",
        icon: '<i class="fas fa-comment"></i>',
        condition: (target) => MediaUtil.isMediaFile(ContextMenus.#getMediaPath(target)),
        callback: (target) => SceneActions.sendToChat(ContextMenus.#getMediaPath(target))
      }
    ];
  }

  /**
   * Build context menu items for folder entries (bulk operations)
   * @param {object} app - The FilePicker application instance
   * @returns {Array<object>} Array of ContextMenuEntry objects
   */
  static #getFolderMenuItems(app) {
    return [
      {
        name: "QUICK_SCENES.contextMenu.bulkQuickScenes",
        icon: '<i class="fas fa-images"></i>',
        callback: (target) => SceneActions.createBulkQuickScenes(target?.dataset?.path, app.activeSource)
      }
    ];
  }

  /**
   * Extract the media path from a context menu target element.
   * Handles FilePicker li[data-path], Journal img[src], and video[src] elements.
   * @param {HTMLElement} target - The right-clicked element
   * @returns {string|null} The media URL or null
   */
  static #getMediaPath(target) {
    return target?.dataset?.path ?? target?.getAttribute?.("src") ?? null;
  }

}
