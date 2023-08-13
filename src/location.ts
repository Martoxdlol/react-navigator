export type RouteLocationOptions = {
    pathname?: string;
    /**
     * Url string parameters. Example /user/:id -> { id: "1" }
     */
    params?: Record<string, string | unknown>;

    /**
     * Query string parameters. Example ?id=1&name=John -> { id: "1", name: "John" }
     */
    query?: Record<string, string | unknown>;

    /**
     * Alternative to query. Example ?id=1&name=John -> "?id=1&name=John"
     */
    search?: string;

    /**
     * The hash string.
     */
    hash?: string;

    /**
     * Path not belonging to the route that is matched at the end with * and is passed to nested navigators.
     * Example: /user/:id/* -> /user/1/settings/security -> childPath is "settings/security"
     *  */
    childPath?: string;
}

export class RouteLocation {
    routeName: string;
    params: Record<string, string | unknown>;
    paramsNames: Set<string>;
    search?: string;
    hash?: string;
    childPath?: string;

    public constructor(routeName: string, options: RouteLocationOptions) {
        this.routeName = routeName;
        this.paramsNames = new Set(getParamsNames(getSegments(routeName)));

        if (options.childPath) {
            this.childPath = options.childPath
        }

        const info = options.pathname !== undefined ? matchRouteSegments(getSegments(options.pathname), getSegments(routeName)) : null;

        if (info) {
            Object.keys(info.params).forEach(key => this.paramsNames.add(key));
        }

        if (info && options.childPath === undefined) {
            this.childPath = info.unusedSegments?.join('/')
        }

        this.params = { ...info?.params, ...options.params };

        this.paramsNames.forEach(paramName => {
            if (!this.params[paramName]) {
                throw new Error(`Missing parameter "${paramName}" for route "${routeName}"`);
            }
        })

        const optionsQuery = options.query

        if (optionsQuery) {
            for (const key in optionsQuery) {
                if (optionsQuery[key] === null || optionsQuery[key] === undefined) {
                    delete optionsQuery[key]
                } else {
                    optionsQuery[key] = optionsQuery[key]
                }
            }
        }

        if(options.search){
            this.search = options.search
        }
         
        if(options.query){
            this.search = new URLSearchParams(optionsQuery as Record<string, string>).toString()
        }

        this.hash = options.hash;
    }

    public get searchParams(): URLSearchParams {
        return new URLSearchParams(this.search);
    }

    public get query(): Record<string, string> {
        return Object.fromEntries(this.searchParams.entries());
    }

    public get pathname(): string {
        const segments = getSegments(mergePathWithParams(this.routeName, this.params));
        if (segments[segments.length - 1] === '*') {
            segments.pop()
        }
        return segments.join('/');
    }

    public get fullPath(): string {
        return [...getSegments(this.pathname), ...getSegments(this.childPath ?? '')].filter(Boolean).join('/');
    }

    static from(input: string | RouteLocation | (RouteLocationOptions & { routeName?: string }), options: (RouteLocationOptions & { routeName?: string }) = {}) {
        if (typeof input === 'string') {
            return new RouteLocation(input, options);
        }
        if ((input as RouteLocation).__isRouteLocation) {
            return input as RouteLocation;
        }
        const opts = input as (RouteLocationOptions & { routeName?: string });
        return new RouteLocation(opts.routeName ?? options.routeName ?? opts.pathname ?? '', {
            childPath: opts.childPath ?? options.childPath,
            ...opts,
        });
    }

    private __isRouteLocation = true;
}

export function getSegments(path: string) {
    return path.split('/').filter(Boolean);
}

export function getParamsNames(segments: string[]) {
    return segments.filter(segment => segment[0] === ':').map(segment => segment.slice(1));
}

export function matchRouteSegments(actualSegments: string[], testSegments: string[]) {
    const params: Record<string, string | unknown> = {};

    let unusedSegments: string[] | undefined = undefined;

    const lastTestSegment = testSegments[testSegments.length - 1];

    if (lastTestSegment !== '*' && actualSegments.length !== testSegments.length) {
        return null;
    }

    const matchedSegments = []

    for (let i = 0; i < testSegments.length; i++) {
        const actualSegment = actualSegments[i];
        const testSegment = testSegments[i];

        const isParam = testSegment[0] === ':';
        const isCatchAll = testSegment[0] === '*';
        const isGeneric = isParam || isCatchAll;
        const isLastSegment = i === testSegments.length - 1;

        if (!isGeneric && actualSegment !== testSegment) {
            return null;
        }

        if (isParam) {
            params[testSegment.slice(1)] = decodeURIComponent(actualSegment);
        }

        if (isCatchAll && isLastSegment) {
            unusedSegments = actualSegments.slice(i).map(v => decodeURIComponent(v));
            break
        }

        matchedSegments.push(actualSegment);
    }

    return { params, unusedSegments, matchedSegments };
}

export function mergePathWithParams(path: string, params: Record<string, string | unknown>) {
    const segments = getSegments(path)
    const newSegments = segments.map(segment => {
        if (segment[0] === ':') {
            const param = params[segment.slice(1)]
            if (param !== undefined) {
                return encodeURIComponent(param + '')
            }
        }

        return segment
    })

    return newSegments.join('/')
}