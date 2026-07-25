import { useMemo, useState, type PropsWithChildren } from 'react';
import { makeAutoObservable, observable } from 'mobx';
import { observer } from 'mobx-react-lite';
import type { ValidationTarget } from '@validation-rules/react';
import { cloneModel, countPopulatedValues, ShowcaseStateContext, type StateProviderProps } from '../types';

class MobxShowcaseStore {
  model: ValidationTarget;
  revision = 0;

  constructor(initialModel: ValidationTarget) {
    this.model = cloneModel(initialModel);
    makeAutoObservable(this, { model: observable.ref }, { autoBind: true });
  }

  get populatedValues(): number {
    return countPopulatedValues(this.model);
  }

  replaceModel(nextModel: ValidationTarget): void {
    this.model = nextModel;
    this.revision += 1;
  }

  resetModel(nextModel: ValidationTarget): void {
    this.model = cloneModel(nextModel);
    this.revision += 1;
  }
}

export function MobxProvider({ initialModel, children }: StateProviderProps) {
  const [store] = useState(() => new MobxShowcaseStore(initialModel));
  return <MobxBridge store={store}>{children}</MobxBridge>;
}

const MobxBridge = observer(function MobxBridge({ store, children }: PropsWithChildren<{ store: MobxShowcaseStore }>) {
  const value = useMemo(() => ({
    model: store.model,
    revision: store.revision,
    populatedValues: store.populatedValues,
    setModel: store.replaceModel,
    reset: store.resetModel
  }), [store, store.model, store.populatedValues, store.revision]);
  return <ShowcaseStateContext.Provider value={value}>{children}</ShowcaseStateContext.Provider>;
});
