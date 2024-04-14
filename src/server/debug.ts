let heaps = [];
let stacks = [];

export const appendHeap = heap => {
    heaps.push(heap);
};

export const appendStack = stack => {
    stacks.push(stack);
};

export const resetHeapsAndStacks = () => {
    heaps = [];
    stacks = [];
};

export const getHeaps = () => {
    return heaps;
};

export const getStacks = () => {
    return stacks;
};
