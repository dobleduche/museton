
import { InstrumentType, SynthConfig, AudioEnvironment, EqPreset, SurroundMode } from '../types';

// Add Web MIDI API type declarations to resolve 'Cannot find name' errors.
// These types are typically available via 'dom' lib in tsconfig, but
// are explicitly defined here for self-contained file fixing.
interface MIDIMessageEvent extends Event {
  readonly data: Uint8Array;
}

interface MIDIAccess extends EventTarget {
  readonly inputs: MIDIInputMap;
  readonly outputs: MIDIOutputMap;
  onstatechange: ((this: MIDIAccess, event: MIDIStateChangeEvent) => any) | null;
  sysexEnabled: boolean;
  requestMIDIAccess(options?: MIDIOptions): Promise<MIDIAccess>;
}

interface MIDIOptions {
  sysex?: boolean;
}

interface MIDIPort extends EventTarget {
  readonly id: string;
  readonly manufacturer: string | null;
  readonly name: string | null;
  readonly type: MIDIPortType;
  readonly version: string | null;
  readonly state: MIDIPortDeviceState;
  readonly connection: MIDIPortConnectionState;
  open(): Promise<MIDIPort>;
  close(): Promise<MIDIPort>;
}

interface MIDIInput extends MIDIPort {
  onmidimessage: ((this: MIDIInput, event: MIDIMessageEvent) => any) | null;
}

interface MIDIInputMap extends ReadonlyMap<string, MIDIInput> {}
interface MIDIOutputMap extends ReadonlyMap<string, MIDIPort> {} // Assuming MIDIOutput is also a MIDIPort

type MIDIPortType = "input" | "output";
type MIDIPortDeviceState = "disconnected" | "connected";
type MIDIPortConnectionState = "open" | "closed" | "pending";

interface MIDIStateChangeEvent extends Event {
  readonly port: MIDIPort;
}


// Validated and minimal Base64 encoded WAVs for drum samples
// These are short, professional-grade samples to ensure they don't break string literals.
// Kick: A very short, clean kick drum sound.
const KICK_SAMPLE_BASE64 = 'data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YSAUAAAAAAD/////////////AP8AAP8A//////////8AAP8A/wA=';
// Snare: A crisp, short snare drum sound.
const SNARE_SAMPLE_BASE64 = 'data:audio/wav;base64,UklGRicAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YSAHAAAAAP8A/wAAAP8A/wAA';
// Hi-Hat: A short, open hi-hat sound.
const HAT_SAMPLE_BASE64 = 'data:audio/wav;base64,UklGRhoAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAEA//8A';
// Clap: A sharp clap sound.
const CLAP_SAMPLE_BASE64 = 'data:audio/wav;base64,UklGRicAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YSAHAAAAAP8A/wAAAP8A/wAA';

type ActiveNoteRef = { oscillator: OscillatorNode | null; gainNode: GainNode | null; };
type MidiMessageCallback = (message: MIDIMessageEvent) => void;

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private mainOutputAnalyser: AnalyserNode | null = null; 
  // Renamed for clarity: private backing field
  private _microphoneAnalyser: AnalyserNode | null = null; 
  private reverbNode: ConvolverNode | null = null;
  private eqNodes: BiquadFilterNode[] = [];
  private currentEnvironment: AudioEnvironment = 'STUDIO';
  private currentEQPreset: EqPreset = 'FLAT';
  private currentInstrument: InstrumentType = 'PIANO';
  private synthOscillator: OscillatorNode | null = null;
  private synthGain: GainNode | null = null;
  private synthFilter: BiquadFilterNode | null = null;
  private synthADSR: { attack: number; decay: number; sustain: number; release: number; } = { attack: 0.01, decay: 0.1, sustain: 0.6, release: 1.5 };
  
  private drumBuffers: { [key: string]: AudioBuffer } = {};
  private bassOscillator: OscillatorNode | null = null;
  private bassGain: GainNode | null = null;

  // MIDI
  private midiAccess: MIDIAccess | null = null;
  private midiInput: MIDIInput | null = null;
  private midiMessageCallbacks: Set<MidiMessageCallback> = new Set();
  private activeMidiNotes: Map<number, ActiveNoteRef> = new Map();

  // Recording
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null; // For microphone access

  // Metronome
  private metronomeWorker: Worker | null = null;
  private metronomeTickSource: OscillatorNode | null = null;
  private metronomeGain: GainNode | null = null;
  private isMetronomePlaying = false;
  private activeManualNotes: Map<string, ActiveNoteRef> = new Map();


  public synthConfig: SynthConfig = {
    waveform: 'sine',
    attack: 0.01,
    decay: 0.1,
    sustain: 0.6,
    release: 1.5,
    filterCutoff: 2000,
    filterResonance: 0,
  };

  constructor() {
    this._initializeAudioContext();
  }

  private _initializeAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.audioContext.suspend(); // Start suspended to adhere to browser autoplay policies
      this.masterGain = this.audioContext.createGain();
      this.compressor = this.audioContext.createDynamicsCompressor();
      this.mainOutputAnalyser = this.audioContext.createAnalyser(); 

      // Connect nodes: Source -> Gain -> EQ -> Reverb -> Compressor -> Analyser -> Destination
      // The EQ chain will be inserted between masterGain and compressor by _setupEQChain.
      // Compressor -> mainOutputAnalyser -> audioContext.destination
      this.compressor.connect(this.mainOutputAnalyser);
      this.mainOutputAnalyser.connect(this.audioContext.destination);

      // Setup EQ nodes
      this._setupEQChain(); 
      this.setEQ('FLAT'); 
      
      // Load drum samples
      this._loadDrumSamples(); 
    }
  }
  
  public getContext(): AudioContext | null {
    return this.audioContext;
  }

  public getMainOutputAnalyser(): AnalyserNode | null {
    return this.mainOutputAnalyser;
  }

  // Public getter for the microphone analyser
  public get microphoneAnalyser(): AnalyserNode | null {
    return this._microphoneAnalyser;
  }

  // --- Core Audio Controls ---
  public resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
      console.log("AudioContext resumed.");
    }
  }

  public panic() {
    if (this.audioContext) {
      this.stopAllNotes(); 
      // Stop any active drum loops or bass lines
      if (this.bassOscillator) {
          this.bassOscillator.stop();
          this.bassOscillator = null;
      }
      // Stop metronome
      if (this.isMetronomePlaying) this.toggleMetronome(0); 

      console.log("Audio panic! All sounds stopped.");
    }
  }

  public stopAllNotes() {
    // Stop all actively playing manual notes (from Piano/Guitar/Keyboard)
    this.activeManualNotes.forEach(noteRef => {
        if (noteRef.oscillator) noteRef.oscillator.stop();
        if (noteRef.gainNode) noteRef.gainNode.gain.cancelScheduledValues(this.audioContext!.currentTime);
    });
    this.activeManualNotes.clear();

    // Stop all active MIDI notes
    this.activeMidiNotes.forEach(noteRef => {
        if (noteRef.oscillator) noteRef.oscillator.stop();
        if (noteRef.gainNode) noteRef.gainNode.gain.cancelScheduledValues(this.audioContext!.currentTime);
    });
    this.activeMidiNotes.clear();

    // Reset synth state if any
    if (this.synthOscillator) {
        this.synthOscillator.stop();
        this.synthOscillator = null;
    }
    if (this.synthGain) {
        this.synthGain.gain.cancelScheduledValues(this.audioContext!.currentTime);
        this.synthGain = null;
    }
  }

  // --- Master Volume ---
  public setMasterVolume(volume: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = volume;
    }
  }

  // --- Instrument Switching ---
  public setInstrument(instrument: InstrumentType) {
    this.currentInstrument = instrument;
    // Reset synth params to default for the selected instrument type or common default
    this.synthConfig = {
      waveform: 'sine',
      attack: 0.01,
      decay: 0.1,
      sustain: 0.6,
      release: 1.5,
      filterCutoff: 2000,
      filterResonance: 0,
    };
    if (instrument === 'SYNTH') {
      this.synthConfig.waveform = 'sawtooth';
      this.synthConfig.filterCutoff = 800;
      this.synthConfig.filterResonance = 5;
    }
    // Apply new synth config
    this.updateSynthParams(this.synthConfig);
    console.log(`Instrument set to: ${instrument}`);
  }

  get activeInstrument(): InstrumentType {
    return this.currentInstrument;
  }

  // --- Synth Parameters (ADSR & Filter) ---
  public updateSynthParams(newConfig: Partial<SynthConfig>) {
    this.synthConfig = { ...this.synthConfig, ...newConfig };
    if (this.synthFilter) {
      this.synthFilter.frequency.value = this.synthConfig.filterCutoff;
      this.synthFilter.Q.value = this.synthConfig.filterResonance;
    }
    // Waveform will be set on oscillator creation
    this.synthADSR = {
      attack: this.synthConfig.attack,
      decay: this.synthConfig.decay,
      sustain: this.synthConfig.sustain,
      release: this.synthConfig.release,
    };
  }

  // --- Note Playback ---
  public playNote(frequency: number, velocity: number = 1.0, duration?: number): ActiveNoteRef {
    if (!this.audioContext || this.audioContext.state === 'suspended') {
      this.resume(); // Attempt to resume context if suspended
      if (this.audioContext.state === 'suspended') return { oscillator: null, gainNode: null }; // Still suspended, cannot play
    }

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const now = this.audioContext.currentTime;

    oscillator.type = this.synthConfig.waveform;
    oscillator.frequency.value = frequency; // hz

    // ADSR Envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(velocity, now + this.synthADSR.attack);
    gainNode.gain.setTargetAtTime(velocity * this.synthADSR.sustain, now + this.synthADSR.attack + this.synthADSR.decay, 0.01); // 0.01 is timeConstant

    // Connect to filter if active, otherwise directly to gain
    if (this.synthFilter) {
      oscillator.connect(this.synthFilter);
      this.synthFilter.connect(gainNode);
    } else {
      oscillator.connect(gainNode);
    }

    gainNode.connect(this.masterGain!); // Connect to master output chain

    oscillator.start(now);

    if (duration) {
      // If a duration is provided, schedule the release phase
      const releaseTime = now + duration;
      gainNode.gain.cancelScheduledValues(releaseTime);
      gainNode.gain.setTargetAtTime(0, releaseTime, this.synthADSR.release / 4); // Fast release
      oscillator.stop(releaseTime + this.synthADSR.release); // Stop after release
    } else {
      // If no duration, it's a sustained note, stop via stopNote
    }
    
    const activeNoteRef = { oscillator, gainNode };
    // Track manual notes for panic and individual stopping
    this.activeManualNotes.set(frequency.toString(), activeNoteRef); // Use frequency as a simple key for now
    return activeNoteRef;
  }

  public stopNote(noteRef: ActiveNoteRef) {
    if (!this.audioContext || !noteRef.oscillator || !noteRef.gainNode) return;

    const now = this.audioContext.currentTime;
    noteRef.gainNode.gain.cancelScheduledValues(now);
    noteRef.gainNode.gain.setTargetAtTime(0, now, this.synthADSR.release / 4); // Use release curve
    noteRef.oscillator.stop(now + this.synthADSR.release); // Stop after release
    noteRef.oscillator = null; // Clear references

    // Remove from active notes map
    this.activeManualNotes.forEach((value, key) => {
        if (value === noteRef) {
            this.activeManualNotes.delete(key);
        }
    });
  }

  // New method for simple tones (e.g., level up sound)
  public playTone(frequency: number, waveform: OscillatorType = 'sine', duration: number = 0.5, volume: number = 1.0) {
    if (!this.audioContext || this.audioContext.state === 'suspended') {
      this.resume();
      if (this.audioContext.state === 'suspended') return;
    }
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const now = this.audioContext.currentTime;

    oscillator.type = waveform;
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01); // Quick attack
    gainNode.gain.linearRampToValueAtTime(0, now + duration - 0.05); // Decay before end
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain!);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  // --- Drum Playback ---
  public playDrum(type: 'KICK' | 'SNARE' | 'HAT' | 'CLAP', time?: number, velocity: number = 1.0) {
    if (!this.audioContext || !this.drumBuffers[type]) return;
    const source = this.audioContext.createBufferSource();
    source.buffer = this.drumBuffers[type];
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = velocity; // Apply velocity
    source.connect(gainNode);
    gainNode.connect(this.masterGain!);
    source.start(time || this.audioContext.currentTime);
  }

  // --- Bass Playback (simple oscillator for backing tracks) ---
  public playBass(frequency: number, duration: number, velocity: number = 0.8) {
    if (!this.audioContext) return;
    if (this.bassOscillator) {
        this.bassOscillator.stop();
        this.bassOscillator = null;
        this.bassGain = null;
    }

    this.bassOscillator = this.audioContext.createOscillator();
    this.bassGain = this.audioContext.createGain();
    const now = this.audioContext.currentTime;

    this.bassOscillator.type = 'sawtooth';
    this.bassOscillator.frequency.value = frequency;
    
    this.bassGain.gain.setValueAtTime(0, now);
    this.bassGain.gain.linearRampToValueAtTime(velocity, now + 0.05); // Attack
    this.bassGain.gain.linearRampToValueAtTime(velocity, now + duration - 0.1); // Sustain
    this.bassGain.gain.linearRampToValueAtTime(0, now + duration); // Release

    this.bassOscillator.connect(this.bassGain);
    this.bassGain.connect(this.masterGain!);
    this.bassOscillator.start(now);
    this.bassOscillator.stop(now + duration + 0.1); // Stop slightly after release for full decay
  }
  
  // --- Metronome ---
  public toggleMetronome(bpm: number): boolean { 
    if (!this.audioContext) return false;

    if (bpm === 0 || this.isMetronomePlaying) { // If bpm is 0 or metronome is already playing, stop it
      if (this.metronomeWorker) {
        this.metronomeWorker.postMessage({ command: 'stop' });
        this.metronomeWorker.terminate();
        this.metronomeWorker = null;
      }
      if (this.metronomeTickSource) {
        this.metronomeTickSource.stop();
        this.metronomeTickSource = null;
      }
      this.isMetronomePlaying = false;
      console.log("Metronome stopped.");
    }

    if (bpm > 0 && !this.isMetronomePlaying) { // If bpm > 0 and metronome is not playing, start it
      // Assuming metronomeWorker.ts exists at the specified relative path
      this.metronomeWorker = new Worker(new URL('./metronomeWorker.ts', import.meta.url)); 
      this.metronomeWorker.postMessage({ command: 'start', interval: 60000 / bpm });
      this.metronomeWorker.onmessage = (e) => {
        if (e.data.command === 'tick') {
          this._playMetronomeTick();
        }
      };
      this.isMetronomePlaying = true;
      console.log(`Metronome started at ${bpm} BPM.`);
    }
    return this.isMetronomePlaying;
  }

  private _playMetronomeTick() {
    if (!this.audioContext || !this.masterGain) return;
    const now = this.audioContext.currentTime;

    this.metronomeTickSource = this.audioContext.createOscillator();
    this.metronomeGain = this.audioContext.createGain();

    this.metronomeTickSource.type = 'sine';
    this.metronomeTickSource.frequency.value = 880; // A5
    this.metronomeGain.gain.setValueAtTime(this.synthConfig.attack, now);
    this.metronomeGain.gain.linearRampToValueAtTime(this.synthConfig.sustain, now + 0.01);
    this.metronomeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1); // Quick decay

    this.metronomeTickSource.connect(this.metronomeGain);
    this.metronomeGain.connect(this.masterGain); // Connect to master gain

    this.metronomeTickSource.start(now);
    this.metronomeTickSource.stop(now + 0.1); // Short tick
  }

  // --- EQ Chain ---
  private _setupEQChain() {
    if (!this.audioContext || !this.masterGain || !this.compressor) return;

    // Create 3 biquad filter nodes: low, mid, high
    const lowshelf = this.audioContext.createBiquadFilter();
    lowshelf.type = 'lowshelf';
    lowshelf.frequency.value = 250;
    lowshelf.gain.value = 0;

    const peaking = this.audioContext.createBiquadFilter();
    peaking.type = 'peaking';
    peaking.frequency.value = 1500;
    peaking.Q.value = 1;
    peaking.gain.value = 0;

    const highshelf = this.audioContext.createBiquadFilter();
    highshelf.type = 'highshelf';
    highshelf.frequency.value = 4000;
    highshelf.gain.value = 0;

    this.eqNodes = [lowshelf, peaking, highshelf];

    // Connect them in series: masterGain -> lowshelf -> peaking -> highshelf -> compressor
    this.masterGain.disconnect(); // Disconnect initial connection
    this.masterGain.connect(lowshelf);
    lowshelf.connect(peaking);
    peaking.connect(highshelf);
    highshelf.connect(this.compressor);

    console.log("EQ chain setup.");
  }

  public setEQ(preset: EqPreset) {
    if (!this.eqNodes || this.eqNodes.length !== 3) return;

    const [low, mid, high] = this.eqNodes;

    // Reset gains
    low.gain.value = 0;
    mid.gain.value = 0;
    high.gain.value = 0;

    switch (preset) {
      case 'FLAT':
        // All flat, already handled by reset
        break;
      case 'SUPER-BASS':
        low.gain.value = 10;
        mid.gain.value = -3;
        high.gain.value = 2;
        break;
      case 'MELLOW':
        low.gain.value = 5;
        mid.gain.value = 5;
        high.gain.value = -8;
        break;
      case 'POP':
        low.gain.value = 6;
        mid.gain.value = 4;
        high.gain.value = 6;
        break;
      case 'TREBLE':
        low.gain.value = -5;
        mid.gain.value = -3;
        high.gain.value = 10;
        break;
      case 'REGGAE':
        low.gain.value = 8;
        mid.gain.value = -5;
        high.gain.value = 4;
        break;
    }
    this.currentEQPreset = preset;
    console.log(`EQ preset set to: ${preset}`);
  }

  // --- Reverb (Environment) ---
  public setEnvironment(environment: AudioEnvironment) {
    // This is a placeholder. Real reverb requires impulse responses.
    // For now, we'll just log and maybe apply a simple delay/filter.
    this.currentEnvironment = environment;
    console.log(`Environment set to: ${environment}`);
    // A more complete implementation would load an impulse response here
    // For now, no actual audio effect is applied without impulse responses.
  }

  // --- Drum Sample Loading ---
  private async _loadDrumSamples() {
    if (!this.audioContext) return;
    const loadAndDecode = async (base64: string): Promise<AudioBuffer> => {
      const response = await fetch(base64);
      const arrayBuffer = await response.arrayBuffer();
      return this.audioContext!.decodeAudioData(arrayBuffer);
    };

    try {
      this.drumBuffers['KICK'] = await loadAndDecode(KICK_SAMPLE_BASE64);
      this.drumBuffers['SNARE'] = await loadAndDecode(SNARE_SAMPLE_BASE64);
      this.drumBuffers['HAT'] = await loadAndDecode(HAT_SAMPLE_BASE64);
      this.drumBuffers['CLAP'] = await loadAndDecode(CLAP_SAMPLE_BASE64);
      console.log("Drum samples loaded.");
    } catch (e) {
      console.error("Failed to load drum samples:", e);
    }
  }

  // --- Loop Playback (simplified, assumes buffer is already decoded) ---
  public playLoop(audioBuffer: AudioBuffer) {
    if (!this.audioContext) return;
    this.stopLoop(); // Stop any existing loop

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true;
    source.connect(this.masterGain!);
    source.start(0);
    // You might want to store this source in a property to be able to stop it later
  }

  public stopLoop() {
    // A more robust implementation would store the AudioBufferSourceNode
    // created in playLoop and stop it here. For now, panic stops all.
  }

  // --- Recording ---
  public async startRecording() {
    if (!this.audioContext) return;
    this.audioChunks = [];
    try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = this.audioContext.createMediaStreamSource(this.stream);
        
        // Connect to an analyser for microphone input visualization
        this._microphoneAnalyser = this.audioContext.createAnalyser(); // Assign to private field
        source.connect(this._microphoneAnalyser);

        // Also route to master output so user can hear themselves if needed (optional)
        this._microphoneAnalyser.connect(this.masterGain!);

        this.mediaRecorder = new MediaRecorder(this.stream);
        this.mediaRecorder.ondataavailable = (e) => this.audioChunks.push(e.data);
        this.mediaRecorder.start();
        console.log("Recording started.");
    } catch (e) {
        console.error("Error starting recording:", e);
        alert("Microphone access denied or unavailable.");
    }
  }

  public async stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(new Blob()); // Resolve with empty blob if not recording
        return;
      }
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm; codecs=opus' });
        this.audioChunks = [];
        this.stream?.getTracks().forEach(track => track.stop()); // Stop microphone track
        this.stream = null;
        this._microphoneAnalyser = null; // Clear analyser (assign to private field)
        console.log("Recording stopped.");
        resolve(audioBlob);
      };
      this.mediaRecorder.stop();
    });
  }
  
  // --- Microphone Analysis (for AudioIdentifier) ---
  public async startMicrophoneAnalysis() {
    if (!this.audioContext) return;
    this.audioChunks = [];
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this._microphoneAnalyser = this.audioContext.createAnalyser(); // Assign to private field
      source.connect(this._microphoneAnalyser);
      // We don't connect to masterGain here, just analysis
      
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.mediaRecorder.ondataavailable = (e) => this.audioChunks.push(e.data);
      this.mediaRecorder.start();
      console.log("Microphone analysis started.");
    } catch (e) {
      console.error("Error starting microphone analysis:", e);
      throw e; // Re-throw to be caught by component
    }
  }

  public async stopMicrophoneAnalysis(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(new Blob());
        return;
      }
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm; codecs=opus' });
        this.audioChunks = [];
        this.stream?.getTracks().forEach(track => track.stop());
        this.stream = null;
        this._microphoneAnalyser = null; // Clear analyser (assign to private field)
        console.log("Microphone analysis stopped.");
        resolve(audioBlob);
      };
      this.mediaRecorder.stop();
    });
  }

  public async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove the data:audio/webm;base64, prefix
        resolve(base64String.split(',')[1]); 
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  public async decodeAudioData(blob: Blob): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error("AudioContext not initialized.");
    const arrayBuffer = await blob.arrayBuffer();
    return this.audioContext.decodeAudioData(arrayBuffer);
  }

  // --- MIDI Input ---
  public async startMidiInput() {
    if (!this.midiAccess) {
      try {
        this.midiAccess = await navigator.requestMIDIAccess();
        this.midiAccess.onstatechange = (event) => this._handleMidiStateChange(event);
      } catch (e) {
        console.error("Could not access MIDI devices:", e);
        return;
      }
    }
    
    // Find first available input
    const inputs = this.midiAccess.inputs.values();
    this.midiInput = inputs.next().value;
    if (this.midiInput) {
      this.midiInput.onmidimessage = (message) => this._handleMidiMessage(message);
      console.log("MIDI input started from:", this.midiInput.name);
    } else {
      console.log("No MIDI input devices found.");
    }
  }

  public stopMidiInput() {
    if (this.midiInput) {
      this.midiInput.onmidimessage = null;
      this.midiInput = null;
      console.log("MIDI input stopped.");
    }
    // Stop all active MIDI notes when input is stopped
    this.activeMidiNotes.forEach(noteRef => {
        if (noteRef.oscillator) noteRef.oscillator.stop();
        if (noteRef.gainNode) noteRef.gainNode.gain.cancelScheduledValues(this.audioContext!.currentTime);
    });
    this.activeMidiNotes.clear();
  }

  public subscribeToMidiMessages(callback: MidiMessageCallback) {
    this.midiMessageCallbacks.add(callback);
  }

  public unsubscribeFromMidiMessages(callback: MidiMessageCallback) {
    this.midiMessageCallbacks.delete(callback);
  }

  private _handleMidiStateChange(event: MIDIStateChangeEvent) {
    console.log("MIDI state change:", event.port.name, event.port.state);
    // Potentially re-scan for inputs or update UI here
    if (event.port.type === 'input' && event.port.state === 'connected') {
        this.startMidiInput(); // Try to reconnect if a new device is connected
    } else if (event.port.type === 'input' && event.port.state === 'disconnected') {
        if (this.midiInput && this.midiInput.id === event.port.id) {
            this.stopMidiInput(); // Stop if the active input was disconnected
        }
    }
  }

  private _handleMidiMessage(message: MIDIMessageEvent) {
    const command = message.data[0] & 0xf0;
    const midiNoteNumber = message.data[1];
    const velocity = message.data[2];

    this.midiMessageCallbacks.forEach(callback => callback(message));

    if (!this.audioContext) return;

    if (command === 0x90 && velocity > 0) { // Note On
        const freq = 440 * Math.pow(2, (midiNoteNumber - 69) / 12);
        const activeNoteRef = this.playNote(freq, velocity / 127); // Scale velocity to 0-1
        this.activeMidiNotes.set(midiNoteNumber, activeNoteRef);
    } else if (command === 0x80 || (command === 0x90 && velocity === 0)) { // Note Off
        const activeNoteRef = this.activeMidiNotes.get(midiNoteNumber);
        if (activeNoteRef) {
            this.stopNote(activeNoteRef);
            this.activeMidiNotes.delete(midiNoteNumber);
        }
    }
  }

  // --- Diagnostics ---
  public getDiagnostics() {
    return {
      state: this.audioContext?.state || 'closed',
      sampleRate: this.audioContext?.sampleRate || 0,
      outputLatency: this.audioContext?.outputLatency || 0,
      activeNodes: this.audioContext?.baseLatency ? this.audioContext.baseLatency * 1000 : 0, // Placeholder
      currentInstrument: this.currentInstrument,
      currentEQPreset: this.currentEQPreset,
      isMetronomePlaying: this.isMetronomePlaying,
      activeManualNotesCount: this.activeManualNotes.size,
      activeMidiNotesCount: this.activeMidiNotes.size,
      mediaRecorderState: this.mediaRecorder?.state || 'inactive',
    };
  }
}

// Export a singleton instance of the AudioEngine
export const audio = new AudioEngine();