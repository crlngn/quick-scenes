/**
 * Adds click-to-zoom and drag-to-pan behavior to ImagePopout figure elements.
 * Click zooms in centered on the clicked point; double-click resets.
 * Attached via the renderImagePopout hook for all users (images only).
 */
export class ImageZoom {

  static MIN_SCALE = 1;
  static MAX_SCALE = 5;
  static ZOOM_STEP = 0.8;

  /**
   * Attach zoom and pan behavior to an ImagePopout's figure element.
   * @param {object} app - The ImagePopout application instance
   * @param {HTMLElement} element - The rendered HTML element
   */
  static attach(app, element) {
    const container = element instanceof HTMLElement ? element : element?.[0];
    const figure = container?.querySelector("figure");
    const media = figure?.querySelector("img");
    if (figure?.querySelector("video")) return;
    if (!figure || !media) return;

    let scale = 1;
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let hasDragged = false;
    let startX = 0;
    let startY = 0;

    const updateTooltip = () => {
      const key = scale > 1 ? "QUICK_SCENES.zoom.dblClickToReset" : "QUICK_SCENES.zoom.clickToZoom";
      media.title = game.i18n.localize(key);
    };

    const applyTransform = () => {
      media.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
      figure.classList.toggle("qsc-zoomed", scale > 1);
      updateTooltip();
    };

    const clampPan = () => {
      if (scale <= 1) {
        panX = 0;
        panY = 0;
        return;
      }
      const rect = figure.getBoundingClientRect();
      const maxPanX = Math.max(0, (media.offsetWidth * scale - rect.width) / 2);
      const maxPanY = Math.max(0, (media.offsetHeight * scale - rect.height) / 2);
      panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
      panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
    };

    const zoomIn = () => {
      if (scale >= ImageZoom.MAX_SCALE) return;
      scale = Math.min(ImageZoom.MAX_SCALE, scale + ImageZoom.ZOOM_STEP);
      clampPan();
      applyTransform();
    };

    const zoomOut = () => {
      if (scale <= ImageZoom.MIN_SCALE) return;
      scale = Math.max(ImageZoom.MIN_SCALE, scale - ImageZoom.ZOOM_STEP);
      clampPan();
      applyTransform();
    };

    figure._qscZoom = {
      get scale() { return scale; },
      zoomIn,
      zoomOut,
    };

    updateTooltip();

    figure.addEventListener("click", (e) => {
      if (hasDragged) return;
      if (scale >= ImageZoom.MAX_SCALE) return;
      const rect = figure.getBoundingClientRect();
      const clickX = e.clientX - rect.left - rect.width / 2;
      const clickY = e.clientY - rect.top - rect.height / 2;
      const prevScale = scale;
      scale = Math.min(ImageZoom.MAX_SCALE, scale + ImageZoom.ZOOM_STEP);
      const ratio = scale / prevScale;
      panX = panX * ratio - clickX * (ratio - 1);
      panY = panY * ratio - clickY * (ratio - 1);
      clampPan();
      applyTransform();
    });

    figure.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || scale <= 1) return;
      isDragging = true;
      hasDragged = false;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
      figure.setPointerCapture(e.pointerId);
    });

    figure.addEventListener("pointermove", (e) => {
      if (!isDragging) return;
      hasDragged = true;
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      clampPan();
      applyTransform();
    });

    figure.addEventListener("pointerup", () => {
      isDragging = false;
    });

    figure.addEventListener("dblclick", (e) => {
      e.preventDefault();
      scale = 1;
      panX = 0;
      panY = 0;
      hasDragged = false;
      applyTransform();
    });

    if (!game.user?.isGM) {
      new foundry.applications.ux.ContextMenu(container, "figure img", ImageZoom.getMenuItems(), { fixed: true, jQuery: false });
    }
  }

  /**
   * Build context menu items for zoom in / zoom out.
   * Only one is shown at a time depending on current zoom state.
   * @returns {Array<object>} Array of ContextMenuEntry objects
   */
  static getMenuItems() {
    return [
      {
        name: "QUICK_SCENES.contextMenu.zoomIn",
        icon: '<i class="fas fa-search-plus"></i>',
        condition: (target) => {
          const figure = target?.closest("figure");
          return figure?._qscZoom && figure._qscZoom.scale < ImageZoom.MAX_SCALE;
        },
        callback: (target) => target?.closest("figure")?._qscZoom?.zoomIn(),
      },
      {
        name: "QUICK_SCENES.contextMenu.zoomOut",
        icon: '<i class="fas fa-search-minus"></i>',
        condition: (target) => {
          const figure = target?.closest("figure");
          return figure?._qscZoom && figure._qscZoom.scale > ImageZoom.MIN_SCALE;
        },
        callback: (target) => target?.closest("figure")?._qscZoom?.zoomOut(),
      },
    ];
  }
}
