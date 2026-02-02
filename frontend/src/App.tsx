import Index from '@/components/Index';
// import { useTestSync } from '@/hooks/useTestSync';
// import { useEffect } from 'react';

function App() {
  // TODO: Re-enable when backend endpoint /user/tests/sync is implemented
  // Auto-sync test results when user logs in
  // const { isSyncing, syncStats } = useTestSync();

  // useEffect(() => {
  //   if (syncStats && syncStats.syncedCount > 0) {
  //     console.log(
  //       `✅ Synced ${syncStats.syncedCount} test results to your account`
  //     );
  //   }
  // }, [syncStats]);

  return (
    <>
      <Index />
      {/* {isSyncing && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2 z-50">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          Syncing your test results...
        </div>
      )} */}
    </>
  );
}

export default App;
