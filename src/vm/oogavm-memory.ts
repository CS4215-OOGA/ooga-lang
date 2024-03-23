
// number of bytes each word represents
const wordSize = 8;
// Simpler but wasteful to adopt a fixed node size for all nodes in the heap
const nodeSize = 10;

const emptyFreeList = -1;

export enum Tag {
  FALSE,
  TRUE,
  NUMBER,
  NULL,
  UNASSIGNED,
  UNDEFINED,
  BLOCKFRAME,
  CALLFRAME,
  CLOSURE,
  FRAME,
  ENVIRONMENT
}

/**
 * The abstraction over the heap.
 *
 * Each node is 10 words (word size).
 * The first
 */
export class Heap {
  // The internal DataView over the actual ArrayBuffer
  private heap: DataView;
  // The next address to assign to
  private free: number;

  private readonly numWords: number;

  constructor(numWords: number) {
    this.numWords = numWords;
    this.heap = new DataView(new ArrayBuffer(numWords * wordSize));
    this.free = 0;
    // Initialize all the next addresses in the free list
    let i;
    for (i = 0; i <= numWords - nodeSize; i += nodeSize) {
      this.setWord(i, i + nodeSize);
    }
    this.setWord(i - nodeSize, emptyFreeList);
  }

  /**
   * Get the number of words in the heap
   * @param heap
   */
  getNumWords(): number {
    return this.numWords;
  }

  /**
   * Get the i-th word in the heap.
   * @param i
   */
  getWord(i: number): number {
    return this.heap.getFloat64(i * wordSize);
  }

  /**
   * Set heap with value at address.
   * @param addr
   * @param value
   */
  setWord(addr: number, value): void {
    this.heap.setFloat64(addr * wordSize, value);
  }

  /**
  * Returns the byte representation of the provided heap.
  * To be used for visualization.
  * @param heap
  */
  displayHeap(heap: DataView): string[] {
    const numWords = this.getNumWords();
    const heapBinStr: string[] = [];
    for (let i = 0; i < numWords; i++) {
      heapBinStr.push(this.wordToString(this.getWord(i)));
    }
    return heapBinStr;
  }

  /**
 * Given a word, return the binary form of it.
 * It's 8 bytes, so we expect 64 bits.
 * @param word
 */
  wordToString(word: number): string {
    const buf = new ArrayBuffer(wordSize);
    const view = new DataView(buf);
    view.setFloat64(0, word);
    let binStr = "";
    for (let i = 0; i < 8; i++) {
      binStr += ("00000000" + view.getUint8(i).toString()).slice(-8) + " ";
    }
    return binStr;
  }
}


function main() {

}

main();
