import { Actor } from "./actor.js";
import { CollisionBox, Signal, Vector2 } from "./datatypes.js";
import { move_toward } from "./math.js";
/** @import { BaseGame, CollisionInfo } from "./game.js" */
/** @import { Ref } from "./datatypes.js" */
/** @import { SpritesheetLoader } from "./texture_loader.js" */
/** @typedef {Ref<ImageBitmap | string | null>} Texture */

export class Sprite extends Actor {
    pos = Vector2.zero;
    size = Vector2.zero;
    src_pos = Vector2.zero;
    src_size = Vector2.zero;
    /** @type {Texture} */
    texture;
    texture_flip_x = false;
    texture_flip_y = false;
    always_on_top = false;
    /** @type {CollisionBox[]} */
    collision_boxes = [];
    /** 
     * @param {Texture} texture
     * @param {Vector2} pos
     * @param {Vector2} size
    */
    debug_render_collision_boxes = false;
    velocity = Vector2.zero;
    gravity_force = 0;
    collision_sensor = false;
    speed = 500;
    jump_height = 600;
    acceleration = 4000;
    ground_friction = 5000;
    air_friction = 3000;
    collision_steps = 1;
    /**
     * @callback other_sprite_predicate
     * @param {Sprite} other
     * @returns {boolean}
    */
    /** @type {other_sprite_predicate?} */
    overlap_predicate;
    /** @type {other_sprite_predicate?} */
    collision_predicate;
    jumped = new Signal();
    /** @type {Signal<[Sprite,CollisionInfo]>} */
    touched = new Signal();
    /**
     * @param {Texture} texture 
     * @param {Vector2} pos 
     * @param {Vector2} size 
     * @param {Vector2?} src_pos 
     * @param {Vector2?} src_size 
    */
    constructor(texture,pos,size,src_pos,src_size) {
        super();
        this.texture = texture;
        this.pos = pos;
        this.size = size;
        this.src_pos = src_pos ?? Vector2.zero;
        this.src_size = src_size ?? Vector2.zero;
    }
    draw() {
        if (!this.texture.val) {
            return;
        }
        if (this.texture.val instanceof ImageBitmap) {
            this.game.context.save()
            this.game.context.scale(this.texture_flip_x ? -1 : 1,this.texture_flip_y ? -1 : 1)
            const pos = this.pos.clone()
            if (this.texture_flip_x) {
                pos.x = -pos.x - this.size.x - this.game.camera_position.x * 2
            }
            if (this.texture_flip_y) {
                pos.y = -pos.y - this.size.y - this.game.camera_position.y * 2
            }
            this.game.context.drawImage(this.texture.val, this.src_pos.x, this.src_pos.y, this.src_size.x, this.src_size.y, pos.x + this.game.camera_position.x, pos.y + this.game.camera_position.y, this.size.x, this.size.y);
            this.game.context.restore()
        }
        if (typeof this.texture.val == "string") {
            this.game.context.save()
            this.game.context.fillStyle = this.texture.val;
            this.game.context.fillRect(this.pos.x + this.game.camera_position.x,this.pos.y + this.game.camera_position.y,this.size.x,this.size.y);
            this.game.context.restore()
        }
        if (this.debug_render_collision_boxes) {
            for (const collision_box of this.collision_boxes) {
                this.game.context.save()
                this.game.context.strokeStyle = "blue";
                this.game.context.strokeRect(this.pos.x + collision_box.pos.x + this.game.camera_position.x,this.pos.y + collision_box.pos.y + this.game.camera_position.y,collision_box.size.x,collision_box.size.y);
                this.game.context.restore()
            }
        }
    }
    jump() {
        this.pos.y -= 1;
        this.velocity.y = -this.jump_height;
        this.jumped.emit();
    }
    /**
     * @param {Vector2} direction
     * @param {number} dt
    */
    move(direction,dt) {
        const target_horizontal_velocity = direction.x * this.speed;
        const current_acceleration = direction.x != 0 ? this.acceleration : (this.is_grounded(this.game) ? this.ground_friction : this.air_friction);
        this.velocity.x = move_toward(this.velocity.x, target_horizontal_velocity, current_acceleration*dt);
    }
    is_grounded() {
        if (this.velocity.y < 0) {
            return false;
        }
        if (!this.game.frame_overlaps.has(this)) {
            return this.is_void_grounded(this.game);
        }
        const collisions = this.game.frame_overlaps.get(this);
        for (const [collider,direction] of collisions) {
            if (direction === "over") {
                return true;
            }
        }
        return this.is_void_grounded(this.game);
    }
    is_void_grounded() {
        return this.pos.y === this.game.size.y - this.size.y;
    }
    /**
     * @param {number} dt
    */
    update(dt) {
        super.update(dt)
        if (!this.velocity.is_zero() || this.gravity_force != 0) {
            this.update_movement(dt);
        }
        if (!this.collision_sensor) {
            return
        }
        if (!this.game.frame_overlaps.has(this)) {
            return;
        }
        for (const info of this.game.frame_overlaps.get(this)) {
            const [collider] = info
            this.touched.emit([collider,info]);
            if (!collider.collision_sensor) {
                collider.touched.emit([this,info]);
            }
        }
    }
    /**
     * @param {number} dt
    */
    update_movement(dt) {
        if (!this.is_grounded(this.game)) {
            this.velocity.y += this.gravity_force * dt;
        } else {
            this.velocity.y = 0;
        }
        if (this.velocity.is_zero()) {
            return;
        }
        let move_amount_x = this.velocity.x * dt / this.collision_steps
        let move_amount_y = this.velocity.y * dt / this.collision_steps
        for (let i = 0; i < this.collision_steps; i++) {
            let collisions;
            if (this.collision_steps <= 1 || i == 0) {
                if (!this.game.frame_overlaps.has(this)) {
                    this.game.frame_overlaps.set(this,this.game.check_for_overlap(this,[]));
                }
                collisions = this.game.frame_overlaps.get(this);
            } else {
                collisions = this.game.check_for_overlap(this,[]);
                this.game.frame_overlaps.set(this,collisions);
            }
            if (this.is_void_grounded(this.game)) {
                this.velocity.y = 0;
                move_amount_y = 0;
            }
            for (const [collider,direction,cb,ocb] of collisions) {
                if (this.collision_predicate) {
                    if (!this.collision_predicate(collider)) {
                        continue
                    }
                }
                if (collider.collision_predicate) {
                    if (!collider.collision_predicate(this)) {
                        continue
                    }
                }
                if ((direction === "left" && move_amount_x > 0) || (direction === "right" && move_amount_x < 0)) {
                    this.velocity.x = 0;
                    move_amount_x = 0;
                } else if ((direction === "over" && move_amount_y > 0) || (direction === "under" && move_amount_y < 0)) {
                    this.velocity.y = 0;
                    move_amount_y = 0;
                    if (direction === "over") {
                        this.pos.y -= Math.max(0,Math.min(Math.max(this.pos.y,this.pos.y + this.size.y),Math.max(collider.pos.y,collider.pos.y + collider.size.y)) - Math.max(Math.min(this.pos.y,this.pos.y + this.size.y),Math.min(collider.pos.y,collider.pos.y + collider.size.y)))
                        // ^ height of intersection of the 2 sprites
                    }
                }
            }
            this.pos.x += move_amount_x
            this.pos.y = Math.min(this.pos.y + move_amount_y, this.game.size.y - this.size.y)
            if (move_amount_x === 0 && move_amount_y === 0) {
                break
            }
        }
    }
    setup_default_collision() {
        this.collision_boxes.push(new CollisionBox(Vector2.zero, this.size.clone()));
    }
}

export class SpriteAnimation {
    /** @type {Ref<CanvasImageSource?>} */
    atlas;
    atlas_size = Vector2.zero;
    frames_in_row = 0;
    frame_size = Vector2.zero;
    frame_amount = 0;
    /** 
     * @param {number} idx
     * @returns {Vector2}
    */
    get_frame_pos_at_idx(idx) {
        return new Vector2(idx % this.frames_in_row, Math.floor(idx / this.frames_in_row));
    }
    /** 
     * @param {number} idx
     * @returns {Vector2}
    */
    get_sized_frame_pos_at_idx(idx) {
        const frame_pos = this.get_frame_pos_at_idx(idx);
        frame_pos.x *= this.frame_size.x;
        frame_pos.y *= this.frame_size.y;
        return frame_pos;
    }
    /**
     * @param {Ref<CanvasImageSource?>} atlas 
     * @param {Vector2} atlas_size 
     * @param {number} frames_in_row 
     * @param {Vector2} frame_size 
     * @param {number} frame_amount 
     */
    constructor(atlas, atlas_size, frames_in_row, frame_size, frame_amount) {
        this.atlas = atlas;
        this.atlas_size = atlas_size;
        this.frames_in_row = frames_in_row;
        this.frame_size = frame_size;
        this.frame_amount = frame_amount;
    }
    /**
     * @param {SpritesheetLoader} loader
    */
    static from_loader(loader) {
        return new SpriteAnimation(
            loader.texture,
            loader.size,
            loader.frames_in_row,
            loader.sprite_size,
            loader.frame_amount
        )
    }
}

export class AnimatedSprite extends Sprite {
    animation_frame = 0;
    last_animation_frame_change = 0;
    animation_frame_dt = 10;
    animation = "";
    animating = true;
    /** @type {Map<string,SpriteAnimation>} */
    sprite_animations;
    /** @param {string} id */
    set_animation(id) {
        this.animation = id;
        this.animation_frame = 0;
        if (this.game) {
            this.last_animation_frame_change = this.game.last_frame;
        }
        const sprite_animation = this.sprite_animations.get(this.animation);
        if (!sprite_animation) {
            return;
        }
        this.texture = sprite_animation.atlas;
        this.src_size = sprite_animation.frame_size;
        this.src_pos = sprite_animation.get_sized_frame_pos_at_idx(this.animation_frame);
    }
    /**
     * @param {Ref<CanvasImageSource?>} texture
     * @param {Vector2} pos
     * @param {Vector2} size
     * @param {string} animation
     * @param {Record<string,SpriteAnimation>} sprite_animations
    */
    constructor(pos, size, sprite_animations) {
        super(null, pos, size);
        this.sprite_animations = new Map(Object.entries(sprite_animations));
    }
    /**
     * @param {number} dt 
    */
    update(dt) {
        super.update(dt);
        if (!this.animating) {
            return;
        }
        const sprite_animation = this.sprite_animations.get(this.animation);
        if (!sprite_animation) {
            return;
        }
        if (this.game.last_frame - this.last_animation_frame_change >= this.animation_frame_dt) {
            this.animation_frame = (this.animation_frame + 1) % sprite_animation.frame_amount;
            this.last_animation_frame_change = this.game.last_frame;
        }
        this.src_pos = sprite_animation.get_sized_frame_pos_at_idx(this.animation_frame);
    }
}