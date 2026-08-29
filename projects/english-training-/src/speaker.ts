/**
 * Speaker Module
 * Handles text-to-speech functionality for reading questions aloud
 * Uses Web Speech API (Speech Synthesis Engine)
 */

class Speaker {
  constructor() {
    this.synthesis = null;
    this.isInitialized = false;
  }
  
  /**
   * Initialize the speech synthesis engine
   */
  async initialize() {
    try {
      // Create the speech synthesis object
      this.synthesis = new (window.SpeechSynthesis || window.webkitSpeechSynthesis)();
      this.isInitialized = true;
      console.log('Speaker initialized successfully.');
      return true;
    } catch (error) {
      console.error('Failed to initialize speaker:', error.message);
      this.isInitialized = false;
      return false;
    }
  }
  
  /**
   * Speak a given text
   * @param {string} text - The text to speak
   * @returns {Promise<void>}
   */
  async speak(text) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      // Set the voice (optional - uses default)
      // This can be customized based on locale
      const voice = this.synthesis.getVoices();
      if (voice.length > 0) {
        this.synthesis.setVoice(voice[0]); // Use first available voice
      }
      
      // Speak the text
      await this.synthesis.speak(text);
      console.log(`Speaked: "${text}"`);
      return true;
    } catch (error) {
      console.error('Speaking failed:', error.message);
      return false;
    }
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
    if (this.synthesis) {
      this.synthesis.cancel();
      this.synthesis = null;
      this.isInitialized = false;
    }
  }
}

// Export singleton instance
export const speaker = new Speaker();
