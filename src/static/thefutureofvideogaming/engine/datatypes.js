/** @template T */
export class Ref {
    /** @type {T} */
    val;
    /** @param {T} val */
    constructor(val) {
        this.val = val;
    }
}

export class Vector2 {
    x = 0;
    y = 0;
    /**
     * @param {number?} x
     * @param {number?} y 
    */
    constructor(x, y) {
        this.x = x ?? 0;
        this.y = y ?? 0;
    }
    static get zero() {
        return new Vector2();
    }
    get magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    normalize() {
        const mag = this.magnitude;
        if (mag <= 0) {
            return this;
        }
        this.x /= mag;
        this.y /= mag;
        return this;
    }
    normalized() {
        const mag = this.magnitude;
        if (mag <= 0) {
            return Vector2.zero;
        }
        return new Vector2(this.x / mag, this.y / mag);
    }
    /** @param {number} amount */
    scale(amount) {
        this.x *= amount;
        this.y *= amount;
        return this;
    }
    /**
     * @param {number} amount
    */
    scaled(amount) {
        return new Vector2(this.x*amount, this.y*amount)
    }
    /**
     * @param {Vector2} other_vec
    */
    add(other_vec) {
        return new Vector2(this.x + other_vec.x, this.y + other_vec.y);
    }
    /**
     * @param {Vector2} other_vec
    */
    added(other_vec) {
        this.x += other_vec.x;
        this.y += other_vec.y;
        return this;
    }
    /**
     * @param {Vector2} other_vec
    */
    sub(other_vec) {
        return new Vector2(this.x - other_vec.x, this.y - other_vec.y);
    }
    /**
     * @param {Vector2} other_vec
    */
    subbed(other_vec) {
        this.x -= other_vec.x;
        this.y -= other_vec.y;
        return this;
    }
    clone() {
        return new Vector2(this.x, this.y)
    }
    neg() {
        return new Vector2(-this.x, -this.y);
    }
    is_zero() {
        return this.x === 0 && this.y === 0;
    }
    /**
     * @param {Vector2} target
     * @param {number} delta
    */
    move_toward(target,delta) {
        const delta_vec = new Vector2(target.x - this.x, target.y - this.y);
        if (delta_vec.magnitude < delta || delta_vec.magnitude < .0001) {
            return target.clone();
        }
        return this.add(delta_vec.normalize().scale(delta));
    }
    /**
     * @param {Vector2} other 
    */
    assign(other) {
        this.x = other.x;
        this.y = other.y;
        return this;
    }
    toString() {
        return `(${this.x}, ${this.y})`
    }
}

export class CollisionBox {
    enabled = true;
    pos = Vector2.zero;
    size = Vector2.zero;
    /** 
     * @param {Vector2} pos
     * @param {Vector2} size
    */
    constructor(pos, size) {
        this.pos = pos;
        this.size = size;
    }
    /**
     * @param {CollisionBox} other
     * @param {Vector2} self_offset
     * @param {Vector2} other_offset
     * @returns {boolean}
    */
    collides_with(other,self_offset,other_offset) {
        const self_pos = this.pos.add(self_offset);
        const other_pos = other.pos.add(other_offset);
        if (self_pos.x > other_pos.x + other.size.x) {
            return false;
        }
        if (self_pos.x + this.size.x < other_pos.x) {
            return false;
        }
        if (self_pos.y > other_pos.y + other.size.y) {
            return false;
        }
        if (self_pos.y + this.size.y < other_pos.y) {
            return false;
        }
        return true;
    }
}

/** @template T */
export class Signal {
    /** @type {SignalConnection[]} */
    connections = [];
    /** @param {T} payload */
    emit(payload) {
        for (const connection of this.connections) {
            connection.callback(payload);
        }
    }
    /**
     * @callback sig_cb
     * @param {T} payload
     * @returns {void}
    */
    /** @param {sig_cb} callback */
    connect(callback) {
        const connection = new SignalConnection()
        connection.callback = callback;
        connection.signal = this;
        this.connections.push(connection);
        return connection
    }
    /** @param {sig_cb} callback */
    once(callback) {
        /** @type {SignalConnection} */
        let connection;
        connection = this.connect(function(...args) {
            callback(...args);
            connection.disconnect()
        })
        return connection
    }
}

export class SignalConnection {
    /** @type {Signal} */
    signal;
    /** @type {Function} */
    callback;
    disconnect() {
        const idx = this.signal.connections.indexOf(this);
        if (idx < 0) {
            return;
        }
        this.signal.connections.splice(idx,1);
    }
}