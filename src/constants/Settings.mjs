export const SETTING_SCOPE = {
  client: "client",
  world: "world"
}

export const SETTINGS_KEYS = {
  DEBUG_MODE: "debug-mode",
  SCENE_DEFAULTS: "scene-defaults",
  SCENE_DEFAULTS_MENU: "scene-defaults-menu",
}

export const getSettings = () => {
  return {
    debugMode: {
      tag: SETTINGS_KEYS.DEBUG_MODE,
      label: game.i18n.localize("QUICK_SCENES.settings.debugMode.label"),
      hint: game.i18n.localize("QUICK_SCENES.settings.debugMode.hint"),
      propType: Boolean,
      default: false,
      scope: SETTING_SCOPE.client,
      config: true,
      requiresReload: false
    },
  }
}
