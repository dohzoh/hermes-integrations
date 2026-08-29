/**
 * Speaker Module
 * Handles text-to-speech functionality for reading questions aloud
 * Uses Web Speech API (Speech Synthesis Engine)
 *
 * Browser-only module. In Node (tests) it exposes a stub that records
 * the most recent utterance so behavior can be verified.
 */

class Speaker {
  constructor() {
    this.synthesis = null;
    this.isInitialized = false;
    this.voice = null;
    this.lastUtterance = null;
  }

  /**
   * Initialize the speech synthesis engine.
   * Returns true in browser, false in Node/test environments.
   */
  async initialize() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      // No DOM available (Node, tests). Stay uninitialized.
      this.isInitialized = false;
      return false;
    }

    try {
      this.synthesis = window.SpeechSynthesis || window.webkitSpeechSynthesis;
      if (!this.synthesis) {
        this.isInitialized = false;
        return false;
      }

      // Voices load asynchronously in many browsers; wait briefly.
      if (this.synthesis.getVoices().length === 0) {
        await new Promise((resolve) => {
          const handler = () => {
            this.synthesis.removeEventListener?.('voiceschanged', handler);
            resolve();
          };
          this.synthesis.addEventListener?.('voiceschanged', handler);
          // Fallback timeout
          setTimeout(resolve, 500);
        });
      }

      this.voice = pickEnglishVoice(this.synthesis.getVoices());
      this.isInitialized = true;
      return true;
    } catch (error) {
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Speak a given text. Resolves when the utterance has finished.
   * @param {string} text
   * @returns {Promise<boolean>} true if the utterance was queued, false otherwise
   */
  async speak(text) {
    if (!text) return false;

    if (!this.isInitialized) {
      const ok = await this.initialize();
      if (!ok) {
        // No synthesis available; record for tests/UI fallback.
        this.lastUtterance = text;
        return false;
      }
    }

    if (typeof window === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') {
      this.lastUtterance = text;
      return false;
    }

    return new Promise((resolve) => {
      try {
        const utter = new SpeechSynthesisUtterance(text);
        if (this.voice) utter.voice = this.voice;
        utter.lang = 'en-US';
        utter.rate = 0.95;
        utter.pitch = 1.0;
        utter.onend = () => resolve(true);
        utter.onerror = () => resolve(false);
        this.lastUtterance = text;
        this.synthesis.speak(utter);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Check if the speaker is ready
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized;
  }

  /**
   * Stop speaking
   */
  stop() {
    if (this.synthesis && typeof this.synthesis.cancel === 'function') {
      this.synthesis.cancel();
    }
  }
}

function pickEnglishVoice(voices) {
  if (!voices || voices.length === 0) return null;
  // Prefer an English voice.
  const english = voices.find((v) => /^en[-_]/i.test(v.lang));
  return english || voices[0];
}

// Export singleton instance
export const speaker = new Speaker();
export { Speaker };
