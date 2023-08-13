import { ReactNavigator } from "."
import { RouteLocation, RouteLocationOptions } from "./location"
import * as React from "react"
import { createContext, createElement, type ReactNode } from "react"

export const routeContext = createContext<Route | undefined>(undefined)


let lastKey = 1

function getKey() {
    return lastKey++
}

export type RouteRenderProps = {
    visibility: 'closed' | 'open' | 'hidden';
    isCurrent: boolean;
}

export abstract class Route {
    constructor() {
        this.buildComponent = this.buildComponent.bind(this)
    }

    buildComponent(details: RouteRenderProps) {
        return <routeContext.Provider value={this}>
            {createElement(this.builder, { location: this.location })}
        </routeContext.Provider>
    }

    abstract render(details: RouteRenderProps): JSX.Element;

    public navigator?: ReactNavigator
    public history: RouteLocation[] = []
    public index: number = 0

    // Use when pop and still animating last close animation
    deleted: boolean = false

    public initialAnimated: boolean | undefined

    /**
     * If true, when the user presses the back button, the route will be popped from the stack.
     * Normally, when the user presses the back button, the route state will be maintained and be available for pressing forward.
     * */
    public abstract get popOnBack(): boolean

    /**
     * If the user push a route over this this will be removed from the stack.
     */
    public abstract get removeOnPush(): boolean

    /**
     * If the user press forward, this route will be removed from the stack.
     */
    public abstract get removeOnForward(): boolean

    /**
     * It will remove the fisrt route from the stack if the stack is full.
     */
    public abstract get historyDepth(): number | undefined

    /**
     * Push a new location to the stack.
     */
    public pushUpdate(input: RouteLocation | RouteLocationOptions | string) {
        const location = RouteLocation.from(input, typeof input === 'string' ? undefined : {
            routeName: this.location.routeName,
            childPath: this.location.childPath,
        })

        if (this.deleted) return

        if (!this.willPushUpdate(location)) {
            return
        }

        this.index++
        this.history.splice(this.index, this.history.length - this.index)
        this.history.push(location)
        this.navigator?.parent?.updateChildPath(location.fullPath)
        this.navigator?.update(this.location.fullPath, location.search, location.hash)

        const depth = this.historyDepth

        if (!depth || !Number.isInteger(depth) || depth < 0) return

        while (this.history.length > depth) {
            this.history.shift()
            this.index--
        }
    }

    /**
     * Replaces current location with a new one.
     */
    public update(input: RouteLocation | RouteLocationOptions | string) {
        const location = RouteLocation.from(input, typeof input === 'string' ? undefined : {
            routeName: this.location.routeName,
            childPath: this.location.childPath,
        })

        if (this.deleted) return

        if (!this.willPushUpdate(location)) {
            return
        }

        this.history[this.index] = location
        this.navigator?.parent?.updateChildPath(location.fullPath)
        this.navigator?.update(this.location.fullPath, location.search, location.hash)
    }

    /**
     * If true, when the user presses the back button, the route will be popped from the stack.
     * */
    public willBack() {
        if (this.deleted) return false

        if (this.index === 0) {
            return true
        }

        this.index--

        this.navigator?.parent?.updateChildPath(this.location.fullPath)

        this.navigator?.update(this.location.fullPath, this.location.search, this.location.hash)

        return false
    }

    public willForward() {
        if (this.deleted) return false

        if (this.index === this.history.length - 1) {
            return true
        }

        this.index++

        this.navigator?.parent?.updateChildPath(this.location.fullPath)

        this.navigator?.update(this.location.fullPath, this.location.search, this.location.hash)

        return false
    }

    public willPushUpdate(location: RouteLocation) {
        if (this.deleted) return false

        return true
    }

    public willUpdate(location: RouteLocation) {
        if (this.deleted) return false

        return true
    }

    public willPushNewRoute(route: Route) {
        return true
    }

    mount(navigator: ReactNavigator, initialLocation: RouteLocation) {
        this.navigator = navigator
        this.navigator?.parent?.updateChildPath(initialLocation.fullPath)
        this.history.push(initialLocation)
    }

    private _key: string | undefined
    get key() {
        if (!this._key) {
            this._key = getKey().toString()
        }

        return this._key
    }

    get location() {
        return this.history[this.index]
    }

    public abstract builder(props: { location: RouteLocation }): ReactNode

    abstract get transitionDuration(): number

    abstract get opaque(): boolean

    __isRoute = true
}

export function useRoute() {
    const route = React.useContext(routeContext)
    if (!route) {
        throw new Error("useLocation must be used inside a PageRoute")
    }

    return route
}

export function useLocation() {
    return useRoute().location
}