export function collides(a, b) {
  return !(
    a.x + a.size / 2 < b.x ||
    a.x - a.size / 2 > b.x + b.w ||
    a.y + a.size / 2 < b.y ||
    a.y - a.size / 2 > b.y + b.h
  );
}

export function checkTreeCollisions(px, py, playerSize, trees) {
  for (const t of trees) {
    if (!t.collisionBoxes) continue;
    for (const box of t.collisionBoxes) {
      const bx = t.x + box.x;
      const by = t.y + box.y;
      if (collides({ x: px, y: py, size: playerSize }, { x: bx, y: by, w: box.w, h: box.h })) {
        return true;
      }
    }
  }
  return false;
}

export function checkBlockCollisions(px, py, playerSize, worldObjects, tileSize = 8) {
  const half = playerSize / 2;
  const playerBox = {
    x: px - half,
    y: py - half,
    w: playerSize,
    h: playerSize,
  };

  for (const obj of worldObjects) {
    const def = obj.def;
    if (!def?.solid) continue;

    let bx, by, bw, bh;

    // 🔹 Use custom collision box if block defines one (e.g., fence)
    if (typeof def.getCollisionBox === 'function') {
      const box = def.getCollisionBox(obj.x, obj.y);
      if (!box) continue;
      ({ x: bx, y: by, w: bw, h: bh } = box);
    } else {
      // fallback: full tile
      bx = obj.x;
      by = obj.y;
      bw = def.width || tileSize;
      bh = def.height || tileSize;
    }

    if (
      playerBox.x < bx + bw &&
      playerBox.x + playerBox.w > bx &&
      playerBox.y < by + bh &&
      playerBox.y + playerBox.h > by
    ) {
      return true;
    }
  }

  return false;
}
