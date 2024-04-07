export function pair(x, xs) {
    return [x, xs];
}

export function array_test(x) {
    if (typeof Array.isArray !== 'undefined') {
        return Array.isArray(x);
    } else {
        return x instanceof Array;
    }
}

export function is_pair(x) {
    return array_test(x) && x.length === 2;
}

export function head(xs) {
    if (is_pair(xs)) {
        return xs[0];
    } else {
        throw new Error('head(xs) expects a pair as argument xs, but encountered ' + xs);
    }
}

export function tail(xs) {
    if (is_pair(xs)) {
        return xs[1];
    } else {
        throw new Error('tail(xs) expects a pair as argument xs, but encountered ' + xs);
    }
}

export function error(value, ...strs) {
    const output = strs.length === 0 ? value : value + ' ' + strs.join(' ');
    throw new Error(output);
}

export function unparse(t: any): string {
    let cache = new Set();
    return JSON.stringify(
        t,
        (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (cache.has(value)) {
                    // Circular reference found, discard key
                    return;
                }
                // Store value in our collection
                cache.add(value);
            }
            return value;
        },
        2
    );
}
