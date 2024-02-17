import { useLayoutEffect, useRef, useState } from "react";
import { PageRoute, } from "./page_route";
import { RouteRenderProps } from "./route";

export function useRenderAnimationLogic(route: PageRoute, props: RouteRenderProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const animationCycle = useRef(-1)

    const visibility = props.visibility


    const [freezing, setFreezing] = useState(() => {
        return visibility !== 'open'
    })

    const lastVisibilityRef = useRef(visibility)

    function getAnimationTarget() {
        if(route.opaque) {
            return containerRef.current!
        }

        return containerRef.current!.children[0] as HTMLDivElement
    }

    useLayoutEffect(() => {
        // console.log('visibility', route.location.routeName, `${lastVisibilityRef.current} -> ${visibility}`)
        animationCycle.current++
        const currentAnimationCycle = animationCycle.current


        function setVisibility(visible: boolean) {
            // this is to prevent changing how the route is being displayed when other animations are triggered before this one finishes
            if (currentAnimationCycle !== animationCycle.current) {
                return
            }

            // Directly setting the display property to prevent unnecessary re-renders and strage behavior
            containerRef.current!.style.display = visible ? 'block' : 'none'

            setFreezing(!visible)
        }

        function beforeReturn() {
            // this is to prevent changing how the route is being displayed when other animations are triggered before this one finishes
            if (currentAnimationCycle !== animationCycle.current) {
                return
            }

            lastVisibilityRef.current = visibility
        }

        if (visibility === 'open' && (lastVisibilityRef.current === 'closed' || animationCycle.current === 0)) {
            setVisibility(true)

            // If route is the initial route and is required to not have an animation (default behavior when mounting the navigator the first time)
            if (animationCycle.current === 0 && route.initialAnimated === false) {
                return beforeReturn()
            }

            route.animation.animateOpen(getAnimationTarget())

            return beforeReturn()
        }

        // Close animation
        if (visibility === 'closed' && lastVisibilityRef.current === 'open') {
            //                                                    --> this runs when the animation finishes
            route.animation.animateClose(getAnimationTarget(), () => setVisibility(false))
            return beforeReturn()
        }

        // Hide animation (pushing a route over another one)
        if (visibility === 'hidden' && lastVisibilityRef.current === 'open') {
            //                                                    --> this runs when the animation finishes
            route.animation.animateHide(getAnimationTarget(), () => setVisibility(false))
            return beforeReturn()
        }

        if (visibility === 'open' && lastVisibilityRef.current === 'hidden') {
            setVisibility(true)
            route.animation.animateUnhide(getAnimationTarget())
            return beforeReturn()
        }

        setVisibility(visibility === 'open')
        return beforeReturn()
    }, [visibility])

    return {
        freezing,
        containerRef,
        visibility,
    }
}

export type DefaultAnimations = 'scale' | 'fade' | 'slide' | 'none' | 'delayed-exit' | 'slide-up' | 'default'

export type AnimationFrom = DefaultAnimations | RouteAnimation

type AnimateOnOptions = {
    element: HTMLDivElement | HTMLElement
    onFinish?: () => unknown
    keyframes: Keyframe[]
    options?: KeyframeAnimationOptions
}

export abstract class RouteAnimation {
    route: PageRoute | undefined

    constructor(route?: PageRoute) {
        if(route) {
            this.route = route
        }
    }

    protected animateOn(options: AnimateOnOptions) {
        const { element, onFinish, keyframes, options: animationOptions } = options

        if(!this.route) {
            onFinish?.()
            return
        }

        const animation = element.animate(keyframes, {
            duration: this.route.transitionDuration,
            ...animationOptions,
        })

        animation.addEventListener('finish', () => {
            onFinish?.()
        })
    }

    animateOpen(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        onFinish?.()
    }

    animateClose(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        onFinish?.()
    }

    animateHide(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        onFinish?.()
    }

    animateUnhide(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        onFinish?.()
    }

    static from(input: AnimationFrom = 'default', route: PageRoute): RouteAnimation {
        if ((input as RouteAnimation).__isRouteAnimation) {
            (input as RouteAnimation).route = route
            return input as RouteAnimation
        }

        if (input === 'none') {
            return new NoneAnimation(route)
        }

        if (input === 'delayed-exit') {
            return new DelayedAnimation(route)
        }

        if (input === 'fade') {
            return new FadeAnimation(route)
        }

        if (input === 'slide') {
            return new SlideAnimation(route)
        }

        if (input === 'scale') {
            return new ScaleAnimation(route)
        }

        if (input === 'slide-up') {
            return new SlideUpAnimation(route)
        }

        // Default
        return new ScaleAnimation(route)
    }

    private __isRouteAnimation = true
}

export class NoneAnimation extends RouteAnimation { }

export class DelayedAnimation extends RouteAnimation {
    animateOpen(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        setTimeout(() => onFinish?.(), this.route?.transitionDuration, 0)
    }

    animateClose(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        setTimeout(() => onFinish?.(), this.route?.transitionDuration, 0)
    }

    animateHide(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        setTimeout(() => onFinish?.(), this.route?.transitionDuration, 0)
    }

    animateUnhide(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        setTimeout(() => onFinish?.(), this.route?.transitionDuration, 0)
    }
}

export class ScaleAnimation extends RouteAnimation {
    animateOpen(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        this.animateOn({
            keyframes: [
                { transform: 'scale(60%)', opacity: '0' },
                { transform: 'scale(100%)', opacity: '1' },
            ],
            element,
            onFinish,
        })
    }

    animateClose(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        this.animateOn({
            keyframes: [
                { transform: 'scale(100%)', opacity: '1' },
                { transform: 'scale(60%)', opacity: '0' },
            ],
            element,
            onFinish,
        })
    }

    animateHide(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        this.animateOn({
            keyframes: [
                { transform: 'scale(100%)', opacity: '1' },
                { transform: 'scale(120%)', opacity: '1' },
            ],
            element,
            onFinish,
        })
    }

    animateUnhide(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        this.animateOn({
            keyframes: [
                { transform: 'scale(120%)', opacity: '1' },
                { transform: 'scale(100%)', opacity: '1' },
            ],
            element,
            onFinish,
        })
    }
}

export class FadeAnimation extends RouteAnimation {
    animateOpen(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        this.animateOn({
            keyframes: [
                { opacity: '0' },
                { opacity: '1' },
            ],
            element,
            onFinish,
        })
    }

    animateClose(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        this.animateOn({
            keyframes: [
                { opacity: '1' },
                { opacity: '0' },
            ],
            element,
            onFinish,
        })
    }

    animateHide(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        this.animateOn({
            keyframes: [
                { opacity: '1' },
                { opacity: '0' },
            ],
            element,
            onFinish,
        })
    }

    animateUnhide(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        this.animateOn({
            keyframes: [
                { opacity: '0' },
                { opacity: '1' },
            ],
            element,
            onFinish,
        })
    }
}

export class SlideAnimation extends RouteAnimation {
    animateOpen(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        this.animateOn({
            keyframes: [
                { transform: 'translateX(100%)' },
                { transform: 'translateX(0)' },
            ],
            element,
            onFinish,
        })
    }

    animateClose(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        this.animateOn({
            keyframes: [
                { transform: 'translateX(0%)' },
                { transform: 'translateX(100%)' },
            ],
            element,
            onFinish,
        })
    }

    animateHide(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        this.animateOn({
            keyframes: [
                { transform: 'translateX(0)' },
                { transform: 'translateX(-50%)' },
            ],
            element,
            onFinish,
        })
    }

    animateUnhide(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        this.animateOn({
            keyframes: [
                { transform: 'translateX(-50%)' },
                { transform: 'translateX(0)' },
            ],
            element,
            onFinish,
        })
    }
}

export class SlideUpAnimation extends RouteAnimation {
    animateOpen(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        this.animateOn({
            keyframes: [
                { transform: 'translateY(100%)' },
                { transform: 'translateY(0)' },
            ],
            element,
            onFinish,
        })
    }

    animateClose(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        this.animateOn({
            keyframes: [
                { transform: 'translateY(0%)' },
                { transform: 'translateY(100%)' },
            ],
            element,
            onFinish,
        })
    }

    animateHide(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        this.animateOn({
            keyframes: [
                { transform: 'translateY(0)' },
                { transform: 'translateY(-50%)' },
            ],
            element,
            onFinish,
        })
    }

    animateUnhide(element: HTMLDivElement | HTMLElement, onFinish?: () => unknown) {
        this.animateOn({
            keyframes: [
                { transform: 'translateY(-50%)' },
                { transform: 'translateY(0)' },
            ],
            element,
            onFinish,
        })
    }
}