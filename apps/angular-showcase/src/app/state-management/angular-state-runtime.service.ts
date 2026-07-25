import { computed, Injectable, OnDestroy, Optional, signal } from '@angular/core';
import {
  createAction,
  createReducer,
  on,
  props,
  Store as NgRxStore
} from '@ngrx/store';
import {
  Action as NgxsAction,
  Selector,
  State,
  StateContext,
  Store as NgxsStore
} from '@ngxs/store';
import { Store as AkitaStore } from '@datorama/akita/src/lib/store';
import { Query as AkitaQuery } from '@datorama/akita/src/lib/query';
import { createStore as createElfStore, setProps, withProps } from '@ngneat/elf';
import { RxState } from '@rx-angular/state';
import { BehaviorSubject } from 'rxjs';
import {
  AngularStateComplexModel,
  AngularStateSimpleModel,
  type AngularStateStrategyId,
  createComplexModel,
  createSimpleModel
} from './angular-state-showcase.model';

export interface AngularStateRuntimeSnapshot {
  strategyId: AngularStateStrategyId;
  simple: AngularStateSimpleModel;
  complex: AngularStateComplexModel;
  lifecycle: 'editing' | 'validating' | 'valid' | 'invalid' | 'saved';
  lastEvent: string;
  updatedAt: string;
}

export interface AngularStateRuntimeRoot {
  angularStateShowcase: AngularStateRuntimeSnapshot;
}

export function createAngularStateRuntimeSnapshot(
  strategyId: AngularStateStrategyId = 'template-driven',
  simple: AngularStateSimpleModel = createSimpleModel(),
  complex: AngularStateComplexModel = createComplexModel(),
  lifecycle: AngularStateRuntimeSnapshot['lifecycle'] = 'editing',
  lastEvent = 'Initialized showcase state.'
): AngularStateRuntimeSnapshot {
  return {
    strategyId,
    simple: cloneSimpleModel(simple),
    complex: cloneComplexModel(complex),
    lifecycle,
    lastEvent,
    updatedAt: new Date().toISOString()
  };
}

export const initialAngularStateRuntimeSnapshot = createAngularStateRuntimeSnapshot();

export const angularStateSnapshotCommitted = createAction(
  '[Angular State Showcase] Snapshot Committed',
  props<{ snapshot: AngularStateRuntimeSnapshot }>()
);

export const angularStateShowcaseReducer = createReducer(
  initialAngularStateRuntimeSnapshot,
  on(angularStateSnapshotCommitted, (_state, { snapshot }) => snapshot)
);

export class CommitAngularStateSnapshot {
  static readonly type = '[Angular State Showcase] Commit Snapshot';

  constructor(public readonly snapshot: AngularStateRuntimeSnapshot) {}
}

@State<AngularStateRuntimeSnapshot>({
  name: 'angularStateShowcaseNgxs',
  defaults: initialAngularStateRuntimeSnapshot
})
@Injectable()
export class AngularStateShowcaseNgxsState {
  @Selector()
  static snapshot(state: AngularStateRuntimeSnapshot): AngularStateRuntimeSnapshot {
    return state;
  }

  @NgxsAction(CommitAngularStateSnapshot)
  commit(ctx: StateContext<AngularStateRuntimeSnapshot>, action: CommitAngularStateSnapshot): void {
    ctx.setState(action.snapshot);
  }
}

@Injectable()
export class AngularStateStrategyRuntime implements OnDestroy {
  private latest = initialAngularStateRuntimeSnapshot;
  private readonly templateDrivenStore = new BehaviorSubject<AngularStateRuntimeSnapshot>(this.latest);
  private readonly reactiveFormsStore = new BehaviorSubject<AngularStateRuntimeSnapshot>(this.latest);
  private readonly customRxjsStore = new BehaviorSubject<AngularStateRuntimeSnapshot>(this.latest);
  private readonly signalsStore = signal(this.latest);
  readonly signalsErrorCount = computed(() =>
    (this.signalsStore().simple.validationResults?.length ?? 0)
    + (this.signalsStore().complex.validationResults?.length ?? 0)
  );
  private readonly akitaStore = new AkitaStore<AngularStateRuntimeSnapshot>(
    this.latest,
    { name: 'angular-state-showcase-akita' }
  );
  private readonly akitaQuery = new AkitaQuery(this.akitaStore);
  private readonly elfStore = createElfStore(
    { name: 'angular-state-showcase-elf' },
    withProps<AngularStateRuntimeSnapshot>(this.latest)
  );

  constructor(
    @Optional() private readonly ngrxStore: NgRxStore<AngularStateRuntimeRoot> | null,
    @Optional() private readonly ngxsStore: NgxsStore | null,
    private readonly rxAngularState: RxState<AngularStateRuntimeSnapshot>
  ) {
    this.rxAngularState.set(this.latest);
  }

  initialize(
    strategyId: AngularStateStrategyId,
    simple: AngularStateSimpleModel,
    complex: AngularStateComplexModel
  ): AngularStateRuntimeSnapshot {
    return this.commit(strategyId, simple, complex, 'Initialized state strategy.', 'editing');
  }

  commitSimple(
    strategyId: AngularStateStrategyId,
    simple: AngularStateSimpleModel,
    lifecycle: AngularStateRuntimeSnapshot['lifecycle'],
    lastEvent: string
  ): AngularStateRuntimeSnapshot {
    return this.commit(strategyId, simple, this.latest.complex, lastEvent, lifecycle);
  }

  commitComplex(
    strategyId: AngularStateStrategyId,
    complex: AngularStateComplexModel,
    lifecycle: AngularStateRuntimeSnapshot['lifecycle'],
    lastEvent: string
  ): AngularStateRuntimeSnapshot {
    return this.commit(strategyId, this.latest.simple, complex, lastEvent, lifecycle);
  }

  snapshot(): AngularStateRuntimeSnapshot {
    return this.latest;
  }

  ngOnDestroy(): void {
    this.templateDrivenStore.complete();
    this.reactiveFormsStore.complete();
    this.customRxjsStore.complete();
    this.akitaStore.destroy();
    this.elfStore.destroy();
  }

  private commit(
    strategyId: AngularStateStrategyId,
    simple: AngularStateSimpleModel,
    complex: AngularStateComplexModel,
    lastEvent: string,
    lifecycle: AngularStateRuntimeSnapshot['lifecycle']
  ): AngularStateRuntimeSnapshot {
    const snapshot = createAngularStateRuntimeSnapshot(strategyId, simple, complex, lifecycle, lastEvent);
    this.latest = snapshot;

    switch (strategyId) {
      case 'template-driven':
        this.templateDrivenStore.next(snapshot);
        break;
      case 'reactive-forms':
        this.reactiveFormsStore.next(snapshot);
        break;
      case 'ngrx':
        this.ngrxStore?.dispatch(angularStateSnapshotCommitted({ snapshot }));
        break;
      case 'ngxs':
        this.ngxsStore?.dispatch(new CommitAngularStateSnapshot(snapshot)).subscribe();
        break;
      case 'akita':
        this.akitaStore.update(snapshot);
        this.akitaQuery.getValue();
        break;
      case 'elf':
        this.elfStore.update(setProps(snapshot));
        break;
      case 'rx-angular-state':
        this.rxAngularState.set(snapshot);
        break;
      case 'signals':
        this.signalsStore.set(snapshot);
        this.signalsErrorCount();
        break;
      case 'custom-rxjs-store':
        this.customRxjsStore.next(snapshot);
        break;
    }

    return snapshot;
  }
}

function cloneSimpleModel(model: AngularStateSimpleModel): AngularStateSimpleModel {
  return Object.assign(new AngularStateSimpleModel(), structuredClone(model));
}

function cloneComplexModel(model: AngularStateComplexModel): AngularStateComplexModel {
  return Object.assign(new AngularStateComplexModel(), structuredClone(model));
}
