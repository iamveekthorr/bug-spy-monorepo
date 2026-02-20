describe('Homepage', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('Layout and UI Elements', () => {
    it('should display the main heading', () => {
      cy.contains('Automated Website').should('be.visible');
      cy.contains('Testing').should('be.visible');
      cy.contains('Faster.').should('be.visible');
      cy.contains('Smarter. Better.').should('be.visible');
    });

    it('should display the hero section with correct elements', () => {
      cy.contains('Run a Free Website Test Instantly').should('be.visible');
      cy.contains('Enter any website URL').should('be.visible');
    });

    it('should display the test form with all inputs', () => {
      cy.get('input[name="url_input"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible').and('contain', 'Start Test');
    });

    it('should display dropdown selects for test type and device', () => {
      // Test Type dropdown
      cy.get('#testType').should('exist');
      cy.contains('Quick Free Test').should('be.visible');

      // Device Type dropdown
      cy.get('#deviceType').should('exist');
      cy.contains('Desktop').should('be.visible');
    });

    it('should have consistent form element heights', () => {
      // Check that all form elements have the same height (48px)
      cy.get('input[name="url_input"]').invoke('outerHeight').should('equal', 48);
      cy.get('button[type="submit"]').invoke('outerHeight').should('equal', 48);
      cy.get('#testType').invoke('outerHeight').should('equal', 48);
      cy.get('#deviceType').invoke('outerHeight').should('equal', 48);
    });

    it('should display What is BugSpy section', () => {
      cy.contains('What is BugSpy?').should('be.visible');
      cy.contains('web-based platform that automates website testing').should('be.visible');
    });

    it('should display platform cards', () => {
      cy.contains('Easy Automated Testing:').should('be.visible');
      cy.contains('Actionable Insights:').should('be.visible');
      cy.contains('Scalable for Teams:').should('be.visible');
    });

    it('should display features overview section', () => {
      cy.contains('features overview').should('be.visible');
      cy.contains('Error Categorization').should('be.visible');
      cy.contains('Full-page Screenshots').should('be.visible');
      cy.contains('Exportable Reports').should('be.visible');
      cy.contains('Scheduled tests & history').should('be.visible');
    });

    it('should display how it works section', () => {
      cy.contains('how bugspy works').should('be.visible');
      cy.contains('Enter a website URL').should('be.visible');
      cy.contains('Run automated tests').should('be.visible');
      cy.contains('Review detailed results').should('be.visible');
      cy.contains('Export and share reports').should('be.visible');
    });

    it('should display signup CTA section', () => {
      cy.contains('Sign up to unlock full details').should('be.visible');
      cy.contains('Sign up').should('be.visible');
    });
  });

  describe('Navigation', () => {
    it('should have a functioning header with logo', () => {
      cy.get('header').should('be.visible');
    });

    it('should open signup modal when clicking Sign up button', () => {
      cy.contains('button', 'Sign up').first().click();
      cy.get('[role="dialog"]', { timeout: 10000 }).should('be.visible');
      cy.contains('Create your BugSpy account').should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    const viewports = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1280, height: 720, name: 'Desktop' },
    ];

    viewports.forEach((viewport) => {
      it(`should be responsive on ${viewport.name}`, () => {
        cy.viewport(viewport.width, viewport.height);
        cy.get('input[name="url_input"]').should('be.visible');
        cy.get('button[type="submit"]').should('be.visible');
        cy.contains('Automated Website').should('be.visible');
      });
    });
  });

  describe('Typography and Fonts', () => {
    it('should use Inter font family', () => {
      cy.get('body').should('have.css', 'font-family').and('include', 'Inter');
    });

    it('should apply Inter font to form inputs', () => {
      cy.get('input[name="url_input"]').should('have.css', 'font-family').and('include', 'Inter');
    });

    it('should apply Inter font to buttons', () => {
      cy.get('button[type="submit"]').should('have.css', 'font-family').and('include', 'Inter');
    });
  });
});
