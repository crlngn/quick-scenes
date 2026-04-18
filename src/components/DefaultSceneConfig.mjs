import { MODULE_ID } from "../constants/General.mjs";
import { SETTINGS_KEYS } from "../constants/Settings.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";

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
   * Create the config using a temporary in-memory Scene pre-filled with saved defaults.
   * v14 Scene has an embedded "levels" collection and SceneConfig reads initialLevel.id
   * during render, so seed a placeholder level when the schema supports it.
   * @param {object} options - Application options
   */
  constructor(options = {}) {
    const savedDefaults = SettingsUtil.getSceneDefaults();
    const seed = { name: "Picked from File Name" };
    if ("levels" in Scene.schema.fields) {
      const defaultId = Scene.metadata.defaultLevelId ?? "defaultLevel0000";
      const level = { _id: defaultId, name: "Default" };
      const map = foundry.documents.BaseScene._LEVELS_PROPERTY_MAP ?? [];
      for (const [sceneKey, levelKey] of map) {
        const value = foundry.utils.getProperty(savedDefaults, sceneKey);
        if (value !== undefined) foundry.utils.setProperty(level, levelKey, value);
      }
      seed.levels = [level];
    }
    const tempScene = new Scene({ ...seed, ...savedDefaults });
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
    if (submitData.levels?.length) {
      const level = submitData.levels[0];
      const map = foundry.documents?.BaseScene?._LEVELS_PROPERTY_MAP ?? [];
      for (const [sceneKey, levelKey] of map) {
        const value = foundry.utils.getProperty(level, levelKey);
        if (value !== undefined) foundry.utils.setProperty(submitData, sceneKey, value);
      }
    }
    delete submitData.name;
    delete submitData.navName;
    delete submitData._id;
    delete submitData.thumb;
    delete submitData.levels;
    delete submitData.initialLevel;
    if (!submitData.initial?.x && !submitData.initial?.y && !submitData.initial?.scale) {
      delete submitData.initial;
    }
    await game.settings.set(MODULE_ID, SETTINGS_KEYS.SCENE_DEFAULTS, submitData);
    LogUtil.log("Scene defaults saved", [submitData]);
    ui.notifications?.info(game.i18n.localize("QUICK_SCENES.notifications.defaultsSaved"));
  }
}
