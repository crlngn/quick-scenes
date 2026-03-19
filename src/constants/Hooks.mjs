/**
 * Foundry Core hooks
 * https://foundryvtt.com/api/classes/client.Hooks.html
 * https://foundryvtt.com/api/modules/hookEvents.html
 */
export const HOOKS_CORE = {
  INIT: "init",
  READY: "ready",
  CANVAS_READY: "canvasReady",

  /* Settings */
  RENDER_SETTINGS_CONFIG: "renderSettingsConfig",

  /* File Picker */
  RENDER_FILE_PICKER: "renderFilePicker",

  /* Journal */
  RENDER_JOURNAL_SHEET: "renderJournalEntrySheet",

  /* Image Popout */
  RENDER_IMAGE_POPOUT: "renderImagePopout",

  /* Chat */
  RENDER_CHAT_MESSAGE: "renderChatMessage",

  /* Documents */
  PRE_CREATE_SCENE: "preCreateScene",
}

/**
 * Internal Quick Scenes hooks for module coordination
 */
export const HOOKS_QSC = {
}
