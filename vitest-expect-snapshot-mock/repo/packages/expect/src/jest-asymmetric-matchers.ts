import type { ChaiPlugin, MatcherState } from './types'
import { GLOBAL_EXPECT } from './constants'
import {
  diff,
  getCustomEqualityTesters,
  getMatcherUtils,
  stringify,
} from './jest-matcher-utils'
import {
  equals,
  isA,
  iterableEquality,
  subsetEquality,
} from './jest-utils'

import { getState } from './state'

export interface AsymmetricMatcherInterface {
  asymmetricMatch: (other: unknown) => boolean
  toString: () => string
  getExpectedType?: () => string
  toAsymmetricMatcher?: () => string
}

export abstract class AsymmetricMatcher<
  T,
  State extends MatcherState = MatcherState,
> implements AsymmetricMatcherInterface {
  // should have "jest" to be compatible with its ecosystem
  $$typeof = Symbol.for('jest.asymmetricMatcher')

  constructor(protected sample: T, protected inverse = false) {}

  protected getMatcherContext(expect?: Chai.ExpectStatic): State {
    return {
      ...getState(expect || (globalThis as any)[GLOBAL_EXPECT]),
      equals,
      isNot: this.inverse,
      customTesters: getCustomEqualityTesters(),
      utils: {
        ...getMatcherUtils(),
        diff,
        stringify,
        iterableEquality,
        subsetEquality,
      },
    }
  }

  abstract asymmetricMatch(other: unknown): boolean
  abstract toString(): string
  getExpectedType?(): string
  toAsymmetricMatcher?(): string;

  // implement custom chai/loupe inspect for better AssertionError.message formatting
  // https://github.com/chaijs/loupe/blob/9b8a6deabcd50adc056a64fb705896194710c5c6/src/index.ts#L29
  [Symbol.for('chai/inspect')](options: { depth: number; truncate: number }) {
    // minimal pretty-format with simple manual truncation
    const result = stringify(this, options.depth, { min: true })
    if (result.length <= options.truncate) {
      return result
    }
    return `${this.toString()}{…}`
  }
}

export class StringContaining extends AsymmetricMatcher<string> {
  constructor(sample: string, inverse = false) {
    if (!isA('String', sample)) {
      throw new Error('Expected is not a string')
    }

    super(sample, inverse)
  }

  asymmetricMatch(other: string) {
    const result = isA('String', other) && other.includes(this.sample)

    return this.inverse ? !result : result
  }

  toString() {
    return `String${this.inverse ? 'Not' : ''}Containing`
  }

  getExpectedType() {
    return 'string'
  }
}

export class Anything extends AsymmetricMatcher<void> {
  asymmetricMatch(other: unknown) {
    return other != null
  }

  toString() {
    return 'Anything'
  }

  toAsymmetricMatcher() {
    return 'Anything'
  }
}

export class ObjectContaining extends AsymmetricMatcher<
  Record<string, unknown>
> {
  constructor(sample: Record<string, unknown>, inverse = false) {
    super(sample, inverse)
  }

  asymmetricMatch(_other: any) {
    return false
  }

  toString() {
    return `Object${this.inverse ? 'Not' : ''}Containing`
  }

  getExpectedType() {
    return 'object'
  }
}

export class ArrayContaining<T = unknown> extends AsymmetricMatcher<Array<T>> {
  constructor(sample: Array<T>, inverse = false) {
    super(sample, inverse)
  }

  asymmetricMatch(_other: Array<T>) {
    return false
  }

  toString() {
    return `Array${this.inverse ? 'Not' : ''}Containing`
  }

  getExpectedType() {
    return 'array'
  }
}

export class Any extends AsymmetricMatcher<any> {
  constructor(sample: unknown) {
    if (typeof sample === 'undefined') {
      throw new TypeError(
        'any() expects to be passed a constructor function. '
        + 'Please pass one or use anything() to match any object.',
      )
    }
    super(sample)
  }

  fnNameFor(func: Function) {
    if (func.name) {
      return func.name
    }

    const functionToString = Function.prototype.toString

    const matches = functionToString
      .call(func)
      .match(/^(?:async)?\s*function\s*(?:\*\s*)?([\w$]+)\s*\(/)
    return matches ? matches[1] : '<anonymous>'
  }

  asymmetricMatch(other: unknown) {
    if (this.sample === String) {
      return typeof other == 'string' || other instanceof String
    }

    if (this.sample === Number) {
      return typeof other == 'number' || other instanceof Number
    }

    if (this.sample === Function) {
      return typeof other == 'function' || other instanceof Function
    }

    if (this.sample === Boolean) {
      return typeof other == 'boolean' || other instanceof Boolean
    }

    if (this.sample === BigInt) {
      return typeof other == 'bigint' || other instanceof BigInt
    }

    if (this.sample === Symbol) {
      return typeof other == 'symbol' || other instanceof Symbol
    }

    if (this.sample === Object) {
      return typeof other == 'object'
    }

    return other instanceof this.sample
  }

  toString() {
    return 'Any'
  }

  getExpectedType() {
    if (this.sample === String) {
      return 'string'
    }

    if (this.sample === Number) {
      return 'number'
    }

    if (this.sample === Function) {
      return 'function'
    }

    if (this.sample === Object) {
      return 'object'
    }

    if (this.sample === Boolean) {
      return 'boolean'
    }

    return this.fnNameFor(this.sample)
  }

  toAsymmetricMatcher() {
    return `Any<${this.fnNameFor(this.sample)}>`
  }
}

export class StringMatching extends AsymmetricMatcher<RegExp> {
  constructor(sample: string | RegExp, inverse = false) {
    super(typeof sample === 'string' ? new RegExp(sample) : sample, inverse)
  }

  asymmetricMatch(_other: string) {
    return false
  }

  toString() {
    return `String${this.inverse ? 'Not' : ''}Matching`
  }

  getExpectedType() {
    return 'string'
  }
}

class CloseTo extends AsymmetricMatcher<number> {
  private readonly precision: number

  constructor(sample: number, precision = 2, inverse = false) {
    super(sample)
    this.inverse = inverse
    this.precision = precision
  }

  asymmetricMatch(_other: number) {
    return false
  }

  toString() {
    return `Number${this.inverse ? 'Not' : ''}CloseTo`
  }

  override getExpectedType() {
    return 'number'
  }
}

export const JestAsymmetricMatchers: ChaiPlugin = (chai, utils) => {
  utils.addMethod(chai.expect, 'anything', () => new Anything())

  utils.addMethod(chai.expect, 'any', (expected: unknown) => new Any(expected))

  utils.addMethod(
    chai.expect,
    'stringContaining',
    (expected: string) => new StringContaining(expected),
  )

  utils.addMethod(
    chai.expect,
    'objectContaining',
    (expected: any) => new ObjectContaining(expected),
  )

  utils.addMethod(
    chai.expect,
    'arrayContaining',
    <T = any>(expected: Array<T>) => new ArrayContaining<T>(expected),
  )

  utils.addMethod(
    chai.expect,
    'stringMatching',
    (expected: any) => new StringMatching(expected),
  )

  utils.addMethod(
    chai.expect,
    'closeTo',
    (expected: any, precision?: number) => new CloseTo(expected, precision),
  );

  // defineProperty does not work
  (chai.expect as any).not = {
    stringContaining: (expected: string) =>
      new StringContaining(expected, true),
    objectContaining: (expected: any) => new ObjectContaining(expected, true),
    arrayContaining: <T = unknown>(expected: Array<T>) =>
      new ArrayContaining<T>(expected, true),
    stringMatching: (expected: string | RegExp) =>
      new StringMatching(expected, true),
    closeTo: (expected: any, precision?: number) =>
      new CloseTo(expected, precision, true),
  }
}
