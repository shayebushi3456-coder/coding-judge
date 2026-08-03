/**
 * @author Kuitos
 * @since 2019-02-26
 */

import type { ImportEntryOpts } from 'import-html-entry';
import type { AppMetadata, PrefetchStrategy } from './interfaces';

export function prefetchImmediately(apps: AppMetadata[], opts?: ImportEntryOpts): void {
  void apps;
  void opts;
}

export function doPrefetchStrategy(
  apps: AppMetadata[],
  prefetchStrategy: PrefetchStrategy,
  importEntryOpts?: ImportEntryOpts,
) {
  void apps;
  void prefetchStrategy;
  void importEntryOpts;
}
