// Angular JIT compiles the components at test time, so the compiler must load first.
import '@angular/compiler';
import { NgModule, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterEach } from 'vitest';
import { uninstallWorldWind } from 'worldwind-kit/testing';

@NgModule({ providers: [provideZonelessChangeDetection()] })
class ZonelessTestModule {}

TestBed.initTestEnvironment([BrowserTestingModule, ZonelessTestModule], platformBrowserTesting(), {
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

afterEach(() => {
  TestBed.resetTestingModule();
  uninstallWorldWind();
});
