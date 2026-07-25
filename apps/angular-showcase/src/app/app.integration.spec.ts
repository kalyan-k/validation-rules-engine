import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ValidationProviderService } from '@validation-rules/angular';
import { AppComponent } from './app.component';
import { AppModule } from './app.module';

describe('showcase application integration', () => {
  let fixture: ComponentFixture<AppComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppModule] }).compileComponents();
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('initializes registered policies and renders the routed home page inside the shell', async () => {
    await router.navigateByUrl('/');
    fixture.detectChanges();

    const validation = TestBed.inject(ValidationProviderService);
    expect(validation.hasPolicy('SampleForm')).toBeTrue();
    expect(validation.hasPolicy('PerformanceConfig')).toBeTrue();
    expect(fixture.nativeElement.querySelector('app-showcase-shell')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-home')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('UI framework showcases');
  });

  it('redirects legacy and unknown routes', async () => {
    await router.navigateByUrl('/sample-form');
    fixture.detectChanges();
    expect(router.url).toBe('/showcases/bootstrap');
    expect(fixture.nativeElement.querySelector('app-framework-showcase')).not.toBeNull();

    await router.navigateByUrl('/does-not-exist');
    fixture.detectChanges();
    expect(router.url).toBe('/');
  });

  it('renders framework-specific tabs and switches form scenarios through user clicks', async () => {
    await router.navigateByUrl('/showcases/bootstrap');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Bootstrap 5 Showcase');
    expect(fixture.nativeElement.querySelector('app-sample-form')).not.toBeNull();

    const tabs = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.showcase-tab');
    tabs[1].click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-complex-form')).not.toBeNull();

    tabs[2].click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-performance-form')).not.toBeNull();
  });

  it('submits and clears the Bootstrap sample form through DOM events', async () => {
    await router.navigateByUrl('/showcases/bootstrap');
    fixture.detectChanges();
    const form = (fixture.nativeElement as HTMLElement).querySelector<HTMLFormElement>('app-sample-form form')!;

    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-sample-form .alert.mt-3')?.textContent)
      .toContain('Please fix validation errors before submitting.');

    const clear = Array.from(form.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.trim() === 'Clear') as HTMLButtonElement;
    clear.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-sample-form .alert.mt-3')).toBeNull();
    expect((form.querySelector('#textInput') as HTMLInputElement).value).toBe('');
  });

  it('contains explicit framework routes, legacy redirects, and a wildcard fallback', () => {
    const children = router.config[0].children ?? [];
    expect(children.find((route) => route.path === 'showcases/material')?.data?.['framework']).toBe('material');
    expect(children.find((route) => route.path === 'performance-form')?.redirectTo).toBe('showcases/bootstrap');
    expect(router.config.at(-1)?.path).toBe('**');
  });
});
