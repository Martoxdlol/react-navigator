import { JSX, ReactNode, createContext, createElement } from "react";
import { Route, RouteRenderProps } from "./route";
import { RouteLocation, } from "./location";
import * as React from "react";
import { AnimationFrom, RouteAnimation, useRenderAnimationLogic } from "./animation";
import { Freeze } from "react-freeze";
import { ErrorBoundary, FallbackProps, useErrorBoundary } from "react-error-boundary";

export const DEFAULT_TRANSITION_DURATION = 180

export type OnNavigateCallback = (action: 'back' | 'forward' | 'push_update' | 'update' | 'push_route') => boolean

export type PageRouteBaseOptions = {
    builder: (props: { location: RouteLocation }) => ReactNode;
    transitionDuration?: number;
    opaque?: boolean;
    popOnBack?: boolean;
    removeOnPush?: boolean;
    removeOnForward?: boolean;
    background?: string;
    historyDepth?: number;
    buildErrorFallback?: (props: FallbackProps) => ReactNode;
    onNavigate?: OnNavigateCallback;
}

const routeRenderPropsContext = createContext<RouteRenderProps | undefined>(undefined)

export function useNullableRenderProps() {
    return React.useContext(routeRenderPropsContext)
}

export function useRenderProps() {
    const props = useNullableRenderProps()
    if (!props) {
        throw new Error("Must be used inside a page route")
    }
    return props
}

export function isCurrentRoute() {
    return useRenderProps().isCurrent
}

export function useRouteVisibility() {
    return useRenderProps().visibility
}

function defaultBackground(darkMode = false) {
    return darkMode ? '#121212' : 'white'
}

export abstract class PageRouteBase extends Route {
    builder: (props: { location: RouteLocation }) => ReactNode
    providedTransitionDuration?: number
    popOnBack: boolean
    removeOnPush: boolean
    removeOnForward: boolean
    opaque: boolean
    providedBackground?: string
    providedBuildErrorFallback?: (props: FallbackProps) => ReactNode
    onNavigate?: OnNavigateCallback
    historyDepth: number | undefined

    constructor(options: PageRouteBaseOptions) {
        super()

        this.builder = options.builder.bind(this)
        this.buildComponent = this.buildComponent.bind(this)
        this.buildErrorFallbackInternal = this.buildErrorFallbackInternal.bind(this)
        this.providedTransitionDuration = options.transitionDuration
        this.popOnBack = options.popOnBack ?? false
        this.removeOnPush = options.removeOnPush ?? false
        this.removeOnForward = options.removeOnForward ?? false
        this.opaque = options.opaque ?? true
        this.providedBackground = options.background
        this.providedBuildErrorFallback = options.buildErrorFallback?.bind(this)
        this.onNavigate = options.onNavigate?.bind(this)
        this.historyDepth = options.historyDepth
    }

    public willBack(): boolean {
        if (this.onNavigate?.('back') === false) {
            return false
        }
        return super.willBack()
    }

    public willForward(): boolean {
        if (this.onNavigate?.('forward') === false) {
            return false
        }
        return super.willForward()
    }

    public willPushUpdate(location: RouteLocation): boolean {
        if (this.onNavigate?.('push_update') === false) {
            return false
        }
        return super.willPushUpdate(location)
    }

    public willUpdate(location: RouteLocation): boolean {
        if (this.onNavigate?.('update') === false) {
            return false
        }
        return super.willUpdate(location)
    }

    public willPushNewRoute(route: Route): boolean {
        if (this.onNavigate?.('push_route') === false) {
            return false
        }
        return super.willPushNewRoute(route)
    }

    get transitionDuration() {
        return this.providedTransitionDuration ?? this.navigator?.options.defaultRouteTransitionDuration ?? DEFAULT_TRANSITION_DURATION
    }

    get background() {
        if (this.providedBackground) {
            return this.providedBackground
        }

        if (this.opaque) {
            return this.navigator?.options.defaultRouteBackground ?? defaultBackground(this.navigator?.options.darkMode)
        } else {
            return 'transparent'
        }
    }

    private buildErrorFallbackInternal(props: FallbackProps) {
        return this.buildErrorFallback(props)
    }

    buildErrorFallback(props: FallbackProps) {
        if (this.providedBuildErrorFallback) {
            return this.providedBuildErrorFallback(props)
        }

        return <div>
            <h1>Something went wrong</h1>
            <button type="button" onClick={() => props.resetErrorBoundary()}>Reload</button>

            <h2>Details</h2>
            <pre>
                {props.error.stack}
            </pre>
        </div>
    }

    buildComponentWithContext(details: RouteRenderProps): JSX.Element {
        return <ErrorBoundary fallbackRender={this.buildErrorFallbackInternal}>
            <routeRenderPropsContext.Provider value={details}>
                {createElement(this.buildComponent, { ...details })}
            </routeRenderPropsContext.Provider>
        </ErrorBoundary>
    }
}

export type PageRouteOptions = {
    animation?: AnimationFrom
    as?: React.FunctionComponent<unknown> | React.ComponentClass<unknown> | string
    style?: React.CSSProperties
    className?: string
    innerProps?: Record<string, unknown>
} & PageRouteBaseOptions

export class PageRoute extends PageRouteBase {
    private providedAnimation?: AnimationFrom
    options: PageRouteOptions

    constructor(options: PageRouteOptions) {
        super(options)
        this.options = options
        this.providedAnimation = options.animation
        this.buildComponentWithContext = this.buildComponentWithContext.bind(this)
        this.render = this.render.bind(this)
    }

    get animation(): RouteAnimation {
        const animationFrom = this.providedAnimation ?? this.navigator?.options.defaultRouteAnimation

        return RouteAnimation.from(animationFrom, this)
    }

    render(details: RouteRenderProps): JSX.Element {
        const component = createElement(this.buildComponentWithContext, { ...details })

        // TODO: Animations and freezing
        const { containerRef, freezing, visibility } = useRenderAnimationLogic(this, details)

        const style = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, background: this.background }

        const props = {
            'route-visibility': details.visibility,
            'freeze': freezing.toString(),
            'route-is-current': details.isCurrent.toString(),
            'is-route': 'true',
            'route-key': this.key,
            tabIndex: visibility === 'open' ? 0 : -1,
            autoFocus: visibility === 'open',
            ref: containerRef,
            style: {
                ...style,
                ...this.options.style,
            },
            className: this.options.className,
            ...this.options.innerProps,
        }

        return createElement(this.options.as || 'section', props as any, <Freeze freeze={freezing} placeholder={<>(closed)</>}>
            {component}
        </Freeze>)
    }
}
