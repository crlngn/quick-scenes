import { HOOKS_CORE } from "../constants/Hooks.mjs";
import { MODULE_ID } from "../constants/General.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { SettingsUtil } from "./SettingsUtil.mjs";
import { ContextMenus } from "./ContextMenus.mjs";
import { SceneActions } from "./SceneActions.mjs";

/**
 * Main class handling core module initialization and setup
 * Manages module lifecycle, hooks, and core functionality
 */
export class Main {
  /**
   * Initialize the module and set up core hooks
   * @static
   */
  static init() {
    Hooks.once(HOOKS_CORE.INIT, () => {
      LogUtil.log("Initiating module...", [], true);

      SettingsUtil.registerSettings();
    });

    Hooks.once(HOOKS_CORE.READY, () => {
      if (!game.user?.isGM) return;
      LogUtil.log("Module ready.", []);

      Hooks.on(HOOKS_CORE.RENDER_FILE_PICKER, ContextMenus.attachToFilePicker);
      Hooks.on(HOOKS_CORE.RENDER_JOURNAL_SHEET, ContextMenus.attachToJournal);
      Hooks.on(HOOKS_CORE.RENDER_IMAGE_POPOUT, ContextMenus.attachToImagePopout);
      Hooks.on(HOOKS_CORE.RENDER_CHAT_MESSAGE, SceneActions.onRenderChatMessage);
      Hooks.on(HOOKS_CORE.PRE_CREATE_SCENE, SceneActions.onPreCreateScene);
    });
  }
}
