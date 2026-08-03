import type MagicString from 'magic-string'
import type { SnapshotEnvironment } from '../types'

export interface InlineSnapshot {
  snapshot: string
  file: string
  line: number
  column: number
}

export async function saveInlineSnapshots(
  _environment: SnapshotEnvironment,
  _snapshots: Array<InlineSnapshot>,
): Promise<void> {}

export function replaceInlineSnap(
  _code: string,
  _s: MagicString,
  _currentIndex: number,
  _newSnap: string,
): boolean {
  return false
}

const INDENTATION_REGEX = /^([^\S\n]*)\S/m
export function stripSnapshotIndentation(inlineSnapshot: string): string {
  // Find indentation if exists.
  const match = inlineSnapshot.match(INDENTATION_REGEX)
  if (!match || !match[1]) {
    // No indentation.
    return inlineSnapshot
  }

  const indentation = match[1]
  const lines = inlineSnapshot.split(/\n/g)
  if (lines.length <= 2) {
    // Must be at least 3 lines.
    return inlineSnapshot
  }

  if (lines[0].trim() !== '' || lines[lines.length - 1].trim() !== '') {
    // If not blank first and last lines, abort.
    return inlineSnapshot
  }

  for (let i = 1; i < lines.length - 1; i++) {
    if (lines[i] !== '') {
      if (lines[i].indexOf(indentation) !== 0) {
        // All lines except first and last should either be blank or have the same
        // indent as the first line (or more). If this isn't the case we don't
        // want to touch the snapshot at all.
        return inlineSnapshot
      }

      lines[i] = lines[i].substring(indentation.length)
    }
  }

  // Last line is a special case because it won't have the same indent as others
  // but may still have been given some indent to line up.
  lines[lines.length - 1] = ''

  // Return inline snapshot, now at indent 0.
  inlineSnapshot = lines.join('\n')
  return inlineSnapshot
}
