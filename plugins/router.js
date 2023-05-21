export default function (Alpine) {
    Alpine.defaultTarget = Alpine.defaultTarget || 'main'
    let target = Alpine.defaultTarget
    const Views = Alpine.reactive({})

    /**
     * @typedef {object} Router
     * @property {object} query
     * @property {string} queryRaw
     * @property {string} path
     * @property {string} origin
     * @property {function} push
     * @property {object} params
     * @property {string} _rawPath
     * @private
     **/
    const Router = Alpine.reactive({
        query: queryParamsToObject(window.location.search),
        queryRaw: window.location.search,
        path: window.location.pathname,
        origin: window.location.origin,

        /**
         * @param {string} path
         * @param {object} query
         * @example
         * router.push('/somepath', {key: 'value'})
         * // => window.location.pathname = '/somepath'
         * // => window.location.search = '?key=value'
         * // => Alpine.router.path = '/somepath'
         * // => Alpine.router.query = {key: 'value'}
         **/
        push(path, query) {
            // remove trailing slash from path
            path = path.replace(/\/$/, '')
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
        },
        params: {},
        _rawPath: '', // <-- internal property, retains params
    })

    Alpine.router = Router;
    Alpine.views = Views;

    Alpine.directive('route', (el, { expression }, { effect }) => {
        el.getAttribute('href') || el.setAttribute('href', '')

        el.addEventListener('click', (event) => {
            target = el.getAttribute('x-target') || Alpine.defaultTarget

            if (linkIsInternal(expression)) {
                event.preventDefault()
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
                if (el.innerHTML === '') {
                    fetch(`${view}.html`)
                        .then((response) => response.text())
                        .then((html) => {
                            el.innerHTML = html
                        })
                        .then(() => {
                            document.querySelector(target).innerHTML = el.innerHTML
                        })
                } else {
                    document.querySelector(target).innerHTML = el.innerHTML
                }
            }
        })

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
        let current = Views
        keys
            .forEach((key, index) => {
                if (index === keys.length - 1) {
                    current[key] = el
                } else {
                    if (!current[key]) {
                        current[key] = {}
                    }
                    current = current[key]
                }
            })
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
