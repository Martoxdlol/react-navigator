import { RouteBuilder, RoutesDefinition } from ".";
import { getSegments, matchRouteSegments } from "./location";


// TEST
// sortRoutes({
//     '': 8,
//     'fist/route': 1,
//     'second/route/*': 2,
//     'four/:id': 4,
//     ':five/asd': 5,
//     ':six': 6,
//     ':seven/*': 7,
//     '*': 9
// })


/**
 * This function sorts the routes in the order they should be checked.
 */
export function sortRoutes(routes: RoutesDefinition) {
    const routesArray: { segments: string[], builder: RoutesDefinition['builder'], name: string }[] = []

    for (const name in routes) {
        routesArray.push({
            segments: getSegments(name),
            name: name,
            builder: routes[name]
        })
    }

    const maxSegments = routesArray.reduce((max, route) => Math.max(max, route.segments.length), 0)

    routesArray.sort((a, b) => a.segments.length - b.segments.length)

    for (let i = maxSegments - 1; i >= 0; i--) {
        routesArray.sort((a, b) => {
            const aSegment = a.segments[i]
            const bSegment = b.segments[i]

            if (aSegment === bSegment) return 0

            if (aSegment === '*') return 1
            if (bSegment === '*') return -1

            if (!aSegment) return 1
            if (!bSegment) return -1

            if (aSegment[0] === ':') return 1
            if (bSegment[0] === ':') return -1

            return aSegment.localeCompare(bSegment)
        })
    }

    return routesArray
}

export function matchRoute(routes: RoutesDefinition, pathname: string) {
    const sorted = sortRoutes(routes)

    for (const { segments, builder, name } of sorted) {
        const match = matchRouteSegments(getSegments(pathname), segments)
        if(match) {
            return {
                name,
                ...match,
                builder,
            }
        }
    }
}

