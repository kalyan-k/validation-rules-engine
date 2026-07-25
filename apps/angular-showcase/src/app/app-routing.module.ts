import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ShowcaseShellComponent } from './layout/showcase-shell.component';
import { HomeComponent } from './pages/home/home.component';
import { FrameworkShowcaseComponent } from './pages/framework-showcase/framework-showcase.component';
import { provideShowcaseFrameworkDisplay } from './showcase/showcase-framework.providers';
import { AngularStateShowcaseComponent } from './state-management/angular-state-showcase.component';

const routes: Routes = [
  {
    path: '',
    component: ShowcaseShellComponent,
    children: [
      { path: '', component: HomeComponent },
      {
        path: 'showcases/bootstrap',
        component: FrameworkShowcaseComponent,
        data: { framework: 'bootstrap' },
        providers: provideShowcaseFrameworkDisplay('bootstrap')
      },
      {
        path: 'showcases/material',
        component: FrameworkShowcaseComponent,
        data: { framework: 'material' },
        providers: provideShowcaseFrameworkDisplay('material')
      },
      {
        path: 'showcases/tailwind',
        component: FrameworkShowcaseComponent,
        data: { framework: 'tailwind' },
        providers: provideShowcaseFrameworkDisplay('tailwind')
      },
      {
        path: 'state/:strategy',
        component: AngularStateShowcaseComponent,
        data: { page: 'overview' }
      },
      {
        path: 'state/:strategy/simple',
        component: AngularStateShowcaseComponent,
        data: { page: 'simple' }
      },
      {
        path: 'state/:strategy/complex',
        component: AngularStateShowcaseComponent,
        data: { page: 'complex' }
      },
      {
        path: 'state/:strategy/performance',
        component: AngularStateShowcaseComponent,
        data: { page: 'performance' }
      },
      { path: 'showcases', redirectTo: 'showcases/bootstrap', pathMatch: 'full' },
      { path: 'state', redirectTo: 'state/template-driven', pathMatch: 'full' },
      { path: 'reactive-forms', redirectTo: 'state/reactive-forms', pathMatch: 'full' },
      { path: 'sample-form', redirectTo: 'showcases/bootstrap', pathMatch: 'full' },
      { path: 'complex-form', redirectTo: 'showcases/bootstrap', pathMatch: 'full' },
      { path: 'performance-form', redirectTo: 'showcases/bootstrap', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
