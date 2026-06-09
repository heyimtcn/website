import { Ref, Vector2 } from "./datatypes.js";

export class TextureLoader {
    /** @type {Ref<ImageBitmap?>} */
    texture = new Ref(null);
    size = Vector2.zero;
    src = "";
    /**
     * @param {string} src
     * @param {Vector2} size
     */
    constructor(src,size) {
        this.src = src;
        this.size = size;
        const image = new Image(this.size.x, this.size.y);
        image.src = this.src;
        image.decode().then(async () => {
            this.texture.val = await createImageBitmap(image);
        });
    }
}

export class SpritesheetLoader extends TextureLoader {
    sprite_size = Vector2.zero;
    frames_in_row = 0;
    frame_amount = 0;
    /**
     * @param {string} src
     * @param {Vector2} size
     * @param {Vector2} sprite_size
     * @param {number} frames_in_row
     * @param {number} frame_amount
     */
    constructor(src,size,sprite_size,frames_in_row,frame_amount) {
        super(src,size);
        this.sprite_size = sprite_size;
        this.frames_in_row = frames_in_row;
        this.frame_amount = frame_amount;
    }
}