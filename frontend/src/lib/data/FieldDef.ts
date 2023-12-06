import { IIndexable, applyDefault, cloneObject } from "./util";

interface IStringFieldDef {
  type: "string";
  inputType?: string;
  acceptNull?: boolean;
  acceptUndefined?: boolean;
  valueList?: Array<string | null>;
  editable?: boolean;
  regExp?: RegExp;
  minLength?: number;
  maxLength?: number;
}
interface INumberFieldDef {
  type: "number";
  inputType?: string;
  acceptNull?: boolean;
  acceptUndefined?: boolean;
  valueList?: Array<number | null>;
  maxNum?: number;
  minNum?: number;
  editable?: boolean;
}
interface IBooleanFieldDef {
  type: "boolean";
  inputType?: string;
  acceptNull?: boolean;
  acceptUndefined?: boolean;
  valueList?: Array<boolean | null>;
  editable?: boolean;
}
interface IObjectFieldDef {
  type: "object";
  inputType?: string;
  acceptNull?: boolean;
  acceptUndefined?: boolean;
  valueList?: Array<object | null>;
  children: { [key: string]: IFieldDef };
  editable?: boolean;
}
interface IArrayFieldDef {
  type: "array";
  inputType?: string;
  acceptNull?: boolean;
  acceptUndefined?: boolean;
  valueList?: Array<Array<any> | null>;
  children: Array<IFieldDef>;
  editable?: boolean;
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
  errorPath: string;
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

export default class FieldDef<T> {
  public static readonly DEFAULT_FIELD_DEF: IFieldDef = Object.freeze({
    type: "string",
    inputType: "text",
    acceptNull: false,
    acceptUndefined: false,
    valueList: undefined,
    maxNum: undefined,
    minNum: undefined,
    minLength: 1,
    maxLength: undefined,
    children: undefined,
    editable: true,
    regExp: undefined,
  });
  private _name: string;
  private _fieldDef: IFieldDef;
  private _fallbackValue: T;
  private _objectChildren?: Map<string, FieldDef<any>>;
  private _arrayChildren?: Array<FieldDef<any>>;

  public get name(): string {
    return this._name;
  }
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
   * The children for this fieldDef
   */
  public get objectChildren(): Map<string, FieldDef<any>> | null {
    return this._objectChildren || null;
  }
  /**
   * The children for this fieldDef
   */
  public get arrayChildren(): Array<FieldDef<any>> | null {
    return this._arrayChildren || null;
  }
  /**
   * The fallback value for this fieldDef
   */
  public get fallbackValue(): T {
    return this._fallbackValue;
  }

  constructor(fieldDef: IFieldDef, fallbackValue?: T, name: string = "root") {
    this._checkFieldDef(fieldDef);
    this._name = name;
    this._fieldDef = applyDefault(
      cloneObject(fieldDef),
      FieldDef.DEFAULT_FIELD_DEF
    );
    if (fallbackValue != null) {
      if (this._fieldDef.type == "object" && this._fieldDef.children) {
        let type = typeof fallbackValue;
        if (fallbackValue && type !== "object") {
          throw new Error(
            `Field ${this._name} - FieldDef with type 'object' must have an object fallback value, got ${type}`
          );
        }
        this._objectChildren = this._getObjectChildren(
          this._fieldDef.children,
          fallbackValue as IIndexable
        );
      } else if (this._fieldDef.type == "array" && this._fieldDef.children) {
        let type = typeof fallbackValue;
        if (fallbackValue && !Array.isArray(fallbackValue)) {
          throw new Error(
            `Field ${this._name} - FieldDef with type 'array' must have an array fallback value, got ${type}`
          );
        }
        this._arrayChildren = this._getArrayChildren(
          this._fieldDef.children,
          fallbackValue as Array<any>
        );
      }
    }
    this._fallbackValue = fallbackValue as T;
    if (fallbackValue === undefined) {
      return;
    }
    let errorResult = this._validate(this._fallbackValue);
    if (errorResult) {
      throw new Error(
        `Field ${this._name} - Invalid fallback value : ${errorResult.errorType} - ${errorResult.message}`
      );
    }
  }
  /**
   * Validate a value for this fieldDef
   */
  public validate(value: any): IValidateResult<T> {
    let errorResult = this._validate(value);
    if (errorResult) {
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
        errorPath: this._name,
        errorType: "parseString",
        message: (error as Error).message || String(error),
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
  private _validate(
    value: any,
    path: string = this._name
  ): IValidateError<T> | void {
    let errorResult: IValidateError<T> = {
      isValid: false,
      errorPath: path,
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
      return;
    }
    // Check null
    if (value === null) {
      if (!this._fieldDef.acceptNull) {
        errorResult.errorType = "null";
        errorResult.message = "Value cannot be null";
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
      errorResult.message = `Value must be one of ${this._fieldDef.valueList}`;
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
      return;
    }
    if (typeof value === "object") {
      if (this._fieldDef.type === "object") {
        if (!this._objectChildren) {
          return;
        }
        let children = this._objectChildren as Map<string, FieldDef<any>>;
        let keyList = Array.from(children.keys());
        for (let i = 0; i < keyList.length; i++) {
          let key = keyList[i];
          let childDef = children.get(key) as FieldDef<any>;
          let childValue = value[key];
          let childPath = `${path}.${key}`;
          let childErrorResult = childDef._validate(childValue, childPath);
          if (childErrorResult) {
            return childErrorResult;
          }
        }
        return;
      }
      if (this._fieldDef.type === "array") {
        if (!this._arrayChildren) {
          return;
        }
        let children = this._arrayChildren as Array<FieldDef<any>>;
        for (let i = 0; i < children.length; i++) {
          let childDef = children[i];
          let childValue = value[i];
          let childPath = `${path}[${i}]`;
          let childErrorResult = childDef._validate(childValue, childPath);
          if (childErrorResult) {
            return childErrorResult;
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
  ): Map<string, FieldDef<any>> {
    let result: Map<string, FieldDef<any>> = new Map();
    for (let key in children) {
      let def = children[key];
      if (!this.editable) {
        def.editable = false;
      }
      let childDef = new FieldDef(
        def,
        fallbackValue && fallbackValue[key],
        key
      );
      result.set(key, childDef);
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
        fallbackValue && fallbackValue[i],
        `[${i}]`
      );
      result.push(childDef);
    }
    return result;
  }
}
