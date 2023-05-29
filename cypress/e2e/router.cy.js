const BASE_PATH = 'http://localhost:5173/router';

describe('router global', () => {
    beforeEach(() => {
        cy.visit('http://localhost:5173/somepath/example?key=123')
    })

    it('adds router to Alpine global', () => {
        cy.window().then((win) => {
            expect(win.Alpine).to.have.property('router')
        })
    })

    it('contains query parameter object', () => {
        cy.window().then((win) => {
            expect(win.Alpine.router).to.have.property('query')
            expect(win.Alpine.router.query).to.eql({ key: '123' })
        })
    })

    it('updates query parameters on route change', () => {
        cy.visit('http://localhost:5173?key=change').then(() => {
            cy.window().then((win) => {
                expect(win.Alpine.router).to.have.property('query')
                expect(win.Alpine.router.query).to.eql({ key: 'change' })
            })
        })
    })

    it('contains path reference', () => {
        cy.window().then((win) => {
            expect(win.Alpine.router).to.have.property('path')
            expect(win.Alpine.router.path).to.eql('/somepath/example')
        })
    })

    it('contains origin reference', () => {
        cy.window().then((win) => {
            expect(win.Alpine.router).to.have.property('origin')
            expect(win.Alpine.router.origin).to.eql('http://localhost:5173')
        })
    })

    describe('push', () => {
        beforeEach(() => {
            cy.visit('http://localhost:5173/somepath/example?key=123')
        })

        it('updates path', () => {
            cy.window().then((win) => {
                win.Alpine.router.push('/newpath')
                expect(win.location.pathname).to.eql('/newpath', 'window.location.pathname')
                expect(win.Alpine.router.path).to.eql('/newpath', 'Alpine.router.path')
            })
        })

        it('updates query', () => {
            cy.window().then((win) => {
                win.Alpine.router.push('/newpath', { key: 'new' })
                expect(win.Alpine.router.query).to.eql({ key: 'new' })
            })
        })

        it('updates query string', () => {
            cy.window().then((win) => {
                win.Alpine.router.push('/newpath', { key: 'new' })
                expect(win.Alpine.router.queryRaw).to.eql('?key=new')
            })
        })

        it('updates path and query', () => {
            cy.window().then((win) => {
                win.Alpine.router.push('/newpath', { key: 'new' })
                expect(win.Alpine.router.path).to.eql('/newpath')
                expect(win.Alpine.router.query).to.eql({ key: 'new' })
            })
        })

        it('retains correct origin', () => {
            cy.window().then((win) => {
                win.Alpine.router.push('/newpath', { key: 'new' })
                expect(win.Alpine.router.origin).to.eql('http://localhost:5173')
            })
        })
    })
})

describe('x-route', () => {
    beforeEach(() => {
        cy.visit(BASE_PATH)
    })

    describe('ignores absolute urls', () => {
        it('does not change path', () => {
            cy.get('a[data-test="basic-absolute-route"]').click()
            cy.window().then((win) => {
                expect(win.location.pathname).to.eql('/', 'window.location.pathname')
                expect(win.Alpine.router.path).to.eql('/', 'Alpine.router.path')
            })
        })
    })
})

describe('x-route & x-view', () => {
    beforeEach(() => {
        // visit BASE_PATH and wait for fetch to /router.html to complete
        cy.intercept('/router.html').as('getView')
        cy.visit(BASE_PATH)
        cy.wait('@getView')
    })

    it('populates Alpine.views array with template refs', () => {
        cy.window().then((win) => {
            expect(win.Alpine.views).have.property('/router/view');
        })
    })

    it('renders view on route change', () => {
        cy.get('[data-test="test-view"]').should('not.exist')
        cy.get('router-examples[index="1"]').shadow().find('a').click()
        cy.get('[data-test="test-view"]').should('exist')
    })

    it('renders correct template for parameterised route', () => {
        cy.get('[data-test="test-view-params"]').should('not.exist')
        cy.get('router-examples[index="2"]').shadow().find('a').click()
        cy.get('[data-test="test-view-params"]').should('exist')
        cy.window().then((win) => {
            expect(win.Alpine.router.params).to.have.keys('name')
        })
    })

    it('leaves param value in path only', () => {
        cy.get('router-examples[index="2"]').shadow().find('a').click()
        cy.window().then((win) => {
            expect(win.location.pathname).to.eql('/router/view/aaron', 'window.location.pathname')
            expect(win.Alpine.router.path).to.eql('/router/view/aaron', 'Alpine.router.path')
        })
    })

    it('renders correct template for middle parameterised route', () => {
        cy.get('[data-test="test-view-params-middle"]').should('not.exist')
        cy.get('router-examples[index="3"]').shadow().find('a').click()
        cy.get('[data-test="test-view-params-middle"]').should('exist')
        cy.window().then((win) => {
            expect(win.Alpine.router.params).to.have.keys('product')
        })
    })

    it('renders correct template for middle and end parameterised route', () => {
        cy.get('[data-test="test-view-params-middle-end"]').should('not.exist')
        cy.get('router-examples[index="4"]').shadow().find('a').click()
        cy.get('[data-test="test-view-params-middle-end"]').should('exist')
        cy.window().then((win) => {
            expect(win.Alpine.router.params).to.have.keys('product', 'category')
        })
    })
})


describe('x-target', () => {
    beforeEach(() => {
        cy.visit(BASE_PATH)
    })

    it('loads /view into #app', () => {
        cy.get('[data-test="test-view"]').should('not.exist')
        cy.get('router-examples[index="5"]').shadow().find('a').click()
        cy.get('[data-test="test-view"]').should('exist')
        cy.get('#app').should('be.not.empty')
    })
})


describe('fetches html remotely if template is empty', () => {
    beforeEach(() => {
        cy.visit(BASE_PATH)
    })

    it('loads remote.html', () => {
        cy.get('[data-test="remote-template"]').should('not.exist')
        cy.get('router-examples[index="6"]').shadow().find('a').click()
        cy.get('[data-test="remote-template"]').should('exist')
    })
})
