import { IIndexable, applyDefault, cloneObject } from "./util";

interface IFieldDefBase {
  type: string;
  inputType?: string;
  acceptNull?: boolean;
  acceptUndefined?: boolean;
  valueList?: Array<any>;
  editable?: boolean;
  validator?: (value: any) => string | void;
}

interface IStringFieldDef extends IFieldDefBase {
  type: "string";
  valueList?: Array<string | null>;
  regExp?: RegExp;
  minLength?: number;
  maxLength?: number;
}
interface INumberFieldDef extends IFieldDefBase {
  type: "number";
  valueList?: Array<number | null>;
  maxNum?: number;
  minNum?: number;
}
interface IBooleanFieldDef extends IFieldDefBase {
  type: "boolean";
  valueList?: Array<boolean | null>;
}
interface IObjectFieldDef extends IFieldDefBase {
  type: "object";
  valueList?: Array<object | null>;
  children?: { [key: string]: IFieldDef };
  childDef?: FieldDef<any>;
}
interface IArrayFieldDef extends IFieldDefBase {
  type: "array";
  valueList?: Array<Array<any> | null>;
  children?: Array<IFieldDef>;
  childDef?: FieldDef<any>;
  minLength?: number;
  maxLength?: number;
}

export type IFieldDefType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array";

export type IFieldDef =
  | IStringFieldDef
  | INumberFieldDef
  | IBooleanFieldDef
  | IObjectFieldDef
  | IArrayFieldDef;

interface IValidateError<T> {
  isValid: false;
  path: string;
  errorType: string;
  message: string;
  value: any;
}
interface IValidateSuccess<T> {
  isValid: true;
  value: T;
}
export type IValidateResult<T> = IValidateError<T> | IValidateSuccess<T>;

const VALID_FIELD_DEF_TYPE_MAP: { [key: string]: boolean } = {
  string: true,
  number: true,
  boolean: true,
  object: true,
  array: true,
};

const MAX_VALUE_LIST_DISPLAY_LENGTH = 5;

export default class FieldDef<T> {
  public static readonly DEFAULT_FIELD_DEF: IFieldDef = Object.freeze({
    type: "string",
    inputType: "text",
    acceptNull: false,
    acceptUndefined: false,
    valueList: undefined,
    maxNum: undefined,
    minNum: undefined,
    minLength: undefined,
    maxLength: undefined,
    children: undefined,
    editable: true,
    regExp: undefined,
  });
  private _fieldDef: IFieldDef;
  private _fallbackValue: T;
  private _objectChildren?: { [key: string]: FieldDef<any> };
  private _arrayChildren?: Array<FieldDef<any>>;
  private _childCount: number = 0;

  /**
   * The name of this fieldDef
   */
  public readonly name: string;
  /**
   * The base path of this fieldDef
   */
  public readonly basePath: string;
  /**
   * The path of this fieldDef
   */
  public readonly path: string;

  /**
   * The type of this fieldDef
   */
  public get type(): IFieldDefType {
    return this._fieldDef.type;
  }
  /**
   * The input type for this fieldDef
   */
  public get inputType(): string | null {
    return this._fieldDef.inputType || null;
  }
  /**
   * Whether this fieldDef accepts null
   */
  public get acceptNull(): boolean {
    return this._fieldDef.acceptNull || false;
  }
  /**
   * Whether this fieldDef accepts undefined
   */
  public get acceptUndefined(): boolean {
    return this._fieldDef.acceptUndefined || false;
  }
  /**
   * Whether this fieldDef accepts null or undefined
   */
  public get valueList(): Array<any> | null {
    return this._fieldDef.valueList ? this._fieldDef.valueList.slice() : null;
  }
  /**
   * The maximum number for this fieldDef
   */
  public get maxNum(): number | null {
    let def = this._fieldDef as INumberFieldDef;
    return def.maxNum === undefined ? null : def.maxNum;
  }
  /**
   * The minimum number for this fieldDef
   */
  public get minNum(): number | null {
    let def = this._fieldDef as INumberFieldDef;
    return def.minNum === undefined ? null : def.minNum;
  }
  /**
   * Whether this fieldDef is editable
   */
  public get editable(): boolean {
    return this._fieldDef.editable || false;
  }
  /**
   * The regular expression for this fieldDef
   */
  public get regExp(): RegExp | null {
    return (this._fieldDef as IStringFieldDef).regExp || null;
  }
  /**
   * The minimum length for this fieldDef
   */
  public get minLength(): number | null {
    let def = this._fieldDef as IStringFieldDef;
    return def.minLength === undefined ? null : def.minLength;
  }
  /**
   * The maximum length for this fieldDef
   */
  public get maxLength(): number | null {
    let def = this._fieldDef as IStringFieldDef;
    return def.maxLength === undefined ? null : def.maxLength;
  }

  /**
   * The fallback value for this fieldDef
   */
  public get fallbackValue(): T {
    return this._fallbackValue;
  }
  /**
   * The number of children for this fieldDef
   */
  public get childCount(): number {
    return this._childCount;
  }

  constructor(
    fieldDef: IFieldDef,
    fallbackValue?: T | undefined,
    name: string = "root",
    basePath: string = ""
  ) {
    this._checkFieldDef(fieldDef);
    this.name = name;
    this.basePath = basePath;
    this.path =
      basePath + (basePath && !name.startsWith("[") ? "." : "") + name;
    this._fieldDef = applyDefault(
      cloneObject(fieldDef),
      FieldDef.DEFAULT_FIELD_DEF
    );
    if (this._fieldDef.type == "object" && this._fieldDef.children) {
      if (fallbackValue) {
        let type = typeof fallbackValue;
        if (type !== "object") {
          throw new Error(
            `Field ${this.name} - FieldDef with type 'object' must have an object fallback value, got ${type}`
          );
        }
      }
      this._objectChildren = this._getObjectChildren(
        this._fieldDef.children,
        fallbackValue as IIndexable
      );
      this._childCount = Object.keys(this._objectChildren).length;
    } else if (this._fieldDef.type == "array" && this._fieldDef.children) {
      if (fallbackValue) {
        let type = typeof fallbackValue;
        if (!Array.isArray(fallbackValue)) {
          throw new Error(
            `Field ${this.name} - FieldDef with type 'array' must have an array fallback value, got ${type}`
          );
        }
      }
      this._arrayChildren = this._getArrayChildren(
        this._fieldDef.children,
        fallbackValue as Array<any>
      );
      this._childCount = this._arrayChildren.length;
    }
    this._fallbackValue = fallbackValue as T;
    if (fallbackValue === undefined) {
      return;
    }
    let errorResult = this._validate(this._fallbackValue);
    if (errorResult) {
      throw new Error(
        `Field ${this.name} - Invalid fallback value : ${errorResult.message} at ${errorResult.path}`
      );
    }
  }
  /**
   * Get a child fieldDef by name
   */
  public getChild(name: string): FieldDef<any> | null {
    if (this._objectChildren) {
      return this._objectChildren[name] || null;
    }
    if (this._arrayChildren) {
      let index = Number(name);
      if (isNaN(index)) {
        return null;
      }
      return this._arrayChildren[index] || null;
    }
    return null;
  }
  public forEachChild(
    callback: (child: FieldDef<any>, name: string | number) => void
  ) {
    if (this._objectChildren) {
      Object.keys(this._objectChildren).forEach((key) => {
        callback(this._objectChildren![key], key);
      });
    }
    if (this._arrayChildren) {
      this._arrayChildren.forEach((child, index) => {
        callback(child, index);
      });
    }
  }
  /**
   * Validate a value for this fieldDef
   */
  public validate(value: any): IValidateResult<T> {
    let errorResult = this._validate(value);
    if (errorResult) {
      errorResult.message += ` at ${errorResult.path}`;
      return errorResult;
    }
    return {
      isValid: true,
      value: value,
    };
  }

  /**
   * Convert a string to a value that fits this fieldDef
   */
  public parseString(value: string): IValidateResult<T> {
    let parsedValue: T;
    try {
      parsedValue = this._parseString(value);
    } catch (error) {
      let errorResult: IValidateError<T> = {
        isValid: false,
        path: this.path,
        errorType: "parseString",
        message: `${(error as Error).message || String(error)} at ${this.path}`,
        value: value,
      };
      return errorResult;
    }
    let errorResult = this._validate(parsedValue);
    if (errorResult) {
      return errorResult;
    }
    return {
      isValid: true,
      value: parsedValue,
    };
  }

  /**
   * Get a valid value for this fieldDef
   * Will return the fallback value if the value is invalid
   * If the fallback value is undefined, an error will be thrown
   */
  public getValidValue(value: any): T {
    if (this._fallbackValue === undefined && !this._fieldDef.acceptUndefined) {
      throw new Error(
        "Cannot get valid value for fieldDef with undefined fallback value"
      );
    }
    let errorResult = this._validate(value);
    if (!errorResult) {
      return value;
    }
    return this._fallbackValue as T;
  }

  private _parseString(value: string): T {
    value = String(value).trim();
    if (this._fieldDef.acceptNull && value === "null") {
      return null as any;
    }
    if (this._fieldDef.acceptUndefined && value === "undefined") {
      return undefined as any;
    }
    if (this._fieldDef.type === "string") {
      return value as any;
    }
    if (this._fieldDef.type === "number") {
      let num = Number(value);
      if (isNaN(num)) {
        throw new Error(`Invalid number string: ${value}`);
      }
      return num as any;
    }
    if (this._fieldDef.type === "boolean") {
      let lowerValue = value.toLowerCase();
      if (lowerValue === "true") {
        return true as any;
      }
      if (lowerValue === "false") {
        return false as any;
      }
      throw new Error(`Invalid boolean string: ${value}`);
    }
    // For object and array, we expect the string to be a JSON string
    let obj = JSON.parse(value);
    return obj as any;
  }

  private _checkFieldDef(fieldDef: IFieldDef): void {
    if (!fieldDef.type) {
      throw new Error("FieldDef must have a type");
    }
    if (!VALID_FIELD_DEF_TYPE_MAP[fieldDef.type]) {
      throw new Error(`Invalid FieldDef type: ${fieldDef.type}`);
    }

    if (fieldDef.type === "number") {
      if (fieldDef.maxNum !== undefined && fieldDef.minNum !== undefined) {
        if (fieldDef.maxNum < fieldDef.minNum) {
          throw new Error("FieldDef maxNum must be greater than minNum");
        }
      }
    }
    if (fieldDef.type === "string") {
      if (
        fieldDef.maxLength !== undefined &&
        fieldDef.minLength !== undefined
      ) {
        if (fieldDef.maxLength < fieldDef.minLength) {
          throw new Error("FieldDef maxLength must be greater than minLength");
        }
      }
      if (
        fieldDef.regExp !== undefined &&
        !(fieldDef.regExp instanceof RegExp)
      ) {
        throw new Error("FieldDef regExp must be a RegExp");
      }
    }
  }
  private _validate(value: any): IValidateError<T> | void {
    let errorResult: IValidateError<T> = {
      isValid: false,
      path: this.path,
      errorType: "unknown",
      message: "Unknown error",
      value: value,
    };
    // Check editable
    if (!this._fieldDef.editable && value !== this._fallbackValue) {
      errorResult.errorType = "notEditable";
      errorResult.message = "Value is not editable";
      return errorResult;
    }
    // Check undefined
    if (value === undefined) {
      if (!this._fieldDef.acceptUndefined) {
        errorResult.errorType = "undefined";
        errorResult.message = "Value cannot be undefined";
        return errorResult;
      }
      // Custom validator
      let message = this._fieldDef.validator && this._fieldDef.validator(value);
      if (message) {
        errorResult.errorType = "validator";
        errorResult.message = message;
        return errorResult;
      }
      return;
    }
    // Check null
    if (value === null) {
      if (!this._fieldDef.acceptNull) {
        errorResult.errorType = "null";
        errorResult.message = "Value cannot be null";
        return errorResult;
      }
      // Custom validator
      let message = this._fieldDef.validator && this._fieldDef.validator(value);
      if (message) {
        errorResult.errorType = "validator";
        errorResult.message = message;
        return errorResult;
      }
      return;
    }
    if (!this._isFieldDefType(value)) {
      // Check type
      errorResult.errorType = "type";
      errorResult.message = `Value must be of type ${
        this._fieldDef.type
      }, got ${typeof value}`;
      return errorResult;
    }
    // Check valueList
    if (
      this._fieldDef.valueList !== undefined &&
      this._fieldDef.valueList.length > 0 &&
      !this._fieldDef.valueList.includes(value)
    ) {
      errorResult.errorType = "valueList";
      errorResult.message = `Value must be one of: ${this._fieldDef.valueList
        .slice(0, MAX_VALUE_LIST_DISPLAY_LENGTH)
        .join(",")}${
        this._fieldDef.valueList.length > MAX_VALUE_LIST_DISPLAY_LENGTH
          ? `... (${
              this._fieldDef.valueList.length - MAX_VALUE_LIST_DISPLAY_LENGTH
            } more)`
          : ""
      }`;
      return errorResult;
    }
    // Check number
    if (this._fieldDef.type === "number") {
      if (
        this._fieldDef.maxNum !== undefined &&
        value > this._fieldDef.maxNum
      ) {
        errorResult.errorType = "maxNum";
        errorResult.message = `Value cannot be greater than ${this._fieldDef.maxNum}`;
        return errorResult;
      }
      if (
        this._fieldDef.minNum !== undefined &&
        value < this._fieldDef.minNum
      ) {
        errorResult.errorType = "minNum";
        errorResult.message = `Value cannot be less than ${this._fieldDef.minNum}`;
        return errorResult;
      }
      // Custom validator
      let message = this._fieldDef.validator && this._fieldDef.validator(value);
      if (message) {
        errorResult.errorType = "validator";
        errorResult.message = message;
        return errorResult;
      }
      return;
    }
    // Check string
    if (this._fieldDef.type === "string") {
      if (
        this._fieldDef.maxLength !== undefined &&
        value.length > this._fieldDef.maxLength
      ) {
        errorResult.errorType = "maxLength";
        errorResult.message = `Value cannot be longer than ${this._fieldDef.maxLength}`;
        return errorResult;
      }
      if (
        this._fieldDef.minLength !== undefined &&
        value.length < this._fieldDef.minLength
      ) {
        errorResult.errorType = "minLength";
        errorResult.message = `Value cannot be shorter than ${this._fieldDef.minLength}`;
        return errorResult;
      }
      if (
        this._fieldDef.regExp !== undefined &&
        !this._fieldDef.regExp.test(value)
      ) {
        errorResult.errorType = "regExp";
        errorResult.message = `Value must match ${this._fieldDef.regExp}`;
        return errorResult;
      }
      // Custom validator
      let message = this._fieldDef.validator && this._fieldDef.validator(value);
      if (message) {
        errorResult.errorType = "validator";
        errorResult.message = message;
        return errorResult;
      }
      return;
    }
    // Check object and array
    if (typeof value === "object") {
      if (this._fieldDef.type === "object") {
        // Custom validator
        let message =
          this._fieldDef.validator && this._fieldDef.validator(value);
        if (message) {
          errorResult.errorType = "validator";
          errorResult.message = message;
          return errorResult;
        }
        // Check object children
        if (this._objectChildren) {
          let keys = Object.keys(this._objectChildren);
          for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            let childDef = this._objectChildren[key] as FieldDef<any>;
            let childValue = value[key];
            let childErrorResult = childDef._validate(childValue);
            if (childErrorResult) {
              return childErrorResult;
            }
          }
        }
        // Check each child
        if (this._fieldDef.childDef) {
          const templateDef = this._fieldDef.childDef;
          let keys = Object.keys(value);
          for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            let childDef = new FieldDef<any>(
              templateDef._fieldDef,
              templateDef._fallbackValue,
              key,
              this.path
            );
            let childValue = value[key];
            let childErrorResult = childDef._validate(childValue);
            if (childErrorResult) {
              return childErrorResult;
            }
          }
        }
        return;
      }
      if (this._fieldDef.type === "array") {
        // Check array length
        if (
          this._fieldDef.maxLength !== undefined &&
          value.length > this._fieldDef.maxLength
        ) {
          errorResult.errorType = "maxLength";
          errorResult.message = `Array cannot be longer than ${this._fieldDef.maxLength}`;
          return errorResult;
        }
        if (
          this._fieldDef.minLength !== undefined &&
          value.length < this._fieldDef.minLength
        ) {
          errorResult.errorType = "minLength";
          errorResult.message = `Array cannot be shorter than ${this._fieldDef.minLength}`;
          return errorResult;
        }
        // Custom validator
        let message =
          this._fieldDef.validator && this._fieldDef.validator(value);
        if (message) {
          errorResult.errorType = "validator";
          errorResult.message = message;
          return errorResult;
        }
        // Check array children
        if (this._arrayChildren) {
          for (let i = 0; i < this._arrayChildren.length; i++) {
            let childDef = this._arrayChildren[i];
            let childValue = value[i];
            let childErrorResult = childDef._validate(childValue);
            if (childErrorResult) {
              return childErrorResult;
            }
          }
        }
        // Check each child
        if (this._fieldDef.childDef) {
          const templateDef = this._fieldDef.childDef;
          for (let i = 0; i < value.length; i++) {
            let childDef = new FieldDef<any>(
              templateDef._fieldDef,
              templateDef._fallbackValue,
              `[${i}]`,
              this.path
            );
            let childValue = value[i];
            let childErrorResult = childDef._validate(childValue);
            if (childErrorResult) {
              return childErrorResult;
            }
          }
        }
        return;
      }
    }
  }

  private _isFieldDefType(value: any): boolean {
    if (this._fieldDef.type === "array") {
      return Array.isArray(value);
    }
    return typeof value === this._fieldDef.type;
  }

  private _getObjectChildren(
    children: { [key: string]: IFieldDef },
    fallbackValue?: IIndexable
  ): { [key: string]: FieldDef<any> } {
    let result: { [key: string]: FieldDef<any> } = {};
    for (let key in children) {
      let def = children[key];
      if (!this.editable) {
        def.editable = false;
      }
      let childDef = new FieldDef(
        def,
        fallbackValue ? fallbackValue[key] : undefined,
        key,
        this.path
      );
      result[key] = childDef;
    }
    return result;
  }
  private _getArrayChildren(
    children: Array<IFieldDef>,
    fallbackValue?: Array<any>
  ): Array<FieldDef<any>> {
    let result: Array<FieldDef<any>> = [];
    for (let i = 0; i < children.length; i++) {
      let def = children[i];
      if (!this.editable) {
        def.editable = false;
      }
      let childDef = new FieldDef(
        def,
        fallbackValue ? fallbackValue[i] : undefined,
        `[${i}]`,
        this.path
      );
      result.push(childDef);
    }
    return result;
  }
}
