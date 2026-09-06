import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../internal/utils';

/** @category Widgets */
export type PanelPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';

/** @category Widgets */
export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  position?: PanelPosition;
  /** Small uppercase heading. */
  heading?: ReactNode;
}

/** A floating card in one corner of the globe. Styled by `react-worldwind/styles.css`.
 * @category Widgets
 */
export function Panel({ position = 'top-left', heading, className, children, ...rest }: PanelProps) {
  return (
    <div className={cx('wwui-panel', `wwui-panel--${position}`, className)} {...rest}>
      {heading != null && heading !== '' ? <h3 className="wwui-panel__title">{heading}</h3> : null}
      {children}
    </div>
  );
}
