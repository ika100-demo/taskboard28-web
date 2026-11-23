// Acceptance tests load the modules under test lazily: a module that does not exist yet fails the test that needs
// it (at run time) instead of failing the collection of the whole file.
export function load<T>(path: string): Promise<T> {
  const target = path.startsWith("@/") ? `${process.cwd()}/${path.slice(2)}` : path;
  return import(/* @vite-ignore */ target) as Promise<T>;
}
