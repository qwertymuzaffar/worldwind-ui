import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { installFakeWorldWind, type FakeWorldWind } from 'worldwind-kit/testing';
import { Globe, useGlobe, type GlobeProps } from '../src';

function Ready() {
  const globe = useGlobe();
  return <span data-testid="ready">{globe.isDisposed ? 'disposed' : 'ready'}</span>;
}

/** Renders `ui` inside a `<Globe>` backed by the fake WorldWind and waits until it is ready. */
export async function renderInGlobe(ui: ReactNode, props: Partial<GlobeProps> = {}) {
  const fake: FakeWorldWind = installFakeWorldWind();
  const view = render(
    <Globe {...props}>
      {ui}
      <Ready />
    </Globe>,
  );
  await screen.findByTestId('ready');
  const wwd = fake.windows[0]!;
  const rerender = async (next: ReactNode) => {
    view.rerender(
      <Globe {...props}>
        {next}
        <Ready />
      </Globe>,
    );
    await screen.findByTestId('ready');
  };
  return { ...view, fake, wwd, rerender };
}
