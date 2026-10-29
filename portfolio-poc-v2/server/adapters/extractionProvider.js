/**
 * Provider-neutral OCR result boundary. A future PaddleOCR adapter must return
 * this shape and must never write platform records directly.
 *
 * @typedef {Object} NormalizedExtractionResult
 * @property {string} jobId
 * @property {string} sourceId
 * @property {string} text
 * @property {{index:number,text:string,confidence?:number}[]} chunks
 * @property {string} language
 * @property {number|null} confidence
 * @property {string} provider
 * @property {string} version
 * @property {string[]} warnings
 * @property {string} completedAt
 */

export const fakeExtractionProvider = {
  /** @returns {Promise<NormalizedExtractionResult>} */
  async extract({ jobId, sourceId, text = 'Deterministic OCR fixture', language = 'zh-Hant' }) {
    return { jobId, sourceId, text, chunks: [{ index: 0, text, confidence: 0.99 }], language, confidence: 0.99, provider: 'fake-extraction-provider', version: '1', warnings: [], completedAt: '2026-10-29T00:00:00.000Z' };
  },
};
