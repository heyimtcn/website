/** @import { BaseGame } from "./game.js" */

import { Signal } from "./datatypes.js";

export class Actor {
    /** @type {BaseGame} */
    game;
    initialized = false;
    /** @type {Record<string,any>} */
    meta = {};
    init() {
        this.initialized = true
    }
    deinit() {
        this.initialized = false
    }
    draw() {
    }
    /**
     * @param {number} dt
    */
    update(dt) {
        this.updated.emit()
    }
    updated = new Signal();
}