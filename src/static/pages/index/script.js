/** @type {HTMLDivElement} */
const background = document.querySelector("#background");
/** @type {NodeListOf<HTMLAnchorElement>} */
const pages = document.querySelectorAll("#pages > a");

const page_angle = 2 * Math.PI / pages.length;

const page_rotation_speed = .25;
const background_animation_speed = .1;
let background_offset = 0;

let animation_speed = 1;
const animation_slowdown_speed = 2;

const page_distance = 270;
const x_distance_mult = 1.1;
const y_distance_mult = .9;

/** @type {Map<HTMLAnchorElement,number>} */
const pages_angle_map = new Map();

let pages_hovered = false;

function on_hover() {
    pages_hovered = true;
}

function on_unhover() {
    pages_hovered = false;
}

const mobile_media_query = matchMedia("(pointer: coarse)");

for (let i = 0; i < pages.length; i++) {
    const page = pages.item(i);
    pages_angle_map.set(page,page_angle * (i + 1) - Math.PI / 2);
    if (!mobile_media_query.matches) {
        page.addEventListener("mouseenter",on_hover);
        page.addEventListener("mouseleave",on_unhover);
    }
}

function is_mobile() {
    return document.body.offsetWidth <= 850
}

let last_timestamp = NaN;

/** @param {DOMHighResTimeStamp} timestamp */
function animation_step(timestamp) {
    const dt = (timestamp - last_timestamp) / 1000;
    if (pages_hovered && animation_speed > 0) {
        animation_speed = Math.max(animation_speed - animation_slowdown_speed * dt,0);
    } else if (!pages_hovered && animation_speed < 1) {
        animation_speed = Math.min(animation_speed + animation_slowdown_speed * dt,1);
    }
    for (const [page, angle] of pages_angle_map) {
        const new_angle = (angle + page_rotation_speed * animation_speed * dt) % (2 * Math.PI);
        pages_angle_map.set(page,new_angle);
        page.style.translate = `${Math.cos(new_angle) * page_distance * x_distance_mult}% ${Math.sin(new_angle) * page_distance * y_distance_mult}%`;
    }
    background_offset = (background_offset + animation_speed * background_animation_speed * dt) % 1
    const background_size = is_mobile() ? 300 : 450;
    const new_offset = background_size * background_offset - background_size;
    background.style.translate = `${new_offset}px ${new_offset}px`
    last_timestamp = timestamp;
    requestAnimationFrame(animation_step);
}

/** @param {DOMHighResTimeStamp} timestamp */
function initial_animation_step(timestamp) {
    last_timestamp = timestamp;
    animation_step(timestamp);
}

requestAnimationFrame(initial_animation_step);

/** @type {HTMLImageElement} */
const logo = document.querySelector("#logo");
const logo_rotation_functions = ["rotateY","rotateX","rotateZ"];
let logo_rotation = 0;
let last_logo_timestamp = NaN;
let logo_rotation_function = "";
let logo_rotation_sign = 0

/** @param {DOMHighResTimeStamp} timestamp */
function logo_animation_step(timestamp) {
    const dt = (timestamp - last_logo_timestamp) / 1000;
    let stop_condition;
    if (logo_rotation_sign === 1) {
        logo_rotation = Math.min(logo_rotation + dt * 16, 2*Math.PI);
        stop_condition = logo_rotation === 2*Math.PI;
    } else {
        logo_rotation = Math.max(logo_rotation - dt * 16, 0);
        stop_condition = logo_rotation === 0;
    }
    if (stop_condition) {
        logo.style.removeProperty("transform");
        return;
    }
    logo.style.transform = `${logo_rotation_function}(${logo_rotation}rad)`;
    last_logo_timestamp = timestamp;
    requestAnimationFrame(logo_animation_step);
}

/** @param {DOMHighResTimeStamp} timestamp */
function logo_initial_animation_step(timestamp) {
    last_logo_timestamp = timestamp;
    logo_animation_step(timestamp);
}

logo.addEventListener("click",() => {
    logo_rotation_function = logo_rotation_functions[Math.floor(Math.random() * logo_rotation_functions.length)]
    logo_rotation_sign = Math.random() <= .5 ? 1 : -1;
    logo_rotation = logo_rotation_sign === 1 ? 0 : 2*Math.PI;
    requestAnimationFrame(logo_initial_animation_step);
})