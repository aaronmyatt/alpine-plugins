const ROOT_PATH = 'http://localhost:5173';
const BASE_PATH = ROOT_PATH+'/components';
const COMPONENT_DATA_ATTR = 'c-data';

describe('components global', () => {
    beforeEach(() => {
        cy.visit('http://localhost:5173/somepath/example?key=123')
    })
})

describe('x-route', () => {
    beforeEach(() => {
        // visit BASE_PATH and wait for fetch to /router.html to complete
        cy.intercept('/components.html').as('getView')
        cy.visit(BASE_PATH)
        cy.wait('@getView')
    })

    describe('templates', () => {
            it('with x-component directive become web components', () => {
                const componentName = 'basic-component'
                cy.get(`template[x-component="${componentName}"]`).should('exist')
                cy.get(componentName).should('exist')
                cy.window().then((win) => {
                    expect(win.customElements.get(componentName)).to.be.ok
                })
            })

                it('any other elements with the directive are ignored', () => {
                    const componentName = 'not-basic-component'
                    cy.get(`div[x-component="${componentName}"]`).should('exist')
                    cy.get(componentName).should('not.exist')
                    cy.window().then((win) => {
                        expect(win.customElements.get(componentName)).to.be.undefined
                    })
                })
    })

    describe(COMPONENT_DATA_ATTR, () => {
        it('becomes the components x-data', () => {
            const componentName = 'data-component'
            cy.get(componentName).should('exist')
            // should have attr x-data="{ foo: 'bar' }"
            cy.get(`[x-component="${componentName}"]`).invoke('attr', COMPONENT_DATA_ATTR).should('eq', '{foo: \'bar\'}')
            // should have text "bar"
            cy.get(componentName).shadow().find('[x-data]').then(el => {
                cy.window().then(win => {
                    expect(win.Alpine.$data(el[0]).foo).to.eq('bar')
                })
            })
        })

        it('values accessible in Custom Element shadow dom', () => {
            const componentName = 'data-component'
            cy.get(componentName).should('exist')
            // should have attr x-data="{ foo: 'bar' }"
            cy.get(`[x-component="${componentName}"]`).invoke('attr', COMPONENT_DATA_ATTR).should('eq', '{foo: \'bar\'}')
            // should have text "bar"
            cy.get(componentName).shadow().should('include.text', 'bar')
        })

        it('values accessible on (querySelected) element', () => {
            const componentName = 'data-component'
            cy.get(componentName).should('exist')
            // should have attr x-data="{ foo: 'bar' }"
            cy.get(`[x-component="${componentName}"]`).invoke('attr', COMPONENT_DATA_ATTR).should('eq', '{foo: \'bar\'}')
            // should have text "bar"
            cy.get(componentName).invoke('prop', 'foo').should('eq', 'bar')
        })
    })

    describe('custom element attributes', () => {
        it(`that match ${COMPONENT_DATA_ATTR} keys update x-data`, () => {
            const componentName = 'attr-component'
            cy.get(componentName).should('exist')
            // should have attr x-data="{ foo: 'bar' }"
            cy.get(`[x-component="${componentName}"]`).invoke('attr', COMPONENT_DATA_ATTR).should('eq', '{foo: \'bar\'}')
            // should have an attribute foo="foobar"
            cy.get(componentName).invoke('attr', 'foo').should('eq', 'foobar')
            cy.get(componentName).invoke('prop', 'foo').should('eq', 'foobar')
        })

        it(`reactively update the component dom`, () => {
            const componentName = 'attr-component'
            cy.get(componentName).should('exist')
            // should have attr x-data="{ foo: 'bar' }"
            cy.get(`[x-component="${componentName}"]`).invoke('attr', COMPONENT_DATA_ATTR).should('eq', '{foo: \'bar\'}')
            // should update the attribute "foo" to "somethingnew"
            cy.get(componentName).invoke('attr', 'foo', 'somethingnew')
            cy.get(componentName).invoke('prop', 'foo').should('eq', 'somethingnew')
            // shadow dom should have text "somethingnew"
            cy.get(componentName).shadow().should('include.text', 'somethingnew')
        })
    })

    describe('slots', () => {
        let componentName = 'slot-component'

        it(`work as expected`, () => {
            cy.get(componentName).should('exist')
            cy.get(componentName).should('include.text', 'This is <slot> content')
            cy.get(componentName).shadow().should('include.text', 'Not slot content')
        })

        it(`can be referenced within the component`, () => {
            cy.get(componentName).should('exist')
            cy.get(componentName).shadow().should('include.text', 'Not slot content')
            cy.get(componentName).shadow().should('include.text', 'This named slot is called: namedslot')
        })

        it(`can be unique per component instance`, () => {
            cy.visit(BASE_PATH+'?test=1')
            cy.get('main').find(componentName).should('have.length', 2)
            componentName = '[data-test="alt-slot-component"]'
            cy.get(componentName).should("exist")
            cy.get(componentName).shadow().should('include.text', 'Not slot content')
            cy.get(componentName).should('include.text', 'but different')
        })
    })

    // describe subcomponents
    describe('subcomponents', () => {
      it('within a parent component work normally', () => {
        const componentName = 'parent-component'
        cy.get(componentName).should('exist')
        cy.get(componentName).shadow().find('child-component').should('exist')
        cy.get(componentName).shadow().find('sub-component').should('exist')
        cy.get(componentName).shadow().find('#inside-child-component').should('exist')
        cy.get(componentName).shadow().find('#inside-sub-component').should('exist')
      })
    })
})

        describe('remote templates', () => {
            it.skip('with x-component directive become web components', () => {
                const componentName = 'basic-component'
                cy.get(`template[x-component="${componentName}"]`).should('exist')
                cy.get(componentName).should('exist')
                cy.window().then((win) => {
                    expect(win.customElements.get(componentName)).to.be.ok
                })
            })
        })



        // it('x-data values are also accessible on the custom element instance', () => {
        //     const componentName = 'data-component'
        //     cy.get(componentName).should('exist')
        //     cy.get(componentName).invoke('prop', 'foo').should('eq', 'bar')
        // })
