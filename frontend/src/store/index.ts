import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { AuthState, User, TestResult, DashboardStats } from '@/types';

// Auth Store
interface AuthStore extends AuthState {
  login: (user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        
        login: (user: User) =>
          set(
            { user, isAuthenticated: true, isLoading: false, error: null },
            false,
            'auth/login'
          ),
        
        logout: () =>
          set(
            { user: null, isAuthenticated: false, isLoading: false, error: null },
            false,
            'auth/logout'
          ),
        
        setUser: (user: User) =>
          set({ user }, false, 'auth/setUser'),
        
        setLoading: (isLoading: boolean) =>
          set({ isLoading }, false, 'auth/setLoading'),
        
        setError: (error: string | null) =>
          set({ error }, false, 'auth/setError'),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);

// Tests Store
interface TestsStore {
  tests: TestResult[];
  currentTest: TestResult | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    status: string[];
    testType: string[];
    deviceType: string[];
  };
  
  setTests: (tests: TestResult[]) => void;
  addTest: (test: TestResult) => void;
  updateTest: (id: string, updates: Partial<TestResult>) => void;
  setCurrentTest: (test: TestResult | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<TestsStore['filters']>) => void;
  clearFilters: () => void;
}

export const useTestsStore = create<TestsStore>()(
  devtools(
    (set) => ({
      tests: [],
      currentTest: null,
      isLoading: false,
      error: null,
      filters: {
        status: [],
        testType: [],
        deviceType: [],
      },
      
      setTests: (tests: TestResult[]) =>
        set({ tests, isLoading: false, error: null }, false, 'tests/setTests'),
      
      addTest: (test: TestResult) =>
        set(
          (state) => ({ tests: [test, ...state.tests] }),
          false,
          'tests/addTest'
        ),
      
      updateTest: (id: string, updates: Partial<TestResult>) =>
        set(
          (state) => ({
            tests: state.tests.map((test) =>
              test.id === id ? { ...test, ...updates } : test
            ),
            currentTest: state.currentTest?.id === id 
              ? { ...state.currentTest, ...updates }
              : state.currentTest,
          }),
          false,
          'tests/updateTest'
        ),
      
      setCurrentTest: (test: TestResult | null) =>
        set({ currentTest: test }, false, 'tests/setCurrentTest'),
      
      setLoading: (isLoading: boolean) =>
        set({ isLoading }, false, 'tests/setLoading'),
      
      setError: (error: string | null) =>
        set({ error }, false, 'tests/setError'),
      
      setFilters: (filters: Partial<TestsStore['filters']>) =>
        set(
          (state) => ({ filters: { ...state.filters, ...filters } }),
          false,
          'tests/setFilters'
        ),
      
      clearFilters: () =>
        set(
          { filters: { status: [], testType: [], deviceType: [] } },
          false,
          'tests/clearFilters'
        ),
    }),
    {
      name: 'tests-store',
    }
  )
);

// Dashboard Store
interface DashboardStore {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  
  setStats: (stats: DashboardStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  refreshStats: () => Promise<void>;
}

export const useDashboardStore = create<DashboardStore>()(
  devtools(
    (set) => ({
      stats: null,
      isLoading: false,
      error: null,
      
      setStats: (stats: DashboardStats) =>
        set({ stats, isLoading: false, error: null }, false, 'dashboard/setStats'),
      
      setLoading: (isLoading: boolean) =>
        set({ isLoading }, false, 'dashboard/setLoading'),
      
      setError: (error: string | null) =>
        set({ error }, false, 'dashboard/setError'),
      
      refreshStats: async () => {
        set({ isLoading: true, error: null }, false, 'dashboard/refreshStats');
        try {
          // API call would go here
          // const stats = await dashboardAPI.getStats();
          // set({ stats, isLoading: false });
          
          // Mock data for now
          const mockStats: DashboardStats = {
            totalTests: 156,
            testsThisMonth: 42,
            averageScore: 85,
            criticalIssues: 3,
            recentTests: [],
          };
          
          set({ stats: mockStats, isLoading: false }, false, 'dashboard/refreshStats/success');
        } catch (error) {
          set(
            { error: error instanceof Error ? error.message : 'Failed to fetch stats', isLoading: false },
            false,
            'dashboard/refreshStats/error'
          );
        }
      },
    }),
    {
      name: 'dashboard-store',
    }
  )
);

// UI Store for general UI state
interface UIStore {
  sidebarOpen: boolean;
  currentPage: string;
  
  // Auth modal state
  authModals: {
    loginOpen: boolean;
    signupOpen: boolean;
    forgotPasswordOpen: boolean;
  };
  
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentPage: (page: string) => void;
  
  // Auth modal actions
  openLoginModal: () => void;
  openSignupModal: () => void;
  openForgotPasswordModal: () => void;
  closeAuthModals: () => void;
}

export const useUIStore = create<UIStore>()(
  devtools(
    (set) => ({
      sidebarOpen: true,
      currentPage: '',
      authModals: {
        loginOpen: false,
        signupOpen: false,
        forgotPasswordOpen: false,
      },
      
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen }), false, 'ui/toggleSidebar'),
      
      setSidebarOpen: (sidebarOpen: boolean) =>
        set({ sidebarOpen }, false, 'ui/setSidebarOpen'),
      
      setCurrentPage: (currentPage: string) =>
        set({ currentPage }, false, 'ui/setCurrentPage'),
      
      openLoginModal: () =>
        set(
          { 
            authModals: { 
              loginOpen: true, 
              signupOpen: false, 
              forgotPasswordOpen: false 
            } 
          }, 
          false, 
          'ui/openLoginModal'
        ),
      
      openSignupModal: () =>
        set(
          { 
            authModals: { 
              loginOpen: false, 
              signupOpen: true, 
              forgotPasswordOpen: false 
            } 
          }, 
          false, 
          'ui/openSignupModal'
        ),
      
      openForgotPasswordModal: () =>
        set(
          { 
            authModals: { 
              loginOpen: false, 
              signupOpen: false, 
              forgotPasswordOpen: true 
            } 
          }, 
          false, 
          'ui/openForgotPasswordModal'
        ),
      
      closeAuthModals: () =>
        set(
          { 
            authModals: { 
              loginOpen: false, 
              signupOpen: false, 
              forgotPasswordOpen: false 
            } 
          }, 
          false, 
          'ui/closeAuthModals'
        ),
    }),
    {
      name: 'ui-store',
    }
  )
);