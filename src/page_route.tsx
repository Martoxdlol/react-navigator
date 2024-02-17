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
            return 'rgba(0,0,0,0.3)'
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
    containerStyle?: React.CSSProperties
    containerProps?: React.ComponentProps<'div'>
    className?: string
    innerProps?: Record<string, unknown>
    onClick?: (e: React.MouseEvent) => void
    onClickBarrier?: (e: React.MouseEvent) => void
    barrierLabel?: string
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

        const style: React.CSSProperties = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }

        if (this.opaque === false) {
            style.transition = `background-color ${this.transitionDuration}ms`
            if (visibility !== 'open') {
                style.background = 'rgba(0,0,0,0)'
            }
        } else {
            style.background = this.background
        }

        const isOpen = visibility === 'open'

        React.useLayoutEffect(() => {
            if (this.opaque === false && isOpen && containerRef.current) {
                setTimeout(() => {
                    if (!containerRef.current) return
                    containerRef.current.style.background = this.background
                }, 1)
            }
        }, [isOpen])

        const props: React.ComponentProps<'div'> & Record<string, unknown> = {
            'route-visibility': details.visibility,
            'freeze': freezing.toString(),
            'route-is-current': details.isCurrent.toString(),
            'is-route': 'true',
            'route-key': this.key,
            tabIndex: visibility === 'open' ? 0 : -1,
            autoFocus: visibility === 'open',
            ref: containerRef,
            title: this.options.barrierLabel,
            style: {
                ...style,
                ...this.options.style,
            },
            className: this.options.className,
            ...this.options.innerProps,
        }

        const onClick = this.options.onClick || ((e: React.MouseEvent) => {
            if (e.target === e.currentTarget) {
                if (this.options.onClickBarrier) {
                    this.options.onClickBarrier(e)
                } else {
                    this.navigator?.pop()
                }
            }
        })

        let contentExtraStyles: React.CSSProperties = {}

        if (this.opaque === false) {
            contentExtraStyles = {
                display: 'flex', justifyContent: 'center', alignItems: 'center',
            }
        }

        return createElement(this.options.as || 'section', props as any, <Freeze freeze={freezing} placeholder={<>(closed)</>}>
            <div
                title=""
                route-content="true"
                route-animation-target="true"
                onClick={onClick}
                {...this.options.containerProps}
                style={{ width: '100%', height: '100%', position: 'relative', ...contentExtraStyles, ...this.options.containerStyle }}
            >
                {component}
            </div>
        </Freeze>)
    }
}
