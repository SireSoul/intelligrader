// stuff/ui/gameCursor.js

export const GAME_CURSOR = 'url("/ui/cursors/default.png") 0 0, auto';

export function attachGameCursor(canvas) {
  if (!canvas) return;

  // Force cursor when mouse is over the game
  canvas.addEventListener("mouseenter", () => {
    canvas.style.cursor = GAME_CURSOR;
  });

  // Optional: restore browser cursor when leaving game
  canvas.addEventListener("mouseleave", () => {
    canvas.style.cursor = "default";
  });

  // Prevent right-click menu from stealing focus
  canvas.addEventListener("contextmenu", e => e.preventDefault());

  // Set immediately
  canvas.style.cursor = GAME_CURSOR;
}