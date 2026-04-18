import { MODULE_ID } from "../constants/General.mjs";
import { getSettings, SETTINGS_KEYS } from "../constants/Settings.mjs";
import { DefaultSceneConfig } from "./DefaultSceneConfig.mjs";
import { LogUtil } from "./LogUtil.mjs";

/**
 * Core settings management utility for the Quick Scenes module
 * Handles registration, retrieval, and application of module settings
 */
export class SettingsUtil {

  /**
   * Registers all module settings with Foundry VTT
   */
  static registerSettings() {
    const SETTINGS = getSettings();

    const settingsList = Object.entries(SETTINGS);
    settingsList.forEach((entry) => {
      const setting = entry[1];

      const settingObj = {
        name: setting.label,
        hint: setting.hint,
        default: setting.default,
        type: setting.propType,
        scope: setting.scope,
        config: setting.config,
        requiresReload: setting.requiresReload || false,
        onChange: value => {
          SettingsUtil.onSettingChange(setting.tag, value);
        }
      };

      game.settings.register(MODULE_ID, setting.tag, settingObj);
    });

    game.settings.register(MODULE_ID, SETTINGS_KEYS.SCENE_DEFAULTS, {
      scope: "world",
      config: false,
      type: Object,
      default: {},
    });

    game.settings.registerMenu(MODULE_ID, SETTINGS_KEYS.SCENE_DEFAULTS_MENU, {
      name: game.i18n.localize("QUICK_SCENES.settings.sceneDefaults.label"),
      label: game.i18n.localize("QUICK_SCENES.settings.sceneDefaults.button"),
      hint: game.i18n.localize("QUICK_SCENES.settings.sceneDefaults.hint"),
      icon: "fa-solid fa-map",
      type: DefaultSceneConfig,
      restricted: true,
    });

    SettingsUtil.applyDebugSettings();
  }

  /**
   * Retrieves a setting value
   * @param {string} tag - The setting tag/key
   * @returns {*} The setting value
   */
  static get(tag) {
    return game.settings.get(MODULE_ID, tag);
  }

  /**
   * Sets a setting value
   * @param {string} tag - The setting tag/key
   * @param {*} value - The value to set
   */
  static async set(tag, value) {
    return await game.settings.set(MODULE_ID, tag, value);
  }

  /**
   * Handles setting change callbacks
   * @param {string} tag - The setting tag that changed
   * @param {*} value - The new value
   */
  static onSettingChange(tag, value) {
    const SETTINGS = getSettings();

    switch(tag) {
      case SETTINGS.debugMode.tag:
        SettingsUtil.applyDebugSettings(value); break;
    }
  }

  /**
   * Retrieves saved scene defaults, stripping v14 embedded-level data so
   * that Scene._preCreate can auto-migrate top-level fields into levels.
   * @returns {object}
   */
  static getSceneDefaults() {
    const defaults = game.settings.get(MODULE_ID, SETTINGS_KEYS.SCENE_DEFAULTS) ?? {};
    if ("levels" in Scene.schema.fields) {
      delete defaults.levels;
      delete defaults.initialLevel;
    }
    return defaults;
  }

  /**
   * Applies debug mode settings
   * @param {boolean} [value] - Whether to enable debug mode
   */
  static applyDebugSettings(value) {
    const SETTINGS = getSettings();
    LogUtil.debugOn = value || SettingsUtil.get(SETTINGS.debugMode.tag);
  }
}
