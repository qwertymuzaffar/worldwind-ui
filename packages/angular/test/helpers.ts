import type { Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { installFakeWorldWind, type FakeWorldWind, type FakeWorldWindow } from 'worldwind-kit/testing';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Lets pending promises (globe creation, effects, outputs) and change detection run. */
export async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 3; i += 1) {
    await tick();
    await fixture.whenStable();
  }
}

export interface Mounted<T> {
  fixture: ComponentFixture<T>;
  fake: FakeWorldWind;
  wwd: FakeWorldWindow;
  element: HTMLElement;
}

/** Installs the fake WorldWind, creates the host component and waits for its globe to be ready. */
export async function mount<T>(host: Type<T>): Promise<Mounted<T>> {
  const fake = installFakeWorldWind();
  const fixture = TestBed.createComponent(host);
  fixture.autoDetectChanges();
  await settle(fixture);
  const wwd = fake.windows[0];
  if (!wwd) throw new Error('the globe was not created');
  return { fixture, fake, wwd, element: fixture.nativeElement as HTMLElement };
}

export function query<E extends Element = HTMLElement>(element: Element, selector: string): E {
  const found = element.querySelector<E>(selector);
  if (!found) throw new Error(`no element matches "${selector}"`);
  return found;
}

export function setInputValue(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
