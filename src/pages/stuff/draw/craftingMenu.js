// stuff/ui/craftingMenu.js
import { getAllBlockRecipes } from '../blocks/blocks.js';

export class CraftingMenu {
  constructor() {
    this.open = false;
    this.hoveredIndex = -1;
    this.recipes = [];
    this._imageCache = {}; // cache textures
  }

  /** Loads all recipes from registered blocks */
  loadRecipes() {
    const defs = getAllBlockRecipes();

    // Convert block recipe → crafting menu recipe format
    this.recipes = defs.map(r => ({
      id: r.id,                      // block id
      name: r.name || r.id,
      texture: r.texture,
      ingredients: r.requires,       // <-- blocks use "requires"
      output: { id: r.id, count: 1 } // crafting produces ONE of that block
    }));

    console.log(`[CraftingMenu] Loaded ${this.recipes.length} recipes.`);
  }

  toggle() {
    this.open = !this.open;
  }

  /** helper: cached image loading */
  getImage(src) {
    if (!src) return null;
    if (!this._imageCache[src]) {
      const img = new Image();
      img.src = src;
      this._imageCache[src] = img;
    }
    return this._imageCache[src];
  }

  draw(ctx, VIEW_W, VIEW_H) {
    if (!this.open) return;

    const menuW = 320;
    const menuH = 260;
    const x = (VIEW_W - menuW) / 2;
    const y = (VIEW_H - menuH) / 2;

    // background
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#111';
    ctx.fillRect(x, y, menuW, menuH);
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, menuW, menuH);
    ctx.restore();

    ctx.font = '18px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('Crafting Menu', x + 85, y + 28);

    const startY = y + 50;
    const slotH = 50;

    this.recipes.forEach((recipe, i) => {
      const ry = startY + i * slotH;

      // highlight if hovered
      ctx.fillStyle = i === this.hoveredIndex ? '#333' : '#222';
      ctx.fillRect(x + 12, ry, menuW - 24, slotH - 6);

      // icon
      const img = this.getImage(recipe.texture);
      if (img?.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x + 20, ry + 8, 32, 32);
      } else {
        ctx.fillStyle = '#555';
        ctx.fillRect(x + 20, ry + 8, 32, 32);
      }

      // name
      ctx.fillStyle = '#fff';
      ctx.fillText(recipe.name, x + 65, ry + 28);

      // ingredients
      if (Array.isArray(recipe.ingredients)) {
        ctx.fillStyle = '#aaa';
        const txt = recipe.ingredients
          .map(i => `${i.count}× ${i.id}`)
          .join(', ');
        ctx.fillText(txt, x + 160, ry + 28);
      }
    });
  }

  handleMouseMove(mx, my, VIEW_W, VIEW_H) {
    if (!this.open) return;
    const menuW = 320;
    const menuH = 260;
    const x = (VIEW_W - menuW) / 2;
    const y = (VIEW_H - menuH) / 2;
    const startY = y + 50;
    const slotH = 50;

    this.hoveredIndex = -1;
    for (let i = 0; i < this.recipes.length; i++) {
      const ry = startY + i * slotH;
      if (mx >= x + 12 && mx <= x + menuW - 12 &&
          my >= ry && my <= ry + slotH - 6) {
        this.hoveredIndex = i;
        break;
      }
    }
  }

  /** inventorySlots: array of { itemId, count } */
  handleMouseClick(inventorySlots) {
    if (!this.open || this.hoveredIndex === -1) return null;

    const recipe = this.recipes[this.hoveredIndex];
    const ingredients = recipe.ingredients || [];

    // ---- check if inventory has needed items ----
    const canCraft = ingredients.every(ing => {
      let need = ing.count;
      for (const slot of inventorySlots) {
        if (slot?.itemId === ing.id) {
          need -= slot.count;
          if (need <= 0) return true;
        }
      }
      return need <= 0;
    });

    if (!canCraft) {
      console.log('❌ Not enough materials');
      return null;
    }

    // ---- consume required items ----
    ingredients.forEach(ing => {
      let need = ing.count;
      for (const slot of inventorySlots) {
        if (slot?.itemId === ing.id) {
          const take = Math.min(slot.count, need);
          slot.count -= take;
          need -= take;

          if (slot.count <= 0) {
            slot.itemId = null;
            slot.count = 0;
          }
          if (need <= 0) break;
        }
      }
    });

    // ---- add crafted item ----
    const result = recipe.output;
    let remaining = result.count;

    // stack into existing slots
    for (const slot of inventorySlots) {
      if (slot.itemId === result.id) {
        slot.count += remaining;
        remaining = 0;
        break;
      }
    }

    // place in empty slot
    if (remaining > 0) {
      const empty = inventorySlots.find(s => !s.itemId);
      if (empty) {
        empty.itemId = result.id;
        empty.count = remaining;
      } else {
        console.warn('Inventory full — dropping crafted item');
      }
    }

    console.log(`✅ Crafted: ${recipe.name}`);
    return result.id;
  }
}
