import { Vector2, Ref, CollisionBox } from "./datatypes.js";
import { in_range } from "./math.js";
/** @import { Sprite } from "./sprite.js" */
/** @typedef {"over"|"under"|"left"|"right"|"unknown"} Direction */
/** @typedef {[Sprite,Direction,CollisionBox,CollisionBox]} CollisionInfo */

export class BaseGame {
    size = Vector2.zero;
    fps = 60;
    last_frame = performance.now();
    dt = 0;
    target_dt = 0;
    /** @type {Map<string,any>} */
    debug_info = new Map()
    /** @type {Sprite[]} */
    sprites = [];
    /** @type {Vector2} */
    camera_position = Vector2.zero;
    /** @type {CanvasRenderingContext2D} */
    context;
    /** @type {Map<Sprite,CollisionInfo[]>} */
    frame_overlaps = new Map()
    /**
     * @param {CanvasRenderingContext2D} context
     * @param {Vector2} size
    */
    constructor(context,size) {
        this.context = context
        this.target_dt = 1 / this.fps;
        this.size = size;
    };
    init() {
    }
    draw() {
        this.context.clearRect(0, 0, this.size.x, this.size.y);
        this.context.save()
        this.context.fillStyle = "#9494FF"
        this.context.fillRect(0, 0, this.size.x, this.size.y)
        this.context.restore()
        const draw_last = []
        for (const sprite of this.sprites) {
            if (sprite.always_on_top) {
                draw_last.push(sprite)
                continue
            }
            sprite.draw();
        }
        for (const sprite of draw_last) {
            sprite.draw();
        }
    };
    update() {
        const now = performance.now();
        this.dt = (now - this.last_frame) / 1000;
        this.last_frame = now;
        this.frame_overlaps.clear()
        for (const sprite of this.sprites) {
            if (!sprite.collision_sensor) {
                continue;
            }
            this.frame_overlaps.set(sprite,this.check_for_overlap(sprite,[]))
        }
        for (const sprite of this.sprites) {
            sprite.update(this.dt);
        }
    };
    /**
     * @param {Sprite} sprite
    */
    add_sprite(sprite) {
        if (!this.sprites.includes(sprite)) {
            this.sprites.push(sprite);
        }
        if (!sprite.initialized) {
            sprite.game = this
            sprite.init();
        }
    }
    /**
     * @param {Sprite} sprite
    */
    remove_sprite(sprite) {
        if (this.sprites.includes(sprite)) {
            this.sprites.splice(this.sprites.indexOf(sprite),1);
        }
        if (sprite.initialized) {
            sprite.deinit();
        }
    }
    /**
     * @param {Sprite} sprite
     * @param {Sprite[]} ignore
     * @returns {CollisionInfo[]}
    */
    check_for_overlap(sprite,ignore = []) {
        const collisions = []
        for (const other_sprite of this.sprites) {
            if (other_sprite === sprite) {
                continue;
            }
            if (ignore.includes(other_sprite)) {
                continue;
            }
            if (sprite.overlap_predicate) {
                if (!sprite.overlap_predicate(other_sprite)) {
                    continue
                }
            }
            if (other_sprite.overlap_predicate) {
                if (!other_sprite.overlap_predicate(sprite)) {
                    continue
                }
            }
            for (const other_collision_box of other_sprite.collision_boxes) {
                for (const sprite_collision_box of sprite.collision_boxes) {
                    if (sprite_collision_box.collides_with(other_collision_box,sprite.pos,other_sprite.pos)) {
                        let collision
                        if (in_range(sprite.pos.y + sprite.size.y,other_sprite.pos.y,4)) {
                            collision = [other_sprite,"over",sprite_collision_box,other_collision_box];
                        } else if (in_range(sprite.pos.y,other_sprite.pos.y + other_sprite.size.y,10)) {
                            collision = [other_sprite,"under",sprite_collision_box,other_collision_box];
                        } else if (in_range(sprite.pos.x + sprite.size.x,other_sprite.pos.x,10)) {
                            collision = [other_sprite,"left",sprite_collision_box,other_collision_box];
                        } else if (in_range(sprite.pos.x,other_sprite.pos.x + other_sprite.size.x,10)) {
                            collision = [other_sprite,"right",sprite_collision_box,other_collision_box];
                        } else {
                            collision = [other_sprite,"unknown",sprite_collision_box,other_collision_box];
                        }
                        collisions.push(collision)
                    }
                }
            }
        }
        return collisions;
    }
}