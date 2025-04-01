export default function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(deepClone) as any;
    }

    const result: any = {};
    for (const key in obj) {
        result[key] = deepClone(obj[key]);
    }
    return result;
}
