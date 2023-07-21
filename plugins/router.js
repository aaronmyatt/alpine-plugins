export default function (Alpine) {
    const VIEWS = Alpine.views = {}
    const ROUTER = Alpine.router = Alpine.reactive({
        // preferences
        defaultTarget: '',
        baseUrl: '',
        // state
        target: '',
        routes: [],
        parts: [],
        lastRoute: {},
        query: {},
        params: {},
        queryRaw: '',
        path: '',
        origin: '',
        _rawPath: '', // <-- internal property, retains params so we can match views

        push(slug) {
            slug = respectBaseUrl(slug)
            // separate path from query
            const [path, query] = dropTrailingSlash(slug).split('?')
            const paths = paramsFromRoute(dropTrailingSlash(path))
            this.params = paths.params
            this.parts = paths.parts
            this._rawPath = normalisePath(paths.rawpath)
            const state = {
                url: dropTrailingSlash(paths.pathname),
                target: this.target,
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
    })
    setRouterDefaults(Alpine, ROUTER)
    registerDirectives(Alpine, ROUTER, VIEWS)
    reactToPathChanges(Alpine, ROUTER, VIEWS)
    appendCurrentView(Alpine, ROUTER, VIEWS)
    listenToPopStateForBackNavigation(Alpine, ROUTER)
    registerMagicProperties(Alpine, ROUTER, VIEWS)
}

function setRouterDefaults(Alpine, ROUTER) {
    ROUTER.defaultTarget = Alpine.defaultTarget = Alpine.defaultTarget || 'main'
    ROUTER.baseUrl = Alpine.baseUrl = (dropTrailingSlash(Alpine.baseUrl) || '/')
    ROUTER.target = Alpine.defaultTarget
    ROUTER.updateRouterValues();
}
function registerDirectives(Alpine, ROUTER, VIEWS) {
    Alpine.directive('view', (el, {expression}) => {
        VIEWS[expression] = el;
        VIEWS[expression].parts = expression.split('/').filter(part => part !== '');
    })

    Alpine.directive('route', (el, {expression}, {evaluateLater}) => {
        const getRoute = expression.startsWith('/') ? (fn) => fn(expression) : evaluateLater(expression);
        el.addEventListener('click', (e) => {
            getRoute((route) => {
                ROUTER.target = el.getAttribute('x-target') || Alpine.defaultTarget
                if (linkIsInternal(route)) {
                    e && e.preventDefault()
                    ROUTER.push(normalisePath(route))
                }
            })
        })
    })
}
function reactToPathChanges(Alpine, ROUTER, VIEWS) {
    Alpine.effect(() => {
        const templateEl = VIEWS[ROUTER._rawPath] // we react to this
        if(templateEl){
            if (templateEl.hasAttribute('x-target'))
                ROUTER.target = templateEl.getAttribute('x-target')
            renderLocalOrRemoteView(templateEl, ROUTER.target)
        } else {
            const parts = ROUTER._rawPath.split('/').filter(part => part !== '')
            const likelyTheRightView = VIEWS && Object.entries(VIEWS).find((view) => {
                return view[1].parts.length === parts.length
            })
            if(likelyTheRightView){
                const rawpath =  likelyTheRightView[1]
                    .parts
                    .reduce((rawpath, part, index) => {
                        if(part === parts[index])
                            return rawpath + part + '/'
                        return rawpath + part + ':' + parts[index] + '/'
                    }, '/')
                Alpine.nextTick(() => ROUTER.push(dropTrailingSlash(rawpath)+window.location.search))
            }
        }
    })
}
function appendCurrentView(Alpine, ROUTER, VIEWS) {
    document.addEventListener('alpine:initialized', () => {
        // does ROUTER.path exactly match a view?
        let view = VIEWS[ROUTER.path]
        view || (view = Object.values(VIEWS).find(view => ROUTER.path.startsWith('/'+view.parts[0])))
        if(view) {
            renderLocalOrRemoteView(view, ROUTER.defaultTarget)
                .then(() => {
                    Alpine.nextTick(() => ROUTER.push(ROUTER.path + window.location.search))
                })
        } else {
            console.error('No view found for path: ' + ROUTER.path)
        }
    })
}

function listenToPopStateForBackNavigation(Alpine, ROUTER) {
    window.addEventListener('popstate', (e) => {
        e.preventDefault()
        ROUTER.target = Alpine.defaultTarget
        if(ROUTER.lastRoute.target !== ROUTER.target) {
            renderView(ROUTER.lastRoute.target, '');
        }
        ROUTER._rawPath = e.state.url;
    })
}
function registerMagicProperties(Alpine, ROUTER, VIEWS){
    Alpine.magic('route', (el, {Alpine}) => expression => {
        ROUTER.target = el.getAttribute('x-target') || Alpine.defaultTarget
        if (linkIsInternal(expression)) {
            ROUTER.push(expression.pathname, query && getQueryParams(`?${query}`))
        }
    })
    Alpine.magic('router', () => ROUTER)
    Alpine.magic('view', () => expression => VIEWS[expression])
}

function renderLocalOrRemoteView(templateEl, target, initTree = true) {
    if (templateEl.innerHTML.trim() === '') {
        // get first attribute from templateEl that startsWith x-view
        // otherwise "child" templates that rely on a modifier will be skipped
        // const attrName = Array.from(templateEl.attributes).find(attr => attr.name.startsWith('x-view')).name;
        const path = templateEl.getAttribute('x-view');
        return fetch(`${Alpine.baseUrl === '/' ? '' : Alpine.baseUrl}${path}.html`)
            .then((response) => response.text())
            .then((html) => {
                templateEl.innerHTML = html
            })
            .then(() => {
                renderView(target, templateEl.innerHTML, initTree);
            })
    } else {
        return Promise.resolve(renderView(target, templateEl.innerHTML, initTree));
    }
}


function renderView(target, html, initTree = true) {
    const notInTheShadowDom = document.querySelector(target)
    if (notInTheShadowDom) {
        notInTheShadowDom.innerHTML = html;
        initTree && Alpine.initTree(notInTheShadowDom);
    }
}

function paramsFromRoute(path) {
    return path
        .split('/')
        .filter((key) => key !== '')
        .reduce((paths, pathPart) => {
            paths.parts.push(pathPart);
            // extract key from key if key is "key:value"
            if (pathPart.includes(':')) {
                const [paramKey, paramValue] = pathPart.split(':')
                paths.params[paramKey] = paramValue
                return {
                    pathname: paths['pathname'] + paramValue + '/',
                    rawpath: paths['rawpath'] + paramKey + '/',
                    params: paths['params'],
                    parts: paths['parts'],
                }
            }
            return {
                pathname: paths['pathname'] + pathPart + '/',
                rawpath: paths['rawpath'] + pathPart + '/',
                params: paths['params'],
                parts: paths['parts'],
            }
        }, {
            pathname: '/',
            rawpath: '/',
            params: {},
            parts: [],
        })
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

function dropTrailingSlash(path) {
    return path === '/' ? path : path.replace(/\/$/, '');
}
function normalisePath(path) {
    if(Alpine.baseUrl === '/') return dropTrailingSlash(path);
    return dropTrailingSlash(path)
        .replace(dropTrailingSlash(Alpine.baseUrl),path===Alpine.baseUrl ? '/' : '');
}

function respectBaseUrl(path){
    if(path.includes(Alpine.baseUrl)) return path
    return dropTrailingSlash(Alpine.baseUrl + path)
}
