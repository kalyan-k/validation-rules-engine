import { useMemo, useState, type PropsWithChildren } from 'react';
import { atom, createStore, Provider, useAtom, useAtomValue, type PrimitiveAtom, type Atom } from 'jotai';
import type { ValidationTarget } from '@validation-rules/react';
import { cloneModel, countPopulatedValues, ShowcaseStateContext, type StateProviderProps } from '../types';

interface ShowcaseAtoms {
  modelAtom: PrimitiveAtom<ValidationTarget>;
  revisionAtom: PrimitiveAtom<number>;
  populatedAtom: Atom<number>;
}

export function JotaiProvider({ initialModel, children }: StateProviderProps) {
  const [store] = useState(() => createStore());
  const [atoms] = useState<ShowcaseAtoms>(() => {
    const modelAtom = atom<ValidationTarget>(cloneModel(initialModel));
    return {
      modelAtom,
      revisionAtom: atom(0),
      populatedAtom: atom((get) => countPopulatedValues(get(modelAtom)))
    };
  });
  return <Provider store={store}><JotaiBridge atoms={atoms}>{children}</JotaiBridge></Provider>;
}

function JotaiBridge({ atoms, children }: PropsWithChildren<{ atoms: ShowcaseAtoms }>) {
  const [model, setModelAtom] = useAtom(atoms.modelAtom);
  const [revision, setRevision] = useAtom(atoms.revisionAtom);
  const populatedValues = useAtomValue(atoms.populatedAtom);
  const value = useMemo(() => ({
    model,
    revision,
    populatedValues,
    setModel(nextModel: ValidationTarget) {
      setModelAtom(nextModel);
      setRevision((current) => current + 1);
    },
    reset(nextModel: ValidationTarget) {
      setModelAtom(cloneModel(nextModel));
      setRevision((current) => current + 1);
    }
  }), [model, populatedValues, revision, setModelAtom, setRevision]);
  return <ShowcaseStateContext.Provider value={value}>{children}</ShowcaseStateContext.Provider>;
}
