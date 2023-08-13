import * as React from "react";
import { PushRouteOptionsAndRouteName, ReactNavigator, navigatorContext, useNavigator } from ".";
import { RouteRenderProps } from './route'
import { useNullableRenderProps } from './page_route'
import { getSegments } from './location'

export type ProviderComponentProps = {
    as?: React.FunctionComponent<unknown> | React.ComponentClass<unknown> | string
    style?: React.CSSProperties
    className?: string
    innerProps?: Record<string, unknown>
}

function useMountNavigator(navigator: ReactNavigator) {
    const parent = React.useContext(navigatorContext)

    const [_, setUpdate] = React.useState(0)

    navigator.parent = parent
    navigator.reactUpdateFunction = () => setUpdate((update) => update + 1)

    React.useEffect(() => {
        if (!parent) return

        parent.addChild(navigator)

        return () => {
            parent.removeChild(navigator)
        }
    }, [parent])

    if (!navigator.isInitialized) {
        navigator.initialize()
    }
}


export function Stack(props: { navigator: ReactNavigator } & ProviderComponentProps) {
    const { navigator } = props

    useMountNavigator(navigator)

    // console.log("************")

    const component = <navigatorContext.Provider value={navigator}>
        {navigator.routes.map((route, index) => {

            const isCurrent = route === navigator.current
            let state: RouteRenderProps['visibility'] = 'open'

            if (navigator.index > index) {
                state = 'hidden'
                // *****************
                // If route is behind a transparent route, it should be open not hidden (because should be visible as if it was at front, example: a modal)
                let opaque = navigator.current.opaque

                for (let i = index + 1; i < navigator.index; i++) {
                    const route = navigator.routes[i]
                    if (route.opaque) {
                        opaque = true
                        break
                    }
                }

                if (!opaque) state = 'open'
                // *****************
            }

            if (navigator.index < index) {
                state = 'closed'
            }

            if (route.deleted) {
                state = 'closed'
            }

            // console.log("Rendering route", route.location.routeName, route.key, route.deleted ? "(deleted)" : state)

            return React.createElement(route.render, { key: route.key, visibility: state, isCurrent })
        })}
    </navigatorContext.Provider>

    // console.log("************\n")


    // ***** Focusing logic *****

    const ref = React.useRef<HTMLDivElement | Element>(null)

    // Cjeck if naviggator is inside a route
    const routeRenderProps = useNullableRenderProps()
    const routeIsCurrent = routeRenderProps?.isCurrent

    React.useLayoutEffect(() => {
        const listener = (e: FocusEvent) => {
            e.stopImmediatePropagation()
            e.stopPropagation()
            e.preventDefault()
            navigator.conditionalFocus()
        }

        if (routeIsCurrent === false) {
            navigator.blur()
        }

        ref.current?.addEventListener('focusin', listener as any)
        return () => {
            ref.current?.removeEventListener('focusin', listener as any)
        }
    }, [routeIsCurrent])

    // **********

    const style: React.CSSProperties = {
        width: '100%',
        height: '100%',
    }

    const componentProps = {
        ref,
        style: {
            ...style,
            ...props.style,
        },
        className: props.className,
        ...props.innerProps,
    }

    return React.createElement(props.as || 'div', componentProps as any, component)
}

export type LinkProps<T extends keyof React.ReactHTML = 'a'> = {
    as?: T
    navigator?: ReactNavigator
    href: string | PushRouteOptionsAndRouteName
    replace?: boolean
} & Omit<React.HTMLProps<T>, 'href'>

export function Link({ href: to, as = 'a', navigator: ___navigator, ...props }: LinkProps) {

    const _navigator = useNavigator()
    const navigator = ___navigator ?? _navigator

    const parent = navigator.parent

    const segments: string[] = []

    if (parent) {
        segments.push(...getSegments(parent.current.location.pathname))
    }

    let search = ''
    let hash = ''

    const relativeSegments: string[] = []

    if (typeof to === 'string') {
        const url = new URL(to, 'http://x')
        segments.push(...getSegments(url.pathname))
        relativeSegments.push(...getSegments(url.pathname))
        search = url.search
        hash = url.hash
    } else {
        segments.push(...getSegments(to.routeName ?? to.pathname ?? ''))
        search = to.search ?? ''
        hash = to.hash ?? ''
    }

    const href = segments.flat().join('/') + search + hash

    function push() {
        navigator.pushNamed(relativeSegments.join('/'), {
            hash, search,
            replace: props.replace,
        })
    }

    return React.createElement(as, {
        onClick: (e: React.MouseEvent) => {
            e.preventDefault()
            push()
        },
        href,
        ...props,
    })
}