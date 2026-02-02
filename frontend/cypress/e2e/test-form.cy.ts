describe('Test Form Functionality', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('Form Validation', () => {
    it('should show validation error for invalid URL', () => {
      cy.get('input[name="url_input"]').type('invalid-url');
      cy.get('button[type="submit"]').click();
      cy.get('input[name="url_input"]').parent().should('have.attr', 'data-invalid', 'true');
    });

    it('should accept valid URLs with protocol', () => {
      cy.get('input[name="url_input"]').type('https://example.com');
      cy.get('button[type="submit"]').click();
      cy.get('[role="dialog"]').should('be.visible');
    });

    it('should accept valid URLs without protocol', () => {
      cy.get('input[name="url_input"]').type('example.com');
      cy.get('button[type="submit"]').click();
      cy.get('[role="dialog"]').should('be.visible');
    });

    it('should accept URLs with subdomains', () => {
      cy.get('input[name="url_input"]').type('www.example.com');
      cy.get('button[type="submit"]').click();
      cy.get('[role="dialog"]').should('be.visible');
    });

    it('should accept URLs with paths', () => {
      cy.get('input[name="url_input"]').type('example.com/path/to/page');
      cy.get('button[type="submit"]').click();
      cy.get('[role="dialog"]').should('be.visible');
    });
  });

  describe('Form Submission and Loading State', () => {
    it('should disable submit button during test execution', () => {
      cy.get('input[name="url_input"]').type('example.com');
      cy.get('button[type="submit"]').click();
      cy.get('button[type="submit"]').should('be.disabled');
      cy.get('button[type="submit"]').should('contain', 'Testing...');
    });

    it('should open modal on form submission', () => {
      cy.get('input[name="url_input"]').type('example.com');
      cy.get('button[type="submit"]').click();
      cy.get('[role="dialog"]').should('be.visible');
    });

    it('should show loading state in modal', () => {
      cy.get('input[name="url_input"]').type('example.com');
      cy.get('button[type="submit"]').click();
      cy.get('[role="dialog"]').should('be.visible');
      cy.contains('Performing BugSpy Magic...').should('be.visible');
    });

    it('should display security message during test', () => {
      cy.get('input[name="url_input"]').type('example.com');
      cy.get('button[type="submit"]').click();
      cy.contains('SECURE DATA PROCESSING').should('be.visible');
    });

    it('should show warning about not closing the page', () => {
      cy.get('input[name="url_input"]').type('example.com');
      cy.get('button[type="submit"]').click();
      cy.contains('Do not refresh, close or click back button').should('be.visible');
    });
  });

  describe('Dropdown Selections', () => {
    it('should open and select test type', () => {
      cy.get('#testType').click();
      cy.contains('Performance Test').should('be.visible');
      cy.contains('Security Test').should('be.visible');
      cy.contains('SEO Test').should('be.visible');
      cy.contains('Performance Test').click();
    });

    it('should open and select device type', () => {
      cy.get('#deviceType').click();
      cy.contains('Desktop').should('be.visible');
      cy.contains('Tablet').should('be.visible');
      cy.contains('Mobile').should('be.visible');
      cy.contains('Mobile').click();
    });

    it('should submit form with selected options', () => {
      cy.get('input[name="url_input"]').type('example.com');
      cy.get('#testType').click();
      cy.contains('Performance Test').click();
      cy.get('#deviceType').click();
      cy.contains('Mobile').click();
      cy.get('button[type="submit"]').click();
      cy.get('[role="dialog"]').should('be.visible');
    });
  });

  describe('Form Reset and Multiple Submissions', () => {
    it('should allow form resubmission after closing modal', () => {
      // First submission
      cy.get('input[name="url_input"]').type('example.com');
      cy.get('button[type="submit"]').click();
      cy.get('[role="dialog"]').should('be.visible');

      // Close modal (wait for it to be interactable)
      cy.wait(500);
      cy.get('body').type('{esc}');
      cy.get('[role="dialog"]').should('not.exist');

      // Second submission
      cy.get('input[name="url_input"]').clear().type('another-site.com');
      cy.get('button[type="submit"]').should('not.be.disabled');
      cy.get('button[type="submit"]').click();
      cy.get('[role="dialog"]').should('be.visible');
    });

    it('should preserve form values when modal is closed', () => {
      cy.get('input[name="url_input"]').type('example.com');
      cy.get('#testType').click();
      cy.contains('Performance Test').click();

      // Open and close modal
      cy.get('button[type="submit"]').click();
      cy.wait(500);
      cy.get('body').type('{esc}');

      // Check values are preserved
      cy.get('input[name="url_input"]').should('have.value', 'example.com');
    });
  });

  describe('Input Field Styling', () => {
    it('should highlight invalid fields with red border', () => {
      cy.get('input[name="url_input"]').type('invalid');
      cy.get('button[type="submit"]').click();
      cy.get('input[name="url_input"]').should('have.class', 'border-red-300');
    });

    it('should show focus styles on input', () => {
      cy.get('input[name="url_input"]').focus();
      cy.get('input[name="url_input"]').should('have.class', 'focus:border-blue-500');
    });

    it('should show hover styles on button', () => {
      cy.get('button[type="submit"]').trigger('mouseover');
      cy.get('button[type="submit"]').should('have.class', 'hover:bg-blue-700');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form inputs', () => {
      cy.get('input[name="url_input"]').should('have.attr', 'placeholder', 'https://example.com');
    });

    it('should allow keyboard navigation', () => {
      cy.get('input[name="url_input"]').focus().should('have.focus');
      cy.focused().tab();
      cy.get('#testType').should('have.focus');
    });

    it('should be submittable via Enter key', () => {
      cy.get('input[name="url_input"]').type('example.com{enter}');
      cy.get('[role="dialog"]').should('be.visible');
    });
  });
});
