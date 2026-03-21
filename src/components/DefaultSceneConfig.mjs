import { MODULE_ID } from "../constants/General.mjs";
import { SETTINGS_KEYS } from "../constants/Settings.mjs";
import { LogUtil } from "./LogUtil.mjs";

/**
 * A SceneConfig variant that saves scene properties as module defaults
 * instead of creating or updating a real scene document.
 * Opened via the module settings menu button.
 */
export class DefaultSceneConfig extends foundry.applications.sheets.SceneConfig {

  static DEFAULT_OPTIONS = {
    window: {
      title: "QUICK_SCENES.settings.sceneDefaults.configTitle",
    },
    form: {
      closeOnSubmit: true,
    },
  };

  /**
   * Create the config using a temporary in-memory Scene pre-filled with saved defaults
   * @param {object} options - Application options
   */
  constructor(options = {}) {
    const savedDefaults = game.settings.get(MODULE_ID, SETTINGS_KEYS.SCENE_DEFAULTS) ?? {};
    const tempScene = new Scene({ name: "Picked from File Name", ...savedDefaults });
    super({ document: tempScene, ...options });
  }

  /**
   * Override submit to save form data as module defaults instead of updating a document
   * @param {SubmitEvent} event
   * @param {HTMLFormElement} form
   * @param {object} submitData
   * @param {object} options
   */
  async _processSubmitData(event, form, submitData, options = {}) {
    delete submitData.name;
    delete submitData.navName;
    delete submitData._id;
    delete submitData.thumb;
    if (!submitData.initial?.x && !submitData.initial?.y && !submitData.initial?.scale) {
      delete submitData.initial;
    }
    await game.settings.set(MODULE_ID, SETTINGS_KEYS.SCENE_DEFAULTS, submitData);
    LogUtil.log("Scene defaults saved", [submitData]);
    ui.notifications?.info(game.i18n.localize("QUICK_SCENES.notifications.defaultsSaved"));
  }
}
