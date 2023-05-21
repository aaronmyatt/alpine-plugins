// Define a new Alpine.js plugin
export default function registerWebComponents(Alpine) {
    // Define the prefix for property attributes
    const PROPERTY_ATTRIBUTE_PREFIX = 'data-';
    const ALPINE_ATTRIBUTE_PREFIX = 'x-';
    // Find all <template> tags with the `x-component` directive
    document.querySelectorAll('template[x-component]').forEach((template) => {
        // Get the component name from the `x-component` directive
        const componentName = template.getAttribute('x-component');

        // Get the property names and default values from the <template> tag
        const properties = {};
        const alpineDirectives = {};
        Array.from(template.attributes).forEach((attribute) => {
            if (attribute.name.startsWith(PROPERTY_ATTRIBUTE_PREFIX)) {
                const propertyName = attribute.name.replace(
                    PROPERTY_ATTRIBUTE_PREFIX,
                    ''
                );
                properties[propertyName] = attribute.value;
            }

            if (attribute.name.startsWith(ALPINE_ATTRIBUTE_PREFIX)) {
                alpineDirectives[attribute.name] = attribute.value;
            }
        });

        // Define a new WebComponent class
        class CustomElement extends HTMLElement {
            alpineWrapper = null;

            constructor() {
                super();

                // Wrap the <template> tag in a <div> tag with the `x-data` attribute
                this.alpineWrapper = document.createElement('div');
                properties.componentName = componentName;
                this.alpineWrapper.setAttribute(
                    'x-data',
                    JSON.stringify(properties)
                );
                Object.keys(alpineDirectives).forEach((directive) => {
                    this.alpineWrapper.setAttribute(directive, alpineDirectives[directive]);
                });
                
                // Define getters and setters for each property
                Object.keys(properties).forEach((propertyName) => {
                    this.setAttribute(propertyName, properties[propertyName]);

                    Object.defineProperty(this, propertyName, {
                        get() {
                            return this.shadowRoot.firstChild._x_dataStack[0][propertyName]
                        },
                        set(value) {
                            this.shadowRoot.firstChild._x_dataStack[0][propertyName] = value;
                        },
                    });
                });
            }

            async connectedCallback() {
                const componentTemplate = await this.cloneOrFetchTemplate();
                // Get the contents of the <template> tag and attach it to the shadow DOM
                this.alpineWrapper.appendChild(componentTemplate);
                
                this.attachShadow({ mode: 'open' });
                this.shadowRoot.appendChild(this.alpineWrapper);
                Alpine.initTree(this.shadowRoot.firstChild);

                let slots = this.shadowRoot.querySelectorAll("slot").forEach((slot) => {
                    slot.addEventListener("slotchange", (e) => {
                        // console.log(slot.assignedElements());
                    });
                })
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
                for (let i = 0; i < template.content.children.length; i++) {
                    if (template.content.children[i].tagName !== "SLOT") {
                        hasNonSlotChildren = true;
                        break;
                    }
                }

                // if template has non Slot element children, clone it
                // otherwise fetch it from the public folder
                if (hasNonSlotChildren) {
                    return template.content.cloneNode(true);
                }else {
                    return fetch(`${componentName}.html`)
                        .then((response) => response.text())
                        .then((html) => {
                            template.innerHTML = `${html}${template.innerHTML}`;
                        })
                        .then(() => {
                            return template.content.cloneNode(true);
                        });
                }



                
                
                

            }
        }

        // Register the WebComponent with the custom element name
        customElements.define(componentName, CustomElement);
    });
}

// Register the plugin with Alpine.js