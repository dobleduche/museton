
import { openDB, DBSchema } from 'idb';
import { UserPersona, BeatProject, HistoryItem, PracticeSession, SavedProject, SynthConfig } from '../types';

interface TheoryGenDB extends DBSchema {
  user: {
    key: string;
    value: UserPersona;
  };
  history: {
    key: number;
    value: HistoryItem;
    indexes: { 'by-type': string };
  };
  recordings: {
    key: number;
    value: {
      id?: number;
      blob: Blob;
      name: string;
      timestamp: Date;
      duration: number;
    };
  };
  projects: {
    key: number;
    value: SavedProject;
  };
  practice: {
    key: number;
    value: PracticeSession;
  };
  synth_presets: {
    key: number;
    value: {
      id?: number;
      name: string;
      config: SynthConfig;
      timestamp: Date;
    };
  };
}

const DB_NAME = 'theorygen-db';
const VERSION = 3; 

export const db = {
  async init() {
    return openDB<TheoryGenDB>(DB_NAME, VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains('user')) {
          db.createObjectStore('user', { keyPath: 'name' });
        }
        if (!db.objectStoreNames.contains('history')) {
          const store = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
          store.createIndex('by-type', 'type');
        }
        if (!db.objectStoreNames.contains('recordings')) {
          db.createObjectStore('recordings', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('practice')) {
          db.createObjectStore('practice', { keyPath: 'id', autoIncrement: true });
        }
        // New Store for Synth Patches
        if (!db.objectStoreNames.contains('synth_presets')) {
          db.createObjectStore('synth_presets', { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  },

  async savePersona(persona: UserPersona) {
    const database = await this.init();
    return database.put('user', persona);
  },

  async getPersona(name: string) {
    const database = await this.init();
    return database.get('user', name);
  },

  async addToHistory(item: Omit<HistoryItem, 'id' | 'timestamp'>) {
    const database = await this.init();
    return database.add('history', { ...item, timestamp: new Date() } as HistoryItem);
  },

  async getHistory() {
    const database = await this.init();
    return database.getAll('history');
  },

  async saveRecording(blob: Blob, name: string, duration: number) {
    const database = await this.init();
    return database.add('recordings', {
      blob,
      name,
      duration,
      timestamp: new Date()
    });
  },

  async getRecordings() {
    const database = await this.init();
    return database.getAll('recordings');
  },
  
  async deleteRecording(id: number) {
    const database = await this.init();
    return database.delete('recordings', id);
  },

  // Projects
  async saveProject(project: BeatProject) {
    const database = await this.init();
    return database.add('projects', {
      data: project,
      name: project.title,
      timestamp: new Date()
    });
  },

  async getProjects() {
    const database = await this.init();
    return database.getAll('projects');
  },

  async deleteProject(id: number) {
    const database = await this.init();
    return database.delete('projects', id);
  },

  // Practice & Mastery
  async savePracticeSession(session: PracticeSession) {
    const database = await this.init();
    return database.add('practice', session);
  },

  async getPracticeSessions() {
    const database = await this.init();
    return database.getAll('practice');
  },

  // Synth Presets (New API)
  async saveSynthPreset(name: string, config: SynthConfig) {
    const database = await this.init();
    return database.add('synth_presets', {
      name,
      config,
      timestamp: new Date()
    });
  },

  async getSynthPresets() {
    const database = await this.init();
    return database.getAll('synth_presets');
  },

  async deleteSynthPreset(id: number) {
    const database = await this.init();
    return database.delete('synth_presets', id);
  }
};
