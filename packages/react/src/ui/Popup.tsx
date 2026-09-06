import { useEffect, useRef, type ReactNode } from 'react';
import type { LatLonAlt } from 'worldwind-kit';
import { useGlobe } from '../context';
import { cx, useLatest } from '../internal/utils';

export type PopupAnchor = 'bottom' | 'top' | 'left' | 'right' | 'center';

export interface PopupProps {
  /** The geographic position the popup points at. */
  position: LatLonAlt;
  /** Which side of the position the popup sits on. `bottom` means the popup's bottom edge touches the point (popup above it). Default `bottom`. */
  anchor?: PopupAnchor;
  /** Extra offset in CSS pixels. */
  offset?: { x?: number; y?: number };
  /** Optional bold first line. */
  title?: ReactNode;
  /** Renders a close button that calls this. */
  onClose?: () => void;
  /** Hide the popup while its position is behind the globe or off screen. Default true. */
  hideWhenHidden?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * An HTML overlay anchored to a geographic position that follows the globe as it moves.
 * Render it inside `<Globe>`; content is ordinary React.
 * @category Widgets
 */
export function Popup({ position, anchor = 'bottom', offset, title, onClose, hideWhenHidden = true, className, children }: PopupProps) {
  const globe = useGlobe();
  const element = useRef<HTMLDivElement>(null);
  const latest = useLatest({ offset, hideWhenHidden });
  const { latitude, longitude, altitude } = position;

  useEffect(() => {
    const node = element.current;
    if (!node) return;
    return globe.trackPosition({ latitude, longitude, altitude }, (point) => {
      const { offset, hideWhenHidden } = latest.current;
      if (!point || (hideWhenHidden && !point.visible)) {
        node.style.visibility = 'hidden';
        return;
      }
      node.style.visibility = 'visible';
      node.style.transform = `translate(${point.x + (offset?.x ?? 0)}px, ${point.y + (offset?.y ?? 0)}px)`;
    });
  }, [globe, latitude, longitude, altitude, latest]);

  return (
    <div ref={element} className={cx('wwui-popup', `wwui-popup--${anchor}`, className)} style={{ visibility: 'hidden' }} role="dialog">
      <div className="wwui-popup__inner">
        {onClose ? (
          <button type="button" className="wwui-popup__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        ) : null}
        {title != null ? <div className="wwui-popup__title">{title}</div> : null}
        {children}
      </div>
    </div>
  );
}
