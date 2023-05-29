export default function (Alpine) {
    Alpine.defaultTarget = Alpine.defaultTarget || 'main'
    let target = Alpine.defaultTarget
    const Views = Alpine.reactive({})

    const Router = Alpine.reactive({
        routes: [],
        query: queryParamsToObject(window.location.search),
        queryRaw: window.location.search,
        path: window.location.pathname,
        origin: window.location.origin,

        push(path, query) {
            // remove trailing slash from path unless it's just a slash
            path = path === '/' ? path : path.replace(/\/$/, '')
            if (query) {
                const queryString = objectToQueryString(query)
                window.history.pushState({}, '', `${path}${queryString}`)
            } else {
                window.history.pushState({}, '', path)
            }
            this.query = queryParamsToObject(window.location.search)
            this.queryRaw = window.location.search
            this.path = window.location.pathname
            this.origin = window.location.origin
            return this;
        },
        params: {},
        _rawPath: '', // <-- internal property, retains params
    })

    Alpine.router = Router;
    Alpine.views = Views;

    Alpine.directive('route', (el, { expression }, { evaluateLater, effect }) => {
        Router.routes.push(el);

        const getRoute = expression.startsWith('/') ? (fn) => fn(expression) : evaluateLater(expression);
        effect(() => {
            getRoute((route) => {
                el.addEventListener('click', (event) => {

                    target = el.getAttribute('x-target') || Alpine.defaultTarget
                    if (linkIsInternal(route)) {
                        event && event.preventDefault()
                        Router._rawPath = route
                        // separate path from query
                        const [path, query] = route.split('?')
                        const realPath = path
                            .split('/')
                            .filter((key) => key !== '')
                            .reduce((pathToBe, pathPart) => {
                                // extract key from key if key is "key:value"
                                if (pathPart.includes(':')) {
                                    const [paramKey, paramValue] = pathPart.split(':')
                                    Router.params[paramKey] = paramValue
                                    return pathToBe + paramValue + '/'
                                } else {
                                    return pathToBe + pathPart + '/'
                                }
                            }, '/')
                        Router.push(realPath, query && getQueryParams(`?${query}`))
                    }
                })
            })
        })

    })

    Alpine.magic('route', (el, {Alpine}) => expression => {
        target = el.getAttribute('x-target') || Alpine.defaultTarget
            if (linkIsInternal(expression)) {
                Router._rawPath = expression
                // separate path from query
                const [path, query] = expression.split('?')
                const realPath = path
                    .split('/')
                    .filter((key) => key !== '')
                    .reduce((pathToBe, pathPart) => {
                        // extract key from key if key is "key:value"
                        if (pathPart.includes(':')) {
                            const [paramKey, paramValue] = pathPart.split(':')
                            Router.params[paramKey] = paramValue
                            return pathToBe + paramValue + '/'
                        } else {
                            return pathToBe + pathPart + '/'
                        }
                    }, '/')
                Router.push(realPath, query && getQueryParams(`?${query}`))
            }
    })

    Alpine.directive('view', (el, { expression }, { effect }) => {

        effect(() => {
            if (el.hasAttribute('x-target'))
                target = el.getAttribute('x-target')

            let view = Router._rawPath
                .split('/')
                .filter((key) => key !== '')
                .reduce((pathToBe, pathPart, index, array) => {
                    // extract key from key if key is "key:value"
                    if (pathPart.includes(':')) {
                        const [paramKey, _] = pathPart.split(':')
                        pathPart = paramKey
                    }
                    if (index === array.length - 1) {
                        return pathToBe + pathPart
                    }
                    return pathToBe + pathPart + '/'
                }, '/')

            if (view === expression) {
                // if element innerHTML empty, fetch template from public folder
                if (el.innerHTML.trim() === '') {
                    fetch(`${expression}.html`)
                        .then((response) => response.text())
                        .then((html) => {
                            el.innerHTML = html
                        })
                        .then(() => {
                            renderView(target, el.innerHTML);
                        })
                } else {
                    renderView(target, el.innerHTML);
                }
            }
        })

        function renderView(target, html){
            const notInTheShadowDom = document.querySelector(target)
            if(notInTheShadowDom){
                notInTheShadowDom.innerHTML = html;
                Alpine.initTree(notInTheShadowDom);
            }
            else
                window.components && window.components.map(component => {
                    const el = component.shadowRoot.querySelector(target)
                    if(el){
                        component.shadowRoot.querySelector(target).innerHTML = html
                        Alpine.initTree(el);
                    }
                })
        }

        // split route into object keys
        // if route is /foo/bar/baz
        // then we want to create an object like this:
        // {
        //   foo: {
        //     bar: {
        //       baz: el
        //     }
        //   }
        // }
        const keys = expression.split('/')
            .filter((key) => key !== '')
        Views[expression] = el;
    })

    // ensure all views have been parsed then trigger initial view
    Router._rawPath = window.location.pathname
}

function objectToQueryString(obj) {
    const params = new URLSearchParams(obj)
    return `?${params.toString()}`
}

function queryParamsToObject(query) {
    const params = new URLSearchParams(query)
    const obj = {}
    for (const [key, value] of params) {
        obj[key] = value
    }
    return obj
}

function linkIsInternal(path) {
    return !path.includes(window.location.origin)
}

function getQueryParams(search) {
    if (search) {
        return queryParamsToObject(search)
    }
    return null
}
