import { createContext, useContext } from 'react';

export interface NavState { view: string; param?: string }
export interface NavCtx extends NavState { go: (view: string, param?: string) => void; back: () => void }

export const NavContext = createContext<NavCtx>({ view: 'home', go: () => {}, back: () => {} });
export const useNav = () => useContext(NavContext);
