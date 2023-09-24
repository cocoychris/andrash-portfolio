/**
 * This is the **internal property accessor function**
 *
 * This will give you the access to the "internal properties" of an object without any TypeScript Error.
 *
 * Since TypeScript has no such a concept of "internal property".
 * You could simply declare an internal property as a private property
 * and intentionally call this function when you have to access it.
 * @param object an instance of any class
 * @returns the original object you just passed in, but all the private properties are now accessable.
 */
export function internal(object: object): IIndexable {
  return object as unknown as IIndexable;
}
export interface IIndexable {
  [key: string]: any;
}
