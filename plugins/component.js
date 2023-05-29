// Define a new Alpine.js plugin
export default function registerWebComponents(Alpine) {
    window.components = window.components || [];
    const ALPINE_ATTRIBUTE_PREFIX = 'x-';

    Alpine.directive('component', (el, { expression }, { effect }) => {
        if (customElements.get(expression)) return;
        // Get the component name from the `x-component` directive
        const componentName = expression;

        // Get the property names and default values from the <template> tag
        const properties = Object.assign({}, el.dataset);
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


        // Define a new WebComponent class
        class CustomElement extends HTMLElement {
            alpineWrapper = null;

            constructor() {
                super();

                // Wrap the <template> tag in a <div> tag with the `x-data` attribute
                this.alpineWrapper = document.createElement('div');
                properties.componentName = componentName;
                properties.slots = {
                    default: {}
                    // convert componentName like card-button, to function name like cardButton
                }

                if ('x-data' in alpineDirectives) {
                    // skip!
                } else {
                    // const alpineDataName = componentName.split("-").map((word, index) => {
                    //     if (index === 0) {
                    //         return word;
                    //     }
                    //     return word.charAt(0).toUpperCase() + word.slice(1);
                    // }).join("");
                    // const data = structuredClone(properties);
                    // Alpine.data(alpineDataName, _ => data)
                    this.alpineWrapper.setAttribute('x-data', JSON.stringify(properties));
                }

                Object.keys(alpineDirectives).forEach((directive) => {
                    this.alpineWrapper.setAttribute(directive, alpineDirectives[directive]);
                });
                // Define getters and setters for each property
                Object.keys(properties).forEach((propertyName) => {
                    Object.defineProperty(this, propertyName, {
                        get() {
                            return Alpine.$data(this.shadowRoot.firstChild)[propertyName]
                        },
                        set(value) {
                            this.shadowRoot && (Alpine.$data(this.shadowRoot.firstChild)[propertyName] = value);
                        },
                    });
                });
            }

            async connectedCallback() {
                window.components.push(this);
                this.attachShadow({ mode: 'open' });
                // Get the contents of the <template> tag and attach it to the shadow DOM
                const componentTemplate = await this.cloneOrFetchTemplate();
                this.alpineWrapper.appendChild(componentTemplate);
                this.shadowRoot.appendChild(this.alpineWrapper);
                this.addStylesIfPresent(componentTemplate);
                this.shareStylesWithDocument();
                Alpine.initTree(this.shadowRoot.firstChild);
                this.registerProps()
                this.registerSlots()
            }

            static get observedAttributes() {
                return Object.keys(properties);
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
                    return fetch(`${componentName}.html`)
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
                const style = document.createElement("style");
                style.textContent = `@import url(${document.styleSheets[0].href})`
                this.shadowRoot.appendChild(style);
            }

            addStylesIfPresent(componentTemplate) {
                componentTemplate.querySelectorAll("style").forEach((style) => {
                    this.shadowRoot.appendChild(style);
                })
            }

            registerProps() {
                Object.keys(properties).forEach((propertyName) => {
                    if (this.hasAttribute(propertyName)) {
                        this[propertyName] = this.getAttribute(propertyName);
                    }
                });
            }

            registerSlots() {
                this.shadowRoot.querySelectorAll("slot").forEach((slot) => {
                    slot.addEventListener("slotchange", (e) => {
                        const slotChild = slot.assignedElements().slice(0, 1).pop();
                        this.slots[slot.name || 'default'] = slotChild;
                    });
                })
            }
        }

        // Register the WebComponent with the custom element name
        customElements.define(componentName, CustomElement);
    });
}

// Register the plugin with Alpine.js
