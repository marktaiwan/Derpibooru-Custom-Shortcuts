// ==UserScript==
// @name         Derpibooru Custom Shortcuts
// @description  Configurable shortcuts and enhanced keyboard navigations. "Ctrl+Shift+/" to open settings.
// @version      1.2.14
// @author       Marker
// @license      MIT
// @namespace    https://github.com/marktaiwan/
// @homepageURL  https://github.com/marktaiwan/Derpibooru-Custom-Shortcuts
// @supportURL   https://github.com/marktaiwan/Derpibooru-Custom-Shortcuts/issues
// @match        https://*.derpibooru.org/*
// @match        https://*.trixiebooru.org/*
// @grant        unsafeWindow
// @grant        GM_openInTab
// @inject-into  content
// @noframes
// ==/UserScript==

(function () {
'use strict';

let lastSelectedTag = null;
const SCRIPT_ID = 'markers_custom_shortcuts';
const THUMB_SELECTOR = '.js-resizable-media-container .media-box';
const TAG_SELECTOR = '.tag-list .tag.dropdown';
const CSS = `/* Generated by Custom Shortcuts */
#${SCRIPT_ID}--panelWrapper {
  position: fixed;
  top: 0px;
  left: 0px;
  z-index: 10;
  display: flex;
  width: 100vw;
  height: 100vh;
  align-items: center;
  justify-content: center;
  background-color: rgba(0,0,0,0.5);
}

.${SCRIPT_ID}--header {
  padding: 0px 5px;
}

.${SCRIPT_ID}--body {
  max-height: calc(100vh - 80px);
  overflow: auto;
}

.${SCRIPT_ID}--table {
  display: grid;
  width: 600px;
  grid-template-columns: 1fr 150px 150px;
  grid-column-gap: 5px;
  grid-row-gap: 5px;
}

.${SCRIPT_ID}--table input {
  font-size: 12px;
  align-self: center;
  text-align: center;
}

.media-box.highlighted, .tag.highlighted {
  box-shadow: 0px 0px 0px 4px coral;
}

.highlighted a {
  outline: none;
}
`;

/*
 *  - 'key' uses KeyboardEvent.code to represent keypress.
 *    For instance, 's' would be 'KeyS' and '5' would be either 'Digit5' or
 *    'Numpad5'.
 *  - 'ctrl', 'alt', 'shift' are Booleans and defaults to false if not
 *    present.
 */
const presets = {
  default: {
    prev:     [{key: 'KeyJ'}],
    next:     [{key: 'KeyK'}],
    source:   [{key: 'KeyS'}],
    random:   [{key: 'KeyR'}],
    upvote:   [{key: 'KeyU'}],
    favorite: [{key: 'KeyF'}],
    toIndex:  [{key: 'KeyI'}],
    tagEdit:  [{key: 'KeyL'}],
  },
  preset_1: {
    scrollUp:           [{key: 'KeyW'}, {key: 'ArrowUp'}],
    scrollDown:         [{key: 'KeyS'}, {key: 'ArrowDown'}],
    scrollLeft:         [{key: 'KeyA'}, {key: 'ArrowLeft'}],
    scrollRight:        [{key: 'KeyD'}, {key: 'ArrowRight'}],
    toggleKeyboardNav:  [{key: 'KeyQ'}],
    openSelected:       [{key: 'KeyE'}],
    openInNewTab:       [],
    openInBackground:   [{key: 'KeyE', shift: true}],
    prev:               [{key: 'KeyZ'}],
    next:               [{key: 'KeyX'}],
    source:             [],
    random:             [{key: 'KeyR'}],
    upvote:             [{key: 'KeyG', shift: true}],
    favorite:           [{key: 'KeyF', shift: true}],
    toIndex:            [],
    tagEdit:            [{key: 'KeyL'}],
    tagSubmit:          [{key: 'KeyL', ctrl: true}],
    toggleScale:        [{key: 'KeyV'}],
    toggleVideo:        [{key: 'KeyN'}],
    toggleSound:        [{key: 'KeyM'}],
    focusSearch:        [{key: 'KeyS', shift: true}],
    focusComment:       [{key: 'KeyC', shift: true}],
    refreshCommentList: [{key: 'KeyR', shift: true}],
    historyBack:        [{key: 'KeyA', shift: true}],
    historyForward:     [{key: 'KeyD', shift: true}],
  },
  preset_2: {},
  preset_3: {},

  /* Keybinds that are applied globally */
  global: {
    useDefault:  [{key: 'Backquote', alt: true}],
    usePreset_1: [{key: 'Digit1', alt: true}],
    usePreset_2: [{key: 'Digit2', alt: true}],
    usePreset_3: [{key: 'Digit3', alt: true}]
  },

  /* Special non-configurable keybinds */
  reserved: {
    unfocus: [{key: 'Escape'}],
    toggleSettings: [{key: 'Slash', ctrl: true, shift: true}],
  }
};

const reservedKeys = [
  'Escape',
  'Backspace',
  'Delete',
  'Meta',
  'ContextMenu',
  // 'Enter',
  // 'Tab',
  // 'CapsLock',
  // 'ScrollLock',
  // 'NumLock',
];

/*
 *  'constant' executes the command twice, on keydown and keyup.
 *
 *  'repeat' indicates whether the command should act on
 *  subsequent events generated by the key being held down.
 *  Defaults to false.
 *
 *  'input' indicates whether the command should execute when an
 *  input field has focus.
 *  Defaults to false.
 *
 *  'global' indicates whether the keybind applies to all presets.
 *  Defaults to false.
 */
const actions = {
  scrollUp: {
    name: 'Scroll up',
    fn: event => scroll('up', event),
    constant: true,
    repeat: true
  },
  scrollDown: {
    name: 'Scroll down',
    fn: event => scroll('down', event),
    constant: true,
    repeat: true
  },
  scrollLeft: {
    name: 'Scroll left',
    fn: event => scroll('left', event),
    constant: true,
    repeat: true
  },
  scrollRight: {
    name: 'Scroll right',
    fn: event => scroll('right', event),
    constant: true,
    repeat: true
  },
  toggleKeyboardNav: {
    name: 'Toggle keyboard selection mode',
    fn: () => {
      const highlighted = $('.media-box.highlighted, .tag-list .tag.dropdown.highlighted');

      if (highlighted) {
        unhighlight(highlighted);
      } else {
        const prevSelected = $(`.media-box[data-image-id="${sessionStorage.lastSelectedThumb}"]`);
        if (prevSelected && isVisible(prevSelected)) {
          highlight(prevSelected);
        } else if (lastSelectedTag && isVisible(lastSelectedTag)) {
          highlight(lastSelectedTag);
        } else {
          highlight(getFirstVisibleOrClosest(THUMB_SELECTOR) || getFirstVisibleOrClosest(TAG_SELECTOR));
        }
      }
    }
  },
  openSelected: {
    name: 'Open selected',
    fn: () => {
      const selected = $('.media-box.highlighted, .tag.highlighted');
      if (selected) click('.media-box__content a, a.tag__name', selected);
    }
  },
  openInNewTab: {
    name: 'Open selected in new tab',
    fn: () => {
      const selected = $('.media-box.highlighted, .tag.highlighted');
      if (selected) {
        const anchor = $('.media-box__content a, a.tag__name', selected);
        window.open(anchor.href, '_blank');
      }
    }
  },
  openInBackground: {
    name: 'Open selected in background tab',
    fn: () => {
      const selected = $('.media-box.highlighted, .tag.highlighted');
      if (selected) {
        const anchor = $('.media-box__content a, a.tag__name', selected);
        GM_openInTab(anchor.href, {active: false});
      }
    }
  },
  prev: {
    name: 'Previous page/image',
    fn: () => click('.js-prev')
  },
  next: {
    name: 'Next page/image',
    fn: () => click('.js-next')
  },
  source: {
    name: 'Open source URL',
    fn: () => click('.js-source-link')
  },
  random: {
    name: 'Random image',
    fn: () => click('.js-rand')
  },
  upvote: {
    name: 'Upvote image',
    fn: () => {
      let mediaBox = $('.media-box.highlighted');
      if (mediaBox) {
        click('.media-box__header a.interaction--upvote', mediaBox);
      } else {
        mediaBox = $('.media-box:hover');
        if (mediaBox) {
          click('.media-box__header a.interaction--upvote', mediaBox);
        } else {
          click('.block__header a.interaction--upvote');
        }
      }
    }
  },
  favorite: {
    name: 'Favourite image',
    fn: () => {
      let mediaBox = $('.media-box.highlighted');
      if (mediaBox) {
        click('.media-box__header a.interaction--fave', mediaBox);
      } else {
        mediaBox = $('.media-box:hover');
        if (mediaBox) {
          click('.media-box__header a.interaction--fave', mediaBox);
        } else {
          click('.block__header a.interaction--fave');
        }
      }
    }
  },
  toIndex: {
    name: 'Go to index page containing the image being displayed',
    fn: () => click('.js-up')
  },
  tagEdit: {
    name: 'Open tags for editing',
    fn: () => {
      click('#edit-tags');
      return {preventDefault: true};
    }
  },
  tagSubmit: {
    name: 'Save tags',
    fn: e => {
      const target = e.target;
      const submitButtonSelector = '.js-imageform:not(.hidden) #tags-form #edit_save_button';
      let stopPropagation = true;
      let preventDefault = true;

      if ((target.matches('#taginput-fancy-tag_input') && (e.ctrlKey || e.altKey))
        || !target.matches('.input, input, textarea')) {
        click(submitButtonSelector);
      } else {
        stopPropagation = false;
        preventDefault = false;
      }

      return {stopPropagation, preventDefault};
    },
    input: true
  },
  toggleScale: {
    name: 'Cycle through image scaling',
    fn: () => click('#image-display')
  },
  toggleVideo: {
    name: 'Play/pause webms',
    fn: () => {
      const video = $('video#image-display, .highlighted .image-container video');
      if (!video) return;
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    }
  },
  toggleSound: {
    name: 'Mute/unmute webms',
    fn: () => {
      const video = $('video#image-display, .highlighted .image-container video');
      if (!video) return;
      video.muted = !video.muted;

      // SIN: Compatibility hack with Webm Volume Toggle because I
      //      don't know how to fix it properly in the other script
      const container = video.closest('.video-container');
      if (!container) return;

      const button = $('.volume-toggle-button', container);
      container.dataset.isMuted = video.muted ? '1' : '0';

      if (container.dataset.isMuted == '0') {
        button.classList.add('fa-volume-up');
        button.classList.remove('fa-volume-off');
      } else {
        button.classList.add('fa-volume-off');
        button.classList.remove('fa-volume-up');
      }

    }
  },
  focusSearch: {
    name: 'Focus on search field',
    fn: () => {
      const searchField = $('.header__input--search');
      if (searchField) {
        searchField.focus();
        searchField.select();
        return {preventDefault: true};
      }
    }
  },
  focusComment: {
    name: 'Focus on comment form',
    fn: () => {
      const commentField = $('[name="comment[body]"], [name="post[body]"], [name="message[body]"]');
      if (commentField) {
        commentField.focus();
        return {preventDefault: true};
      }
    }
  },
  refreshCommentList: {
    name: 'Refresh comment list',
    fn: () => click('#js-refresh-comments')
  },
  historyBack: {
    name: 'Go back in browser history',
    fn: () => window.history.back()
  },
  historyForward: {
    name: 'Go forward in browser history',
    fn: () => window.history.forward()
  },
  useDefault: {
    name: 'Global: Switch to default keybinds',
    fn: () => switchPreset('default'),
    global: true
  },
  usePreset_1: {
    name: 'Global: Switch to preset 1',
    fn: () => switchPreset('preset_1'),
    global: true
  },
  usePreset_2: {
    name: 'Global: Switch to preset 2',
    fn: () => switchPreset('preset_2'),
    global: true
  },
  usePreset_3: {
    name: 'Global: Switch to preset 3',
    fn: () => switchPreset('preset_3'),
    global: true
  },
  unfocus: {
    fn: e => {
      const target = e.target;
      let stopPropagation = true;

      if (target.matches('#taginput-fancy-tag_input') && $('.autocomplete')) {
        stopPropagation = false;
      } else {
        // default behavior
        target.blur();
      }
      return {stopPropagation};
    },
    input: true
  },
  toggleSettings: {
    fn: () => {
      const panel = $(`#${SCRIPT_ID}--panelWrapper`);
      if (panel) {
        panel.remove();
      } else {
        openSettings();
      }
    }
  }
};

const onReady = (() => {
  const callbacks = [];
  document.addEventListener('DOMContentLoaded', () => callbacks.forEach(fn => fn()), {once: true});
  return fn => {
    if (document.readyState == 'loading') {
      callbacks.push(fn);
    } else {
      fn();
    }
  };
})();

const smoothscroll = (function () {
  let startTime = null;
  let pendingFrame = null;
  let keydown = {up: false, down: false, left: false, right: false};

  function reset() {
    startTime = null;
    keydown = {up: false, down: false, left: false, right: false};
    unsafeWindow.cancelAnimationFrame(pendingFrame);
  }
  function noKeyDown() {
    return !(keydown.up || keydown.down || keydown.left || keydown.right);
  }
  function step(timestamp) {

    if (noKeyDown() || !document.hasFocus()) {
      reset();
      return;
    }

    startTime = startTime || timestamp;
    const elapsed = timestamp - startTime;
    const maxVelocity = 40; // px/frame
    const easeDuration = 250;  // ms
    const scale = window.devicePixelRatio;

    const velocity = ((elapsed > easeDuration)
      ? maxVelocity
      : maxVelocity * (elapsed / easeDuration)
    ) / scale;

    let x = 0;
    let y = 0;

    if (keydown.up) y += 1;
    if (keydown.down) y += -1;
    if (keydown.left) x += -1;
    if (keydown.right) x += 1;

    const rad = Math.atan2(y, x);
    x = (x != 0) ? Math.cos(rad) : 0;
    y = Math.sin(rad) * -1;

    window.scrollBy(Math.round(x * velocity), Math.round(y * velocity));
    pendingFrame = window.requestAnimationFrame(step);
  }

  return function (direction, type) {
    switch (type) {
      case 'keydown':
        if (noKeyDown()) pendingFrame = window.requestAnimationFrame(step);
        keydown[direction] = true;
        break;
      case 'keyup':
        keydown[direction] = false;
        if (noKeyDown()) reset();
        break;
    }
  };
})();

function $(selector, parent = document) {
  return parent.querySelector(selector);
}

function $$(selector, parent = document) {
  return parent.querySelectorAll(selector);
}

function click(selector, parent = document) {
  const el = $(selector, parent);
  if (el) el.click();
}

function getStorage(key) {
  const store = JSON.parse(localStorage.getItem(SCRIPT_ID));
  return store[key];
}

function setStorage(key, val) {
  const store = JSON.parse(localStorage.getItem(SCRIPT_ID));
  store[key] = val;
  localStorage.setItem(SCRIPT_ID, JSON.stringify(store));
}

function getRect(ele) {
  // Relative to viewport
  const {top, bottom, left, height, width} = ele.getBoundingClientRect();
  const mid = (top + bottom) / 2;

  // Relative to document
  const x = left + window.pageXOffset + (width / 2);
  const y = top + window.pageYOffset + (height / 2);

  return {top, bottom, left, height, width, mid, x, y};
}

function isVisible(ele) {
  const clientHeight = document.documentElement.clientHeight;
  const {top, bottom, height, mid} = getRect(ele);
  const margin = Math.min(Math.max(50, height / 4), clientHeight / 4);

  return (mid > 0 + margin && mid < clientHeight - margin
    || top < 0 + margin && bottom > clientHeight - margin);
}

function getFirstVisibleOrClosest(selector) {
  const nodeList = $$(selector);
  const listLength = nodeList.length;
  const viewportMid = document.documentElement.clientHeight / 2;
  if (listLength < 1) return;

  let closest = nodeList[0];
  let closest_delta = Math.abs(getRect(closest).mid - viewportMid);

  for (let i = 0; i < listLength; i++) {
    const ele = nodeList[i];
    if (isVisible(ele)) return ele;

    const ele_y = getRect(ele).mid;
    const ele_delta = Math.abs(ele_y - viewportMid);
    if (ele_delta < closest_delta) {
      [closest, closest_delta] = [ele, ele_delta];
    }
  }
  return closest;
}

function highlight(selection, setSmooth = true) {
  if (!selection) return;

  unhighlight($('.highlighted'));

  $('.media-box__content a, .tag a.tag__name', selection).focus({preventScroll: true});
  selection.classList.add('highlighted');

  if (!isVisible(selection)) {
    if (setSmooth) {
      selection.scrollIntoView({behavior: 'smooth', block: 'center'});
    } else {
      selection.scrollIntoView({behavior: 'auto', block: 'nearest'});
    }
  }

  if (selection.matches('.media-box')) {
    sessionStorage.lastSelectedThumb = selection.dataset.imageId;
  } else {
    lastSelectedTag = selection;
  }
}

function unhighlight(ele) {
  if (!ele) return;
  ele.classList.remove('highlighted');
  document.activeElement.blur();
}

function scroll(direction, event) {
  const type = event.type;
  const selection = $('.highlighted');

  if (selection && type == 'keydown') {
    keyboardNav(direction, selection, !event.repeat);
  } else if (!event.repeat){
    smoothscroll(direction, type);
  }
}

function keyboardNav(direction, highlighted, setSmooth) {
  function similar(val1, val2, margin) {
    return (val1 < val2 + margin && val1 > val2 - margin);
  }
  function distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  const rect = getRect(highlighted);
  const originalPos = {x: rect.x, y: rect.y};
  const margin = Math.max(4, rect.height / 4);  // px

  const selector = (highlighted.matches('.media-box')) ? THUMB_SELECTOR : TAG_SELECTOR;
  const nodeList = $$(selector);
  let ele = highlighted;
  let index = [...nodeList].indexOf(ele);

  switch (direction) {
    case 'left': {
      if (index > 0) ele = nodeList.item(--index);
      break;
    }
    case 'right': {
      if (index < nodeList.length - 1) ele = nodeList.item(++index);
      break;
    }
    case 'up': case 'down': {
      let closest = highlighted;
      let closestDistance, closestYDistance;

      while ((direction == 'up' && index > 0) || (direction == 'down' && index < nodeList.length - 1)) {
        if (direction == 'up') index--;
        if (direction == 'down') index++;

        const current = nodeList.item(index);
        const currentPos = getRect(current);
        const currentDistance = distance(originalPos, currentPos);
        const currentYDistance = Math.abs(currentPos.y - originalPos.y);

        // Skip same row, and only iterate over elements one row up/down.
        if (similar(currentPos.y, originalPos.y, margin)) continue;
        if (!closestYDistance) closestYDistance = currentYDistance;
        if (currentYDistance > closestYDistance) break;

        if (!closestDistance || currentDistance <= closestDistance) {
          closest = current;
          closestDistance = currentDistance;
        }
      }

      ele = closest;
      break;
    }
  }

  highlight(ele, setSmooth);
}

function switchPreset(id) {
  const selector = $(`#${SCRIPT_ID}--preset-selector`);
  if (selector) {
    selector.value = id;
    selector.dispatchEvent(new Event('input'));
  } else {
    setStorage('usePreset', id);
  }
}

function getActiveKeybinds() {
  const keybinds = getStorage('keybinds');
  const id = getStorage('usePreset');
  return keybinds[id];
}

function getGlobalKeybinds() {
  const keybinds = getStorage('keybinds');
  return keybinds['global'];
}

/*
 *  Returns false if no match found, otherwise returns the bind settings
 */
function matchKeybind(key, ctrl, alt, shift) {
  const keybinds = {...getActiveKeybinds(), ...getGlobalKeybinds(), ...presets.reserved};
  for (const name in keybinds) {
    for (const slot of keybinds[name]) {
      if (slot === null || slot === undefined) continue;
      const {
        key: bindKey,
        ctrl: bindCtrl = false,
        alt: bindAlt = false,
        shift: bindShift = false
      } = slot;

      if (key == bindKey
        && ctrl == bindCtrl
        && alt == bindAlt
        && shift == bindShift
        && Object.prototype.hasOwnProperty.call(actions, name)
      ) {
        return name;
      }
    }
  }
  return false;
}

function openSettings() {
  function rowTemplate(name, id) {
    return `
<span>${name}</span>
<input data-command="${id}" data-slot="0" data-key="" data-ctrl="0" data-alt="0" data-shift="0" type="text">
<input data-command="${id}" data-slot="1" data-key="" data-ctrl="0" data-alt="0" data-shift="0" type="text">
`;
  }
  function printRows() {
    const arr = [];

    for (const id in actions) {
      if (actions[id].name) arr.push(rowTemplate(actions[id].name, id));
    }

    return arr.join('');
  }
  function clear(input) {
    input.value = '';
    input.dataset.key = '';
    input.ctrl = false;
    input.alt = false;
    input.shift = false;
  }
  function renderSingleKeybind(input) {
    function simplify(str) {
      return str.replace(/^(Key|Digit)/, '');
    }
    const keyCombinations = [];
    if (input.ctrl) keyCombinations.push('Ctrl');
    if (input.alt) keyCombinations.push('Alt');
    if (input.shift) keyCombinations.push('Shift');
    if (input.dataset.key !== '') keyCombinations.push(simplify(input.dataset.key));
    input.value = keyCombinations.join('+');
  }
  function renderAllKeybinds(wrapper) {
    const panelWrapper = wrapper || document.getElementById(`${SCRIPT_ID}--panelWrapper`);
    const keybinds = {...getActiveKeybinds(), ...getGlobalKeybinds()};

    if (!panelWrapper) return;

    // Reset input fields
    for (const input of $$('[data-command]', panelWrapper)) {
      clear(input);
      input.disabled = (getStorage('usePreset') == 'default');
    }

    // Populate input from storage
    for (const name in keybinds) {
      const slots = keybinds[name];
      for (let i = 0; i < slots.length; i++) {
        const input = $(` [data-command="${name}"][data-slot="${i}"]`, panelWrapper);

        if (!slots[i] || !input || !slots[i].key) continue;

        const {key, ctrl = false, alt = false, shift = false} = slots[i];
        input.dataset.key = key;
        input.ctrl = ctrl;
        input.alt = alt;
        input.shift = shift;
        renderSingleKeybind(input);
      }
    }
  }
  function modifierLookup(which) {
    return ({16: 'shift', 17: 'ctrl', 18: 'alt'}[which]);
  }
  function saveKeybind(input) {
    const key = input.dataset.key;
    const ctrl = input.ctrl;
    const alt = input.alt;
    const shift = input.shift;
    const command = input.dataset.command;
    const slot = parseInt(input.dataset.slot);

    if (matchKeybind(key, ctrl, alt, shift)) {
      // existing keybind
      clear(input);
      input.blur();
      input.value = 'Keybind already in use';
      return;
    }
    if (reservedKeys.includes(key)) {
      // reserved key
      clear(input);
      input.blur();
      input.value = 'Key is reserved';
      return;
    }

    const presets = getStorage('keybinds');
    const keybinds = (actions[command].global)
      ? presets['global']
      : presets[getStorage('usePreset')];

    if (!keybinds[command]) {
      keybinds[command] = [];
    }
    if (key !== '') {
      // set
      keybinds[command][slot] = {key, ctrl, alt, shift};
      input.blur();
    } else {
      // delete
      delete keybinds[command][slot];
      if (keybinds[command].every(val => val === null)) delete keybinds[command];
    }
    setStorage('keybinds', presets);
    renderSingleKeybind(input);
  }
  function keydownHandler(e) {
    e.preventDefault();
    e.stopPropagation();
    const input = e.target;

    if (e.code == 'Escape' || e.code == 'Backspace' || e.code == 'Delete') {
      clear(input);
      saveKeybind(input);
      return;
    }

    if (e.repeat || input.dataset.key !== '') {
      return;
    }

    if (e.which >= 16 && e.which <= 18) {
      input[modifierLookup(e.which)] = true;
      renderSingleKeybind(input);
      return;
    }

    input.dataset.key = e.code;
    saveKeybind(input);
  }
  function keyupHandler(e) {
    e.preventDefault();
    e.stopPropagation();
    const input = e.target;

    if (e.which >= 16 && e.which <= 18 && !e.repeat && input.dataset.key == '') {
      input[modifierLookup(e.which)] = false;
      renderSingleKeybind(input);
    }
  }
  const panelWrapper = document.createElement('div');
  panelWrapper.id = `${SCRIPT_ID}--panelWrapper`;
  panelWrapper.innerHTML = `
<div id="${SCRIPT_ID}--panel" class="">
  <div class="${SCRIPT_ID}--header block__header">
    <b>Custom Shortcuts Settings</b>
    <select id="${SCRIPT_ID}--preset-selector">
      <option value="default">Default</option>
      <option value="preset_1">Preset 1</option>
      <option value="preset_2">Preset 2</option>
      <option value="preset_3">Preset 3</option>
    </select>
    <button id="${SCRIPT_ID}--close-button" class="button">🗙</button>
  </div>
  <div class="${SCRIPT_ID}--body block__tab">
    Esc/Backspace/Del to clear setting
    <br>
    <br>
    <div class="${SCRIPT_ID}--table">
      <span><b>Action</b></span>
      <span><b>Slot 1</b></span>
      <span><b>Slot 2</b></span>
      ${printRows()}
    </div>
  </div>
</div>
`;

  for (const input of $$('[data-command]', panelWrapper)) {
    // event handlers
    input.addEventListener('keydown', keydownHandler);
    input.addEventListener('keyup', keyupHandler);

    // define getter and setters
    for (const modifier of ['ctrl', 'alt', 'shift']) {
      Object.defineProperty(input, modifier, {
        set: function (val) {
          this.dataset[modifier] = val ? '1' : '0';
        },
        get: function () {
          return (this.dataset[modifier] == '1');
        }
      });
    }
  }

  // selector
  const selector = $(`#${SCRIPT_ID}--preset-selector`, panelWrapper);
  selector.value = getStorage('usePreset');
  selector.addEventListener('input', () => {
    setStorage('usePreset', selector.value);
    selector.blur();
    renderAllKeybinds();
  });

  // close panel
  panelWrapper.addEventListener('click', e => {
    if (e.target == e.currentTarget ||
      e.target.matches(`#${SCRIPT_ID}--close-button`)) {
      panelWrapper.remove();
    }
  });

  renderAllKeybinds(panelWrapper);
  document.body.appendChild(panelWrapper);
}

function keyHandler(e) {
  const command = matchKeybind(e.code, e.ctrlKey, e.altKey, e.shiftKey);
  const ownSettingsSelector = `.${SCRIPT_ID}--table input, #${SCRIPT_ID}--preset-selector`;
  let stopPropagation = true;
  let preventDefault = true;

  if (!command) {
    // keep things like ctrl + f working if combination is not rebound
    preventDefault = false;
  }

  // By default not to run on site inputs
  if (e.target.matches('input, .input') || e.target.matches(ownSettingsSelector)) {
    stopPropagation = false;
    preventDefault = false;
  }

  if (command
    && (actions[command].constant || (e.type == 'keydown'))
    && (actions[command].repeat || !e.repeat)
    && (actions[command].input || !e.target.matches('input, .input'))
    && !e.target.matches(ownSettingsSelector)) {

    const o = actions[command].fn(e) || {};
    if (Object.prototype.hasOwnProperty.call(o, 'stopPropagation')) stopPropagation = o.stopPropagation;
    if (Object.prototype.hasOwnProperty.call(o, 'preventDefault')) preventDefault = o.preventDefault;

  }

  if (stopPropagation) e.stopPropagation();
  if (preventDefault) e.preventDefault();
}

function init() {
  if (!document.getElementById(`${SCRIPT_ID}-style`)) {
    const styleElement = document.createElement('style');
    styleElement.setAttribute('type', 'text/css');
    styleElement.id = `${SCRIPT_ID}-style`;
    styleElement.innerHTML = CSS;
    document.body.insertAdjacentElement('afterend', styleElement);
  }

  // Initialize localStorage on first run
  if (localStorage.getItem(SCRIPT_ID) == null) localStorage.setItem(SCRIPT_ID, '{}');
  if (getStorage('keybinds') == null) setStorage('keybinds', {
    default: presets.default,
    preset_1: presets.preset_1,
    preset_2: presets.preset_2,
    preset_3: presets.preset_3,
    global: presets.global
  });
  if (getStorage('usePreset') == null) setStorage('usePreset', 'preset_1');

  // 'capture' is set to true so that the event is dispatched to the handler
  // before the native ones, so that the site shortcuts can be disabled
  // by stopPropagation();
  document.addEventListener('keydown', keyHandler, {capture: true});
  document.addEventListener('keyup', keyHandler, {capture: true});

  // Disable highlight when navigating away from current page.
  // Workaround for Firefox preserving page state when moving forward
  // and back in history.
  window.addEventListener('pagehide', function () {
    unhighlight($('.highlighted'));
  });
}

onReady(init);
})();
