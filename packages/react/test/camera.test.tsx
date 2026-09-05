import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Camera, useCamera } from '../src';
import { renderInGlobe } from './helpers';

function CameraProbe() {
  const camera = useCamera();
  return (
    <div>
      <span data-testid="range">{camera.state.range}</span>
      <button onClick={() => camera.zoomIn()}>zoom</button>
    </div>
  );
}

describe('camera', () => {
  it('exposes state that updates after frames and bound controls', async () => {
    const { wwd } = await renderInGlobe(<CameraProbe />, { view: { range: 1000 } });
    expect(screen.getByTestId('range').textContent).toBe('1000');

    fireEvent.click(screen.getByText('zoom'));
    expect(wwd.navigator.range).toBe(500);
    expect(screen.getByTestId('range').textContent).toBe('1000');

    act(() => wwd.simulateFrame());
    await waitFor(() => expect(screen.getByTestId('range').textContent).toBe('500'));
  });

  it('drives the camera declaratively', async () => {
    const { wwd, rerender } = await renderInGlobe(<Camera latitude={10} longitude={20} range={5000} animate={500} />);
    await waitFor(() => expect(wwd.navigator.lookAtLocation).toMatchObject({ latitude: 10, longitude: 20 }));
    expect(wwd.goToAnimator.calls).toHaveLength(0);

    await rerender(<Camera latitude={30} longitude={40} range={5000} animate={500} />);
    await waitFor(() => expect(wwd.goToAnimator.calls).toHaveLength(1));
    expect(wwd.goToAnimator.travelTime).toBe(500);
    expect(wwd.navigator.lookAtLocation).toMatchObject({ latitude: 30, longitude: 40 });
  });
});
