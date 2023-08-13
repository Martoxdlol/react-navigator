import { matchRoute } from "./match_route";
import { RouteLocation, RouteLocationOptions, getSegments } from "./location";
import { Route } from "./route";
import { Stack, ProviderComponentProps, LinkProps, Link } from "./components";
import * as React from "react";
import NavKeysController, { Action } from "nav-keys";
import { PageRoute } from "./page_route";
import { AnimationFrom } from "./animation";
export * from "./animation";
export * from "./components";
export * from "./location";
export * from "./match_route";
export * from "./page_route";
export * from "./route";
export * from "./query_state";


/**
 * Function type that returns a PageRoute, used on the routes definition object. 
 * */
export type RouteBuilder = () => Route | JSX.Element;

/**
 * Routes definition object, where the key is the route name and the value is a function that returns a PageRoute.
 * 
 * example:
 * 
 * ```ts
 * const routes: RoutesDefinition = {
 *     home: () => new PageRoute(builder: () => <HomeScreen />),
 *     about: () => new PageRoute(builder: () => <AboutScreen />),
 * };
 * */
export type RoutesDefinition = Record<string, RouteBuilder>;

export type PushRouteOptions = {
    // /**
    //  * If true, the route params, query and url will be added to the stack without creating a new PageRoute and without animation.
    //  * */
    // shallow?: boolean;

    replace?: boolean;
    /**
     * If false, the route will be added to the stack without animation.
     * */
    animated?: boolean;
} & RouteLocationOptions

export type PushRouteOptionsAndRouteName<TRoutes extends RoutesDefinition = RoutesDefinition> = PushRouteOptions & {
    /**
     * The route name or path to push.
     */
    routeName?: keyof TRoutes & string;
}

export type PushUpdateOptions = Omit<RouteLocationOptions, 'pathname'> & {
    replace?: boolean;
}

export const navigatorContext = React.createContext<ReactNavigator | undefined>(undefined)

export type ReactNavigatorOptions = {
    staticUrl?: string;
    defaultRouteBackground?: string;
    defaultRouteTransitionDuration?: number;
    darkMode?: boolean;
    defaultRouteAnimation?: AnimationFrom;
    // baseUrl?: string; // TODO: implement this
    ignoreBrowserNavigation?: boolean;
    skipBrowserUrlUpdate?: boolean;
    noAutomaticFocus?: boolean;
}

export class ReactNavigator<TRoutes extends RoutesDefinition = RoutesDefinition> {
    routesDefinition: TRoutes

    options: ReactNavigatorOptions

    constructor(routesDefinition: TRoutes, options: ReactNavigatorOptions = {}) {
        this.routesDefinition = routesDefinition
        this.options = options
        this.Stack = this.Stack.bind(this)
        this.Link = this.Link.bind(this)
        if (options.staticUrl) {
            this.realUrl = new URL(options.staticUrl, 'http://x')
        }
    }

    /// Routes

    routes: Route[] = []

    currentRoute?: Route

    get current() {
        if (!this.currentRoute) {
            throw new Error('Navigator is not initialized')
        }

        return this.currentRoute
    }

    get index() {
        return this.routes.indexOf(this.current)
    }

    getPreviousRoute(startingAt?: Route): Route | undefined {
        if (!startingAt) startingAt = this.current
        const index = this.routes.indexOf(startingAt)
        if (index === -1) return undefined

        const prev = this.routes[index - 1]
        if (!prev) return undefined

        if (!prev.deleted) return prev

        return this.getPreviousRoute(prev)
    }

    getNextRoute(startingAt?: Route): Route | undefined {
        if (!startingAt) startingAt = this.current
        const index = this.routes.indexOf(startingAt)
        if (index === -1) return undefined

        const next = this.routes[index + 1]
        if (!next) return undefined

        if (!next.deleted) return next

        return this.getNextRoute(next)
    }

    get isInitialized() {
        return this.routes.length > 0
    }

    initialize() {
        if (this.isInitialized) {
            return
        }

        const path = this.path
        const url = this.sourceUrl
        const search = url.search
        const hash = url.hash

        this.pushNamed(path, {
            pathname: path,
            animated: false,
            hash, search,
        })
    }


    /// Parent

    parent?: ReactNavigator
    get topNavigator(): ReactNavigator {
        if (this.isTopNavigator) {
            return this
        }

        return this.parent!.topNavigator
    }

    get isTopNavigator() {
        return this.parent === undefined
    }

    /// Path and child path
    private static globalNavKeys: NavKeysController | undefined

    private navKeys: NavKeysController | undefined

    private realUrl: URL | undefined

    get sourceUrl(): URL {
        if (!this.isTopNavigator) {
            return this.parent!.sourceUrl
        }

        if (this.realUrl != undefined) {
            return this.realUrl
        }

        if (!this.parent && !this.navKeys) {
            // This will prevent erros with hot reloading
            if (ReactNavigator.globalNavKeys) {
                this.navKeys = ReactNavigator.globalNavKeys
            } else {
                this.navKeys = new NavKeysController()
            }

            // TODO: do something with this (the forward button)

            setTimeout(() => {
                this.navKeys!.enableForwardButton()
            }, 120)

            if (!this.options.ignoreBrowserNavigation) {
                this.navKeys.listen(e => {
                    if (e.action === Action.back) {
                        this.focusedNavigator.back()
                    } else if (e.action === Action.forward) {
                        this.focusedNavigator.forward()
                    } else if (e.action === Action.hashchange) {
                        this.focusedNavigator.update(null, this.current.location.search, e.url.hash)
                    }
                })
            }

            const url = new URL(this.navKeys.url)
            this.realUrl = url
            return url
        }

        throw new Error('Cannot get sourceUrl')
    }

    get path(): string {
        if (this.isTopNavigator) {
            return this.sourceUrl.pathname
        }

        return this.parent!.childPath
    }

    updateChildPath(path: string) {
        this.current.location.childPath = path
    }

    get childPath() {
        return this.current.location.childPath || ''
    }

    /// Update

    /**
     * Trigger a update and re-render of the entire navigator/s tree
     */
    public update(path: string | null, search: string | undefined, hash: string | undefined): void {
        // If you have multiple navigators at the same level
        if (this.options.skipBrowserUrlUpdate) {
            this.reactUpdateFunction?.()
            return
        }

        if (!this.isTopNavigator) {
            const mergedPath = path !== null ? [...getSegments(this.path), ...getSegments(path)].join('/') : null
            return this.parent!.update(mergedPath, search, hash)
        }

        if (!this.reactUpdateFunction) {
            return
        }

        if (this.realUrl) {
            if (path !== null) this.realUrl.pathname = path
            this.realUrl.search = search ?? ''
            this.realUrl.hash = hash ?? ''
        }

        if (this.realUrl && this.navKeys) {
            this.navKeys.url = this.realUrl
        }

        this.reactUpdateFunction()
    }

    /// Children

    children: Set<ReactNavigator> = new Set()

    addChild(child: ReactNavigator) {
        this.children.add(child)
    }

    removeChild(child: ReactNavigator) {
        this.children.delete(child)
    }

    /// Updator function

    reactUpdateFunction?: () => void


    /// Find route

    matchRoute(routeName: keyof TRoutes & string) {
        return matchRoute(this.routesDefinition, routeName)
    }

    /// Exposed methods

    /**
     * Push a new route to the stack.
     * If you want to push a route by its name or path, use pushNamed instead.
     */
    public push(route: Route, options: PushRouteOptionsAndRouteName<TRoutes> = {}) {
        const initialized = this.isInitialized

        // If already a current route, ask it if it will allow to push a new route
        if (initialized) {
            if (!this.current.willPushNewRoute(route)) {
                return null
            }
        }

        // If the navigator is empty, the route must have a routeName
        if (!options.routeName && this.routes.length === 0) {
            throw new Error('Cannot push a route without a routeName if the navigator is empty')
        }

        // If the route has a routeName, check if it is valid
        const routeName = options.routeName ?? this.current.location.routeName

        // Give the new route the neccessary information to work properly
        route.mount(this, new RouteLocation(routeName, {
            params: options.params ?? this.current.location.params,
            ...options,
        }))

        // Set wther the route will open with an animation or not
        route.initialAnimated = options.animated

        const current = this.currentRoute

        if (initialized) {
            this.routes.splice(this.index + 1, 0, route)

            // Remove all routes after the recently pushed route
            const routesToRemove = this.routes.slice(this.index + 2)
            routesToRemove.forEach(route => {
                if (!route.deleted) removeFromArray(this.routes, route)
            })
        } else {
            this.routes.push(route)
        }

        if (current && (options.replace || current.removeOnPush)) {
            this.deleteRoute(current)
        }

        // Set the new route as current
        this.currentRoute = route

        // Now, this navigator is in focus
        this.conditionalFocus()

        // If the navigator is not initialized, we don't need to update (render will is happening right now)
        if (initialized) this.update(route.location.fullPath, route.location.search, route.location.hash)

        return route
    }

    /**
     * Push a new route to the stack by its name or path.
     * If you want to push a route by its instance, use push instead.
     * */
    public pushNamed(routeNameOrPath: keyof TRoutes & string, options: PushRouteOptions = {}) {
        // Find the route using the routeName or path
        const match = this.matchRoute(routeNameOrPath)

        // If no route was found, throw an error
        if (!match) {
            throw new Error(`Route ${routeNameOrPath} not found`)
        }

        // Builder can be a function that retuns a JSX.Element or a function that returns a Route
        const built = match.builder() // Can be a <Component /> or a Route()

        let route: Route

        if ((built as Route).__isRoute) {
            route = built as Route // If is route, just use it
        } else {
            // If not, create it using default page route
            route = new PageRoute({
                builder: () => {
                    const reactElem = built as JSX.Element
                    return React.createElement(reactElem.type, reactElem.props)
                }
            })
        }

        // Push the route
        return this.push(route, {
            routeName: match.name,
            childPath: match.unusedSegments?.join('/'),
            pathname: match.matchedSegments.join('/'),
            ...options,
            params: { ...match.params, ...options.params },
        })
    }

    public pushUpdate(options: PushUpdateOptions) {
        const currentLoc = this.current.location
        this.current.pushUpdate(new RouteLocation(currentLoc.routeName, {
            ...currentLoc,
            ...options,
        }))
    }

    public deleteRoute(route: Route) {
        route.deleted = true

        if (route.transitionDuration > 0) {
            setTimeout(() => {
                removeFromArray(this.routes, route)
            }, route.transitionDuration)
        } else {
            removeFromArray(this.routes, route)
        }
    }

    /**
     * Pop the current route from the stack.
     * */
    public pop(options: { skipRouteCheck?: boolean } = {}) {
        if (!options.skipRouteCheck && !this.current.willBack()) {
            return
        }

        const prev = this.getPreviousRoute()

        if (!prev) {
            if (this.isTopNavigator) {
                this.navKeys?.exit()
                return
            }

            this.parent?.back()
        }

        const routeToDelete = this.current

        this.deleteRoute(routeToDelete)

        this.currentRoute = prev

        const location = this.current.location

        this.conditionalFocus()

        this.update(location.fullPath, location.search, location.hash)
    }

    /**
     * Set the current route as previous and only pop the current route from the stack in some cases.
     * */
    public back() {
        const shouldRemove = this.current.popOnBack

        if (shouldRemove) {
            return this.pop()
        }

        if (!this.current.willBack()) {
            return
        }

        const prev = this.getPreviousRoute()

        if (!prev) {
            if (this.isTopNavigator) {
                this.navKeys?.exit()
                return
            }

            this.parent?.back()
        }

        this.currentRoute = prev

        const location = this.current.location

        this.conditionalFocus()

        this.update(location.fullPath, location.search, location.hash)
    }

    public forward() {
        if (!this.current.willForward()) {
            return
        }

        const next = this.getNextRoute()
        console.log('forward', next)

        if (!next) {
            // TODO: forward child or parent navigator (if possible)

            if (this.isTopNavigator) {
                this.parent?.forward()
            }

            return
        }

        if (this.currentRoute?.removeOnForward) {
            this.deleteRoute(this.currentRoute)
        }

        this.currentRoute = next

        const location = this.current.location

        this.conditionalFocus()

        this.update(location.fullPath, location.search, location.hash)
    }

    /// React Components

    Stack(props: ProviderComponentProps) {
        return <Stack navigator={this} {...props} />
    }

    Link(props: Omit<LinkProps, 'navigator'>) {
        return <Link navigator={this} {...props} />
    }

    /// Navigators in focus for managing the navigation keys

    private currentInFocus: ReactNavigator | undefined

    public get focusedNavigator(): ReactNavigator {
        if (!this.isTopNavigator) {
            return this.parent!.focusedNavigator
        }

        return this.currentInFocus ?? this
    }

    private _focus(navigator: ReactNavigator): void {
        if (!this.isTopNavigator) {
            return this.parent?._focus(navigator)
        }

        if (this.currentInFocus === navigator) return
    }

    conditionalFocus() {
        if (this.options.noAutomaticFocus) return
        return this.focus()
    }

    public focus() {
        this._focus(this)
    }

    public get isInFocus() {
        return this.focusedNavigator === this
    }

    public blur() {
        if (!this.isTopNavigator) {
            this.parent?.blur()
        }
    }
}

export function useNavigator() {
    const navigator = React.useContext(navigatorContext)

    if (navigator === undefined) {
        throw new Error("Cannot use useNavigator outside of a navigator context")
    }

    return navigator
}

function removeFromArray(array: unknown[], item: unknown) {
    return array.splice(array.indexOf(item), 1)
}
