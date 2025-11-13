// stuff/world/placeBlock.js
import { TILE_SIZE } from '../constants.js';
import { allBlocks } from '../blocks/blocks.js';

/**
 * Place a block into the worldObjects array at the given world coords.
 * Handles snapping + duplicate prevention + feedback.
 */
export function placeBlockAt(id, worldX, worldY, worldObjects, dialogueRef) {
  const def = allBlocks.find(b => b.id === id);
  if (!def) {
    if (dialogueRef) {
      dialogueRef.current = {
        text: `Block "${id}" not found.`,
        frame: 0,
        duration: 100,
      };
    }
    return;
  }

  const sx = Math.floor(worldX / TILE_SIZE) * TILE_SIZE;
  const sy = Math.floor(worldY / TILE_SIZE) * TILE_SIZE;

  // Prevent overlapping blocks
  if (worldObjects.some(o => o.x === sx && o.y === sy)) {
    if (dialogueRef) {
      dialogueRef.current = {
        text: 'Block already exists here.',
        frame: 0,
        duration: 80,
      };
    }
    return;
  }

  worldObjects.push({ id, x: sx, y: sy, def });

  if (dialogueRef) {
    dialogueRef.current = {
      text: `${id} placed`,
      frame: 0,
      duration: 100,
    };
  }
}