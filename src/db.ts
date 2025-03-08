import { get, getMany, set, clear, entries, del } from "idb-keyval";

export async function GET (key: string, handler?: (err: Error) => void) {
    try {
        return await get(key);
    } catch (err) {
        if(handler) {
            handler(err as Error);
            return undefined;
        } else {
            console.log("Could not load data from IndexedDB.");
            return undefined;
        }
    }
}

export async function GETMANY (keys: Array<string>, handler?: (err: Error) => void) {
    try {
        return await getMany(keys);
    } catch (err) {
        if(handler) {
            handler(err as Error);
            return undefined;
        } else {
            console.log("Could not load data from IndexedDB.");
            return undefined;
        }
    }
}

export async function SET (key: string, value: any, handler?: (err: Error) => void) {
    try {
        await set(key, value);
    } catch (err) {
        if(handler) {
            handler(err as Error);
        } else {
            console.log("Could not set data IndexedDB.");
        }
    }
}

export function DEL (key: string) {
    del(key);
}

export function CLEAR () {
    clear();
}

export async function ENTRIES (handler?: (err: Error) => void) {
    try {
        return await entries();
    } catch (err) {
        if(handler) {
            handler(err as Error);
            return undefined;
        } else {
            console.log("Could not load data from IndexedDB.");
            return undefined;
        }
    }
}