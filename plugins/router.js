export default function (Alpine) {
    Alpine.defaultTarget = Alpine.defaultTarget || 'main'
    let target = Alpine.defaultTarget
    const Views = Alpine.reactive({})

    const Router = Alpine.reactive({
        routes: [],
        lastRoute: {},
        query: {},
        queryRaw: '',
        path: '',
        origin: '',
        params: {},
        parts: [],

        push(slug) {
            // separate path from query
            const [path, query] = slug.split('?')
            const paths = paramsFromRoute(dropTrailingSlash(path))
            this.params = paths.params
            this.parts = paths.parts
            this._rawPath = dropTrailingSlash(paths.rawpath)

            const state = {
                url: dropTrailingSlash(paths.pathname),
                target,
            };
            if (query) {
                state.url += `?${query}`
            }
            history.pushState(state, '', state.url)
            this.lastRoute = state;
            this.updateRouterValues();
            return this;
        },
        updateRouterValues() {
            this.query = queryParamsToObject(window.location.search)
            this.queryRaw = window.location.search
            this.path = window.location.pathname
            this.origin = window.location.origin
        },
        _rawPath: '', // <-- internal property, retains params
    })

    window.addEventListener('popstate', (e) => {
        e.preventDefault();
        target = Alpine.defaultTarget
        renderView(Router.lastRoute.target, '');
    })

    Alpine.router = Router;
    Alpine.views = Views;

    Alpine.directive('route', (el, {expression, modifiers}, {evaluateLater, effect}) => {
        Router.routes.push(el);

        const getRoute = expression.startsWith('/') ? (fn) => fn(expression) : evaluateLater(expression);
        el.addEventListener('click', (e) => {
            getRoute((route) => {
                target = el.getAttribute('x-target') || Alpine.defaultTarget
                if (linkIsInternal(route)) {
                    e && e.preventDefault()
                    Router.push(route)
                }
            })
        })
    })

    Alpine.magic('route', (el, {Alpine}) => expression => {
        target = el.getAttribute('x-target') || Alpine.defaultTarget
        if (linkIsInternal(expression)) {
            Router.push(expression.pathname, query && getQueryParams(`?${query}`))
        }
    })

    Alpine.directive('view', (el, {expression, modifiers}, {effect}) => {
        Views[expression] = el;
        Views[expression].parts = expression.split('/').filter(part => part !== '');
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
