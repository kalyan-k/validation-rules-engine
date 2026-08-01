import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { StoreModule } from '@ngrx/store';
import { NgxsModule } from '@ngxs/store';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ShowcaseShellComponent } from './layout/showcase-shell.component';
import { HomeComponent } from './pages/home/home.component';
import { FrameworkShowcaseComponent } from './pages/framework-showcase/framework-showcase.component';
import { SampleFormComponent } from './components/sample-form/sample-form.component';
import { SampleFormMaterialComponent } from './components/sample-form/sample-form-material.component';
import { SampleFormTailwindComponent } from './components/sample-form/sample-form-tailwind.component';
import { ComplexFormComponent } from './components/complex-form/complex-form.component';
import { ComplexFormMaterialComponent } from './components/complex-form/complex-form-material.component';
import { ComplexFormTailwindComponent } from './components/complex-form/complex-form-tailwind.component';
import { PerformanceFormComponent } from './components/performance-form/performance-form.component';
import { PerformanceFormSectionComponent } from './components/performance-form/performance-form-section.component';
import { PerformanceFormErrorSummaryComponent } from './components/performance-form/performance-form-error-summary.component';
import { ValidationModule } from '@validation-rules-engine/angular';
import { validationProviders } from './validation.providers';
import { AngularStateShowcaseComponent } from './state-management/angular-state-showcase.component';
import {
  AngularStateShowcaseNgxsState,
  angularStateShowcaseReducer
} from './state-management/angular-state-runtime.service';

@NgModule({
  declarations: [
    AppComponent,
    ShowcaseShellComponent,
    HomeComponent,
    FrameworkShowcaseComponent,
    SampleFormComponent,
    SampleFormMaterialComponent,
    SampleFormTailwindComponent,
    ComplexFormComponent,
    ComplexFormMaterialComponent,
    ComplexFormTailwindComponent,
    PerformanceFormComponent,
    PerformanceFormSectionComponent,
    PerformanceFormErrorSummaryComponent,
    AngularStateShowcaseComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    AppRoutingModule,
    StoreModule.forRoot({ angularStateShowcase: angularStateShowcaseReducer }),
    NgxsModule.forRoot([AngularStateShowcaseNgxsState]),
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    ValidationModule.forRoot({
      invalidClass: 'is-invalid',
      errorClass: 'invalid-feedback d-block',
      errorContainerClass: 'policy-validation-error-container',
      requiredMarkerClass: 'policy-validation-required-marker text-danger'
    })
  ],
  providers: [...validationProviders],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent]
})
export class AppModule { }
