import * as Tone from 'https://esm.sh/tone';

/** @type {string[]} */
const keys_down = [];

/** @type {((key:string) => void)[]} */
const key_down_listeners = [];
/** @type {((key:string) => void)[]} */
const key_up_listeners = [];

const default_instrument = "piano";

let current_key = "neutral";
let octave_shifted = false;
let current_instrument = "";
let current_sampler

const key_element = new Map([
    ["neutral", document.querySelector("#neutral")],
    ["right", document.querySelector("#arrow_right")],
    ["down_right", document.querySelector("#arrow_down_right")],
    ["down", document.querySelector("#arrow_down")],
    ["down_left", document.querySelector("#arrow_down_left")],
    ["left", document.querySelector("#arrow_left")],
    ["up_left", document.querySelector("#arrow_up_left")],
    ["up", document.querySelector("#arrow_up")],
]);

const key_note_regular = new Map([
    ["neutral", "B5"],
    ["right", "C#6"],
    ["down_right", "D#6"],
    ["down", "E6"],
    ["down_left", "F#6"],
    ["left", "G#6"],
    ["up_left", "A#6"],
    ["up", "B6"],
]);

const key_note_shifted = new Map([
    ["neutral", "B4"],
    ["right", "C#5"],
    ["down_right", "D#5"],
    ["down", "E5"],
    ["down_left", "F#5"],
    ["left", "G#5"],
    ["up_left", "A#5"],
    ["up", "B5"],
]);

/**
 * @param {string} key
 * @returns {string}
*/
function get_note_from_key(key) {
    if (!octave_shifted) {
        return key_note_regular.get(key);
    }
    return key_note_shifted.get(key);
}

const arrow_keys = ["ArrowUp","ArrowLeft","ArrowRight","ArrowDown"];

function update_selected_key() {
    const up_key_down = keys_down.includes("ArrowUp");
    const left_key_down = keys_down.includes("ArrowLeft");
    const right_key_down = keys_down.includes("ArrowRight");
    const down_key_down = keys_down.includes("ArrowDown");
    const prev_key = current_key;
    if (down_key_down && right_key_down) {
        current_key = "down_right";
    } else if (down_key_down && left_key_down) {
        current_key = "down_left";
    } else if (up_key_down && left_key_down) {
        current_key = "up_left";
    } else if (right_key_down) {
        current_key = "right";
    } else if (down_key_down) {
        current_key = "down";
    } else if (left_key_down) {
        current_key = "left";
    } else if (up_key_down) {
        current_key = "up";
    } else {
        current_key = "neutral";
    }
    if (current_key === prev_key) {
        return;
    }
    key_element.get(prev_key).classList.remove("selected");
    key_element.get(current_key).classList.add("selected");
}

key_element.get(current_key).classList.add("selected");

key_down_listeners.push((key) => {
    if (key === "c" || key === "C") {
        octave_shifted = true;
        document.body.classList.add("shifted");
    } else if (arrow_keys.includes(key)) {
        update_selected_key();
    } else if (key === "z" || key === "Z") {
        if (current_sampler?.loaded) {
            current_sampler.triggerAttackRelease([get_note_from_key(current_key)],1);
        }
    }
});

key_up_listeners.push((key) => {
    if (key === "c" || key === "C") {
        octave_shifted = false;
        document.body.classList.remove("shifted");
    } else if (arrow_keys.includes(key)) {
        update_selected_key();
    }
});

const piano_ui_elements = document.querySelectorAll("#piano_ui > *");

let start_timestamp = 0;

/** @param {number} timestamp */
function animate_piano_ui(timestamp) {
    const elapsed = timestamp - start_timestamp;
    const elapsed_seconds = elapsed / 1000;
    for (let i = 0; i < piano_ui_elements.length; i++) {
        /** @type {HTMLElement} */
        const element = piano_ui_elements[i];
        const offset = Math.sin(elapsed_seconds * 2 + i * 0.8) * 8;
        element.style.translate = `0 ${offset}%`;
    }
    window.requestAnimationFrame(animate_piano_ui)
}

window.requestAnimationFrame((timestamp) => {
    start_timestamp = timestamp;
    animate_piano_ui(timestamp);
});

/** @type {Map<string,any>} */
const loaded_samplers = new Map()

/**
 * @param {string} name 
 * @returns {HTMLDivElement?}
*/
function get_instrument_el_from_name(name) {
    return document.querySelector(`#instruments > div[data-instrument="${name}"]`);
}

/** @param {string} instrument */
function load_sampler(instrument) {
    if (loaded_samplers.has(instrument)) {
        return loaded_samplers.get(instrument);
    }
    const sample = new Tone.Sampler({
        urls: {
            B5: `assets/sounds/instruments/${instrument}.wav`,
        },
    }).toDestination();
    loaded_samplers.set(instrument,sample);
    return sample;
}

/** @param {string} instrument */
function set_instrument(instrument) {
    if (instrument === current_instrument) {
        return;
    }
    current_sampler = load_sampler(instrument);
    get_instrument_el_from_name(current_instrument)?.classList.remove("selected");
    get_instrument_el_from_name(instrument).classList.add("selected");
    current_instrument = instrument;
}

set_instrument(default_instrument);

for (const instr_element of /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll("#instruments > div"))) {
    instr_element.style.maskImage = `url("assets/sprites/instruments/${instr_element.dataset.instrument}.png")`;
    instr_element.addEventListener("click", () => set_instrument(instr_element.dataset.instrument));
}

document.addEventListener("keydown", (ev) => {
    if (keys_down.includes(ev.key)) {
        return;
    }
    keys_down.push(ev.key);
    for (const callback of key_down_listeners) {
        callback(ev.key);
    }
});

document.addEventListener("keyup", (ev) => {
    if (!keys_down.includes(ev.key)) {
        return;
    }
    keys_down.splice(keys_down.indexOf(ev.key),1);
    for (const callback of key_up_listeners) {
        callback(ev.key);
    }
});

/** @type {HTMLSpanElement} */
const loading_notice = document.querySelector("#loading_notice");
Tone.loaded().then(() => {
    loading_notice.innerText = "enjoy!";
    loading_notice.style.opacity = "0";
})