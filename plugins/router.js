export default function (Alpine) {
    Alpine.defaultTarget = Alpine.defaultTarget || 'main'
    Alpine.baseUrl = Alpine.baseUrl || ''
    let target = Alpine.defaultTarget
    const Views = {}

    Alpine.directive('view', (el, {expression}) => {
        Views[expression] = el;
        Views[expression].parts = expression.split('/').filter(part => part !== '');
    })

    const Router = Alpine.reactive({
        routes: [],
        parts: [],
        lastRoute: {},
        query: {},
        params: {},
        queryRaw: '',
        path: '',
        origin: '',

        push(slug) {
            // separate path from query
            const [path, query] = dropTrailingSlash(slug).split('?')
            const paths = paramsFromRoute(dropTrailingSlash(path))
            this.params = paths.params
            this.parts = paths.parts
            this._rawPath = dropTrailingSlash(paths.rawpath).replace(dropTrailingSlash(Alpine.baseUrl), paths.rawpath===Alpine.baseUrl ? '/' : '')
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
        _rawPath: '/', // <-- internal property, retains params
    })

    const routeChangeHandler = () => {
        Alpine.nextTick(() => {
            Router.push(pathname + window.location.search)
            removeEventListener('routechange', routeChangeHandler, false);
        });
    }
    window.addEventListener('routechange', routeChangeHandler)


    window.addEventListener('popstate', (e) => {
        e.preventDefault()
        target = Alpine.defaultTarget
        if(Router.lastRoute.target !== target) {
            renderView(Router.lastRoute.target, '');
        }
        Router._rawPath = e.state.url;
    })

    Alpine.router = Router;
    Alpine.views = Views;
    // to avoid reactive changes to the array
    function getView(path) {
        return Views[path]
    }

    Alpine.directive('route', (el, {expression}, {evaluateLater}) => {
        Router.routes.push(el);

        const getRoute = expression.startsWith('/') ? (fn) => fn(expression) : evaluateLater(expression);
        el.addEventListener('click', (e) => {
            getRoute((route) => {
                target = el.getAttribute('x-target') || Alpine.defaultTarget
                if (linkIsInternal(route)) {
                    e && e.preventDefault()
                    Router.push(Alpine.baseUrl+route)
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

    Alpine.magic('router', () => Router)

    Alpine.effect(() => {
        const templateEl = getView(Router._rawPath)

        if(templateEl){
            if (templateEl.hasAttribute('x-target'))
                target = templateEl.getAttribute('x-target')
            renderLocalOrRemoteView(templateEl, target).then(() => {
                const RouteChangeEvent = new Event('routechange')
                Alpine.nextTick(() => dispatchEvent(RouteChangeEvent))
            });
        }
        else{
            const parts = Router._rawPath.split('/').filter(part => part !== '')
            const likelyTheRightView = Views && Object.entries(Views).find((view) => {
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
                Alpine.nextTick(() => Router.push(dropTrailingSlash(rawpath)+window.location.search))
            }
        }
    })

    // ensure all views have been parsed then trigger initial view
    const pathname = dropTrailingSlash(window.location.pathname)
    // 👆this may not match a template in the DOM, but it may match a child view in a remote template
    // so we need to see if any of the parent templates in the current html file match a "part" of the
    // pathname and load that view first - much like you would a layout in a traditional router

    const mostLikelyBaseView = pathname
        .replace(dropTrailingSlash(Alpine.baseUrl), '/')
        .split('/')
        .filter((key) => key !== '')
        .map(part => {
            const key = `/${part}`
            return document.querySelector(`template[x-view="${key}"]`)
        })
        // filter out nulls
        .filter(el => el)
        // keep the longest match
        .reduce((longest, current, index, arr) => {
            if(index === 0) return current;
            if (current && current.getAttribute('x-view').length > longest.getAttribute('x-view').length)
                return current
            return longest
        }, null)

    document.addEventListener('alpine:initialized', () => {
            if(mostLikelyBaseView && mostLikelyBaseView.getAttribute('x-view') === pathname){
                Router.push(pathname+window.location.search);
            } else if(mostLikelyBaseView) {
                Router.push(mostLikelyBaseView.getAttribute('x-view')+window.location.search)
            }else{
                removeEventListener('routechange', routeChangeHandler, false);
                Router.push(pathname+window.location.search)
            }
    });
}

function renderLocalOrRemoteView(templateEl, target, initTree = true) {
    if (templateEl.innerHTML.trim() === '') {
        // get first attribute from templateEl that startsWith x-view
        // otherwise "child" templates that rely on a modifier will be skipped
        // const attrName = Array.from(templateEl.attributes).find(attr => attr.name.startsWith('x-view')).name;
        const path = templateEl.getAttribute('x-view');
        return fetch(`${path}.html`)
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
    } else {
        window.components && window.components.map(component => {
            const el = component.shadowRoot.querySelector(target)
            if (el) {
                component.shadowRoot.querySelector(target).innerHTML = html
                initTree && Alpine.initTree(el);
            }
        })
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
