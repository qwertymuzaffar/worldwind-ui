import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { uninstallWorldWind } from 'worldwind-kit/testing';

afterEach(() => {
  cleanup();
  uninstallWorldWind();
});
