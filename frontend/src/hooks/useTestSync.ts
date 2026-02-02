import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store';
import { indexedDBService } from '@/lib/indexedDB';
import { testsAPI } from '@/lib/api/tests';

/**
 * Hook to sync local IndexedDB test results with server when user logs in
 */
export const useTestSync = () => {
  const { user } = useAuthStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncStats, setSyncStats] = useState<{
    syncedCount: number;
    failedCount: number;
  } | null>(null);

  useEffect(() => {
    const syncTestResults = async () => {
      if (!user?.id) {
        return;
      }

      try {
        setIsSyncing(true);
        setSyncError(null);

        // Get all unsynced test results from IndexedDB
        const unsyncedTests = await indexedDBService.getUnsyncedTestResults();

        if (unsyncedTests.length === 0) {
          console.log('No unsynced test results to sync');
          setIsSyncing(false);
          return;
        }

        console.log(`Syncing ${unsyncedTests.length} test results to server...`);

        // Prepare test data for API
        const testsToSync = unsyncedTests.map((test) => ({
          url: test.url,
          testType: test.testType,
          deviceType: test.deviceType,
          results: test.results,
          timestamp: test.timestamp,
        }));

        // Sync to server
        const response = await testsAPI.syncTestResults(testsToSync);

        console.log('Sync response:', response);

        // Mark synced tests in IndexedDB
        const syncPromises = unsyncedTests.map((test) =>
          indexedDBService.markAsSynced(test.id, user.id)
        );

        await Promise.all(syncPromises);

        setSyncStats({
          syncedCount: response.syncedCount,
          failedCount: response.failedCount,
        });

        console.log(
          `Successfully synced ${response.syncedCount} test results, ${response.failedCount} failed`
        );
      } catch (error) {
        console.error('Failed to sync test results:', error);
        setSyncError(
          error instanceof Error ? error.message : 'Failed to sync test results'
        );
      } finally {
        setIsSyncing(false);
      }
    };

    // Sync when user logs in
    syncTestResults();
  }, [user?.id]);

  return {
    isSyncing,
    syncError,
    syncStats,
  };
};
