import { GradescopeProxyMethods } from '../components/GradescopeWebViewProxy';

// Global registry to store proxy references
let gradescopeProxy: GradescopeProxyMethods | null = null;

export const setGradescopeProxy = (proxy: GradescopeProxyMethods) => {
  console.log('Registering Gradescope proxy');
  gradescopeProxy = proxy;
};

export const getGradescopeProxy = (): GradescopeProxyMethods | null => {
  return gradescopeProxy;
};

export const clearGradescopeProxy = () => {
  console.log('Clearing Gradescope proxy');
  gradescopeProxy = null;
};