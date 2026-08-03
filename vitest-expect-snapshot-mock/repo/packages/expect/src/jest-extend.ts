import type {
  ChaiPlugin,
  ExpectStatic,
  MatchersObject,
} from './types'

export const JestExtend: ChaiPlugin = (chai, utils) => {
  utils.addMethod(
    chai.expect,
    'extend',
    (_expect: ExpectStatic, _expects: MatchersObject) => {},
  )
}
