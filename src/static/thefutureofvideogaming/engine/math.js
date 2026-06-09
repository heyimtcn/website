/**
 * @param {number} from
 * @param {number} to
 * @param {number} delta
*/
export function move_toward(from,to,delta) {
    if (Math.abs(to - from) <= delta) {
        return to;
    }
    return from + Math.sign(to - from) * delta;
}

/**
 * @param {number} num
 * @param {number} target
 * @param {number} range
*/
export function in_range(num,target,range) {
    return num > target - range && num < target + range
}