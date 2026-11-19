import {getTrimmedRaster, getAllRootItems, onUpdateImage} from './paper-functions.js'

export default async ({ addon, console, msg }) => {
  const types = ["costume"];

  function getPaintFormat () {
    if (!ReduxStore) return;
    if (!ReduxStore.getState) return;
    if (!ReduxStore.getState().scratchPaint) return;
    const paint = ReduxStore.getState().scratchPaint;
    return paint.format.startsWith("BITMAP") ? "BITMAP" : "VECTOR";
  }

  function getAllItems () {
    let selectedItems = [];

    if (getPaintFormat() == "BITMAP") {
      const raster = getTrimmedRaster(false /* shouldInsert */);
      if (!raster) return;
      selectedItems.push(raster);
    } else {
      selectedItems = getAllRootItems();
    }

    const jsonItems = [];
    for (let i = 0; i < selectedItems.length; i++) {
      const jsonItem = selectedItems[i].exportJSON({asString: false});
      jsonItems.push(jsonItem);
    }

    return jsonItems;
  }

  /* addon.tab.createEditorContextMenu(
    (ctx) => {
      const target = addon.tab.traps.vm.editingTarget;
      target.deleteCostume(ctx.index);
      queueMicrotask(() => {
        addon.tab.traps.vm.emitTargetsUpdate();
        addon.tab.traps.vm.runtime.emitProjectChanged();
        ctx.target.click();
      });
    },
    {
      types,
      position: "assetContextMenuAfterExport",
      order: 1,
      label: "merge costume to above",
      condition: (ctx) => ctx.index !== 0,
    }
  ); */
  addon.tab.createEditorContextMenu(
    (ctx) => {
      const previousItems = getAllItems();
      console.log(previousItems);
      const target = addon.tab.traps.vm.editingTarget;
      target.deleteCostume(ctx.index);
      // when a costume is deleted, it automatically goes to the costume below the deleted costume so no extra code is needed
      // https://github.com/Dinosaurmod/Dinosaurmod-Paint/blob/develop/src/hocs/copy-paste-hoc.jsx
      let importedItems = [];
      for (let i = 0; i < previousItems.length; i++) {
        const item = paper.Base.importJSON(previousItems[i]);
        if (item) {
          importedItems.push(item);
        }
      }
      if (!importedItems.length) return;
      // If pasting a group or non-raster to bitmap, rasterize first
      if (getPaintFormat() == "BITMAP" && !(importedItems.length === 1 && importedItems[0] instanceof paper.Raster)) {
        const group = new paper.Group(importedItems);
        importedItems = [group.rasterize()];
        group.remove();
      }
      for (const item of importedItems) {
        const placedItem = paper.project.getActiveLayer().addChild(item);
      }

      queueMicrotask(() => {
        onUpdateImage();
        addon.tab.traps.vm.emitTargetsUpdate();
        addon.tab.traps.vm.runtime.emitProjectChanged();
        ctx.target.click();
      });
    },
    {
      types,
      position: "assetContextMenuAfterExport",
      order: 2,
      label: "merge costume to below",
      condition: (ctx) => ctx.index !== ctx.target.parentNode.parentNode.childElementCount - 1,
    }
  );
};
