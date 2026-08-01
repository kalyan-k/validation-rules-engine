import { useMemo, useState, type PropsWithChildren } from 'react';
import { configureStore, createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { Provider, useDispatch, useSelector } from 'react-redux';
import type { ValidationTarget } from '@validation-rules-engine/react';
import { cloneModel, countPopulatedValues, ShowcaseStateContext, type StateProviderProps } from '../types';

interface ShowcaseSliceState { serializedModel: string; revision: number; }
interface ShowcaseRootState { validationShowcase: ShowcaseSliceState; }

function createShowcaseStore(initialModel: ValidationTarget) {
  const slice = createSlice({
    name: 'validationShowcase',
    initialState: { serializedModel: JSON.stringify(cloneModel(initialModel)), revision: 0 } satisfies ShowcaseSliceState,
    reducers: {
      modelReplaced(state, action: PayloadAction<ValidationTarget>) {
        state.serializedModel = JSON.stringify(action.payload);
        state.revision += 1;
      },
      modelReset(state, action: PayloadAction<ValidationTarget>) {
        state.serializedModel = JSON.stringify(cloneModel(action.payload));
        state.revision += 1;
      }
    }
  });
  const store = configureStore({ reducer: { validationShowcase: slice.reducer } });
  return { store, actions: slice.actions };
}

const selectShowcaseState = (state: ShowcaseRootState) => state.validationShowcase;
const selectModel = createSelector(
  [selectShowcaseState],
  (state) => JSON.parse(state.serializedModel) as ValidationTarget
);
const selectRevision = createSelector([selectShowcaseState], (state) => state.revision);
const selectPopulatedValues = createSelector([selectModel], countPopulatedValues);

export function ReduxToolkitProvider({ initialModel, children }: StateProviderProps) {
  const [bundle] = useState(() => createShowcaseStore(initialModel));
  return <Provider store={bundle.store}><ReduxBridge actions={bundle.actions}>{children}</ReduxBridge></Provider>;
}

function ReduxBridge({ actions, children }: PropsWithChildren<{ actions: ReturnType<typeof createShowcaseStore>['actions'] }>) {
  const dispatch = useDispatch();
  const model = useSelector(selectModel);
  const revision = useSelector(selectRevision);
  const populatedValues = useSelector(selectPopulatedValues);
  const value = useMemo(() => ({
    model,
    revision,
    populatedValues,
    setModel: (nextModel: ValidationTarget) => dispatch(actions.modelReplaced(nextModel)),
    reset: (nextModel: ValidationTarget) => dispatch(actions.modelReset(nextModel))
  }), [actions, dispatch, model, populatedValues, revision]);
  return <ShowcaseStateContext.Provider value={value}>{children}</ShowcaseStateContext.Provider>;
}
