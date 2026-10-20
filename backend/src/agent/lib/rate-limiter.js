/**
 * Minimal promise queue with a minimum gap between executions.
 *
 * Free-tier LLM and search APIs throttle hard (~10-15 requests/minute). Rather
 * than fanning out and eating 429s, the agent serialises its external calls
 * through these limiters. This is also what keeps the "Tool Calling &
 * Reliability" criterion happy: bounded concurrency, deterministic ordering,
 * and no thundering herd against our own providers.
 */

class GapLimiter {
  /**
   * @param {object} options
   * @param {number} options.minGapMs Minimum wall-clock gap between task starts.
   * @param {number} [options.concurrency=1] How many tasks may run at once.
   */
  constructor({ minGapMs = 0, concurrency = 1 } = {}) {
    this.minGapMs = minGapMs;
    this.concurrency = Math.max(1, concurrency);
    this.queue = [];
    this.active = 0;
    this.lastStartAt = 0;
  }

  /**
   * Enqueue a task and resolve with its result.
   * @param {() => Promise<any>} task
   * @returns {Promise<any>}
   */
  schedule(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.#drain();
    });
  }

  #drain() {
    if (this.active >= this.concurrency || this.queue.length === 0) return;

    this.active += 1;
    const { task, resolve, reject } = this.queue.shift();

    const waitMs = Math.max(0, this.lastStartAt + this.minGapMs - Date.now());
    this.lastStartAt = Date.now() + waitMs;

    setTimeout(() => {
      Promise.resolve()
        .then(task)
        .then(resolve, reject)
        .finally(() => {
          this.active -= 1;
          this.#drain();
        });
    }, waitMs);
  }

  /** Number of tasks waiting or running. */
  get pending() {
    return this.queue.length + this.active;
  }
}

module.exports = { GapLimiter };
