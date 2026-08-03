/**
 * @author Kuitos
 * @since 2019-04-11
 */
import type { SandBox } from '../../interfaces';
import { SandBoxType } from '../../interfaces';

/**
 * 基于 Proxy 实现的沙箱
 */
export default class LegacySandbox implements SandBox {
  name: string;

  proxy: WindowProxy;

  globalContext: typeof window;

  type: SandBoxType;

  sandboxRunning = true;

  latestSetProp: PropertyKey | null = null;

  active() {
    this.sandboxRunning = true;
  }

  inactive() {
    this.sandboxRunning = false;
  }

  constructor(name: string, globalContext = window) {
    this.name = name;
    this.globalContext = globalContext;
    this.type = SandBoxType.LegacyProxy;

    const rawWindow = globalContext;
    const fakeWindow = Object.create(null) as Window;

    const proxy = new Proxy(fakeWindow, {
      set: (_: Window, p: PropertyKey, value: any): boolean => {
        if (this.sandboxRunning) {
          (rawWindow as any)[p] = value;
          this.latestSetProp = p;
        }
        return true;
      },

      get(_: Window, p: PropertyKey): any {
        if (p === 'top' || p === 'parent' || p === 'window' || p === 'self') {
          return proxy;
        }
        return (rawWindow as any)[p];
      },

      has(_: Window, p: string | number | symbol): boolean {
        return p in rawWindow;
      },

      getOwnPropertyDescriptor(_: Window, p: PropertyKey): PropertyDescriptor | undefined {
        return Object.getOwnPropertyDescriptor(rawWindow, p);
      },

      defineProperty(_: Window, p: string | symbol, attributes: PropertyDescriptor): boolean {
        return Reflect.defineProperty(rawWindow, p, attributes);
      },
    });

    this.proxy = proxy;
  }

  patchDocument(): void {}
}
