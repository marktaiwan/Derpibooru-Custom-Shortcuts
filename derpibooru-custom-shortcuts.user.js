// ==UserScript==
// @name         Derpibooru Custom Shortcuts
// @description  Configurable shortcuts and enhanced keyboard navigations. "Ctrl+Alt+/" to open settings.
// @version      1.1.0
// @author       Marker
// @license      MIT
// @namespace    https://github.com/marktaiwan/
// @homepageURL  https://github.com/marktaiwan/Derpibooru-Custom-Shortcuts
// @supportURL   https://github.com/marktaiwan/Derpibooru-Custom-Shortcuts/issues
// @match        https://*.derpibooru.org/*
// @match        https://*.trixiebooru.org/*
// @grant        GM_addStyle
// @inject-into  content
// @noframes
// ==/UserScript==

(function () {
'use strict';

const SCRIPT_ID = 'markers_custom_shortcuts';
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

.media-box.highlighted {
  box-shadow: 0px 0px 0px 4px coral;
}
`;

/*
 *  - 'key' uses KeyboardEvent.code to represent keypress.
 *    For instance, 's' would be 'KeyS' and '5' would be either 'Digit5' or
 *    'Numpad5'.
 *  - 'ctrl', 'alt', 'shift' are Booleans and defaults to false if not
 *        present.
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
    openInNewTab:       [{key: 'KeyE', shift: true}],
    prev:               [{key: 'KeyZ'}],
    next:               [{key: 'KeyX'}],
    // source:             [],
    random:             [{key: 'KeyR'}],
    upvote:             [{key: 'KeyG', shift: true}],
    favorite:           [{key: 'KeyF', shift: true}],
    // toIndex:            [],
    tagEdit:            [{key: 'KeyL'}],
    // tagSubmit:          [],
    toggleScale:        [{key: 'KeyV'}],
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
    name: 'Toggle keyboard navigation mode',
    fn: keyboardNavToggle
  },
  openSelected: {
    name: 'Open selected image',
    fn: () => {
      const mediaBox = $('.media-box.highlighted');
      if (mediaBox) click('.media-box__content a', mediaBox);
    }
  },
  openInNewTab: {
    name: 'Open selected image in new tab',
    fn: () => {
      const mediaBox = $('.media-box.highlighted');
      if (mediaBox) {
        const anchor = $('.media-box__content a', mediaBox);
        window.open(anchor.href, '_blank');
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
    fn: (e) => {
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
  toggleSound: {
    name: 'Mute/unmute webms',
    fn: () => {
      const video = $('video#image-display, .highlighted .video-container video');
      if (!video) return;
      video.muted = !video.muted;

      // SIN: Compatibility hack with Webm Volume Toggle because I
      //      don't know how to fix it properly in the other script
      const container = video.closest('.video-container');
      const button = $('.volume-toggle-button', container);
      container.dataset.isMuted = video.muted ? '1' : '0';

      if (!button) return;
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
      const commentField = $('#comment_body, #post_body, #message_body');
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
    fn: (e) => {
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

const smoothscroll = (function () {
  let startTime = null;
  let prevFrame = 0;
  let keydown = {up: false, down: false, left: false, right: false};

  function reset() {
    startTime = null;
    keydown = {up: false, down: false, left: false, right: false};
  }
  function noKeyDown() {
    return !(keydown.up || keydown.down || keydown.left || keydown.right);
  }
  function step(timestamp) {

    // Only run step() once per animation frame. Discard any subsequent runs
    // with interval greatly shorter than 16ms without resetting.
    const interval = timestamp - prevFrame;
    prevFrame = timestamp;
    if (interval < 10) return;

    if (noKeyDown() || !document.hasFocus()) {
      reset();
      return;
    }

    startTime = startTime || timestamp;
    const elapsed = timestamp - startTime;
    const maxVelocity = 40; // px/frame
    const easeDuration = 250;  // ms

    const velocity = (elapsed > easeDuration)
      ? maxVelocity
      : maxVelocity * (elapsed / easeDuration);

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
    window.requestAnimationFrame(step);
  }

  return function (direction, type) {
    switch (type) {
      case 'keydown':
        if (noKeyDown()) window.requestAnimationFrame(step);
        keydown[direction] = true;
        break;
      case 'keyup':
        keydown[direction] = false;
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
  const {top, bottom, height} = ele.getBoundingClientRect();
  const mid = (top + bottom) / 2;

  return {top, bottom, height, mid};
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

function highlight(mediaBox, setSmooth = true) {
  if (!mediaBox) return;

  const ele = $('.media-box.highlighted');
  if (ele) ele.classList.remove('highlighted');

  $('.media-box__content a', mediaBox).focus({preventScroll: true});
  mediaBox.classList.add('highlighted');

  if (!isVisible(mediaBox)) {
    if (setSmooth) {
      mediaBox.scrollIntoView({behavior: 'smooth', block: 'center'});
    } else {
      mediaBox.scrollIntoView({behavior: 'auto', block: 'nearest'});
    }
  }

  sessionStorage.lastSelectedThumb = mediaBox.dataset.imageId;
}

function scroll(direction, event) {
  const type = event.type;
  const mediaBox = $('.media-box.highlighted');

  if (mediaBox && type == 'keydown') {
    keyboardNav(direction, mediaBox, !event.repeat);
  } else if (!event.repeat){
    smoothscroll(direction, type);
  }
}

function keyboardNavToggle() {
  const mediaBoxSelector = '.js-resizable-media-container .media-box';
  const mediaBox = $('.media-box.highlighted');

  if (mediaBox) {
    mediaBox.classList.remove('highlighted');
  } else {
    const prevSelected = $(`.media-box[data-image-id="${sessionStorage.lastSelectedThumb}"]`);
    if (prevSelected && isVisible(prevSelected)) {
      highlight(prevSelected);
    } else {
      highlight(getFirstVisibleOrClosest(mediaBoxSelector));
    }
  }
}

function keyboardNav(direction, mediaBox, setSmooth) {
  function similar(val1, val2, margin) {
    return (val1 < val2 + margin && val1 > val2 - margin);
  }
  const originalPos = {x: mediaBox.offsetLeft, y: mediaBox.offsetTop};
  const boxWidth = mediaBox.clientWidth;
  const errorMargin = boxWidth / 3;
  let ele;
  switch (direction) {
    case 'left': {
      ele = mediaBox.previousElementSibling;
      break;
    }
    case 'right': {
      ele = mediaBox.nextElementSibling;
      break;
    }
    case 'up': {
      let currentBox = mediaBox;
      do {
        const currentPos = {x: currentBox.offsetLeft, y: currentBox.offsetTop};
        if (!similar(originalPos.y, currentPos.y, errorMargin)) ele = currentBox;
        if (currentPos.y < originalPos.y && similar(originalPos.x, currentPos.x, errorMargin)) break;
      } while ((currentBox = currentBox.previousElementSibling));
      break;
    }
    case 'down': {
      let currentBox = mediaBox;
      do {
        const currentPos = {x: currentBox.offsetLeft, y: currentBox.offsetTop};
        if (!similar(originalPos.y, currentPos.y, errorMargin)) ele = currentBox;
        if (currentPos.y > originalPos.y && similar(originalPos.x, currentPos.x, errorMargin)) break;
      } while ((currentBox = currentBox.nextElementSibling));
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
        && actions.hasOwnProperty(name)) {
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
  if (e.target.matches('.input') || e.target.matches(ownSettingsSelector)) {
    stopPropagation = false;
    preventDefault = false;
  }

  if (command
    && (actions[command].constant || (e.type == 'keydown'))
    && (actions[command].repeat || !e.repeat)
    && (actions[command].input || !e.target.matches('.input'))
    && !e.target.matches(ownSettingsSelector)) {

    const o = actions[command].fn(e) || {};
    if (o.hasOwnProperty('stopPropagation')) stopPropagation = o.stopPropagation;
    if (o.hasOwnProperty('preventDefault')) preventDefault = o.preventDefault;

  }

  if (stopPropagation) e.stopPropagation();
  if (preventDefault) e.preventDefault();
}

function init() {
  GM_addStyle(CSS);

  // Initialize localStorage on first run
  if (localStorage.getItem(SCRIPT_ID) == null) localStorage.setItem(SCRIPT_ID, '{}');
  if (getStorage('keybinds') == null) setStorage('keybinds', {
    default: presets.default,
    preset_1: presets.preset_1,
    preset_2: presets.preset_2,
    preset_3: presets.preset_3,
    global: presets.global
  });
  if (getStorage('usePreset') == null) setStorage('usePreset', 'default');

  // 'capture' is set to true so that the event is dispatched to the handler
  // before the native ones, so that the site shortcuts can be disabled
  // by stopPropagation();
  document.addEventListener('keydown', keyHandler, {capture: true});
  document.addEventListener('keyup', keyHandler, {capture: true});

  // Disable highlight when navigating away from current page.
  // Workaround for Firefox preserving page state when moving forward
  // and back in history.
  window.addEventListener('pagehide', function () {
    for (const ele of document.querySelectorAll('.highlighted')) {
      ele.classList.remove('highlighted');
    }
  });
}

init();
})();
