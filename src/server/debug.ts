let heaps: any[][] = [];
let stacks: any[][] = [];

export const appendHeap = (heap: any[]) => {
    heaps.push(heap);
};

export const appendStack = (stack: any[]) => {
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
