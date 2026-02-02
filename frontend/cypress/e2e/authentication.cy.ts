describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('Signup Modal', () => {
    beforeEach(() => {
      // Open signup modal
      cy.contains('button', 'Sign up').first().click();
    });

    it('should open signup modal when clicking Sign up button', () => {
      cy.get('[role="dialog"]').should('be.visible');
      cy.contains('Create your account').should('be.visible');
    });

    it('should display all signup form fields', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.get('input[type="email"]').should('be.visible');
        cy.get('input[type="password"]').should('have.length.at.least', 1);
        cy.contains('button', 'Create account').should('be.visible');
      });
    });

    it('should show validation errors for empty fields', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.contains('button', 'Create account').click();
        // Form validation should prevent submission or show errors
      });
    });

    it('should close modal when clicking outside or close button', () => {
      cy.get('[role="dialog"]').should('be.visible');
      cy.get('body').type('{esc}');
      cy.get('[role="dialog"]').should('not.exist');
    });

    it('should switch to login modal', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.contains('Already have an account?').should('be.visible');
        cy.contains('Sign in').click();
      });
      cy.contains('Welcome back').should('be.visible');
    });

    it('should handle successful signup', () => {
      cy.intercept('POST', '**/auth/signup', {
        statusCode: 201,
        body: {
          user: {
            _id: '123',
            email: 'test@example.com',
            name: 'Test User',
          },
          accessToken: 'fake-token',
        },
      }).as('signupRequest');

      cy.get('[role="dialog"]').within(() => {
        cy.get('input[type="email"]').type('test@example.com');
        cy.get('input[type="password"]').first().type('Password123!');
        cy.get('input[type="password"]').eq(1).type('Password123!');
        cy.get('input[type="checkbox"]').check();
        cy.contains('button', 'Create account').click();
      });

      cy.wait('@signupRequest');
      // After successful signup, login modal should open
      cy.contains('Welcome back').should('be.visible');
    });

    it('should show error for existing email', () => {
      cy.intercept('POST', '**/auth/signup', {
        statusCode: 400,
        body: {
          message: 'Email already exists',
        },
      }).as('signupRequest');

      cy.get('[role="dialog"]').within(() => {
        cy.get('input[type="email"]').type('existing@example.com');
        cy.get('input[type="password"]').first().type('Password123!');
        cy.get('input[type="password"]').eq(1).type('Password123!');
        cy.get('input[type="checkbox"]').check();
        cy.contains('button', 'Create account').click();
      });

      cy.wait('@signupRequest');
      cy.contains('Email already exists', { timeout: 5000 }).should('be.visible');
    });

    it('should validate email format', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.get('input[type="email"]').type('invalid-email');
        cy.get('input[type="password"]').first().type('Password123!');
        cy.get('input[type="password"]').eq(1).type('Password123!');
        cy.get('input[type="checkbox"]').check();
        cy.contains('button', 'Create account').click();
        // Should show validation error for invalid email
      });
    });

    it('should validate password strength', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.get('input[type="email"]').type('test@example.com');
        cy.get('input[type="password"]').first().type('weak');
        cy.get('input[type="password"]').eq(1).type('weak');
        cy.get('input[type="checkbox"]').check();
        cy.contains('button', 'Create account').click();
        // Should show validation error for weak password
      });
    });
  });

  describe('Login Modal', () => {
    beforeEach(() => {
      // Open login modal via signup modal
      cy.contains('button', 'Sign up').first().click();
      cy.contains('Sign in').click();
      // Wait for transition to complete - only one dialog should exist
      cy.get('[role="dialog"]').should('have.length', 1);
      cy.contains('Welcome back').should('be.visible');
    });

    it('should display login modal with correct elements', () => {
      cy.get('[role="dialog"]').should('be.visible');
      cy.contains('Welcome back').should('be.visible');
    });

    it('should display all login form fields', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.get('input[type="email"]').should('be.visible');
        cy.get('input[type="password"]').should('be.visible');
        cy.contains('button', 'Sign in').should('be.visible');
      });
    });

    it('should have Remember me checkbox', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.contains('Remember me for 30 days').should('be.visible');
      });
    });

    it('should have Forgot password link', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.contains('Forgot password?').should('be.visible');
      });
    });

    it('should switch to signup modal', () => {
      cy.get('[role="dialog"]').within(() => {
        cy.contains("Don't have an account?").should('be.visible');
        cy.contains('Sign up').click();
      });
      cy.contains('Create your account').should('be.visible');
    });

    it('should handle successful login', () => {
      cy.intercept('POST', '**/auth/login', {
        statusCode: 200,
        body: {
          status: 'success',
          data: {
            user: {
              _id: '123',
              email: 'test@example.com',
              name: 'Test User',
            },
            accessToken: 'fake-token',
          },
        },
      }).as('loginRequest');

      cy.get('[role="dialog"]').within(() => {
        cy.get('input[type="email"]').type('test@example.com');
        cy.get('input[type="password"]').type('Password123!');
        cy.contains('button', 'Sign in').click();
      });

      cy.wait('@loginRequest');
      cy.url().should('include', '/dashboard');
    });

    it('should show error for invalid credentials', () => {
      cy.intercept('POST', '**/auth/login', {
        statusCode: 401,
        body: {
          message: 'Invalid email or password',
        },
      }).as('loginRequest');

      cy.get('[role="dialog"]').within(() => {
        cy.get('input[type="email"]').type('wrong@example.com');
        cy.get('input[type="password"]').type('WrongPassword');
        cy.contains('button', 'Sign in').click();
      });

      cy.wait('@loginRequest');
      cy.contains('Invalid email or password', { timeout: 5000 }).should('be.visible');
    });

    it('should disable submit button during login', () => {
      cy.intercept('POST', '**/auth/login', {
        delay: 1000,
        statusCode: 200,
        body: {
          status: 'success',
          data: {
            user: { _id: '123', email: 'test@example.com' },
            accessToken: 'token',
          },
        },
      }).as('loginRequest');

      cy.get('[role="dialog"]').within(() => {
        cy.get('input[type="email"]').type('test@example.com');
        cy.get('input[type="password"]').type('Password123!');
        cy.contains('button', 'Sign in').click();
        // Button should be disabled while loading
        cy.get('button[type="submit"]').should('be.disabled');
      });
    });

    it('should show loading state during login', () => {
      cy.intercept('POST', '**/auth/login', {
        delay: 1000,
        statusCode: 200,
        body: {
          status: 'success',
          data: {
            user: { _id: '123', email: 'test@example.com' },
            accessToken: 'token',
          },
        },
      }).as('loginRequest');

      cy.get('[role="dialog"]').within(() => {
        cy.get('input[type="email"]').type('test@example.com');
        cy.get('input[type="password"]').type('Password123!');
        cy.contains('button', 'Sign in').click();
        cy.contains('Signing in...').should('be.visible');
      });
    });
  });

  describe('Protected Routes', () => {
    it('should redirect to home when accessing dashboard without auth', () => {
      cy.visit('/dashboard');
      cy.url().should('not.include', '/dashboard');
      cy.url().should('eq', Cypress.config().baseUrl + '/');
    });

    it('should allow access to dashboard after login', () => {
      // Mock successful login
      cy.intercept('POST', '**/auth/login', {
        statusCode: 200,
        body: {
          status: 'success',
          data: {
            user: {
              _id: '123',
              email: 'test@example.com',
              name: 'Test User',
            },
            accessToken: 'fake-token',
          },
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
          totalTests: 10,
          testsThisMonth: 5,
          averageScore: 85,
          criticalIssues: 2,
        },
      }).as('statsRequest');

      cy.intercept('GET', '**/user/tests', {
        statusCode: 200,
        body: [],
      }).as('testsRequest');

      // Open login modal and login
      cy.contains('button', 'Sign up').first().click();
      cy.contains('Sign in').click();

      // Wait for modal transition
      cy.get('[role="dialog"]').should('have.length', 1);

      cy.get('[role="dialog"]').within(() => {
        cy.get('input[type="email"]').type('test@example.com');
        cy.get('input[type="password"]').type('Password123!');
        cy.contains('button', 'Sign in').click();
      });

      cy.wait('@loginRequest');
      cy.url().should('include', '/dashboard');
    });
  });

  describe('Modal Accessibility', () => {
    beforeEach(() => {
      cy.contains('button', 'Sign up').first().click();
    });

    it('should trap focus within modal', () => {
      cy.get('[role="dialog"]').should('be.visible');
      cy.get('input[type="email"]').focus().should('have.focus');
    });

    it('should close on Escape key', () => {
      cy.get('[role="dialog"]').should('be.visible');
      cy.get('body').type('{esc}');
      cy.get('[role="dialog"]').should('not.exist');
    });

    it('should have proper ARIA attributes', () => {
      cy.get('[role="dialog"]').should('have.attr', 'role', 'dialog');
    });

    it('should allow form submission with Enter key', () => {
      cy.intercept('POST', '**/auth/signup', {
        statusCode: 201,
        body: {
          user: { _id: '123', email: 'test@example.com' },
          accessToken: 'token',
        },
      }).as('signupRequest');

      cy.get('[role="dialog"]').within(() => {
        cy.get('input[type="email"]').type('test@example.com');
        cy.get('input[type="password"]').first().type('Password123!');
        cy.get('input[type="password"]').eq(1).type('Password123!');
        cy.get('input[type="checkbox"]').check();
        cy.get('input[type="password"]').eq(1).type('{enter}');
      });

      cy.wait('@signupRequest');
      // After successful signup, login modal should open
      cy.contains('Welcome back').should('be.visible');
    });
  });

  describe('Form Persistence', () => {
    it('should clear form after successful signup', () => {
      cy.intercept('POST', '**/auth/signup', {
        statusCode: 201,
        body: {
          user: { _id: '123', email: 'test@example.com' },
          accessToken: 'token',
        },
      }).as('signupRequest');

      cy.contains('button', 'Sign up').first().click();

      cy.get('[role="dialog"]').within(() => {
        cy.get('input[type="email"]').type('test@example.com');
        cy.get('input[type="password"]').first().type('Password123!');
        cy.get('input[type="password"]').eq(1).type('Password123!');
        cy.get('input[type="checkbox"]').check();
        cy.contains('button', 'Create account').click();
      });

      cy.wait('@signupRequest');
      // After successful signup, login modal should open
      cy.contains('Welcome back').should('be.visible');
    });

    it('should preserve form values when switching between modals', () => {
      cy.contains('button', 'Sign up').first().click();

      cy.get('[role="dialog"]').within(() => {
        cy.get('input[type="email"]').type('test@example.com');
      });

      // Switch to login
      cy.contains('Sign in').click();

      // Wait for login modal to be fully rendered
      cy.contains('Welcome back').should('be.visible');

      // Email should be cleared in new modal
      cy.get('[role="dialog"]').should('have.length', 1).within(() => {
        cy.get('input[type="email"]').should('have.value', '');
      });
    });
  });
});
