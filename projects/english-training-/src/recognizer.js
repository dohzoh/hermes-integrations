/**
 * Recognizer Module
 * Handles voice input via the Web Speech API (SpeechRecognition).
 * Browser-only; falls back to a no-op recognizer in Node/test environments.
 */

class SpeechRecognizer {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.lastTranscript = '';
    this.isSupported = false;
  }

  /**
   * Initialize the recognizer.
   * @returns {Promise<boolean>} true when SpeechRecognition is available
   */
  async initialize() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      this.isSupported = false;
      return false;
    }

    const Ctor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      this.isSupported = false;
      return false;
    }

    try {
      this.recognition = new Ctor();
      this.recognition.lang = 'en-US';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;
      this.isSupported = true;
      return true;
    } catch {
      this.isSupported = false;
      return false;
    }
  }

  /**
   * Start listening and resolve with the recognized transcript.
   * Rejects if recognition fails, is denied, or no speech is detected.
   * @returns {Promise<string>}
   */
  listen() {
    if (!this.isSupported) {
      return this.initialize().then((ok) => {
        if (!ok) throw new Error('Speech recognition not supported');
        return this._startOnce();
      });
    }
    return this._startOnce();
  }

  _startOnce() {
    return new Promise((resolve, reject) => {
      if (this.isListening) {
        reject(new Error('Already listening'));
        return;
      }

      const recognition = this.recognition;
      if (!recognition) {
        reject(new Error('Recognizer not initialized'));
        return;
      }

      const cleanup = () => {
        this.isListening = false;
        try { recognition.onresult = null; } catch {}
        try { recognition.onerror = null; } catch {}
        try { recognition.onend = null; } catch {}
      };

      recognition.onresult = (event) => {
        const result = event.results?.[0]?.[0];
        const transcript = result ? result.transcript : '';
        this.lastTranscript = transcript;
        cleanup();
        resolve(transcript);
      };

      recognition.onerror = (event) => {
        cleanup();
        reject(new Error(event.error || 'Speech recognition error'));
      };

      recognition.onend = () => {
        if (this.isListening) {
          // Ended without producing a result.
          cleanup();
          reject(new Error('No speech detected'));
        }
      };

      try {
        this.isListening = true;
        recognition.start();
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }

  /**
   * Stop listening. Safe to call when not listening.
   */
  stop() {
    if (this.recognition && this.isListening) {
      try { this.recognition.stop(); } catch {}
      this.isListening = false;
    }
  }

  /**
   * Whether voice input is available in the current environment.
   */
  available() {
    return this.isSupported;
  }
}

export const recognizer = new SpeechRecognizer();
export { SpeechRecognizer };
