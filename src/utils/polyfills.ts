/**
 * Browser / WebKit polyfills for Tauri desktop environment.
 * Ensures compatibility across macOS WebKit (Safari WKWebView) and Windows WebView2.
 */

// WebKit does not natively provide Symbol.asyncIterator on ReadableStream,
// causing PDF.js `page.getTextContent()` (which uses `for await (const x of readableStream)`)
// to throw `TypeError: undefined is not a function (near '...value of readableStream...')`.
if (typeof ReadableStream !== 'undefined' && !(ReadableStream.prototype as any)[Symbol.asyncIterator]) {
  (ReadableStream.prototype as any)[Symbol.asyncIterator] = function () {
    const reader = this.getReader();
    return {
      async next() {
        const { done, value } = await reader.read();
        if (done) {
          reader.releaseLock();
          return { done: true, value: undefined };
        }
        return { done: false, value };
      },
      async return() {
        reader.releaseLock();
        return { done: true, value: undefined };
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  };
}

// Polyfill Promise.withResolvers for PDF.js compatibility across older WebKit/Chromium versions
if (typeof (Promise as any).withResolvers === 'undefined') {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

export {};
