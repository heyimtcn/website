import { SpritesheetLoader, Vector2, Sprite, Ref, AnimatedSprite, SpriteAnimation, BaseGame, TextureLoader, SignalConnection } from "./engine/index.js"

/** @type {HTMLCanvasElement} */
const game_canvas = document.querySelector("#game_canvas");
const context = game_canvas.getContext("2d");
/** @type {HTMLDivElement} */
const debug_info_element = document.querySelector("#debug_info")
context.imageSmoothingEnabled = false

const tile_size = 48
const tiles = [
    "                          @  @                                                                                                                           ",
    "          ?               &&&&&&&&   &&&?              ^           &&&    &??&                                                        ##                 ",
    "                                                                                                                                     ###                 ",
    "                                                                                                                                    ####                 ",
    "                                                                                                                                   #####        *        ",
    "    ?   &^&?&         &^&               &     &&    ?  ?  ?     &          &&      #  #          ##  #            &&?&            ######                 ",
    "                                                                                  ##  ##        ###  ##                          #######                 ",
    "                                                                                 ###  ###      ####  ###                        ########                 ",
    "          @                                @ @             @ @        @ @       ####  ####    #####  ####               @ @    #########                 ",
    "=================  =============   ================================================================  ====================================================",
    "=================  =============   ================================================================  ===================================================="
]

const smb1_tileset = new TextureLoader(
    "smb1_tileset.png",
    new Vector2(680,776)
)

const smb1_items = new TextureLoader(
    "smb1_items.png",
    new Vector2(592,572)
)

const smb1_enemies = new TextureLoader(
    "smb1_enemies.png",
    new Vector2(436,530)
)

const youre_winner_texture = new TextureLoader(
    "youre_winner.png",
    new Vector2(315,351)
)

const idle_spritesheet = new SpritesheetLoader(
    "idle_spritesheet.png",
    new Vector2(1160, 878),
    new Vector2(232, 439),
    5,
    10
);

const run_spritesheet = new SpritesheetLoader(
    "run_spritesheet.png",
    new Vector2(1452, 1374),
    new Vector2(363, 458),
    4,
    10
);

const goomba_spritesheet = new SpritesheetLoader(
    "goomba.png",
    new Vector2(32,16),
    new Vector2(16,16),
    2,
    2
)

const coin_spritesheet = new SpritesheetLoader(
    "coin.png",
    new Vector2(32,16),
    new Vector2(8,16),
    4,
    4
)

const question_block_spritesheet = new SpritesheetLoader(
    "question_block.png",
    new Vector2(80,16),
    new Vector2(16,16),
    5,
    5
)

const opened_question_block_spritesheet = new SpritesheetLoader(
    "opened_question_block.png",
    new Vector2(16,16),
    new Vector2(16,16),
    1,
    1
)

class Game extends BaseGame {
    /** @type {Player} */
    player;
    /**
     * @param {CanvasRenderingContext2D} context
     * @param {Vector2} size
    */
    constructor(context,size) {
        super(context,size)
        const player = new Player(
            Vector2.zero,
            Vector2.zero,
            {
                idle: SpriteAnimation.from_loader(idle_spritesheet),
                run: SpriteAnimation.from_loader(run_spritesheet)
            }
        );
        this.player = player;
        this.add_sprite(player);
        for (let row = 0; row < tiles.length; row++) {
            const row_tiles = tiles[row].split("")
            for (let column = 0; column < row_tiles.length; column++) {
                const tile = row_tiles[column];
                switch (tile) {
                    case " ":
                        break
                    case "&":
                        this.create_breakable_block(column,row)
                        break
                    case "?":
                        this.create_question_block(column,row,false)
                        break
                    case "^":
                        this.create_question_block(column,row,true)
                        break
                    case "#":
                        this.create_solid_block(column,row);
                        break
                    case "=":
                        this.create_ground_block(column,row);
                        break
                    case "@":
                        this.create_goomba(column,row);
                        break
                    case "*":
                        const y_offset = this.size.y - tiles.length * tile_size
                        const winner = new Sprite(youre_winner_texture.texture,new Vector2(column * tile_size,y_offset + row * tile_size).sub(youre_winner_texture.size.scaled(.5)),youre_winner_texture.size,Vector2.zero,youre_winner_texture.size)
                        this.add_sprite(winner)
                }
            }
        }
    };
    update() {
        super.update();
        this.camera_position.x = -this.player.pos.x + this.size.x/2 - this.player.size.x/2 - this.size.x/8;
        let debug_str = "";
        for (const [key,value] of this.debug_info) {
            let new_val = value;
            if (value instanceof Ref) {
                new_val = value.val
            }
            debug_str += `<span>${key}: ${new_val}</span>`;
        }
        debug_info_element.innerHTML = debug_str;
    }
    /**
     * @param {number} column
     * @param {number} row
     * @param {Vector2} src_pos
     * @param {Ref<ImageBitmap?>?} texture
    */
    create_tile(column,row,src_pos,texture) {
        texture = texture ?? smb1_tileset.texture
        const y_offset = this.size.y - tiles.length * tile_size
        return new Sprite(texture,new Vector2(column * tile_size,y_offset + row * tile_size),new Vector2(tile_size,tile_size),src_pos,new Vector2(16,16))
    }
    /**
     * @param {number} column
     * @param {number} row
     * @param {Record<string,SpriteAnimation>} sprite_animations
    */
    create_animated_tile(column,row,sprite_animations) {
        const y_offset = this.size.y - tiles.length * tile_size
        return new AnimatedSprite(new Vector2(column * tile_size,y_offset + row * tile_size),new Vector2(tile_size,tile_size),sprite_animations)
    }
    /**
     * @param {number} column
     * @param {number} row
    */
    create_breakable_block(column,row) {
        const breakable_block = this.create_tile(column,row,new Vector2(17,16));
        breakable_block.setup_default_collision();
        this.add_sprite(breakable_block);
        breakable_block.touched.connect(([collider,collision]) => {
            if (!collider instanceof Player) {
                return;
            }
            if (!collider.is_big) {
                return;
            }
            if (collision[1] != "under") {
                return;
            }
            if (collider.velocity.y > 0) {
                return;
            }
            this.remove_sprite(breakable_block);
        });
    }
    /**
     * @param {number} column
     * @param {number} row
     * @param {bool} has_mushroom
    */
    create_question_block(column,row,has_mushroom) {
        const question_block = this.create_animated_tile(column,row,{
            idle: SpriteAnimation.from_loader(question_block_spritesheet),
            opened: SpriteAnimation.from_loader(opened_question_block_spritesheet)
        });
        question_block.animation_frame_dt = 200;
        question_block.setup_default_collision();
        this.add_sprite(question_block);
        question_block.set_animation("idle");
        /** @type {SignalConnection} */
        let conn
        conn = question_block.touched.connect(([collider,collision]) => {
            if (!collider instanceof Player) {
                return;
            }
            if (collision[1] != "under") {
                return;
            }
            if (collider.velocity.y > 0) {
                return;
            }
            question_block.meta.opened = true;
            conn.disconnect()
            question_block.set_animation("opened");
            question_block.animating = false;
            if (has_mushroom) {
                this.create_mushroom(new Vector2(question_block.pos.x,question_block.pos.y - tile_size),true)
            } else {
                this.create_coin_visual(new Vector2(question_block.pos.x,question_block.pos.y - tile_size))
            }
        })
    }
    /**
     * @param {number} column
     * @param {number} row
    */
    create_solid_block(column,row) {
        const solid_block = this.create_tile(column,row,new Vector2(0,33));
        solid_block.setup_default_collision();
        this.add_sprite(solid_block);
    }
    /**
     * @param {number} column
     * @param {number} row
    */
    create_ground_block(column,row) {
        const ground_block = this.create_tile(column,row,new Vector2(0,16));
        ground_block.setup_default_collision();
        this.add_sprite(ground_block);
    }
    /**
     * @param {number} column
     * @param {number} row
    */
    create_goomba(column,row) {
        const goomba = this.create_animated_tile(column,row,{
            walk: SpriteAnimation.from_loader(goomba_spritesheet)
        })
        goomba.animation_frame_dt = 200;
        goomba.setup_default_collision()
        goomba.collision_predicate = (other) => other != this.player;
        goomba.collision_sensor = true;
        goomba.collision_steps = 5;
        goomba.gravity_force = 1000;
        goomba.speed = 100
        goomba.meta.active = false
        goomba.meta.move_dir = -1
        goomba.meta.last_hit = 0;
        goomba.updated.connect(() => {
            if (!goomba.meta.active) {
                if (Math.abs(this.player.pos.x - goomba.pos.x) < 1000) {
                    goomba.meta.active = true;
                } else {
                    return;
                }
            }            
            if (goomba.is_void_grounded()) {
                this.remove_sprite(goomba)
            }
            goomba.move(new Vector2(goomba.meta.move_dir,0),this.dt,this);
        })
        goomba.touched.connect(([collider,[_,direction]]) => {
            if (collider == this.player) {
                if (direction == "under") {
                    this.remove_sprite(goomba);
                    this.player.velocity.y = -300;
                    return;
                }
                const now = performance.now();
                if (now - goomba.meta.last_hit < 1000) {
                    return;
                }
                this.player.take_damage();
                goomba.meta.last_hit = now;
                return
            }
            if (direction == "left" && goomba.meta.move_dir === 1) {
                goomba.meta.move_dir = -1
                return;
            }
            if (direction == "right" && goomba.meta.move_dir === -1) {
                goomba.meta.move_dir = 1
                return;
            }
        })
        this.add_sprite(goomba);
        goomba.set_animation("walk");
    }
    /**
     * @param {Vector2} position
     * @param {bool} pop_out
    */
    create_mushroom(position,pop_out) {
        const mushroom = new Sprite(smb1_items.texture,position,new Vector2(tile_size,tile_size),new Vector2(0,8),new Vector2(16,16));
        mushroom.setup_default_collision()
        mushroom.collision_sensor = true;
        mushroom.collision_steps = 5;
        mushroom.gravity_force = 1000;
        mushroom.speed = 100
        mushroom.meta.move_dir = 1
        if (pop_out) {
            mushroom.velocity.y = -200;
        }
        mushroom.collision_predicate = (other) => other != this.player;
        mushroom.updated.connect(() => {
            if (mushroom.is_void_grounded()) {
                this.remove_sprite(mushroom)
            }
            mushroom.move(new Vector2(mushroom.meta.move_dir,0),this.dt,this)
        })
        mushroom.touched.connect(([collider,[_,direction]]) => {
            if (collider == this.player) {
                this.player.become_big()
                this.remove_sprite(mushroom);
                return;
            }
            if (direction == "left" && mushroom.meta.move_dir === 1) {
                mushroom.meta.move_dir = -1
                return;
            }
            if (direction == "right" && mushroom.meta.move_dir === -1) {
                mushroom.meta.move_dir = 1
                return;
            }
        })
        this.add_sprite(mushroom)
    }
    /**
     * @param {Vector2} position
    */
    create_coin_visual(position) {
        const coin = new AnimatedSprite(position.add(new Vector2(tile_size/4,0)),new Vector2(tile_size/2,tile_size),{
            idle: SpriteAnimation.from_loader(coin_spritesheet)
        })
        coin.animation_frame_dt = 50;
        coin.velocity.y = -400;
        this.add_sprite(coin)
        coin.set_animation("idle")
        setTimeout(() => this.remove_sprite(coin),200)
    }
}

class Player extends AnimatedSprite {
    keys_down = [];
    is_big = false;
    init() {
        super.init();
        this.always_on_top = true;
        this.gravity_force = 1400;
        this.jump_height = 800;
        this.collision_sensor = true;
        this.collision_steps = 3;
        this.size.assign(new Vector2(72,65))
        this.pos.assign(new Vector2(tile_size,this.game.size.y - this.size.y - tile_size * 2))
        this.set_animation("idle", this.game.last_frame);
        this.setup_default_collision();
        document.addEventListener("keydown", ev => {
            if (!this.keys_down.includes(ev.key)) {
                this.keys_down.push(ev.key);
            }
        });
        document.addEventListener("keyup", ev => {
            if (this.keys_down.includes(ev.key)) {
                this.keys_down.splice(this.keys_down.indexOf(ev.key),1)
            }
        });
    }
    /**
     * @param {number} dt 
    */
    update(dt) {
        super.update(dt);
        if (this.is_void_grounded()) {
            this.respawn()
        }
        const movement_vel = Vector2.zero;
        if (this.keys_down.includes("a")) {
            movement_vel.x -= 1;
        }
        if (this.keys_down.includes("d")) {
            movement_vel.x += 1;
        }
        if (movement_vel.x > 0) {
            this.texture_flip_x = false;
        } else if (movement_vel.x < 0) {
            this.texture_flip_x = true;
        }
        //this.game.debug_info.set("grounded",this.is_grounded())
        this.move(movement_vel,dt);
        const is_grounded = this.is_grounded()
        if ((this.keys_down.includes("w") || this.keys_down.includes(" ")) && is_grounded) {
            this.jump()
        }
        if (this.velocity.is_zero() && is_grounded) {
            if (this.animation != "idle") {
                this.set_animation("idle",this.game.last_frame);
            }
        } else if (this.animation != "run") {
            this.set_animation("run",this.game.last_frame);
        }
    }
    become_big() {
        if (this.is_big) {
            return;
        }
        this.is_big = true;
        this.size.y = 91;
        this.pos.y -= 91 - 65;
        this.collision_boxes.splice(0);
        this.setup_default_collision()
    }
    become_small() {
        if (!this.is_big) {
            return;
        }
        this.is_big = false;
        this.size.y = 65;
        this.pos.y += 91 - 65;
        this.collision_boxes.splice(0);
        this.setup_default_collision()
    }
    respawn() {
        this.pos.assign(new Vector2(tile_size,this.game.size.y - this.size.y - tile_size * 2))
        this.become_small()
    }
    take_damage() {
        if (this.is_big) {
            this.become_small()
            return
        }
        this.respawn()
    }
}

const game = new Game(context,new Vector2(game_canvas.width,game_canvas.height));
game.init();

let last_update = performance.now();
function update_game() {
    const now = performance.now();
    if (now - last_update >= game.target_dt) {
        last_update = now;
        game.update();
        game.draw();
    }
    requestAnimationFrame(update_game);
}
requestAnimationFrame(update_game);
