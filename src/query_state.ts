import { useMemo } from "react";
import { useRoute } from "./route";

export type QueryStateOptions<T = string> = {
    mode?: 'push' | 'replace';
    parse?: (value: string | null) => T | null;
    stringify?: (value: T) => string | null | undefined;
    defaultValue?: T;
}

export function useQueryState<T>(name: string, options: QueryStateOptions<T> = {}) {
    const route = useRoute();
    const value = route.location.searchParams.get(name);
    let parsed = options.parse?.(value);

    const updateValue = useMemo(() => {
        return function updateValue(value: T | null | undefined) {
            let stringified: string | null = null;

            if (value !== null && value !== undefined) {
                if (options.stringify) {
                    stringified = options.stringify(value) ?? null;
                } else {
                    stringified = value.toString();
                }
            }

            const query = {
                ...route.location.query,
                [name]: stringified
            }

            if (options.mode === 'push') {
                route.pushUpdate({ query })
            } else {
                route.update({ query })
            }
        }
    }, [name, options.mode, options.stringify])

    return [parsed ?? options.defaultValue, updateValue] as const
}