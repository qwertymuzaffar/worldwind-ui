import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FakeVec3 } from 'worldwind-kit/testing';
import { Popup } from '../src';
import { renderInGlobe } from './helpers';

describe('<Popup>', () => {
  it('follows its position across frames and hides when the point is behind the globe', async () => {
    const onClose = vi.fn();
    const { wwd, rerender } = await renderInGlobe(
      <Popup position={{ latitude: 0, longitude: 0 }} title="Origin" onClose={onClose}>
        body
      </Popup>,
    );
    const popup = document.querySelector<HTMLElement>('.wwui-popup')!;
    expect(popup.style.visibility).toBe('hidden');
    act(() => wwd.simulateFrame());
    await waitFor(() => expect(popup.style.visibility).toBe('visible'));
    expect(popup.style.transform).toBe('translate(400px, 300px)');
    expect(popup.className).toContain('wwui-popup--bottom');
    expect(screen.getByText('Origin')).toBeTruthy();
    expect(screen.getByText('body')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);

    wwd.drawContext.eyePoint = new FakeVec3(0, 0, -1e7);
    act(() => wwd.simulateFrame());
    await waitFor(() => expect(popup.style.visibility).toBe('hidden'));

    wwd.drawContext.eyePoint = new FakeVec3(0, 0, 1e7);
    await rerender(
      <Popup position={{ latitude: 90, longitude: -180 }} anchor="right" offset={{ x: 5, y: -5 }}>
        moved
      </Popup>,
    );
    act(() => wwd.simulateFrame());
    await waitFor(() => expect(document.querySelector<HTMLElement>('.wwui-popup')!.style.transform).toBe('translate(5px, -5px)'));
    expect(document.querySelector('.wwui-popup')!.className).toContain('wwui-popup--right');
  });

  it('detaches its tracker on unmount', async () => {
    const { wwd, rerender } = await renderInGlobe(<Popup position={{ latitude: 1, longitude: 2 }}>x</Popup>);
    await waitFor(() => expect(wwd.redrawCallbacks.length).toBeGreaterThanOrEqual(2));
    const before = wwd.redrawCallbacks.length;
    await rerender(null);
    await waitFor(() => expect(wwd.redrawCallbacks.length).toBe(before - 1));
  });
});
