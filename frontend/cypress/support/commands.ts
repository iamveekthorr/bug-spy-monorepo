// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
// ***********************************************

// Example custom command
Cypress.Commands.add('getBySel', (selector: string) => {
  return cy.get(`[data-cy="${selector}"]`);
});

Cypress.Commands.add('getBySelLike', (selector: string) => {
  return cy.get(`[data-cy*="${selector}"]`);
});

declare global {
  namespace Cypress {
    interface Chainable {
      getBySel(selector: string): Chainable<JQuery<HTMLElement>>;
      getBySelLike(selector: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

export {};
