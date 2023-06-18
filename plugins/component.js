// Define a new Alpine.js plugin
export default function registerWebComponents(Alpine) {
    window.components = window.components || Alpine.reactive([]);
    const ALPINE_ATTRIBUTE_PREFIX = 'x-';

    Alpine.directive('component', (el, { expression }, { effect, evaluate }) => {
        if(el.tagName !== "TEMPLATE") return;
        if (customElements.get(expression)) return;
        const staticComponent = !el.hasAttribute('c-data');

        const componentName = expression.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        const data = evaluate(el.getAttribute('c-data') || '{}' );

        Alpine.data(componentName, () => {
            return {
                ...data,
                componentName,
                slots: {
                    default: {}
                }
            }
        })

        Alpine.store(componentName, {
            ...data,
            slots: {
                default: {}
            }
        })

        const alpineDirectives = el.getAttributeNames()
            .filter((attributeName) => {
                return attributeName.startsWith(ALPINE_ATTRIBUTE_PREFIX) && attributeName !== "x-component";
            })
            .map((attributeName) => {
                return {
                    [attributeName]: el.getAttribute(attributeName)
                }
            })
            .reduce((acc, curr) => {
                return { ...acc, ...curr };
            }, {});

        const properties = new Set(['slots', 'componentName'])
        Object.keys(data).forEach((propertyName) => {
            properties.add(propertyName);
        })

        // Define a new WebComponent class
        class CustomElement extends HTMLElement {
            alpineWrapper = null;

            constructor() {
                super();

                // console.log('constructor', componentName, this)
                // Wrap the <template> tag in a <div> tag with the `x-data` attribute
                this.alpineWrapper = document.createElement('div');
                // Add any Alpine directives to the wrapper
                Object.keys(alpineDirectives).forEach((directiveName) => {
                    this.alpineWrapper.setAttribute(directiveName, alpineDirectives[directiveName]);
                });
                this.alpineWrapper.setAttribute('x-data', componentName);
                this.alpineWrapper.setAttribute('id', 'alpinewrapper');
                this.attachShadow({ mode: 'open' });

                this.registerGetterSetters(this.shadowRoot);

                this.cloneOrFetchTemplate().then(componentTemplate => {
                    this.addStylesIfPresent(componentTemplate);
                    this.alpineWrapper.appendChild(componentTemplate);
                    this.shadowRoot.appendChild(this.alpineWrapper);
                    Alpine.initTree(this.shadowRoot.firstChild);
                    this.shareStylesWithDocument();
                    this.registerSlots(this.shadowRoot)
                })
                    .then(() => {
                        Alpine.nextTick(() => {
                            this.initialiseProps();
                        })
                        window.components.push(this);
                    })
            }

            connectedCallback() {

            }

            static get observedAttributes() {
                return Array.from(properties);
            }

            attributeChangedCallback(name, _oldValue, newValue) {
                this[name] = newValue;
            }

            async cloneOrFetchTemplate() {
                // check if template has non Slot element children
                let hasNonSlotChildren = false;
                for (let i = 0; i < el.content.children.length; i++) {
                    if (el.content.children[i].tagName !== "SLOT") {
                        hasNonSlotChildren = true;
                        break;
                    }
                }

                // if template has non Slot element children, clone it
                // otherwise fetch it from the public folder
                if (hasNonSlotChildren) {
                    return el.content.cloneNode(true);
                } else {
                    return fetch(`${CustomElement.componentName}.html`)
                        .then((response) => response.text())
                        .then((html) => {
                            el.innerHTML = `${html}${el.innerHTML}`;
                        })
                        .then(() => {
                            return el.content.cloneNode(true);
                        });
                }
            }

            shareStylesWithDocument() {
                // iterate over document stylesheets and import them into the shadow dom
                for(const styleSheet of document.styleSheets) {
                    if (styleSheet.href) {
                        const style = document.createElement("style");
                        style.textContent = `@import url(${styleSheet.href})`
                        this.shadowRoot.appendChild(style);
                    }
                }
            }

            addStylesIfPresent(componentTemplate) {
                componentTemplate.querySelectorAll("style").forEach((style) => {
                    this.shadowRoot.appendChild(style);
                })
            }

            registerGetterSetters(shadow) {
                properties.forEach((propertyName) => {
                    Object.defineProperty(this, propertyName, {
                        get() {
                            return shadow.firstChild && Alpine.$data(shadow.firstChild)[propertyName]
                        },
                        set(value) {
                            shadow.firstChild && (Alpine.$data(shadow.firstChild)[propertyName] = value)
                        },
                    });
                });
            }

            initialiseProps() {
                properties.forEach((propertyName) => {
                    if (this.hasAttribute(propertyName)) {
                        this[propertyName] = this.getAttribute(propertyName);
                    }
                });
            }

            registerSlots(shadow) {
                const self = this;
                shadow.addEventListener("slotchange", (e) => {
                    const slotChild = e.target.assignedElements().slice(0, 1).pop();
                    self.slots[e.target.name || 'default'] = slotChild;
                });
            }

            static get componentName(){
                return expression;
            }
        }

        // Register the WebComponent with the custom element name
        customElements.define(CustomElement.componentName, CustomElement);
    });
}
