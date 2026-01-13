import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  testsAPI,
  SingleTestRequest,
  BatchTestRequest,
  SaveTestRequest,
} from '@/lib/api/tests';
import { useTestsStore } from '@/store';

export interface TestProgress {
  status: 'idle' | 'connecting' | 'running' | 'complete' | 'error';
  progress: number;
  message: string;
  data?: any;
  error?: string;
}

export const useSingleTest = () => {
  const [testProgress, setTestProgress] = useState<TestProgress>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const startTest = useCallback((params: SingleTestRequest) => {
    setTestProgress({
      status: 'connecting',
      progress: 0,
      message: 'Connecting to test service...',
    });

    const es = testsAPI.startSingleTest(params);

    es.onopen = () => {
      setTestProgress({
        status: 'running',
        progress: 10,
        message: 'Test started...',
      });
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'progress') {
          setTestProgress({
            status: 'running',
            progress: data.progress || 50,
            message: data.message || 'Running test...',
          });
        } else if (data.type === 'complete') {
          setTestProgress({
            status: 'complete',
            progress: 100,
            message: 'Test completed successfully!',
            data: data.result,
          });
          es.close();
        } else if (data.type === 'error') {
          setTestProgress({
            status: 'error',
            progress: 0,
            message: 'Test failed',
            error: data.message || 'Unknown error occurred',
          });
          es.close();
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    es.onerror = (error) => {
      console.error('SSE Error:', error);
      setTestProgress({
        status: 'error',
        progress: 0,
        message: 'Connection error',
        error: 'Failed to connect to test service',
      });
      es.close();
    };

    setEventSource(es);
  }, []);

  const cancelTest = useCallback(() => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
      setTestProgress({
        status: 'idle',
        progress: 0,
        message: 'Test cancelled',
      });
    }
  }, [eventSource]);

  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  return {
    startTest,
    cancelTest,
    testProgress,
    isRunning: testProgress.status === 'running' || testProgress.status === 'connecting',
  };
};

export const useBatchTest = () => {
  const [testProgress, setTestProgress] = useState<TestProgress>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const startBatchTest = useCallback((params: BatchTestRequest) => {
    setTestProgress({
      status: 'connecting',
      progress: 0,
      message: 'Connecting to test service...',
    });

    const es = testsAPI.startBatchTest(params);

    es.onopen = () => {
      setTestProgress({
        status: 'running',
        progress: 10,
        message: 'Batch test started...',
      });
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'progress') {
          setTestProgress({
            status: 'running',
            progress: data.progress || 50,
            message: data.message || 'Running batch test...',
          });
        } else if (data.type === 'complete') {
          setTestProgress({
            status: 'complete',
            progress: 100,
            message: 'Batch test completed successfully!',
            data: data.result,
          });
          es.close();
        } else if (data.type === 'error') {
          setTestProgress({
            status: 'error',
            progress: 0,
            message: 'Batch test failed',
            error: data.message || 'Unknown error occurred',
          });
          es.close();
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    es.onerror = (error) => {
      console.error('SSE Error:', error);
      setTestProgress({
        status: 'error',
        progress: 0,
        message: 'Connection error',
        error: 'Failed to connect to test service',
      });
      es.close();
    };

    setEventSource(es);
  }, []);

  const cancelTest = useCallback(() => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
      setTestProgress({
        status: 'idle',
        progress: 0,
        message: 'Test cancelled',
      });
    }
  }, [eventSource]);

  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  return {
    startBatchTest,
    cancelTest,
    testProgress,
    isRunning: testProgress.status === 'running' || testProgress.status === 'connecting',
  };
};

export const useSaveTest = () => {
  const { addTest } = useTestsStore();

  return useMutation({
    mutationFn: (data: SaveTestRequest) => testsAPI.saveTest(data),
    onSuccess: (data) => {
      // Optionally update the tests store with the saved test
      console.log('Test saved successfully:', data.savedTestId);
    },
    onError: (error: any) => {
      console.error('Failed to save test:', error);
    },
  });
};
