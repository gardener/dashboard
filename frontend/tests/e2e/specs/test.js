// https://docs.cypress.io/api/introduction/api.html

describe('My First Test', () => {
  it('Visits the app root url', () => {
    cy.visit('/')
    cy.contains('h1', 'Gardener')
    cy.contains('h2', 'The Kubernetes Botanist')
    cy.get('img.logo').should('have.length', 1)
    cy.get('.loginContainer').should('exist')

    // .click('.loginButton', assertClickStatus)
    // .waitForElementVisible('input[type=password]', 5 * 1000)
    // .setValue('input[type=text]', 'nightwatch@example.org')
    // .setValue('input[type=password]', 'secret')
    // .click('button[type=submit]', assertClickStatus)
    // .waitForElementVisible('main h3', 5 * 1000)
    // .assert.containsText('main h3', 'Let\'s get started')
    // .assert.elementPresent('nav a[href="/account"]')
    // .click('nav a[href="/account"]', assertClickStatus)
    // .waitForElementVisible('i.mdi-account', 5 * 1000)
    // .assert.containsText('.flex.xs5.offset-xs1 > p', 'nightwatch@example.org')
  })
})
