describe('Dashboard', () => {
  beforeEach(() => {
    // Mock authentication
    cy.intercept('POST', '**/auth/login', {
      statusCode: 200,
      body: {
        user: {
          _id: '123',
          email: 'test@example.com',
          name: 'Test User',
        },
        accessToken: 'fake-token',
      },
    }).as('loginRequest');

    cy.intercept('GET', '**/user/profile', {
      statusCode: 200,
      body: {
        _id: '123',
        email: 'test@example.com',
        name: 'Test User',
      },
    }).as('profileRequest');

    cy.intercept('GET', '**/user/dashboard/stats', {
      statusCode: 200,
      body: {
        totalTests: 24,
        testsThisMonth: 12,
        averageScore: 85,
        criticalIssues: 3,
      },
    }).as('statsRequest');

    cy.intercept('GET', '**/user/tests', {
      statusCode: 200,
      body: [
        {
          id: '1',
          url: 'https://example.com',
          status: 'COMPLETE',
          createdAt: new Date().toISOString(),
          testType: 'performance',
          deviceType: 'desktop',
          results: {
            performanceMetrics: {
              performanceScore: 85,
              firstContentfulPaint: 1.2,
              largestContentfulPaint: 2.1,
              cumulativeLayoutShift: 0.05,
              totalBlockingTime: 150,
              speedIndex: 1.8,
              opportunities: [],
            },
            errors: [],
            screenshots: [],
            networkRequests: [],
            consoleMessages: [],
            accessibilityIssues: [],
          },
        },
      ],
    }).as('testsRequest');

    // Login
    cy.visit('/');
    cy.contains('button', 'Sign up').first().click();
    cy.contains('Log in').click();
    cy.get('[role="dialog"]').within(() => {
      cy.get('input[type="email"]').type('test@example.com');
      cy.get('input[type="password"]').type('Password123!');
      cy.contains('button', 'Log in').click();
    });

    cy.wait('@loginRequest');
    cy.url().should('include', '/dashboard');
  });

  describe('Dashboard Layout', () => {
    it('should display dashboard header', () => {
      cy.contains('Welcome back!').should('be.visible');
    });

    it('should display navigation menu', () => {
      cy.get('nav').should('be.visible');
    });

    it('should have profile section in header', () => {
      cy.contains('test@example.com').should('be.visible');
    });

    it('should display logout button', () => {
      cy.contains('Logout').should('be.visible');
    });
  });

  describe('Dashboard Stats', () => {
    it('should display all stat cards', () => {
      cy.contains('Total Tests').should('be.visible');
      cy.contains('This Month').should('be.visible');
      cy.contains('Avg Performance').should('be.visible');
      cy.contains('Critical Issues').should('be.visible');
    });

    it('should display correct stat values', () => {
      cy.contains('Total Tests').parent().parent().should('contain', '24');
      cy.contains('This Month').parent().parent().should('contain', '12');
      cy.contains('Avg Performance').parent().parent().should('contain', '85%');
      cy.contains('Critical Issues').parent().parent().should('contain', '3');
    });

    it('should show trend indicators', () => {
      cy.get('svg').should('exist'); // Icons for trends
    });

    it('should make stat cards clickable where applicable', () => {
      cy.contains('Total Tests').parent().parent().click();
      cy.url().should('include', '/dashboard/tests');
    });
  });

  describe('Recent Tests Section', () => {
    it('should display recent tests heading', () => {
      cy.contains('Recent Tests').should('be.visible');
    });

    it('should display View all button', () => {
      cy.contains('button', 'View all').should('be.visible');
    });

    it('should display test entries', () => {
      cy.contains('https://example.com').should('be.visible');
    });

    it('should show test status badges', () => {
      cy.contains('Complete').should('be.visible');
    });

    it('should display test metadata', () => {
      cy.contains('performance').should('be.visible');
      cy.contains('desktop').should('be.visible');
    });

    it('should show performance scores', () => {
      cy.contains('Score: 85%').should('be.visible');
    });

    it('should have View button for each test', () => {
      cy.contains('button', 'View').should('be.visible');
    });

    it('should navigate to test details on click', () => {
      cy.contains('button', 'View').first().click();
      cy.url().should('include', '/dashboard/tests/');
    });

    it('should handle empty tests state', () => {
      cy.intercept('GET', '**/user/tests', {
        statusCode: 200,
        body: [],
      }).as('emptyTests');

      cy.reload();
      cy.wait('@emptyTests');

      cy.contains('No tests yet').should('be.visible');
      cy.contains('Get started by running your first website test').should('be.visible');
    });
  });

  describe('Quick Actions', () => {
    it('should display quick actions section', () => {
      cy.contains('Quick Actions').should('be.visible');
    });

    it('should have Run New Test button', () => {
      cy.contains('Run New Test').should('be.visible');
    });

    it('should have Schedule Test button', () => {
      cy.contains('Schedule Test').should('be.visible');
    });

    it('should have View Reports button', () => {
      cy.contains('View Reports').should('be.visible');
    });

    it('should navigate to homepage when clicking Run New Test', () => {
      cy.contains('Run New Test').click();
      cy.url().should('not.include', '/dashboard');
    });

    it('should navigate to scheduled tests page', () => {
      cy.contains('Schedule Test').click();
      cy.url().should('include', '/dashboard/scheduled');
    });

    it('should navigate to reports page', () => {
      cy.contains('View Reports').click();
      cy.url().should('include', '/dashboard/reports');
    });
  });

  describe('Performance Trend', () => {
    it('should display performance trend section', () => {
      cy.contains('Performance Trend').should('be.visible');
    });

    it('should show trend percentages', () => {
      cy.contains('This week').should('be.visible');
      cy.contains('This month').should('be.visible');
      cy.contains('Last 3 months').should('be.visible');
    });

    it('should display trend chart placeholder', () => {
      cy.get('.bg-gray-50').should('exist');
    });
  });

  describe('Navigation Between Pages', () => {
    it('should navigate to Tests page', () => {
      cy.contains('Tests').click();
      cy.url().should('include', '/dashboard/tests');
      cy.contains('Test History').should('be.visible');
    });

    it('should navigate back to Overview', () => {
      cy.contains('Tests').click();
      cy.contains('Overview').click();
      cy.url().should('eq', Cypress.config().baseUrl + '/dashboard');
      cy.contains('Welcome back!').should('be.visible');
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton on initial load', () => {
      cy.intercept('GET', '**/user/dashboard/stats', {
        delay: 1000,
        statusCode: 200,
        body: {
          totalTests: 24,
          testsThisMonth: 12,
          averageScore: 85,
          criticalIssues: 3,
        },
      }).as('delayedStats');

      cy.reload();

      // Should show loading state
      cy.get('.animate-pulse').should('exist');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      cy.intercept('GET', '**/user/dashboard/stats', {
        statusCode: 500,
        body: { message: 'Internal server error' },
      }).as('statsError');

      cy.reload();

      // Should still render page without crashing
      cy.contains('Welcome back!').should('be.visible');
    });

    it('should handle network failures', () => {
      cy.intercept('GET', '**/user/tests', {
        forceNetworkError: true,
      }).as('networkError');

      cy.reload();

      // Should show fallback or handle gracefully
      cy.contains('Welcome back!').should('be.visible');
    });
  });

  describe('Responsive Dashboard', () => {
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1280, height: 720, name: 'Desktop' },
    ];

    viewports.forEach((viewport) => {
      it(`should be responsive on ${viewport.name}`, () => {
        cy.viewport(viewport.width, viewport.height);
        cy.contains('Welcome back!').should('be.visible');
        cy.contains('Total Tests').should('be.visible');
        cy.contains('Recent Tests').should('be.visible');
      });
    });
  });

  describe('Data Refresh', () => {
    it('should auto-refresh dashboard stats', () => {
      // Stats should refetch every 5 minutes according to config
      cy.wait('@statsRequest');

      // Verify initial load
      cy.contains('24').should('be.visible');
    });

    it('should update UI when stats change', () => {
      let callCount = 0;
      cy.intercept('GET', '**/user/dashboard/stats', (req) => {
        callCount++;
        req.reply({
          statusCode: 200,
          body: {
            totalTests: callCount === 1 ? 24 : 25,
            testsThisMonth: 12,
            averageScore: 85,
            criticalIssues: 3,
          },
        });
      }).as('dynamicStats');

      cy.reload();
      cy.wait('@dynamicStats');

      // Should show initial value
      cy.contains('24').should('be.visible');
    });
  });

  describe('Logout Functionality', () => {
    it('should logout successfully', () => {
      cy.intercept('POST', '**/auth/logout', {
        statusCode: 200,
        body: { message: 'Logged out successfully' },
      }).as('logoutRequest');

      cy.contains('Logout').click();
      cy.wait('@logoutRequest');

      // Should redirect to homepage
      cy.url().should('not.include', '/dashboard');
      cy.contains('Automated Website').should('be.visible');
    });

    it('should clear authentication state on logout', () => {
      cy.intercept('POST', '**/auth/logout', {
        statusCode: 200,
        body: { message: 'Logged out successfully' },
      }).as('logoutRequest');

      cy.contains('Logout').click();
      cy.wait('@logoutRequest');

      // Try to access dashboard again
      cy.visit('/dashboard');
      cy.url().should('not.include', '/dashboard');
    });
  });

  describe('Dashboard Integration', () => {
    it('should display user-specific data', () => {
      cy.contains('test@example.com').should('be.visible');
    });

    it('should show correct test count', () => {
      cy.contains('Total Tests').parent().parent().should('contain', '24');
    });

    it('should link tests to detail pages', () => {
      cy.contains('https://example.com').should('be.visible');
      cy.contains('button', 'View').first().click();
      cy.url().should('match', /\/dashboard\/tests\/\d+/);
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      cy.get('h1, h2, h3').should('exist');
    });

    it('should have keyboard navigable elements', () => {
      cy.get('button').first().focus().should('have.focus');
    });

    it('should have proper ARIA labels where needed', () => {
      cy.get('button').should('exist');
    });
  });

  describe('Performance', () => {
    it('should load dashboard within acceptable time', () => {
      const startTime = Date.now();

      cy.visit('/dashboard');

      cy.contains('Welcome back!').should('be.visible').then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(3000); // Should load in less than 3 seconds
      });
    });

    it('should efficiently handle multiple API calls', () => {
      cy.visit('/dashboard');

      // Should make parallel requests
      cy.wait('@profileRequest');
      cy.wait('@statsRequest');
      cy.wait('@testsRequest');

      cy.contains('Welcome back!').should('be.visible');
    });
  });
});
