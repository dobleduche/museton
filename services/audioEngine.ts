import { AudioEnvironment, EqPreset, SurroundMode, InstrumentType, SynthConfig } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private lowShelf: BiquadFilterNode | null = null;
  private highShelf: BiquadFilterNode | null = null;
  private midPeaking: BiquadFilterNode | null = null;
  public analyser: AnalyserNode | null = null;
  public activeInstrument: InstrumentType = 'PIANO';
  
  // Cache for noise buffer to reduce garbage collection during playback
  private noiseBuffer: AudioBuffer | null = null;

  // Dynamic Synth Config
  public synthConfig: SynthConfig = {
    waveform: 'triangle',
    attack: 0.01,
    decay: 0.1,
    sustain: 0.6,
    release: 1.5,
    filterCutoff: 2000,
    filterResonance: 0
  };

  private isInitialized = false;
  private nodes: any = {};
  
  // Recording
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingStreamDest: MediaStreamAudioDestinationNode | null = null;
  
  // Mic Input
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;

  // Looping
  private loopSource: AudioBufferSourceNode | null = null;
  private loopGain: GainNode | null = null;

  // Metronome State
  private metroNextNoteTime = 0;
  private metroTimerID: number | null = null;
  public isMetronomeOn = false;
  public metronomeBpm = 120;
  public metronomeVolume = 0.5;

  init() {
    if (this.isInitialized) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass({ latencyHint: 'interactive' });
    
    // --- MASTER BUS CHAIN ---
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.9;

    // Standard Compressor for Glue
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    // Hard Limiter for Safety
    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -1.0; 
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20; 
    this.limiter.attack.value = 0.001;
    this.limiter.release.value = 0.1;

    this.reverbNode = this.ctx.createConvolver();
    
    // EQ
    this.lowShelf = this.ctx.createBiquadFilter();
    this.lowShelf.type = 'lowshelf';
    this.lowShelf.frequency.value = 320;

    this.midPeaking = this.ctx.createBiquadFilter();
    this.midPeaking.type = 'peaking';
    this.midPeaking.frequency.value = 1000;
    this.midPeaking.Q.value = 0.5;

    this.highShelf = this.ctx.createBiquadFilter();
    this.highShelf.type = 'highshelf';
    this.highShelf.frequency.value = 3200;

    // Analyzer (Visualization)
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.85;

    // Recording Destination
    this.recordingStreamDest = this.ctx.createMediaStreamDestination();

    // Routing
    const mainBus = this.ctx.createGain();
    this.nodes.mainBus = mainBus;
    
    mainBus.connect(this.lowShelf);
    this.lowShelf.connect(this.midPeaking);
    this.midPeaking.connect(this.highShelf);
    
    this.highShelf.connect(this.compressor);

    // Reverb Send/Return
    const reverbSend = this.ctx.createGain();
    reverbSend.gain.value = 1.0; 
    this.highShelf.connect(reverbSend);
    reverbSend.connect(this.reverbNode);
    
    const reverbReturn = this.ctx.createGain();
    reverbReturn.gain.value = 0.1; 
    this.reverbNode.connect(reverbReturn);
    reverbReturn.connect(this.compressor);

    this.nodes.reverbGain = reverbReturn;

    // Chain: Comp -> Limiter -> Master
    this.compressor.connect(this.limiter);
    this.limiter.connect(this.masterGain);

    // Master connections
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.connect(this.recordingStreamDest);
    this.masterGain.connect(this.analyser);

    // Loop Bus
    this.loopGain = this.ctx.createGain();
    this.loopGain.connect(this.nodes.mainBus);

    this.isInitialized = true;
    this.setEnvironment('STUDIO');
  }

  getContext() {
    return this.ctx;
  }

  getDiagnostics() {
    return {
      state: this.ctx ? this.ctx.state : 'suspended',
      sampleRate: this.ctx ? this.ctx.sampleRate : 0,
      baseLatency: this.ctx ? this.ctx.baseLatency : 0,
      outputLatency: this.ctx ? (this.ctx as any).outputLatency || 0 : 0,
      activeNodes: Object.keys(this.nodes).length + 5 // Approximate
    };
  }

  resume() {
    if (!this.ctx) this.init();
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().catch(e => console.warn("Audio Context resume failed", e));
    }
  }
  
  // EMERGENCY STOP
  panic() {
      if (this.ctx) {
          this.ctx.suspend().then(() => {
              console.log("Audio Engine Halted (Panic)");
              this.stopMetronome();
              this.stopLoop();
              setTimeout(() => {
                   if (this.ctx && this.ctx.state === 'suspended') {
                       this.ctx.resume();
                   }
              }, 1000); 
          });
      }
  }

  // --- METRONOME ---
  
  public toggleMetronome(bpm: number) {
      this.metronomeBpm = bpm;
      if (this.isMetronomeOn) {
          this.stopMetronome();
      } else {
          this.startMetronome();
      }
      return this.isMetronomeOn;
  }

  public startMetronome() {
      if (!this.ctx) this.init();
      this.isMetronomeOn = true;
      this.metroNextNoteTime = this.ctx!.currentTime;
      this.metroScheduler();
  }

  public stopMetronome() {
      this.isMetronomeOn = false;
      if (this.metroTimerID) window.clearTimeout(this.metroTimerID);
  }

  private metroScheduler() {
      const lookahead = 25.0; 
      const scheduleAheadTime = 0.1; 

      while (this.isMetronomeOn && this.metroNextNoteTime < this.ctx!.currentTime + scheduleAheadTime) {
          this.scheduleMetroClick(this.metroNextNoteTime);
          const secondsPerBeat = 60.0 / this.metronomeBpm;
          this.metroNextNoteTime += secondsPerBeat;
      }
      
      if (this.isMetronomeOn) {
          this.metroTimerID = window.setTimeout(() => this.metroScheduler(), lookahead);
      }
  }

  private scheduleMetroClick(time: number) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.masterGain!); 

      osc.frequency.value = 1000;
      gain.gain.setValueAtTime(this.metronomeVolume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

      osc.start(time);
      osc.stop(time + 0.05);
  }

  // --- EXTERNAL AUDIO (SHAZAM STYLE) ---
  
  async startMicrophoneAnalysis() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    this.resume();

    try {
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.micSource = this.ctx.createMediaStreamSource(this.micStream);
        
        if (this.analyser) {
            this.micSource.connect(this.analyser);
        }

        this.recordedChunks = [];
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm';
        
        this.mediaRecorder = new MediaRecorder(this.micStream, { mimeType });
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.recordedChunks.push(event.data);
          }
        };
        this.mediaRecorder.start();

    } catch (e) {
        console.error("Microphone access denied", e);
        throw e;
    }
  }

  stopMicrophoneAnalysis(): Promise<Blob> {
    return new Promise((resolve) => {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
                this.recordedChunks = [];
                
                if (this.micStream) {
                    this.micStream.getTracks().forEach(t => t.stop());
                }
                if (this.micSource) {
                    this.micSource.disconnect();
                    this.micSource = null;
                }
                resolve(blob);
            };
            this.mediaRecorder.stop();
        } else {
            resolve(new Blob([], { type: 'audio/webm' }));
        }
    });
  }

  // --- INTERNAL RECORDING ---
  startRecording() {
    if (!this.recordingStreamDest || !this.ctx) this.init();
    if (!this.recordingStreamDest) return;

    this.resume();
    this.recordedChunks = [];
    
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
      ? 'audio/webm;codecs=opus' 
      : 'audio/webm';

    this.mediaRecorder = new MediaRecorder(this.recordingStreamDest!.stream, { mimeType });
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };
    
    this.mediaRecorder.start();
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject("No recorder");
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        this.recordedChunks = [];
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // --- LOOPING ---

  async decodeAudioData(blob: Blob): Promise<AudioBuffer> {
    if (!this.ctx) this.init();
    if (!this.ctx) throw new Error("Audio Context not ready");
    const arrayBuffer = await blob.arrayBuffer();
    return await this.ctx.decodeAudioData(arrayBuffer);
  }

  playLoop(buffer: AudioBuffer) {
    if (!this.ctx || !this.loopGain) return;
    this.stopLoop(); 
    
    this.loopSource = this.ctx.createBufferSource();
    this.loopSource.buffer = buffer;
    this.loopSource.loop = true;
    this.loopSource.connect(this.loopGain);
    this.loopSource.start();
  }

  stopLoop() {
    if (this.loopSource) {
      try { this.loopSource.stop(); } catch(e) {}
      this.loopSource.disconnect();
      this.loopSource = null;
    }
  }

  setInstrument(type: InstrumentType) {
    this.activeInstrument = type;
    switch(type) {
        case 'PIANO':
            this.synthConfig = { waveform: 'triangle', attack: 0.01, decay: 0.1, sustain: 0.6, release: 1.5, filterCutoff: 3000, filterResonance: 0 };
            break;
        case 'GUITAR':
            this.synthConfig = { waveform: 'sawtooth', attack: 0.005, decay: 1.0, sustain: 0.001, release: 0.5, filterCutoff: 2000, filterResonance: 2 };
            break;
        case 'SYNTH':
            this.synthConfig = { waveform: 'sawtooth', attack: 0.1, decay: 0.2, sustain: 0.4, release: 2.0, filterCutoff: 1000, filterResonance: 10 };
            break;
        case 'STRINGS':
            this.synthConfig = { waveform: 'sawtooth', attack: 0.6, decay: 0.2, sustain: 0.8, release: 3.0, filterCutoff: 1200, filterResonance: 0 };
            break;
        case 'HORNS':
            this.synthConfig = { waveform: 'sawtooth', attack: 0.05, decay: 0.2, sustain: 0.6, release: 0.3, filterCutoff: 1500, filterResonance: 5 };
            break;
    }
  }
  
  updateSynthParams(params: Partial<SynthConfig>) {
      this.synthConfig = { ...this.synthConfig, ...params };
  }

  setMasterVolume(volume: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
    }
  }

  // --- SYNTHESIS ---

  private getNoiseBuffer() {
    if (!this.ctx) return null;
    if (!this.noiseBuffer) {
        const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        this.noiseBuffer = buffer;
    }
    return this.noiseBuffer;
  }

  playDrum(type: 'KICK' | 'SNARE' | 'HAT' | 'CLAP', time?: number, velocity: number = 1.0) {
    if (!this.ctx || !this.isInitialized) this.init();
    this.resume();
    if (!this.ctx) return;

    // Use Scheduled time or immediate
    const t = time || this.ctx.currentTime;
    const main = this.nodes.mainBus;
    const gainScale = velocity;

    if (type === 'KICK') {
        // High-Fidelity 808-style Kick
        // 1. Body (Sine with Pitch Drop)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.15); // Faster pitch drop for punch
        
        gain.gain.setValueAtTime(1.0 * gainScale, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

        osc.connect(gain);
        gain.connect(main);
        osc.start(t);
        osc.stop(t + 0.4);

        // 2. Click (Transient)
        const clickOsc = this.ctx.createOscillator();
        const clickGain = this.ctx.createGain();
        clickOsc.type = 'square';
        clickOsc.frequency.setValueAtTime(80, t);
        
        // Very fast decay for click
        clickGain.gain.setValueAtTime(0.3 * gainScale, t);
        clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
        
        // Filter the click to make it snappy not glitchy
        const clickFilter = this.ctx.createBiquadFilter();
        clickFilter.type = 'lowpass';
        clickFilter.frequency.value = 3000;

        clickOsc.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(main);
        
        clickOsc.start(t);
        clickOsc.stop(t + 0.02);

    } else if (type === 'SNARE') {
        // Professional Hybrid Snare
        
        // 1. Tonal Body (Triangle)
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(250, t);
        osc.frequency.linearRampToValueAtTime(150, t + 0.1);
        
        oscGain.gain.setValueAtTime(0.5 * gainScale, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        
        osc.connect(oscGain);
        oscGain.connect(main);
        osc.start(t);
        osc.stop(t + 0.2);

        // 2. Noise (Wires)
        const noiseBuffer = this.getNoiseBuffer();
        if (noiseBuffer) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuffer;
            
            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'highpass';
            noiseFilter.frequency.setValueAtTime(800, t);
            noiseFilter.frequency.linearRampToValueAtTime(1200, t + 0.15); // Filter movement
            
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.8 * gainScale, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(main);
            noise.start(t);
            noise.stop(t + 0.3);
        }

    } else if (type === 'HAT') {
        // Metallic Hat using filtered noise
        const noiseBuffer = this.getNoiseBuffer();
        if (noiseBuffer) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuffer;

            // Bandpass filter for metallic sizzle
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 8000;
            filter.Q.value = 1.0;

            const highpass = this.ctx.createBiquadFilter();
            highpass.type = 'highpass';
            highpass.frequency.value = 7000;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.4 * gainScale, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05); // Super short

            noise.connect(filter);
            filter.connect(highpass);
            highpass.connect(gain);
            gain.connect(main);
            
            noise.start(t);
            noise.stop(t + 0.06);
        }

    } else if (type === 'CLAP') {
       // Multi-Burst Clap
       const noiseBuffer = this.getNoiseBuffer();
       if (noiseBuffer) {
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.value = 1200;
          filter.Q.value = 1;

          const gain = this.ctx.createGain();
          gain.connect(main);
          
          // Simulation of 3 hands clapping slightly offset
          const startTime = t;
          gain.gain.setValueAtTime(0, startTime);
          
          // Burst 1
          gain.gain.linearRampToValueAtTime(0.7 * gainScale, startTime + 0.005);
          gain.gain.exponentialRampToValueAtTime(0.1, startTime + 0.015);
          
          // Burst 2
          gain.gain.linearRampToValueAtTime(0.6 * gainScale, startTime + 0.025);
          gain.gain.exponentialRampToValueAtTime(0.1, startTime + 0.035);
          
          // Burst 3 (Body)
          gain.gain.linearRampToValueAtTime(0.8 * gainScale, startTime + 0.045);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

          const noise = this.ctx.createBufferSource();
          noise.buffer = noiseBuffer;
          noise.connect(filter);
          filter.connect(gain);
          
          noise.start(startTime);
          noise.stop(startTime + 0.2);
       }
    }
  }

  // Bass Synth for Backing Tracks
  playBass(freq: number, duration: number) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + duration);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.nodes.mainBus);

    osc.start(t);
    osc.stop(t + duration);
  }

  // Advanced Instrument Synthesis
  playNote(freq: number) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    const { waveform, attack, decay, sustain, release, filterCutoff, filterResonance } = this.synthConfig;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.nodes.mainBus);

    osc.frequency.value = freq;
    osc.type = waveform;

    // Filter Envelope (Simple tracking)
    filter.type = 'lowpass';
    filter.Q.value = filterResonance;
    filter.frequency.setValueAtTime(filterCutoff, t);
    // Slight filter movement on attack
    filter.frequency.linearRampToValueAtTime(filterCutoff * 1.5, t + attack);
    filter.frequency.exponentialRampToValueAtTime(filterCutoff, t + attack + decay);

    // Amplitude ADSR Envelope
    const peakGain = 0.5; // normalize volume
    
    // 1. Attack
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peakGain, t + Math.max(0.005, attack)); // Min attack to avoid clicks
    
    // 2. Decay to Sustain
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, peakGain * sustain), t + Math.max(0.005, attack) + decay);

    // 3. Release (simulated trigger release after a fixed 'hold' time for single shots, 
    // real synth would wait for keyUp, but here we fire and forget with a generous hold)
    const holdTime = 0.5; 
    gain.gain.setTargetAtTime(0, t + attack + decay + holdTime, release);

    osc.start(t);
    // Stop oscillator after full release to save CPU
    osc.stop(t + attack + decay + holdTime + release + 1.0);
  }
  
  // Legacy tone support
  playTone(freq: number, type: OscillatorType = 'triangle', duration = 0.5) {
     if (!this.ctx) return;
     const osc = this.ctx.createOscillator();
     const gain = this.ctx.createGain();
     osc.type = type;
     osc.frequency.value = freq;
     gain.connect(this.nodes.mainBus);
     osc.connect(gain);
     const t = this.ctx.currentTime;
     gain.gain.setValueAtTime(0.2, t);
     gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
     osc.start(t);
     osc.stop(t + duration);
  }

  // --- DSP & ENVIRONMENTS ---

  setEnvironment(env: AudioEnvironment) {
    if (!this.ctx || !this.nodes.reverbGain) return;
    
    let seconds = 0.5, decay = 2.0, wet = 0.3;

    switch(env) {
      case 'STUDIO': seconds = 0.1; decay = 5.0; wet = 0.05; break;
      case 'GARAGE': seconds = 0.4; decay = 3.0; wet = 0.2; break;
      case 'CLUB': seconds = 1.0; decay = 2.5; wet = 0.4; break;
      case 'HALLWAY': seconds = 1.5; decay = 1.5; wet = 0.5; break;
      case 'CONCERT': seconds = 2.0; decay = 2.0; wet = 0.6; break;
      case 'STADIUM': seconds = 3.0; decay = 1.0; wet = 0.7; break;
      case 'DUNGEON': seconds = 4.0; decay = 0.5; wet = 0.8; break; 
      case 'ORCHESTRA': seconds = 2.5; decay = 1.8; wet = 0.5; break;
    }

    this.nodes.reverbGain.gain.setTargetAtTime(wet, this.ctx.currentTime, 0.2);
    this.generateImpulse(seconds, decay);
  }

  setEQ(preset: EqPreset) {
    if (!this.lowShelf || !this.ctx) return;
    const t = this.ctx.currentTime;
    
    // Reset defaults
    this.lowShelf.gain.setTargetAtTime(0, t, 0.2);
    this.midPeaking!.gain.setTargetAtTime(0, t, 0.2);
    this.highShelf!.gain.setTargetAtTime(0, t, 0.2);

    switch(preset) {
      case 'SUPER-BASS': this.lowShelf.gain.setTargetAtTime(15, t, 0.2); break;
      case 'POP': 
        this.lowShelf.gain.setTargetAtTime(4, t, 0.2);
        this.highShelf!.gain.setTargetAtTime(4, t, 0.2);
        this.midPeaking!.gain.setTargetAtTime(-3, t, 0.2);
        break;
      case 'MELLOW': this.highShelf!.gain.setTargetAtTime(-8, t, 0.2); break;
      case 'TREBLE': this.highShelf!.gain.setTargetAtTime(10, t, 0.2); break;
      case 'REGGAE':
        this.lowShelf.gain.setTargetAtTime(12, t, 0.2);
        this.highShelf!.gain.setTargetAtTime(6, t, 0.2);
        break;
    }
  }

  private generateImpulse(duration: number, decay: number) {
    if (!this.ctx || !this.reverbNode) return;
    const length = this.ctx.sampleRate * duration;
    const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    const l = impulse.getChannelData(0);
    const r = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i < length - 100 ? Math.random() * 2 - 1 : 0;
      l[i] = n * Math.pow(1 - i / length, decay);
      r[i] = n * Math.pow(1 - i / length, decay);
    }
    this.reverbNode.buffer = impulse;
  }
}

export const audio = new AudioEngine();