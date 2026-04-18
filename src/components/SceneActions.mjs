import { MODULE_ID } from "../constants/General.mjs";
import { SETTINGS_KEYS } from "../constants/Settings.mjs";
import { MediaUtil } from "./MediaUtil.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

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
      const savedDefaults = SettingsUtil.getSceneDefaults();
      const defaults = foundry.utils.isEmpty(savedDefaults) ? {} : savedDefaults;

      const scene = await Scene.implementation.createDialog(foundry.utils.mergeObject({
        ...defaults,
        name,
        ...SceneActions.#buildBackgroundData(mediaPath, defaults),
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
   * Browse a folder for media files, show a confirmation dialog with folder
   * selection, then create scenes in bulk with progress and cancel support.
   * @param {string} folderPath - The path to the folder to browse
   * @param {string} source - The FilePicker source ("data", "public", "s3")
   */
  static async createBulkQuickScenes(folderPath, source) {
    if (!game.user?.isGM) return;
    try {
      const result = await FilePicker.browse(source, folderPath);
      const mediaFiles = result.files.filter(f => MediaUtil.isMediaFile(f));
      if (!mediaFiles.length) {
        ui.notifications.warn(game.i18n.localize("QUICK_SCENES.bulk.noImages"));
        return;
      }

      const folderName = folderPath.split("/").filter(Boolean).pop() ?? "Untitled";
      const dialogResult = await SceneActions.#showBulkDialog(mediaFiles.length, folderName);
      if (!dialogResult) return;

      let targetFolderId = dialogResult.folderId;
      if (dialogResult.newFolderName) {
        const folder = await Folder.implementation.create({ name: dialogResult.newFolderName, type: "Scene" });
        targetFolderId = folder.id;
      }

      let targetPackId = dialogResult.packId;
      if (dialogResult.newPackLabel) {
        const slug = dialogResult.newPackLabel.slugify({ strict: true });
        const pack = await CompendiumCollection.createCompendium({ name: slug, label: dialogResult.newPackLabel, type: "Scene" });
        targetPackId = pack.collection;
      }

      await SceneActions.#executeBulkCreation(mediaFiles, targetFolderId, targetPackId);
    } catch (err) {
      LogUtil.error("QUICK_SCENES.notifications.sceneCreateError", { error: err });
    }
  }

  /**
   * Show the bulk scene creation dialog with image count, destination toggle
   * (world vs compendium), folder/pack selection, and new folder/pack input.
   * @param {number} count - Number of media files found
   * @param {string} folderName - Name of the source folder
   * @returns {Promise<{folderId: string|null, newFolderName: string|null, packId: string|null, newPackLabel: string|null}|null>}
   */
  static async #showBulkDialog(count, folderName) {
    const i18n = (key, data) => data ? game.i18n.format(key, data) : game.i18n.localize(key);
    const sceneFolders = game.folders.filter(f => f.type === "Scene");
    const folderOptions = sceneFolders.map(f =>
      `<option value="${f.id}">${"—".repeat(f.depth)} ${f.name}</option>`
    ).join("");
    const scenePacks = game.packs.filter(p => p.documentName === "Scene");
    const packOptions = scenePacks.map(p =>
      `<option value="${p.collection}">${p.title}</option>`
    ).join("");

    const content = `
      <p>${i18n("QUICK_SCENES.bulk.dialogContent", { count, folder: folderName })}</p>
      <div class="form-group">
        <label>${i18n("QUICK_SCENES.bulk.destination")}</label>
        <select name="destination">
          <option value="world">${i18n("QUICK_SCENES.bulk.destinationWorld")}</option>
          <option value="compendium">${i18n("QUICK_SCENES.bulk.destinationCompendium")}</option>
        </select>
      </div>
      <div class="form-group" data-qsc-world-options>
        <label>${i18n("QUICK_SCENES.bulk.selectFolder")}</label>
        <select name="folderId">
          <option value="">${i18n("QUICK_SCENES.bulk.folderNone")}</option>
          ${folderOptions}
          <option value="__new__">${i18n("QUICK_SCENES.bulk.folderNew")}</option>
        </select>
      </div>
      <div class="form-group" data-qsc-new-folder style="display:none">
        <label>${i18n("QUICK_SCENES.bulk.newFolderName")}</label>
        <input type="text" name="newFolderName" value="${folderName}">
      </div>
      <div class="form-group" data-qsc-compendium-options style="display:none">
        <label>${i18n("QUICK_SCENES.bulk.selectPack")}</label>
        <select name="packId">
          ${packOptions}
          <option value="__new__">${i18n("QUICK_SCENES.bulk.packNew")}</option>
        </select>
      </div>
      <div class="form-group" data-qsc-new-pack style="display:none">
        <label>${i18n("QUICK_SCENES.bulk.newPackLabel")}</label>
        <input type="text" name="newPackLabel" value="${folderName}">
      </div>`;

    return foundry.applications.api.DialogV2.wait({
      window: { title: i18n("QUICK_SCENES.bulk.dialogTitle") },
      content,
      render: (event, dialog) => {
        const html = dialog.element;
        const destination = html.querySelector("[name=destination]");
        const worldOptions = html.querySelector("[data-qsc-world-options]");
        const newFolderGroup = html.querySelector("[data-qsc-new-folder]");
        const compendiumOptions = html.querySelector("[data-qsc-compendium-options]");
        const newPackGroup = html.querySelector("[data-qsc-new-pack]");
        const folderSelect = html.querySelector("[name=folderId]");
        const packSelect = html.querySelector("[name=packId]");

        const updateVisibility = () => {
          const isCompendium = destination.value === "compendium";
          worldOptions.style.display = isCompendium ? "none" : "";
          newFolderGroup.style.display = (!isCompendium && folderSelect.value === "__new__") ? "" : "none";
          compendiumOptions.style.display = isCompendium ? "" : "none";
          newPackGroup.style.display = (isCompendium && packSelect.value === "__new__") ? "" : "none";
        };

        destination?.addEventListener("change", updateVisibility);
        folderSelect?.addEventListener("change", updateVisibility);
        packSelect?.addEventListener("change", updateVisibility);
      },
      buttons: [
        {
          action: "create",
          label: i18n("QUICK_SCENES.bulk.createScenes"),
          icon: "fa-solid fa-images",
          default: true,
          callback: (event, button) => {
            const dest = button.form.elements.destination?.value;
            const folderId = button.form.elements.folderId?.value;
            const newFolderName = button.form.elements.newFolderName?.value?.trim();
            const packId = button.form.elements.packId?.value;
            const newPackLabel = button.form.elements.newPackLabel?.value?.trim();
            if (dest === "compendium") {
              return {
                folderId: null, newFolderName: null,
                packId: (packId && packId !== "__new__") ? packId : null,
                newPackLabel: packId === "__new__" ? (newPackLabel || folderName) : null
              };
            }
            return {
              folderId: (folderId && folderId !== "__new__") ? folderId : null,
              newFolderName: folderId === "__new__" ? (newFolderName || folderName) : null,
              packId: null, newPackLabel: null
            };
          }
        },
        {
          action: "cancel",
          label: i18n("QUICK_SCENES.bulk.cancel"),
          icon: "fa-solid fa-xmark"
        }
      ],
      rejectClose: false
    });
  }

  /**
   * Create scenes sequentially from an array of media paths,
   * showing a progress dialog with a cancel button.
   * @param {string[]} mediaFiles - Array of media file paths
   * @param {string|null} folderId - Target scene folder ID, or null for root
   * @param {string|null} packId - Target compendium pack collection ID, or null for world
   */
  static async #executeBulkCreation(mediaFiles, folderId, packId = null) {
    const i18n = (key, data) => data ? game.i18n.format(key, data) : game.i18n.localize(key);
    const total = mediaFiles.length;
    const savedDefaults = SettingsUtil.getSceneDefaults();
    const defaults = foundry.utils.isEmpty(savedDefaults) ? {} : savedDefaults;
    const createdScenes = [];
    let failed = 0;
    let cancelled = false;

    const progressDialog = new foundry.applications.api.DialogV2({
      window: { title: i18n("QUICK_SCENES.bulk.dialogTitle"), minimizable: false },
      content: `<p class="qsc-bulk-progress">${i18n("QUICK_SCENES.bulk.progress", { current: 0, total })}</p>`,
      buttons: [{
        action: "cancel",
        label: i18n("QUICK_SCENES.bulk.cancel"),
        icon: "fa-solid fa-xmark",
        callback: () => { cancelled = true; }
      }],
      modal: true
    });
    progressDialog.render(true);

    const origNotify = ui.notifications.notify.bind(ui.notifications);
    ui.notifications.notify = () => ({ remove() {}, update() {} });

    for (const mediaPath of mediaFiles) {
      if (cancelled) break;
      try {
        const name = SceneActions.#getFileNameFromPath(mediaPath);
        const { width, height } = await SceneActions.#getMediaDimensions(mediaPath);
        const sceneData = foundry.utils.mergeObject({
          ...defaults,
          name,
          thumb: "",
          ...SceneActions.#buildBackgroundData(mediaPath, defaults),
          width,
          height,
          folder: packId ? null : folderId
        }, {});
        const createOptions = packId ? { pack: packId } : {};
        const scene = await Scene.implementation.create(sceneData, createOptions);
        createdScenes.push(scene);
      } catch (err) {
        failed++;
        LogUtil.log("Failed to create scene from " + mediaPath, [err]);
      }
      const message = i18n("QUICK_SCENES.bulk.progress", { current: createdScenes.length + failed, total });
      progressDialog.element?.querySelector(".qsc-bulk-progress")
        ?.replaceChildren(document.createTextNode(message));
    }

    if (createdScenes.length && !cancelled && !packId) {
      await SceneActions.#generateThumbnails(createdScenes, progressDialog, cancelled);
    }

    ui.notifications.notify = origNotify;
    await progressDialog.close();
    if (cancelled) {
      ui.notifications.info(i18n("QUICK_SCENES.bulk.cancelled", { count: createdScenes.length, total }));
    } else {
      ui.notifications.info(i18n("QUICK_SCENES.bulk.complete", { count: createdScenes.length }));
    }
    LogUtil.log("Bulk scene creation finished", [createdScenes.length, total, failed]);
  }

  /**
   * Generate thumbnails for created scenes sequentially.
   * Expects ui.notifications.notify to be intercepted by the caller.
   * @param {Scene[]} scenes - Array of created Scene documents
   * @param {object} progressDialog - The active progress dialog
   * @param {boolean} cancelled - Reference checked each iteration
   */
  static async #generateThumbnails(scenes, progressDialog, cancelled) {
    const i18n = (key, data) => data ? game.i18n.format(key, data) : game.i18n.localize(key);
    const total = scenes.length;

    for (let i = 0; i < scenes.length; i++) {
      if (cancelled) break;
      const scene = scenes[i];
      try {
        const thumbData = await scene.createThumbnail({ img: scene.background.src });
        await scene.update({ thumb: thumbData.thumb }, { diff: false });
      } catch (err) {
        LogUtil.log("Failed to generate thumbnail for " + scene.name, [err]);
      }
      const message = i18n("QUICK_SCENES.bulk.thumbnails", { current: i + 1, total });
      progressDialog.element?.querySelector(".qsc-bulk-progress")
        ?.replaceChildren(document.createTextNode(message));
    }

  }

  /**
   * Attach click-to-expand handlers on chat messages containing module images.
   * Called from renderChatMessageHTML hook.
   * @param {object} message - The ChatMessage document
   * @param {HTMLElement} html - The rendered HTML element
   */
  static onRenderChatMessage(message, html) {
    html?.querySelectorAll("[data-qsc-media]")?.forEach(el => {
      el.addEventListener("click", (event) => {
        event.preventDefault();
        const src = el.getAttribute("src");
        const title = el.closest(".qsc-chat-image")?.querySelector("strong")?.textContent ?? "";
        new foundry.applications.apps.ImagePopout({ src, window: { title } }).render(true);
      });
    });
  }

  /**
   * Apply configured defaults to all newly created scenes when the setting is enabled.
   * Called from preCreateScene hook.
   * @param {Scene} document - The scene document being created
   * @param {object} data - The creation data
   * @param {object} options - Creation options
   * @param {string} userId - The creating user's ID
   */
  static onPreCreateScene(document, data, options, userId) {
    if (!game.user?.isGM) return;
    if (!game.settings.get(MODULE_ID, SETTINGS_KEYS.APPLY_DEFAULTS_ALL)) return;
    const savedDefaults = SettingsUtil.getSceneDefaults();
    if (foundry.utils.isEmpty(savedDefaults)) return;
    const schemaFields = Scene.schema.fields;
    const updates = {};
    for (const [key, value] of Object.entries(savedDefaults)) {
      if ((key in schemaFields) && !(key in data)) {
        updates[key] = value;
      }
    }
    if ("levels" in schemaFields && document.levels.size) {
      const level = document.firstLevel;
      if (level) {
        const levelUpdates = {};
        if (savedDefaults.backgroundColor) levelUpdates.background = { color: savedDefaults.backgroundColor };
        if (savedDefaults.background?.tint) {
          levelUpdates.background ??= {};
          levelUpdates.background.tint = savedDefaults.background.tint;
        }
        if (!foundry.utils.isEmpty(levelUpdates)) level.updateSource(levelUpdates);
      }
    }
    if (!foundry.utils.isEmpty(updates)) {
      document.updateSource(updates);
      LogUtil.log("Applied defaults to new scene", [data.name]);
    }
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
   * Build the background fields for scene creation. v14 moved background
   * to the Level embedded document, so we must pass it inside a levels array.
   * Properties listed in _LEVELS_PROPERTY_MAP are pruned by cleanData on v14,
   * so they must be placed directly on the level.
   * @param {string} src - The media path
   * @param {object} [defaults={}] - Saved scene defaults to extract level props from
   * @returns {object} Data to spread into the scene creation object
   */
  static #buildBackgroundData(src, defaults = {}) {
    if ("levels" in Scene.schema.fields) {
      const defaultId = Scene.metadata.defaultLevelId ?? "defaultLevel0000";
      const level = {
        _id: defaultId,
        name: game.i18n?.localize("DOCUMENT.Level") ?? "Level",
        background: {}
      };
      if (defaults.backgroundColor) level.background.color = defaults.backgroundColor;
      if (defaults.background?.tint) level.background.tint = defaults.background.tint;
      level.background.src = src;
      return { levels: [level] };
    }
    return { background: { src } };
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
