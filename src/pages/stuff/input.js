// stuff/input.js — simplified + optimized
import { windowToCanvas } from './utils';
import { getHotbarLayout, getHotbarSlotRects, handleHotbarKeys } from './draw/hotbar';
import { TILE_SIZE, VIEW_W, VIEW_H } from './constants';
import { saveToCookies, loadFromCookies, restoreFromSave } from './storage/saveUtils.js';
import { handleNPCRightClick } from './npcs/npcManager.js';

export function createInput(
  canvas,
  {
    player, trees, inventory, craftingMenu,
    escapeMenuState, dayNight, dialogueRef,
    onSelectHotbar, onCraft, onQuit,
    commands, state, placeBlock, getCamera
  }
) {
  const keys = Object.create(null);
  let mouseX = 0, mouseY = 0;

  // ---- Chat state ----
  const KNOWN_COMMANDS = ['setblock', 'tp', 'give', 'help'];
  let chatOpen = false, chatBuffer = '', chatMode = null;
  const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
  let historyIndex = -1, tabMatches = [], tabIndex = 0;

  const say = msg => (dialogueRef.current = { text: msg, frame: 0, duration: 120 });

  const pushHistory = txt => {
    if (!txt || chatHistory[0] === txt) return;
    chatHistory.unshift(txt);
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory.slice(0, 50)));
    historyIndex = -1;
  };

  // ---------- keyboard ----------
  function onKeyDown(e) {
    // --- Chat mode ---
    if (chatOpen) return handleChatKey(e);

    // --- Open chat ---
    if (e.key === '/' || e.key.toLowerCase() === 't') {
      chatOpen = true;
      chatBuffer = e.key === '/' ? '/' : '';
      chatMode = e.key === '/' ? 'command' : 'text';
      e.preventDefault();
      return;
    }

    // --- Gameplay keys ---
    keys[e.key] = true;

    // Cancel placement
    if (e.key === 'Escape' && state.placingBlock) {
      state.placingBlock = null;
      say('Placement cancelled');
      return;
    }

    // Crafting
    if (e.key.toLowerCase() === 'c') return craftingMenu.toggle();

    // Skip time
    if ((e.shiftKey && e.code === 'Equal') || e.key === '+' || e.code === 'NumpadAdd') {
      dayNight?.skipMinutes?.(10);
      say('+10 min');
      e.preventDefault();
      return;
    }

    // Go back time
    if ((e.shiftKey && e.code === 'Minus') || e.key === '-' || e.code === 'NumpadSubtract') {
      dayNight?.skipMinutes?.(-10);
      say('-10 min');
      e.preventDefault();
      return;
    }

    // Escape / menu toggles
    if (e.key === 'Escape') {
      if (inventory.open) return inventory.toggle();
      escapeMenuState.open = !escapeMenuState.open;
      escapeMenuState.hovered = -1;
      return;
    }

    // Inventory
    if (e.key.toLowerCase() === 'e' && !escapeMenuState.open) return inventory.toggle();

    // If UI open, ignore rest
    if (craftingMenu.open || inventory.open || escapeMenuState.open) return;

    // Hotbar 1–9
    const prev = escapeMenuState.selectedSlot ?? 0;
    const next = handleHotbarKeys(e, prev);
    if (next !== prev) onSelectHotbar?.(next);
  }

  function handleChatKey(e) {
    // Submit
    if (e.key === 'Enter') {
      const text = chatBuffer.trim();
      if (text) {
        pushHistory(text);
        chatMode === 'command' ? commands?.runCommand(text) : say(text);
      }
      chatBuffer = ''; chatMode = null; chatOpen = false;
      tabMatches = []; tabIndex = 0;
      e.preventDefault();
      return;
    }

    // Cancel
    if (e.key === 'Escape') {
      chatBuffer = ''; chatMode = null; chatOpen = false;
      tabMatches = []; tabIndex = 0;
      e.preventDefault();
      return;
    }

    // Tab autocomplete
    if (e.key === 'Tab' && chatMode === 'command' && chatBuffer.startsWith('/')) {
      e.preventDefault();
      const base = chatBuffer.slice(1).split(/\s+/)[0] || '';
      if (!tabMatches.length)
        tabMatches = KNOWN_COMMANDS.filter(c => c.startsWith(base));
      tabIndex = (tabIndex + 1) % tabMatches.length;
      const match = tabMatches[tabIndex];
      if (match) chatBuffer = '/' + [match, ...chatBuffer.slice(1).split(/\s+/).slice(1)].join(' ');
      return;
    }

    // History
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (!chatHistory.length) return;
      historyIndex += e.key === 'ArrowUp' ? 1 : -1;
      if (historyIndex < 0) historyIndex = -1;
      if (historyIndex >= chatHistory.length) historyIndex = chatHistory.length - 1;
      chatBuffer = historyIndex >= 0 ? chatHistory[historyIndex] : '';
      e.preventDefault();
      return;
    }

    // Backspace / typing
    if (e.key === 'Backspace') chatBuffer = chatBuffer.slice(0, -1);
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) chatBuffer += e.key;
    e.preventDefault();
  }

  const onKeyUp = e => (keys[e.key] = false);

  // ---------- mouse ----------
  function onMouseMove(e) {
    const { mx, my } = windowToCanvas(canvas, e, canvas.width, canvas.height);
    mouseX = mx; mouseY = my;

    if (state?.placingBlock) {
      const { camX, camY, scale } = getCamera();
      const gx = Math.floor((camX + mx / scale) / TILE_SIZE) * TILE_SIZE;
      const gy = Math.floor((camY + my / scale) / TILE_SIZE) * TILE_SIZE;
      Object.assign(state.placingBlock, { x: gx, y: gy });
    }

    craftingMenu.handleMouseMove(mx, my, canvas.width, canvas.height);
    inventory.handleMouseMove(mx, my, VIEW_W, VIEW_H, e);

    if (escapeMenuState.open) {
      escapeMenuState.hovered = -1;
      const startY = canvas.height / 2 - 60;
      const x1 = canvas.width / 2 - 80, x2 = canvas.width / 2 + 80;
      escapeMenuState.options.forEach((opt, i) => {
        const y = startY + i * 40;
        if (mx >= x1 && mx <= x2 && my >= y - 20 && my <= y + 10)
          escapeMenuState.hovered = i;
      });
    }
  }

    function onMouseDown(e) {
    if (chatOpen) return;
    const { mx, my } = windowToCanvas(canvas, e, VIEW_W, VIEW_H);

    // --- Place block if we are in placement mode ---
    if (state?.placingBlock) {
      const { id, x, y, slotIndex } = state.placingBlock;

      // Place the block at the snapped grid position
      placeBlock?.(id, x, y);

      // Consume 1 from the corresponding inventory slot, if valid
      if (typeof slotIndex === 'number' && inventory?.slots?.[slotIndex]) {
        const slot = inventory.slots[slotIndex];

        if (typeof slot.count === 'number') {
          slot.count -= 1;
          if (slot.count <= 0) {
            slot.itemId = null;
            slot.item = null;
            slot.count = 0;
          }
        }
      }

      // If we still have the item, keep placement mode; otherwise cancel it
      const slot = typeof slotIndex === 'number' ? inventory?.slots?.[slotIndex] : null;
      if (!slot || !slot.itemId) {
        // state.placingBlock = null;
      }

      return;
    }

    // Craft / inventory
    const crafted = craftingMenu.handleMouseClick(inventory.slots);
    if (crafted) onCraft?.(crafted);
    inventory.handleMouseDown(mx, my, canvas.width, canvas.height);

    // Escape menu
    if (escapeMenuState.open) {
      const startY = canvas.height / 2 - 60;
      const x1 = canvas.width / 2 - 80, x2 = canvas.width / 2 + 80;
      escapeMenuState.options.forEach((opt, i) => {
        const y = startY + i * 40;
        if (mx >= x1 && mx <= x2 && my >= y - 20 && my <= y + 10) {
          if (opt.action === 'resume') escapeMenuState.open = false;
          if (opt.action === 'quit') onQuit?.();
          if (opt.action === 'save') {
            saveToCookies('gameSave', {
              player: { x: player.x, y: player.y, speed: player.speed, size: player.size },
              inventory: inventory.slots,
              timeOfDay: dayNight.getTime?.() ?? 0,
              trees,
            }, 30);
            const loaded = loadFromCookies('gameSave');
            if (loaded) restoreFromSave(loaded, { player, inventory, dayNight, trees });
            say('Game saved & synced!');
            escapeMenuState.open = false;
          }
        }
      });
      return;
    }

    // Hotbar click
    const layout = getHotbarLayout(null, canvas.width, canvas.height);
    const rects = layout && getHotbarSlotRects(layout);
    rects?.forEach((r, i) => {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h)
        onSelectHotbar?.(i);
    });

    // Left / right click dialogue
    const type = e.button === 2 ? 'Right Click!' : 'Left Click!';
    dialogueRef.current = { text: type, frame: 0, duration: 90 };
  }

  const onContextMenu = e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const { camX, camY, scale } = getCamera();
    handleNPCRightClick(mx, my, camX, camY, scale, dialogueRef);
  };

  // ---------- chat overlay ----------
  function drawChatPrompt(ctx, w = VIEW_W, h = VIEW_H) {
    if (!chatOpen) return;
    const boxW = 400, boxH = 28;
    const x = (w - boxW) / 2, y = h - boxH - 20;
    const text = chatBuffer || '';

    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y, boxW, boxH);
    ctx.strokeStyle = '#888';
    ctx.strokeRect(x, y, boxW, boxH);
    ctx.font = '14px monospace';
    ctx.fillStyle = chatMode === 'command' ? '#6cf' : '#fff';
    ctx.fillText(text, x + 45, y + 18);

    if (chatMode === 'command' && chatBuffer.startsWith('/')) {
      const base = chatBuffer.slice(1).split(/\s+/)[0] || '';
      const suggestion =
        tabMatches[tabIndex] ||
        KNOWN_COMMANDS.find(c => c.startsWith(base) && c !== base);
      if (suggestion) {
        ctx.fillStyle = '#fff';
        ctx.fillText('/' + suggestion, x + 45, y + 18);
      }
    }
    ctx.restore();
  }

  // ---------- attach ----------
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('contextmenu', onContextMenu);

  // ---------- cleanup ----------
  const cleanup = () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('contextmenu', onContextMenu);
  };

  return { keys, cleanup, drawChatPrompt, getMouse: () => ({ mouseX, mouseY }) };
}
