/* ============================================================================
   VOICE & IMAGE PROCESSING MODULE
   ============================================================================
   Features:
   • Voice-to-text note creation
   • Image-to-text (OCR simulation)
   • Smart image tagging & recognition
   • Audio transcription with timestamps
   • Visual note enhancement
   • Handwriting recognition support
   ============================================================================ */

class VoiceImageProcessor {
  constructor() {
    this.mediaRecorder = null;
    this.recognitionAPI = null;
    this.audioChunks = [];
    this.initRecognition();
  }

  // ── SPEECH RECOGNITION API SETUP ──────────────────────────
  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognitionAPI = new SpeechRecognition();
      this.recognitionAPI.continuous = true;
      this.recognitionAPI.interimResults = true;
      this.recognitionAPI.lang = 'en-US';
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // VOICE-TO-TEXT FEATURES
  // ══════════════════════════════════════════════════════════════════

  /**
   * Start voice recording for note taking
   */
  startVoiceNote(onTranscript, onError) {
    if (!this.recognitionAPI) {
      onError('Speech Recognition not supported in this browser');
      return;
    }

    const transcript = [];
    let interimTranscript = '';

    this.recognitionAPI.onstart = () => {
      console.log('[Voice] Recording started');
    };

    this.recognitionAPI.onresult = (event) => {
      interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          transcript.push({
            text: transcriptSegment,
            timestamp: Date.now(),
            confidence: event.results[i][0].confidence,
            final: true
          });
        } else {
          interimTranscript += transcriptSegment + ' ';
        }
      }

      onTranscript({
        final: transcript,
        interim: interimTranscript,
        isFinal: event.results[event.results.length - 1].isFinal
      });
    };

    this.recognitionAPI.onerror = (event) => {
      onError(`Speech recognition error: ${event.error}`);
    };

    this.recognitionAPI.onend = () => {
      console.log('[Voice] Recording ended');
    };

    this.recognitionAPI.start();
    this.recording = true;

    return { stop: () => this.stopVoiceNote() };
  }

  /**
   * Stop voice recording
   */
  stopVoiceNote() {
    if (this.recognitionAPI && this.recording) {
      this.recognitionAPI.stop();
      this.recording = false;
    }
  }

  /**
   * Create note from voice transcript
   */
  createNoteFromVoice(transcript) {
    const note = {
      id: `note_${Date.now()}`,
      title: this.generateTitleFromText(transcript),
      content: transcript,
      type: 'voice',
      createdAt: Date.now(),
      source: 'voice-input',
      processing: {
        summary: this.generateSummary(transcript),
        keyPoints: this.extractKeyPoints(transcript),
        entities: this.extractEntities(transcript),
        sentiment: this.analyzeSentiment(transcript)
      },
      metadata: {
        wordCount: transcript.split(/\s+/).length,
        readingTime: Math.ceil(transcript.split(/\s+/).length / 200)
      }
    };

    return note;
  }

  /**
   * Generate title from voice text
   */
  generateTitleFromText(text) {
    const words = text.split(/\s+/).slice(0, 5);
    return words.join(' ').substring(0, 50) + '...';
  }

  /**
   * Generate summary from text (simple extraction)
   */
  generateSummary(text) {
    const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [];
    const importantSentences = sentences
      .filter(s => s.split(/\s+/).length > 8)
      .slice(0, 3);
    return importantSentences.join(' ').trim();
  }

  /**
   * Extract key points from text
   */
  extractKeyPoints(text) {
    const keywords = {};
    const words = text.toLowerCase().split(/\s+/);
    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'is', 'was', 'are', 'been', 'be', 'have', 'has', 'do', 'does',
      'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);

    words.forEach(word => {
      if (word.length > 4 && !stopwords.has(word)) {
        keywords[word] = (keywords[word] || 0) + 1;
      }
    });

    return Object.entries(keywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => ({ term: word, importance: 0.8 }));
  }

  /**
   * Extract entities (names, dates, numbers)
   */
  extractEntities(text) {
    const entities = {
      dates: [],
      numbers: [],
      proper_nouns: []
    };

    // Simple date detection
    const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4}|January|February|March|April|May|June|July|August|September|October|November|December)\s*\d{0,4}/gi;
    entities.dates = text.match(datePattern) || [];

    // Number detection
    const numberPattern = /\b\d+(?:\.\d+)?\b/g;
    entities.numbers = text.match(numberPattern) || [];

    // Proper nouns (capitalized words)
    const properNounPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    entities.proper_nouns = text.match(properNounPattern) || [];

    return entities;
  }

  /**
   * Simple sentiment analysis
   */
  analyzeSentiment(text) {
    const positive = ['good', 'great', 'excellent', 'amazing', 'love', 'best', 'perfect'];
    const negative = ['bad', 'terrible', 'awful', 'hate', 'worst', 'poor', 'fail'];

    const words = text.toLowerCase().split(/\s+/);
    let positiveScore = words.filter(w => positive.includes(w)).length;
    let negativeScore = words.filter(w => negative.includes(w)).length;

    let sentiment = 'neutral';
    if (positiveScore > negativeScore * 1.5) sentiment = 'positive';
    else if (negativeScore > positiveScore * 1.5) sentiment = 'negative';

    return {
      label: sentiment,
      score: (positiveScore - negativeScore) / Math.max(words.length, 1)
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // IMAGE PROCESSING FEATURES
  // ══════════════════════════════════════════════════════════════════

  /**
   * Process image to extract text (OCR simulation)
   */
  async extractTextFromImage(imageFile) {
    return new Promise(async (resolve, reject) => {
      try {
        const reader = new FileReader();
        
        reader.onload = async (event) => {
          try {
            const image = new Image();
            image.onload = async () => {
              try {
                const extractedText = await this.simulateOCR(image);
                const textData = {
                  imageUrl: event.target.result,
                  extractedText,
                  confidence: 0.85,
                  processingTime: Math.random() * 2000 + 500
                };
                resolve(textData);
              } catch (err) {
                reject(err);
              }
            };
            image.src = event.target.result;
          } catch (error) {
            reject(error);
          }
        };

        reader.readAsDataURL(imageFile);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Simulate OCR text extraction
   */
  async simulateOCR(image) {
    // This is a placeholder - in production use real OCR library
    // For demo, extract text from canvas if image contains text
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    // Placeholder: return simulated text
    return `Text extracted from image\nPlease use Tesseract.js for production deployment`;
  }

  /**
   * Recognize and tag objects in image
   */
  async recognizeImageObjects(imageFile) {
    // Simulated image recognition - in production use TensorFlow.js or cloud API
    return {
      imageUrl: URL.createObjectURL(imageFile),
      objects: [
        { label: 'document', confidence: 0.95 },
        { label: 'whiteboard', confidence: 0.88 },
        { label: 'text', confidence: 0.92 }
      ],
      tags: ['education', 'study', 'notes'],
      description: 'An image containing study materials'
    };
  }

  /**
   * Create note from image
   */
  async createNoteFromImage(imageFile) {
    try {
      const textData = await this.extractTextFromImage(imageFile);
      const objectData = await this.recognizeImageObjects(imageFile);

      const note = {
        id: `note_${Date.now()}`,
        title: this.generateTitleFromText(textData.extractedText),
        content: textData.extractedText,
        type: 'image',
        imageUrl: textData.imageUrl,
        createdAt: Date.now(),
        source: 'image-input',
        processing: {
          ocr: {
            extractedText: textData.extractedText,
            confidence: textData.confidence,
            processingTime: textData.processingTime
          },
          recognition: objectData,
          summary: this.generateSummary(textData.extractedText),
          keyPoints: this.extractKeyPoints(textData.extractedText)
        },
        metadata: {
          imageDimensions: { width: imageFile.width, height: imageFile.height },
          fileSize: imageFile.size,
          wordCount: textData.extractedText.split(/\s+/).length
        }
      };

      return note;
    } catch (error) {
      console.error('[Image Processing] Error:', error);
      throw error;
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // AUDIO FILE PROCESSING
  // ══════════════════════════════════════════════════════════════════

  /**
   * Upload and process audio file
   */
  async processAudioFile(audioFile) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        const audioData = {
          url: event.target.result,
          duration: await this.getAudioDuration(event.target.result),
          fileSize: audioFile.size,
          format: audioFile.type
        };

        // Would transcribe audio using speech recognition API
        resolve(audioData);
      };

      reader.onerror = reject;
      reader.readAsDataURL(audioFile);
    });
  }

  /**
   * Get audio duration
   */
  async getAudioDuration(audioUrl) {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = audioUrl;
      audio.onloadedmetadata = () => resolve(audio.duration);
      audio.onerror = () => resolve(0);
    });
  }

  /**
   * Create flashcard from voice question/answer
   */
  createFlashcardFromVoice(questionTranscript, answerTranscript) {
    return {
      id: `card_${Date.now()}`,
      question: questionTranscript,
      answer: answerTranscript,
      type: 'voice-generated',
      createdAt: Date.now(),
      audioClues: {
        question: true,
        answer: true
      },
      difficulty: 'medium',
      metadata: {
        sourceLanguage: 'en-US',
        transcriptionConfidence: 0.85
      }
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // HANDWRITING SUPPORT
  // ══════════════════════════════════════════════════════════════════

  /**
   * Initialize handwriting canvas
   */
  initHandwritingCanvas(canvasElement) {
    const canvas = canvasElement;
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let startX = 0;
    let startY = 0;

    // Set up canvas
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#3B82F6';

    // Mouse events
    canvas.addEventListener('mousedown', (e) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
    });

    canvas.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mouseout', () => isDrawing = false);

    // Touch events (mobile)
    canvas.addEventListener('touchstart', (e) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      startX = touch.clientX - rect.left;
      startY = touch.clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
    });

    canvas.addEventListener('touchmove', (e) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
    });

    canvas.addEventListener('touchend', () => isDrawing = false);

    return {
      clear: () => ctx.clearRect(0, 0, canvas.width, canvas.height),
      getImage: () => canvas.toDataURL(),
      recognize: () => this.recognizeHandwriting(canvas)
    };
  }

  /**
   * Recognize handwriting (placeholder for ML model)
   */
  async recognizeHandwriting(canvas) {
    // Placeholder - would integrate with TensorFlow.js handwriting recognition
    return {
      mode: 'demo',
      text: 'Handwriting recognition requires ML model integration',
      confidence: 0
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // BATCH PROCESSING
  // ══════════════════════════════════════════════════════════════════

  /**
   * Batch process multiple images
   */
  async batchProcessImages(imageFiles) {
    const results = [];

    for (const file of imageFiles) {
      try {
        const note = await this.createNoteFromImage(file);
        results.push({
          success: true,
          note
        });
      } catch (error) {
        results.push({
          success: false,
          file: file.name,
          error: error.message
        });
      }
    }

    return {
      total: imageFiles.length,
      successful: results.filter(r => r.success).length,
      results
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // UTILITY & EXPORT
  // ══════════════════════════════════════════════════════════════════

  /**
   * Get capabilities report
   */
  getCapabilities() {
    return {
      speechRecognition: !!this.recognitionAPI,
      audioRecording: !!navigator.mediaDevices?.getUserMedia,
      canvas2D: !!document.createElement('canvas').getContext,
      fileAPI: !!window.File && !!window.FileReader,
      webWorkers: !!window.Worker
    };
  }

  /**
   * Request microphone permission
   */
  async requestMicrophoneAccess() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stream obtained successfully
      stream.getTracks().forEach(track => track.stop());
      return { granted: true };
    } catch (error) {
      return { granted: false, error: error.message };
    }
  }

  /**
   * Export processed data
   */
  exportProcessedData(notes) {
    const data = {
      exportedAt: new Date().toISOString(),
      notes: notes.map(note => ({
        ...note,
        processing: note.processing || {}
      }))
    };

    return JSON.stringify(data, null, 2);
  }
}

// Global instance
const voiceImageProcessor = new VoiceImageProcessor();

// Export for use
window.voiceImageProcessor = voiceImageProcessor;
