import { Cache } from './cache.service';
import * as Debug from 'debug';
import { EventEmitter } from 'events';
import { timeOutResponse } from '../utils';

const logger = Debug('acp:service:pool');

const TIMEOUT: number = (+process.env.TIMEOUT) || 5000;

export class RequestPool {
    static pool: Set<string> = new Set();
    static ee: EventEmitter = (new EventEmitter()).setMaxListeners(Infinity);

    static has(key: string) {
        return RequestPool.pool.has(key);
    }
    static add(key: string) {
        RequestPool.pool.add(key);
        return RequestPool;
    }

    static wait(key: string) {
        logger(`wating for ${key}`);
        return new Promise((resolve) => {

            const timeout = setTimeout(() => {
                RequestPool.pool.delete(key);
                RequestPool.ee.off(key, handler);
                logger(`TIMEOUT ${key}`);
                handler(timeOutResponse('RequestPool failed'));
            }, TIMEOUT);

            function handler(data: any) {
                clearTimeout(timeout);
                resolve(data);
                logger(`respond for ${key}`);
            }

            RequestPool.ee.once(key, handler);
        });
    }

    static async putAndPublish(key: string, data: any, expires: number) {
        logger(`putting and publishing for ${key}`);
        RequestPool.pool.delete(key);
        RequestPool.ee.emit(key, data);
        await Cache.put(key, data, expires);
        return data;
    }

    static async errorAndPublish(key: string, data: any) {
        logger(`error and publishing for ${key}`);
        RequestPool.pool.delete(key);
        RequestPool.ee.emit(key, data);
    }
}
