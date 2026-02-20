// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
// ***********************************************************

import '@testing-library/cypress/add-commands';

// Custom commands
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: 'http://localhost:4000/api/v1/auth/login',
    body: { email, password },
  }).then((response) => {
    window.localStorage.setItem('accessToken', response.body.accessToken);
  });
});

Cypress.Commands.add('logout', () => {
  window.localStorage.removeItem('accessToken');
  cy.clearCookies();
});

// Prevent uncaught exceptions from failing tests
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  // This is useful for third-party scripts or known issues
  return false;
});

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
    }
  }
}
