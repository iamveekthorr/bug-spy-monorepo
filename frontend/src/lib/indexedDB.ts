/**
 * IndexedDB Service for storing test results locally
 * Allows non-logged-in users to view their test history
 */

const DB_NAME = 'BugSpyDB';
const DB_VERSION = 1;
const STORE_NAME = 'testResults';

export interface TestResult {
  id: string;
  url: string;
  testType?: string;
  deviceType?: string;
  results: Record<string, unknown>;
  timestamp: number;
  syncedToServer: boolean;
  userId?: string;
}

class IndexedDBService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
          });

          // Create indexes
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('url', 'url', { unique: false });
          objectStore.createIndex('syncedToServer', 'syncedToServer', {
            unique: false,
          });
          objectStore.createIndex('userId', 'userId', { unique: false });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  /**
   * Save a test result to IndexedDB
   */
  async saveTestResult(testResult: Omit<TestResult, 'id'>): Promise<string> {
    const db = await this.ensureDB();
    const id = `test_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const fullTestResult: TestResult = {
      id,
      ...testResult,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(fullTestResult);

      request.onsuccess = () => {
        console.log('Test result saved to IndexedDB:', id);
        resolve(id);
      };

      request.onerror = () => {
        console.error('Failed to save test result:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all test results, sorted by timestamp (newest first)
   */
  async getAllTestResults(): Promise<TestResult[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev'); // Descending order

      const results: TestResult[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        console.error('Failed to get test results:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get a single test result by ID
   */
  async getTestResult(id: string): Promise<TestResult | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('Failed to get test result:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get unsynced test results (for syncing with server on login)
   */
  async getUnsyncedTestResults(): Promise<TestResult[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();

      const results: TestResult[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          // Filter for unsynced results (syncedToServer === false)
          if (cursor.value.syncedToServer === false) {
            results.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        console.error('Failed to get unsynced test results:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Mark a test result as synced to server
   */
  async markAsSynced(id: string, userId?: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const testResult = getRequest.result;
        if (testResult) {
          testResult.syncedToServer = true;
          if (userId) {
            testResult.userId = userId;
          }

          const updateRequest = store.put(testResult);

          updateRequest.onsuccess = () => {
            resolve();
          };

          updateRequest.onerror = () => {
            reject(updateRequest.error);
          };
        } else {
          reject(new Error('Test result not found'));
        }
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  /**
   * Delete a test result
   */
  async deleteTestResult(id: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to delete test result:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all test results
   */
  async clearAllTestResults(): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('All test results cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to clear test results:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get test results count
   */
  async getTestResultsCount(): Promise<number> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Failed to count test results:', request.error);
        reject(request.error);
      };
    });
  }
}

// Export singleton instance
export const indexedDBService = new IndexedDBService();
