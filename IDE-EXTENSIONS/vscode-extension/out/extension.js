"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../../packages/memory-client/node_modules/zod/v4/core/core.js
// @__NO_SIDE_EFFECTS__
function $constructor(name, initializer3, params) {
  function init(inst, def) {
    var _a;
    Object.defineProperty(inst, "_zod", {
      value: inst._zod ?? {},
      enumerable: false
    });
    (_a = inst._zod).traits ?? (_a.traits = /* @__PURE__ */ new Set());
    inst._zod.traits.add(name);
    initializer3(inst, def);
    for (const k in _.prototype) {
      if (!(k in inst))
        Object.defineProperty(inst, k, { value: _.prototype[k].bind(inst) });
    }
    inst._zod.constr = _;
    inst._zod.def = def;
  }
  const Parent = params?.Parent ?? Object;
  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name });
  function _(def) {
    var _a;
    const inst = params?.Parent ? new Definition() : this;
    init(inst, def);
    (_a = inst._zod).deferred ?? (_a.deferred = []);
    for (const fn of inst._zod.deferred) {
      fn();
    }
    return inst;
  }
  Object.defineProperty(_, "init", { value: init });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: (inst) => {
      if (params?.Parent && inst instanceof params.Parent)
        return true;
      return inst?._zod?.traits?.has(name);
    }
  });
  Object.defineProperty(_, "name", { value: name });
  return _;
}
function config(newConfig) {
  if (newConfig)
    Object.assign(globalConfig, newConfig);
  return globalConfig;
}
var NEVER, $brand, $ZodAsyncError, $ZodEncodeError, globalConfig;
var init_core = __esm({
  "../../packages/memory-client/node_modules/zod/v4/core/core.js"() {
    NEVER = Object.freeze({
      status: "aborted"
    });
    $brand = /* @__PURE__ */ Symbol("zod_brand");
    $ZodAsyncError = class extends Error {
      constructor() {
        super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
      }
    };
    $ZodEncodeError = class extends Error {
      constructor(name) {
        super(`Encountered unidirectional transform during encode: ${name}`);
        this.name = "ZodEncodeError";
      }
    };
    globalConfig = {};
  }
});

// ../../packages/memory-client/node_modules/zod/v4/core/util.js
var util_exports = {};
__export(util_exports, {
  BIGINT_FORMAT_RANGES: () => BIGINT_FORMAT_RANGES,
  Class: () => Class,
  NUMBER_FORMAT_RANGES: () => NUMBER_FORMAT_RANGES,
  aborted: () => aborted,
  allowsEval: () => allowsEval,
  assert: () => assert,
  assertEqual: () => assertEqual,
  assertIs: () => assertIs,
  assertNever: () => assertNever,
  assertNotEqual: () => assertNotEqual,
  assignProp: () => assignProp,
  base64ToUint8Array: () => base64ToUint8Array,
  base64urlToUint8Array: () => base64urlToUint8Array,
  cached: () => cached,
  captureStackTrace: () => captureStackTrace,
  cleanEnum: () => cleanEnum,
  cleanRegex: () => cleanRegex,
  clone: () => clone,
  cloneDef: () => cloneDef,
  createTransparentProxy: () => createTransparentProxy,
  defineLazy: () => defineLazy,
  esc: () => esc,
  escapeRegex: () => escapeRegex,
  extend: () => extend,
  finalizeIssue: () => finalizeIssue,
  floatSafeRemainder: () => floatSafeRemainder,
  getElementAtPath: () => getElementAtPath,
  getEnumValues: () => getEnumValues,
  getLengthableOrigin: () => getLengthableOrigin,
  getParsedType: () => getParsedType,
  getSizableOrigin: () => getSizableOrigin,
  hexToUint8Array: () => hexToUint8Array,
  isObject: () => isObject,
  isPlainObject: () => isPlainObject,
  issue: () => issue,
  joinValues: () => joinValues,
  jsonStringifyReplacer: () => jsonStringifyReplacer,
  merge: () => merge,
  mergeDefs: () => mergeDefs,
  normalizeParams: () => normalizeParams,
  nullish: () => nullish,
  numKeys: () => numKeys,
  objectClone: () => objectClone,
  omit: () => omit,
  optionalKeys: () => optionalKeys,
  partial: () => partial,
  pick: () => pick,
  prefixIssues: () => prefixIssues,
  primitiveTypes: () => primitiveTypes,
  promiseAllObject: () => promiseAllObject,
  propertyKeyTypes: () => propertyKeyTypes,
  randomString: () => randomString,
  required: () => required,
  safeExtend: () => safeExtend,
  shallowClone: () => shallowClone,
  stringifyPrimitive: () => stringifyPrimitive,
  uint8ArrayToBase64: () => uint8ArrayToBase64,
  uint8ArrayToBase64url: () => uint8ArrayToBase64url,
  uint8ArrayToHex: () => uint8ArrayToHex,
  unwrapMessage: () => unwrapMessage
});
function assertEqual(val) {
  return val;
}
function assertNotEqual(val) {
  return val;
}
function assertIs(_arg) {
}
function assertNever(_x) {
  throw new Error();
}
function assert(_) {
}
function getEnumValues(entries) {
  const numericValues = Object.values(entries).filter((v) => typeof v === "number");
  const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
  return values;
}
function joinValues(array2, separator = "|") {
  return array2.map((val) => stringifyPrimitive(val)).join(separator);
}
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
function cached(getter) {
  const set2 = false;
  return {
    get value() {
      if (!set2) {
        const value = getter();
        Object.defineProperty(this, "value", { value });
        return value;
      }
      throw new Error("cached value already set");
    }
  };
}
function nullish(input) {
  return input === null || input === void 0;
}
function cleanRegex(source) {
  const start = source.startsWith("^") ? 1 : 0;
  const end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepString = step.toString();
  let stepDecCount = (stepString.split(".")[1] || "").length;
  if (stepDecCount === 0 && /\d?e-\d?/.test(stepString)) {
    const match = stepString.match(/\d?e-(\d?)/);
    if (match?.[1]) {
      stepDecCount = Number.parseInt(match[1]);
    }
  }
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
function defineLazy(object2, key, getter) {
  let value = void 0;
  Object.defineProperty(object2, key, {
    get() {
      if (value === EVALUATING) {
        return void 0;
      }
      if (value === void 0) {
        value = EVALUATING;
        value = getter();
      }
      return value;
    },
    set(v) {
      Object.defineProperty(object2, key, {
        value: v
        // configurable: true,
      });
    },
    configurable: true
  });
}
function objectClone(obj) {
  return Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj));
}
function assignProp(target, prop, value) {
  Object.defineProperty(target, prop, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}
function mergeDefs(...defs) {
  const mergedDescriptors = {};
  for (const def of defs) {
    const descriptors = Object.getOwnPropertyDescriptors(def);
    Object.assign(mergedDescriptors, descriptors);
  }
  return Object.defineProperties({}, mergedDescriptors);
}
function cloneDef(schema) {
  return mergeDefs(schema._zod.def);
}
function getElementAtPath(obj, path2) {
  if (!path2)
    return obj;
  return path2.reduce((acc, key) => acc?.[key], obj);
}
function promiseAllObject(promisesObj) {
  const keys = Object.keys(promisesObj);
  const promises = keys.map((key) => promisesObj[key]);
  return Promise.all(promises).then((results) => {
    const resolvedObj = {};
    for (let i = 0; i < keys.length; i++) {
      resolvedObj[keys[i]] = results[i];
    }
    return resolvedObj;
  });
}
function randomString(length = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let str = "";
  for (let i = 0; i < length; i++) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
}
function esc(str) {
  return JSON.stringify(str);
}
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
function isPlainObject(o) {
  if (isObject(o) === false)
    return false;
  const ctor = o.constructor;
  if (ctor === void 0)
    return true;
  const prot = ctor.prototype;
  if (isObject(prot) === false)
    return false;
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }
  return true;
}
function shallowClone(o) {
  if (isPlainObject(o))
    return { ...o };
  if (Array.isArray(o))
    return [...o];
  return o;
}
function numKeys(data) {
  let keyCount = 0;
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      keyCount++;
    }
  }
  return keyCount;
}
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || params?.parent)
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if (params?.message !== void 0) {
    if (params?.error !== void 0)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
function createTransparentProxy(getter) {
  let target;
  return new Proxy({}, {
    get(_, prop, receiver) {
      target ?? (target = getter());
      return Reflect.get(target, prop, receiver);
    },
    set(_, prop, value, receiver) {
      target ?? (target = getter());
      return Reflect.set(target, prop, value, receiver);
    },
    has(_, prop) {
      target ?? (target = getter());
      return Reflect.has(target, prop);
    },
    deleteProperty(_, prop) {
      target ?? (target = getter());
      return Reflect.deleteProperty(target, prop);
    },
    ownKeys(_) {
      target ?? (target = getter());
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(_, prop) {
      target ?? (target = getter());
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
    defineProperty(_, prop, descriptor) {
      target ?? (target = getter());
      return Reflect.defineProperty(target, prop, descriptor);
    }
  });
}
function stringifyPrimitive(value) {
  if (typeof value === "bigint")
    return value.toString() + "n";
  if (typeof value === "string")
    return `"${value}"`;
  return `${value}`;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
  });
}
function pick(schema, mask) {
  const currDef = schema._zod.def;
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = {};
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        newShape[key] = currDef.shape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function omit(schema, mask) {
  const currDef = schema._zod.def;
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = { ...schema._zod.def.shape };
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        delete newShape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function extend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to extend: expected a plain object");
  }
  const checks = schema._zod.def.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error("Object schemas containing refinements cannot be extended. Use `.safeExtend()` instead.");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    checks: []
  });
  return clone(schema, def);
}
function safeExtend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to safeExtend: expected a plain object");
  }
  const def = {
    ...schema._zod.def,
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    checks: schema._zod.def.checks
  };
  return clone(schema, def);
}
function merge(a, b) {
  const def = mergeDefs(a._zod.def, {
    get shape() {
      const _shape = { ...a._zod.def.shape, ...b._zod.def.shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    get catchall() {
      return b._zod.def.catchall;
    },
    checks: []
    // delete existing checks
  });
  return clone(a, def);
}
function partial(Class2, schema, mask) {
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in oldShape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = Class2 ? new Class2({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      } else {
        for (const key in oldShape) {
          shape[key] = Class2 ? new Class2({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    },
    checks: []
  });
  return clone(schema, def);
}
function required(Class2, schema, mask) {
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in shape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = new Class2({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      } else {
        for (const key in oldShape) {
          shape[key] = new Class2({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    },
    checks: []
  });
  return clone(schema, def);
}
function aborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (x.issues[i]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path2, issues) {
  return issues.map((iss) => {
    var _a;
    (_a = iss).path ?? (_a.path = []);
    iss.path.unshift(path2);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config2) {
  const full = { ...iss, path: iss.path ?? [] };
  if (!iss.message) {
    const message = unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
    full.message = message;
  }
  delete full.inst;
  delete full.continue;
  if (!ctx?.reportInput) {
    delete full.input;
  }
  return full;
}
function getSizableOrigin(input) {
  if (input instanceof Set)
    return "set";
  if (input instanceof Map)
    return "map";
  if (input instanceof File)
    return "file";
  return "unknown";
}
function getLengthableOrigin(input) {
  if (Array.isArray(input))
    return "array";
  if (typeof input === "string")
    return "string";
  return "unknown";
}
function issue(...args) {
  const [iss, input, inst] = args;
  if (typeof iss === "string") {
    return {
      message: iss,
      code: "custom",
      input,
      inst
    };
  }
  return { ...iss };
}
function cleanEnum(obj) {
  return Object.entries(obj).filter(([k, _]) => {
    return Number.isNaN(Number.parseInt(k, 10));
  }).map((el) => el[1]);
}
function base64ToUint8Array(base643) {
  const binaryString = atob(base643);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
function uint8ArrayToBase64(bytes) {
  let binaryString = "";
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
}
function base64urlToUint8Array(base64url3) {
  const base643 = base64url3.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - base643.length % 4) % 4);
  return base64ToUint8Array(base643 + padding);
}
function uint8ArrayToBase64url(bytes) {
  return uint8ArrayToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function hexToUint8Array(hex3) {
  const cleanHex = hex3.replace(/^0x/, "");
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(cleanHex.slice(i, i + 2), 16);
  }
  return bytes;
}
function uint8ArrayToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
var EVALUATING, captureStackTrace, allowsEval, getParsedType, propertyKeyTypes, primitiveTypes, NUMBER_FORMAT_RANGES, BIGINT_FORMAT_RANGES, Class;
var init_util = __esm({
  "../../packages/memory-client/node_modules/zod/v4/core/util.js"() {
    EVALUATING = /* @__PURE__ */ Symbol("evaluating");
    captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {
    };
    allowsEval = cached(() => {
      if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
        return false;
      }
      try {
        const F = Function;
        new F("");
        return true;
      } catch (_) {
        return false;
      }
    });
    getParsedType = (data) => {
      const t = typeof data;
      switch (t) {
        case "undefined":
          return "undefined";
        case "string":
          return "string";
        case "number":
          return Number.isNaN(data) ? "nan" : "number";
        case "boolean":
          return "boolean";
        case "function":
          return "function";
        case "bigint":
          return "bigint";
        case "symbol":
          return "symbol";
        case "object":
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
            return "promise";
          }
          if (typeof Map !== "undefined" && data instanceof Map) {
            return "map";
          }
          if (typeof Set !== "undefined" && data instanceof Set) {
            return "set";
          }
          if (typeof Date !== "undefined" && data instanceof Date) {
            return "date";
          }
          if (typeof File !== "undefined" && data instanceof File) {
            return "file";
          }
          return "object";
        default:
          throw new Error(`Unknown data type: ${t}`);
      }
    };
    propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
    primitiveTypes = /* @__PURE__ */ new Set(["string", "number", "bigint", "boolean", "symbol", "undefined"]);
    NUMBER_FORMAT_RANGES = {
      safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
      int32: [-2147483648, 2147483647],
      uint32: [0, 4294967295],
      float32: [-34028234663852886e22, 34028234663852886e22],
      float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
    };
    BIGINT_FORMAT_RANGES = {
      int64: [/* @__PURE__ */ BigInt("-9223372036854775808"), /* @__PURE__ */ BigInt("9223372036854775807")],
      uint64: [/* @__PURE__ */ BigInt(0), /* @__PURE__ */ BigInt("18446744073709551615")]
    };
    Class = class {
      constructor(..._args) {
      }
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/core/errors.js
function flattenError(error46, mapper = (issue2) => issue2.message) {
  const fieldErrors = {};
  const formErrors = [];
  for (const sub of error46.issues) {
    if (sub.path.length > 0) {
      fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
      fieldErrors[sub.path[0]].push(mapper(sub));
    } else {
      formErrors.push(mapper(sub));
    }
  }
  return { formErrors, fieldErrors };
}
function formatError(error46, mapper = (issue2) => issue2.message) {
  const fieldErrors = { _errors: [] };
  const processError = (error47) => {
    for (const issue2 of error47.issues) {
      if (issue2.code === "invalid_union" && issue2.errors.length) {
        issue2.errors.map((issues) => processError({ issues }));
      } else if (issue2.code === "invalid_key") {
        processError({ issues: issue2.issues });
      } else if (issue2.code === "invalid_element") {
        processError({ issues: issue2.issues });
      } else if (issue2.path.length === 0) {
        fieldErrors._errors.push(mapper(issue2));
      } else {
        let curr = fieldErrors;
        let i = 0;
        while (i < issue2.path.length) {
          const el = issue2.path[i];
          const terminal = i === issue2.path.length - 1;
          if (!terminal) {
            curr[el] = curr[el] || { _errors: [] };
          } else {
            curr[el] = curr[el] || { _errors: [] };
            curr[el]._errors.push(mapper(issue2));
          }
          curr = curr[el];
          i++;
        }
      }
    }
  };
  processError(error46);
  return fieldErrors;
}
function treeifyError(error46, mapper = (issue2) => issue2.message) {
  const result = { errors: [] };
  const processError = (error47, path2 = []) => {
    var _a, _b;
    for (const issue2 of error47.issues) {
      if (issue2.code === "invalid_union" && issue2.errors.length) {
        issue2.errors.map((issues) => processError({ issues }, issue2.path));
      } else if (issue2.code === "invalid_key") {
        processError({ issues: issue2.issues }, issue2.path);
      } else if (issue2.code === "invalid_element") {
        processError({ issues: issue2.issues }, issue2.path);
      } else {
        const fullpath = [...path2, ...issue2.path];
        if (fullpath.length === 0) {
          result.errors.push(mapper(issue2));
          continue;
        }
        let curr = result;
        let i = 0;
        while (i < fullpath.length) {
          const el = fullpath[i];
          const terminal = i === fullpath.length - 1;
          if (typeof el === "string") {
            curr.properties ?? (curr.properties = {});
            (_a = curr.properties)[el] ?? (_a[el] = { errors: [] });
            curr = curr.properties[el];
          } else {
            curr.items ?? (curr.items = []);
            (_b = curr.items)[el] ?? (_b[el] = { errors: [] });
            curr = curr.items[el];
          }
          if (terminal) {
            curr.errors.push(mapper(issue2));
          }
          i++;
        }
      }
    }
  };
  processError(error46);
  return result;
}
function toDotPath(_path) {
  const segs = [];
  const path2 = _path.map((seg) => typeof seg === "object" ? seg.key : seg);
  for (const seg of path2) {
    if (typeof seg === "number")
      segs.push(`[${seg}]`);
    else if (typeof seg === "symbol")
      segs.push(`[${JSON.stringify(String(seg))}]`);
    else if (/[^\w$]/.test(seg))
      segs.push(`[${JSON.stringify(seg)}]`);
    else {
      if (segs.length)
        segs.push(".");
      segs.push(seg);
    }
  }
  return segs.join("");
}
function prettifyError(error46) {
  const lines = [];
  const issues = [...error46.issues].sort((a, b) => (a.path ?? []).length - (b.path ?? []).length);
  for (const issue2 of issues) {
    lines.push(`\u2716 ${issue2.message}`);
    if (issue2.path?.length)
      lines.push(`  \u2192 at ${toDotPath(issue2.path)}`);
  }
  return lines.join("\n");
}
var initializer, $ZodError, $ZodRealError;
var init_errors = __esm({
  "../../packages/memory-client/node_modules/zod/v4/core/errors.js"() {
    init_core();
    init_util();
    initializer = (inst, def) => {
      inst.name = "$ZodError";
      Object.defineProperty(inst, "_zod", {
        value: inst._zod,
        enumerable: false
      });
      Object.defineProperty(inst, "issues", {
        value: def,
        enumerable: false
      });
      inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
      Object.defineProperty(inst, "toString", {
        value: () => inst.message,
        enumerable: false
      });
    };
    $ZodError = $constructor("$ZodError", initializer);
    $ZodRealError = $constructor("$ZodError", initializer, { Parent: Error });
  }
});

// ../../packages/memory-client/node_modules/zod/v4/core/parse.js
var _parse, parse, _parseAsync, parseAsync, _safeParse, safeParse, _safeParseAsync, safeParseAsync, _encode, encode, _decode, decode, _encodeAsync, encodeAsync, _decodeAsync, decodeAsync, _safeEncode, safeEncode, _safeDecode, safeDecode, _safeEncodeAsync, safeEncodeAsync, _safeDecodeAsync, safeDecodeAsync;
var init_parse = __esm({
  "../../packages/memory-client/node_modules/zod/v4/core/parse.js"() {
    init_core();
    init_errors();
    init_util();
    _parse = (_Err) => (schema, value, _ctx, _params) => {
      const ctx = _ctx ? Object.assign(_ctx, { async: false }) : { async: false };
      const result = schema._zod.run({ value, issues: [] }, ctx);
      if (result instanceof Promise) {
        throw new $ZodAsyncError();
      }
      if (result.issues.length) {
        const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
        captureStackTrace(e, _params?.callee);
        throw e;
      }
      return result.value;
    };
    parse = /* @__PURE__ */ _parse($ZodRealError);
    _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
      const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
      let result = schema._zod.run({ value, issues: [] }, ctx);
      if (result instanceof Promise)
        result = await result;
      if (result.issues.length) {
        const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
        captureStackTrace(e, params?.callee);
        throw e;
      }
      return result.value;
    };
    parseAsync = /* @__PURE__ */ _parseAsync($ZodRealError);
    _safeParse = (_Err) => (schema, value, _ctx) => {
      const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
      const result = schema._zod.run({ value, issues: [] }, ctx);
      if (result instanceof Promise) {
        throw new $ZodAsyncError();
      }
      return result.issues.length ? {
        success: false,
        error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
      } : { success: true, data: result.value };
    };
    safeParse = /* @__PURE__ */ _safeParse($ZodRealError);
    _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
      const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
      let result = schema._zod.run({ value, issues: [] }, ctx);
      if (result instanceof Promise)
        result = await result;
      return result.issues.length ? {
        success: false,
        error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
      } : { success: true, data: result.value };
    };
    safeParseAsync = /* @__PURE__ */ _safeParseAsync($ZodRealError);
    _encode = (_Err) => (schema, value, _ctx) => {
      const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
      return _parse(_Err)(schema, value, ctx);
    };
    encode = /* @__PURE__ */ _encode($ZodRealError);
    _decode = (_Err) => (schema, value, _ctx) => {
      return _parse(_Err)(schema, value, _ctx);
    };
    decode = /* @__PURE__ */ _decode($ZodRealError);
    _encodeAsync = (_Err) => async (schema, value, _ctx) => {
      const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
      return _parseAsync(_Err)(schema, value, ctx);
    };
    encodeAsync = /* @__PURE__ */ _encodeAsync($ZodRealError);
    _decodeAsync = (_Err) => async (schema, value, _ctx) => {
      return _parseAsync(_Err)(schema, value, _ctx);
    };
    decodeAsync = /* @__PURE__ */ _decodeAsync($ZodRealError);
    _safeEncode = (_Err) => (schema, value, _ctx) => {
      const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
      return _safeParse(_Err)(schema, value, ctx);
    };
    safeEncode = /* @__PURE__ */ _safeEncode($ZodRealError);
    _safeDecode = (_Err) => (schema, value, _ctx) => {
      return _safeParse(_Err)(schema, value, _ctx);
    };
    safeDecode = /* @__PURE__ */ _safeDecode($ZodRealError);
    _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
      const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
      return _safeParseAsync(_Err)(schema, value, ctx);
    };
    safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync($ZodRealError);
    _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
      return _safeParseAsync(_Err)(schema, value, _ctx);
    };
    safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync($ZodRealError);
  }
});

// ../../packages/memory-client/node_modules/zod/v4/core/regexes.js
var regexes_exports = {};
__export(regexes_exports, {
  base64: () => base64,
  base64url: () => base64url,
  bigint: () => bigint,
  boolean: () => boolean,
  browserEmail: () => browserEmail,
  cidrv4: () => cidrv4,
  cidrv6: () => cidrv6,
  cuid: () => cuid,
  cuid2: () => cuid2,
  date: () => date,
  datetime: () => datetime,
  domain: () => domain,
  duration: () => duration,
  e164: () => e164,
  email: () => email,
  emoji: () => emoji,
  extendedDuration: () => extendedDuration,
  guid: () => guid,
  hex: () => hex,
  hostname: () => hostname,
  html5Email: () => html5Email,
  idnEmail: () => idnEmail,
  integer: () => integer,
  ipv4: () => ipv4,
  ipv6: () => ipv6,
  ksuid: () => ksuid,
  lowercase: () => lowercase,
  md5_base64: () => md5_base64,
  md5_base64url: () => md5_base64url,
  md5_hex: () => md5_hex,
  nanoid: () => nanoid,
  null: () => _null,
  number: () => number,
  rfc5322Email: () => rfc5322Email,
  sha1_base64: () => sha1_base64,
  sha1_base64url: () => sha1_base64url,
  sha1_hex: () => sha1_hex,
  sha256_base64: () => sha256_base64,
  sha256_base64url: () => sha256_base64url,
  sha256_hex: () => sha256_hex,
  sha384_base64: () => sha384_base64,
  sha384_base64url: () => sha384_base64url,
  sha384_hex: () => sha384_hex,
  sha512_base64: () => sha512_base64,
  sha512_base64url: () => sha512_base64url,
  sha512_hex: () => sha512_hex,
  string: () => string,
  time: () => time,
  ulid: () => ulid,
  undefined: () => _undefined,
  unicodeEmail: () => unicodeEmail,
  uppercase: () => uppercase,
  uuid: () => uuid,
  uuid4: () => uuid4,
  uuid6: () => uuid6,
  uuid7: () => uuid7,
  xid: () => xid
});
function emoji() {
  return new RegExp(_emoji, "u");
}
function timeSource(args) {
  const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
  const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  return regex;
}
function time(args) {
  return new RegExp(`^${timeSource(args)}$`);
}
function datetime(args) {
  const time3 = timeSource({ precision: args.precision });
  const opts = ["Z"];
  if (args.local)
    opts.push("");
  if (args.offset)
    opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
  const timeRegex2 = `${time3}(?:${opts.join("|")})`;
  return new RegExp(`^${dateSource}T(?:${timeRegex2})$`);
}
function fixedBase64(bodyLength, padding) {
  return new RegExp(`^[A-Za-z0-9+/]{${bodyLength}}${padding}$`);
}
function fixedBase64url(length) {
  return new RegExp(`^[A-Za-z0-9_-]{${length}}$`);
}
var cuid, cuid2, ulid, xid, ksuid, nanoid, duration, extendedDuration, guid, uuid, uuid4, uuid6, uuid7, email, html5Email, rfc5322Email, unicodeEmail, idnEmail, browserEmail, _emoji, ipv4, ipv6, cidrv4, cidrv6, base64, base64url, hostname, domain, e164, dateSource, date, string, bigint, integer, number, boolean, _null, _undefined, lowercase, uppercase, hex, md5_hex, md5_base64, md5_base64url, sha1_hex, sha1_base64, sha1_base64url, sha256_hex, sha256_base64, sha256_base64url, sha384_hex, sha384_base64, sha384_base64url, sha512_hex, sha512_base64, sha512_base64url;
var init_regexes = __esm({
  "../../packages/memory-client/node_modules/zod/v4/core/regexes.js"() {
    cuid = /^[cC][^\s-]{8,}$/;
    cuid2 = /^[0-9a-z]+$/;
    ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
    xid = /^[0-9a-vA-V]{20}$/;
    ksuid = /^[A-Za-z0-9]{27}$/;
    nanoid = /^[a-zA-Z0-9_-]{21}$/;
    duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
    extendedDuration = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
    guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
    uuid = (version4) => {
      if (!version4)
        return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
      return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version4}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
    };
    uuid4 = /* @__PURE__ */ uuid(4);
    uuid6 = /* @__PURE__ */ uuid(6);
    uuid7 = /* @__PURE__ */ uuid(7);
    email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
    html5Email = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    rfc5322Email = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    unicodeEmail = /^[^\s@"]{1,64}@[^\s@]{1,255}$/u;
    idnEmail = unicodeEmail;
    browserEmail = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    _emoji = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
    ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
    ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
    cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
    cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
    base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
    base64url = /^[A-Za-z0-9_-]*$/;
    hostname = /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/;
    domain = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    e164 = /^\+(?:[0-9]){6,14}[0-9]$/;
    dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
    date = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
    string = (params) => {
      const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
      return new RegExp(`^${regex}$`);
    };
    bigint = /^-?\d+n?$/;
    integer = /^-?\d+$/;
    number = /^-?\d+(?:\.\d+)?/;
    boolean = /^(?:true|false)$/i;
    _null = /^null$/i;
    _undefined = /^undefined$/i;
    lowercase = /^[^A-Z]*$/;
    uppercase = /^[^a-z]*$/;
    hex = /^[0-9a-fA-F]*$/;
    md5_hex = /^[0-9a-fA-F]{32}$/;
    md5_base64 = /* @__PURE__ */ fixedBase64(22, "==");
    md5_base64url = /* @__PURE__ */ fixedBase64url(22);
    sha1_hex = /^[0-9a-fA-F]{40}$/;
    sha1_base64 = /* @__PURE__ */ fixedBase64(27, "=");
    sha1_base64url = /* @__PURE__ */ fixedBase64url(27);
    sha256_hex = /^[0-9a-fA-F]{64}$/;
    sha256_base64 = /* @__PURE__ */ fixedBase64(43, "=");
    sha256_base64url = /* @__PURE__ */ fixedBase64url(43);
    sha384_hex = /^[0-9a-fA-F]{96}$/;
    sha384_base64 = /* @__PURE__ */ fixedBase64(64, "");
    sha384_base64url = /* @__PURE__ */ fixedBase64url(64);
    sha512_hex = /^[0-9a-fA-F]{128}$/;
    sha512_base64 = /* @__PURE__ */ fixedBase64(86, "==");
    sha512_base64url = /* @__PURE__ */ fixedBase64url(86);
  }
});

// ../../packages/memory-client/node_modules/zod/v4/core/checks.js
function handleCheckPropertyResult(result, payload, property) {
  if (result.issues.length) {
    payload.issues.push(...prefixIssues(property, result.issues));
  }
}
var $ZodCheck, numericOriginMap, $ZodCheckLessThan, $ZodCheckGreaterThan, $ZodCheckMultipleOf, $ZodCheckNumberFormat, $ZodCheckBigIntFormat, $ZodCheckMaxSize, $ZodCheckMinSize, $ZodCheckSizeEquals, $ZodCheckMaxLength, $ZodCheckMinLength, $ZodCheckLengthEquals, $ZodCheckStringFormat, $ZodCheckRegex, $ZodCheckLowerCase, $ZodCheckUpperCase, $ZodCheckIncludes, $ZodCheckStartsWith, $ZodCheckEndsWith, $ZodCheckProperty, $ZodCheckMimeType, $ZodCheckOverwrite;
var init_checks = __esm({
  "../../packages/memory-client/node_modules/zod/v4/core/checks.js"() {
    init_core();
    init_regexes();
    init_util();
    $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
      var _a;
      inst._zod ?? (inst._zod = {});
      inst._zod.def = def;
      (_a = inst._zod).onattach ?? (_a.onattach = []);
    });
    numericOriginMap = {
      number: "number",
      bigint: "bigint",
      object: "date"
    };
    $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
      $ZodCheck.init(inst, def);
      const origin = numericOriginMap[typeof def.value];
      inst._zod.onattach.push((inst2) => {
        const bag = inst2._zod.bag;
        const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
        if (def.value < curr) {
          if (def.inclusive)
            bag.maximum = def.value;
          else
            bag.exclusiveMaximum = def.value;
        }
      });
      inst._zod.check = (payload) => {
        if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
          return;
        }
        payload.issues.push({
          origin,
          code: "too_big",
          maximum: def.value,
          input: payload.value,
          inclusive: def.inclusive,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
      $ZodCheck.init(inst, def);
      const origin = numericOriginMap[typeof def.value];
      inst._zod.onattach.push((inst2) => {
        const bag = inst2._zod.bag;
        const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
        if (def.value > curr) {
          if (def.inclusive)
            bag.minimum = def.value;
          else
            bag.exclusiveMinimum = def.value;
        }
      });
      inst._zod.check = (payload) => {
        if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
          return;
        }
        payload.issues.push({
          origin,
          code: "too_small",
          minimum: def.value,
          input: payload.value,
          inclusive: def.inclusive,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
      $ZodCheck.init(inst, def);
      inst._zod.onattach.push((inst2) => {
        var _a;
        (_a = inst2._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
      });
      inst._zod.check = (payload) => {
        if (typeof payload.value !== typeof def.value)
          throw new Error("Cannot mix number and bigint in multiple_of check.");
        const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0;
        if (isMultiple)
          return;
        payload.issues.push({
          origin: typeof payload.value,
          code: "not_multiple_of",
          divisor: def.value,
          input: payload.value,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
      $ZodCheck.init(inst, def);
      def.format = def.format || "float64";
      const isInt = def.format?.includes("int");
      const origin = isInt ? "int" : "number";
      const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
      inst._zod.onattach.push((inst2) => {
        const bag = inst2._zod.bag;
        bag.format = def.format;
        bag.minimum = minimum;
        bag.maximum = maximum;
        if (isInt)
          bag.pattern = integer;
      });
      inst._zod.check = (payload) => {
        const input = payload.value;
        if (isInt) {
          if (!Number.isInteger(input)) {
            payload.issues.push({
              expected: origin,
              format: def.format,
              code: "invalid_type",
              continue: false,
              input,
              inst
            });
            return;
          }
          if (!Number.isSafeInteger(input)) {
            if (input > 0) {
              payload.issues.push({
                input,
                code: "too_big",
                maximum: Number.MAX_SAFE_INTEGER,
                note: "Integers must be within the safe integer range.",
                inst,
                origin,
                continue: !def.abort
              });
            } else {
              payload.issues.push({
                input,
                code: "too_small",
                minimum: Number.MIN_SAFE_INTEGER,
                note: "Integers must be within the safe integer range.",
                inst,
                origin,
                continue: !def.abort
              });
            }
            return;
          }
        }
        if (input < minimum) {
          payload.issues.push({
            origin: "number",
            input,
            code: "too_small",
            minimum,
            inclusive: true,
            inst,
            continue: !def.abort
          });
        }
        if (input > maximum) {
          payload.issues.push({
            origin: "number",
            input,
            code: "too_big",
            maximum,
            inst
          });
        }
      };
    });
    $ZodCheckBigIntFormat = /* @__PURE__ */ $constructor("$ZodCheckBigIntFormat", (inst, def) => {
      $ZodCheck.init(inst, def);
      const [minimum, maximum] = BIGINT_FORMAT_RANGES[def.format];
      inst._zod.onattach.push((inst2) => {
        const bag = inst2._zod.bag;
        bag.format = def.format;
        bag.minimum = minimum;
        bag.maximum = maximum;
      });
      inst._zod.check = (payload) => {
        const input = payload.value;
        if (input < minimum) {
          payload.issues.push({
            origin: "bigint",
            input,
            code: "too_small",
            minimum,
            inclusive: true,
            inst,
            continue: !def.abort
          });
        }
        if (input > maximum) {
          payload.issues.push({
            origin: "bigint",
            input,
            code: "too_big",
            maximum,
            inst
          });
        }
      };
    });
    $ZodCheckMaxSize = /* @__PURE__ */ $constructor("$ZodCheckMaxSize", (inst, def) => {
      var _a;
      $ZodCheck.init(inst, def);
      (_a = inst._zod.def).when ?? (_a.when = (payload) => {
        const val = payload.value;
        return !nullish(val) && val.size !== void 0;
      });
      inst._zod.onattach.push((inst2) => {
        const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
        if (def.maximum < curr)
          inst2._zod.bag.maximum = def.maximum;
      });
      inst._zod.check = (payload) => {
        const input = payload.value;
        const size = input.size;
        if (size <= def.maximum)
          return;
        payload.issues.push({
          origin: getSizableOrigin(input),
          code: "too_big",
          maximum: def.maximum,
          inclusive: true,
          input,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckMinSize = /* @__PURE__ */ $constructor("$ZodCheckMinSize", (inst, def) => {
      var _a;
      $ZodCheck.init(inst, def);
      (_a = inst._zod.def).when ?? (_a.when = (payload) => {
        const val = payload.value;
        return !nullish(val) && val.size !== void 0;
      });
      inst._zod.onattach.push((inst2) => {
        const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
        if (def.minimum > curr)
          inst2._zod.bag.minimum = def.minimum;
      });
      inst._zod.check = (payload) => {
        const input = payload.value;
        const size = input.size;
        if (size >= def.minimum)
          return;
        payload.issues.push({
          origin: getSizableOrigin(input),
          code: "too_small",
          minimum: def.minimum,
          inclusive: true,
          input,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckSizeEquals = /* @__PURE__ */ $constructor("$ZodCheckSizeEquals", (inst, def) => {
      var _a;
      $ZodCheck.init(inst, def);
      (_a = inst._zod.def).when ?? (_a.when = (payload) => {
        const val = payload.value;
        return !nullish(val) && val.size !== void 0;
      });
      inst._zod.onattach.push((inst2) => {
        const bag = inst2._zod.bag;
        bag.minimum = def.size;
        bag.maximum = def.size;
        bag.size = def.size;
      });
      inst._zod.check = (payload) => {
        const input = payload.value;
        const size = input.size;
        if (size === def.size)
          return;
        const tooBig = size > def.size;
        payload.issues.push({
          origin: getSizableOrigin(input),
          ...tooBig ? { code: "too_big", maximum: def.size } : { code: "too_small", minimum: def.size },
          inclusive: true,
          exact: true,
          input: payload.value,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
      var _a;
      $ZodCheck.init(inst, def);
      (_a = inst._zod.def).when ?? (_a.when = (payload) => {
        const val = payload.value;
        return !nullish(val) && val.length !== void 0;
      });
      inst._zod.onattach.push((inst2) => {
        const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
        if (def.maximum < curr)
          inst2._zod.bag.maximum = def.maximum;
      });
      inst._zod.check = (payload) => {
        const input = payload.value;
        const length = input.length;
        if (length <= def.maximum)
          return;
        const origin = getLengthableOrigin(input);
        payload.issues.push({
          origin,
          code: "too_big",
          maximum: def.maximum,
          inclusive: true,
          input,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
      var _a;
      $ZodCheck.init(inst, def);
      (_a = inst._zod.def).when ?? (_a.when = (payload) => {
        const val = payload.value;
        return !nullish(val) && val.length !== void 0;
      });
      inst._zod.onattach.push((inst2) => {
        const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
        if (def.minimum > curr)
          inst2._zod.bag.minimum = def.minimum;
      });
      inst._zod.check = (payload) => {
        const input = payload.value;
        const length = input.length;
        if (length >= def.minimum)
          return;
        const origin = getLengthableOrigin(input);
        payload.issues.push({
          origin,
          code: "too_small",
          minimum: def.minimum,
          inclusive: true,
          input,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
      var _a;
      $ZodCheck.init(inst, def);
      (_a = inst._zod.def).when ?? (_a.when = (payload) => {
        const val = payload.value;
        return !nullish(val) && val.length !== void 0;
      });
      inst._zod.onattach.push((inst2) => {
        const bag = inst2._zod.bag;
        bag.minimum = def.length;
        bag.maximum = def.length;
        bag.length = def.length;
      });
      inst._zod.check = (payload) => {
        const input = payload.value;
        const length = input.length;
        if (length === def.length)
          return;
        const origin = getLengthableOrigin(input);
        const tooBig = length > def.length;
        payload.issues.push({
          origin,
          ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
          inclusive: true,
          exact: true,
          input: payload.value,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
      var _a, _b;
      $ZodCheck.init(inst, def);
      inst._zod.onattach.push((inst2) => {
        const bag = inst2._zod.bag;
        bag.format = def.format;
        if (def.pattern) {
          bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
          bag.patterns.add(def.pattern);
        }
      });
      if (def.pattern)
        (_a = inst._zod).check ?? (_a.check = (payload) => {
          def.pattern.lastIndex = 0;
          if (def.pattern.test(payload.value))
            return;
          payload.issues.push({
            origin: "string",
            code: "invalid_format",
            format: def.format,
            input: payload.value,
            ...def.pattern ? { pattern: def.pattern.toString() } : {},
            inst,
            continue: !def.abort
          });
        });
      else
        (_b = inst._zod).check ?? (_b.check = () => {
        });
    });
    $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
      $ZodCheckStringFormat.init(inst, def);
      inst._zod.check = (payload) => {
        def.pattern.lastIndex = 0;
        if (def.pattern.test(payload.value))
          return;
        payload.issues.push({
          origin: "string",
          code: "invalid_format",
          format: "regex",
          input: payload.value,
          pattern: def.pattern.toString(),
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
      def.pattern ?? (def.pattern = lowercase);
      $ZodCheckStringFormat.init(inst, def);
    });
    $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
      def.pattern ?? (def.pattern = uppercase);
      $ZodCheckStringFormat.init(inst, def);
    });
    $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
      $ZodCheck.init(inst, def);
      const escapedRegex = escapeRegex(def.includes);
      const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
      def.pattern = pattern;
      inst._zod.onattach.push((inst2) => {
        const bag = inst2._zod.bag;
        bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
        bag.patterns.add(pattern);
      });
      inst._zod.check = (payload) => {
        if (payload.value.includes(def.includes, def.position))
          return;
        payload.issues.push({
          origin: "string",
          code: "invalid_format",
          format: "includes",
          includes: def.includes,
          input: payload.value,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
      $ZodCheck.init(inst, def);
      const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
      def.pattern ?? (def.pattern = pattern);
      inst._zod.onattach.push((inst2) => {
        const bag = inst2._zod.bag;
        bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
        bag.patterns.add(pattern);
      });
      inst._zod.check = (payload) => {
        if (payload.value.startsWith(def.prefix))
          return;
        payload.issues.push({
          origin: "string",
          code: "invalid_format",
          format: "starts_with",
          prefix: def.prefix,
          input: payload.value,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
      $ZodCheck.init(inst, def);
      const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
      def.pattern ?? (def.pattern = pattern);
      inst._zod.onattach.push((inst2) => {
        const bag = inst2._zod.bag;
        bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
        bag.patterns.add(pattern);
      });
      inst._zod.check = (payload) => {
        if (payload.value.endsWith(def.suffix))
          return;
        payload.issues.push({
          origin: "string",
          code: "invalid_format",
          format: "ends_with",
          suffix: def.suffix,
          input: payload.value,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckProperty = /* @__PURE__ */ $constructor("$ZodCheckProperty", (inst, def) => {
      $ZodCheck.init(inst, def);
      inst._zod.check = (payload) => {
        const result = def.schema._zod.run({
          value: payload.value[def.property],
          issues: []
        }, {});
        if (result instanceof Promise) {
          return result.then((result2) => handleCheckPropertyResult(result2, payload, def.property));
        }
        handleCheckPropertyResult(result, payload, def.property);
        return;
      };
    });
    $ZodCheckMimeType = /* @__PURE__ */ $constructor("$ZodCheckMimeType", (inst, def) => {
      $ZodCheck.init(inst, def);
      const mimeSet = new Set(def.mime);
      inst._zod.onattach.push((inst2) => {
        inst2._zod.bag.mime = def.mime;
      });
      inst._zod.check = (payload) => {
        if (mimeSet.has(payload.value.type))
          return;
        payload.issues.push({
          code: "invalid_value",
          values: def.mime,
          input: payload.value.type,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
      $ZodCheck.init(inst, def);
      inst._zod.check = (payload) => {
        payload.value = def.tx(payload.value);
      };
    });
  }
});

// ../../packages/memory-client/node_modules/zod/v4/core/doc.js
var Doc;
var init_doc = __esm({
  "../../packages/memory-client/node_modules/zod/v4/core/doc.js"() {
    Doc = class {
      constructor(args = []) {
        this.content = [];
        this.indent = 0;
        if (this)
          this.args = args;
      }
      indented(fn) {
        this.indent += 1;
        fn(this);
        this.indent -= 1;
      }
      write(arg) {
        if (typeof arg === "function") {
          arg(this, { execution: "sync" });
          arg(this, { execution: "async" });
          return;
        }
        const content = arg;
        const lines = content.split("\n").filter((x) => x);
        const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
        const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
        for (const line of dedented) {
          this.content.push(line);
        }
      }
      compile() {
        const F = Function;
        const args = this?.args;
        const content = this?.content ?? [``];
        const lines = [...content.map((x) => `  ${x}`)];
        return new F(...args, lines.join("\n"));
      }
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/core/versions.js
var version;
var init_versions = __esm({
  "../../packages/memory-client/node_modules/zod/v4/core/versions.js"() {
    version = {
      major: 4,
      minor: 1,
      patch: 12
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/core/schemas.js
function isValidBase64(data) {
  if (data === "")
    return true;
  if (data.length % 4 !== 0)
    return false;
  try {
    atob(data);
    return true;
  } catch {
    return false;
  }
}
function isValidBase64URL(data) {
  if (!base64url.test(data))
    return false;
  const base643 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
  const padded = base643.padEnd(Math.ceil(base643.length / 4) * 4, "=");
  return isValidBase64(padded);
}
function isValidJWT(token, algorithm = null) {
  try {
    const tokensParts = token.split(".");
    if (tokensParts.length !== 3)
      return false;
    const [header] = tokensParts;
    if (!header)
      return false;
    const parsedHeader = JSON.parse(atob(header));
    if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT")
      return false;
    if (!parsedHeader.alg)
      return false;
    if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
      return false;
    return true;
  } catch {
    return false;
  }
}
function handleArrayResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
function handlePropertyResult(result, final, key, input) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(key, result.issues));
  }
  if (result.value === void 0) {
    if (key in input) {
      final.value[key] = void 0;
    }
  } else {
    final.value[key] = result.value;
  }
}
function normalizeDef(def) {
  const keys = Object.keys(def.shape);
  for (const k of keys) {
    if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
      throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
    }
  }
  const okeys = optionalKeys(def.shape);
  return {
    ...def,
    keys,
    keySet: new Set(keys),
    numKeys: keys.length,
    optionalKeys: new Set(okeys)
  };
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
  const unrecognized = [];
  const keySet = def.keySet;
  const _catchall = def.catchall._zod;
  const t = _catchall.def.type;
  for (const key of Object.keys(input)) {
    if (keySet.has(key))
      continue;
    if (t === "never") {
      unrecognized.push(key);
      continue;
    }
    const r = _catchall.run({ value: input[key], issues: [] }, ctx);
    if (r instanceof Promise) {
      proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input)));
    } else {
      handlePropertyResult(r, payload, key, input);
    }
  }
  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst
    });
  }
  if (!proms.length)
    return payload;
  return Promise.all(proms).then(() => {
    return payload;
  });
}
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  const nonaborted = results.filter((r) => !aborted(r));
  if (nonaborted.length === 1) {
    final.value = nonaborted[0].value;
    return nonaborted[0];
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  });
  return final;
}
function mergeValues(a, b) {
  if (a === b) {
    return { valid: true, data: a };
  }
  if (a instanceof Date && b instanceof Date && +a === +b) {
    return { valid: true, data: a };
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const bKeys = Object.keys(b);
    const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
        };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return { valid: false, mergeErrorPath: [] };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
        };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  }
  return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(result, left, right) {
  if (left.issues.length) {
    result.issues.push(...left.issues);
  }
  if (right.issues.length) {
    result.issues.push(...right.issues);
  }
  if (aborted(result))
    return result;
  const merged = mergeValues(left.value, right.value);
  if (!merged.valid) {
    throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
  }
  result.value = merged.data;
  return result;
}
function handleTupleResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
function handleMapResult(keyResult, valueResult, final, key, input, inst, ctx) {
  if (keyResult.issues.length) {
    if (propertyKeyTypes.has(typeof key)) {
      final.issues.push(...prefixIssues(key, keyResult.issues));
    } else {
      final.issues.push({
        code: "invalid_key",
        origin: "map",
        input,
        inst,
        issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config()))
      });
    }
  }
  if (valueResult.issues.length) {
    if (propertyKeyTypes.has(typeof key)) {
      final.issues.push(...prefixIssues(key, valueResult.issues));
    } else {
      final.issues.push({
        origin: "map",
        code: "invalid_element",
        input,
        inst,
        key,
        issues: valueResult.issues.map((iss) => finalizeIssue(iss, ctx, config()))
      });
    }
  }
  final.value.set(keyResult.value, valueResult.value);
}
function handleSetResult(result, final) {
  if (result.issues.length) {
    final.issues.push(...result.issues);
  }
  final.value.add(result.value);
}
function handleOptionalResult(result, input) {
  if (result.issues.length && input === void 0) {
    return { issues: [], value: void 0 };
  }
  return result;
}
function handleDefaultResult(payload, def) {
  if (payload.value === void 0) {
    payload.value = def.defaultValue;
  }
  return payload;
}
function handleNonOptionalResult(payload, inst) {
  if (!payload.issues.length && payload.value === void 0) {
    payload.issues.push({
      code: "invalid_type",
      expected: "nonoptional",
      input: payload.value,
      inst
    });
  }
  return payload;
}
function handlePipeResult(left, next, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return next._zod.run({ value: left.value, issues: left.issues }, ctx);
}
function handleCodecAResult(result, def, ctx) {
  if (result.issues.length) {
    result.aborted = true;
    return result;
  }
  const direction = ctx.direction || "forward";
  if (direction === "forward") {
    const transformed = def.transform(result.value, result);
    if (transformed instanceof Promise) {
      return transformed.then((value) => handleCodecTxResult(result, value, def.out, ctx));
    }
    return handleCodecTxResult(result, transformed, def.out, ctx);
  } else {
    const transformed = def.reverseTransform(result.value, result);
    if (transformed instanceof Promise) {
      return transformed.then((value) => handleCodecTxResult(result, value, def.in, ctx));
    }
    return handleCodecTxResult(result, transformed, def.in, ctx);
  }
}
function handleCodecTxResult(left, value, nextSchema, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return nextSchema._zod.run({ value, issues: left.issues }, ctx);
}
function handleReadonlyResult(payload) {
  payload.value = Object.freeze(payload.value);
  return payload;
}
function handleRefineResult(result, payload, input, inst) {
  if (!result) {
    const _iss = {
      code: "custom",
      input,
      inst,
      // incorporates params.error into issue reporting
      path: [...inst._zod.def.path ?? []],
      // incorporates params.error into issue reporting
      continue: !inst._zod.def.abort
      // params: inst._zod.def.params,
    };
    if (inst._zod.def.params)
      _iss.params = inst._zod.def.params;
    payload.issues.push(issue(_iss));
  }
}
var $ZodType, $ZodString, $ZodStringFormat, $ZodGUID, $ZodUUID, $ZodEmail, $ZodURL, $ZodEmoji, $ZodNanoID, $ZodCUID, $ZodCUID2, $ZodULID, $ZodXID, $ZodKSUID, $ZodISODateTime, $ZodISODate, $ZodISOTime, $ZodISODuration, $ZodIPv4, $ZodIPv6, $ZodCIDRv4, $ZodCIDRv6, $ZodBase64, $ZodBase64URL, $ZodE164, $ZodJWT, $ZodCustomStringFormat, $ZodNumber, $ZodNumberFormat, $ZodBoolean, $ZodBigInt, $ZodBigIntFormat, $ZodSymbol, $ZodUndefined, $ZodNull, $ZodAny, $ZodUnknown, $ZodNever, $ZodVoid, $ZodDate, $ZodArray, $ZodObject, $ZodObjectJIT, $ZodUnion, $ZodDiscriminatedUnion, $ZodIntersection, $ZodTuple, $ZodRecord, $ZodMap, $ZodSet, $ZodEnum, $ZodLiteral, $ZodFile, $ZodTransform, $ZodOptional, $ZodNullable, $ZodDefault, $ZodPrefault, $ZodNonOptional, $ZodSuccess, $ZodCatch, $ZodNaN, $ZodPipe, $ZodCodec, $ZodReadonly, $ZodTemplateLiteral, $ZodFunction, $ZodPromise, $ZodLazy, $ZodCustom;
var init_schemas = __esm({
  "../../packages/memory-client/node_modules/zod/v4/core/schemas.js"() {
    init_checks();
    init_core();
    init_doc();
    init_parse();
    init_regexes();
    init_util();
    init_versions();
    init_util();
    $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
      var _a;
      inst ?? (inst = {});
      inst._zod.def = def;
      inst._zod.bag = inst._zod.bag || {};
      inst._zod.version = version;
      const checks = [...inst._zod.def.checks ?? []];
      if (inst._zod.traits.has("$ZodCheck")) {
        checks.unshift(inst);
      }
      for (const ch of checks) {
        for (const fn of ch._zod.onattach) {
          fn(inst);
        }
      }
      if (checks.length === 0) {
        (_a = inst._zod).deferred ?? (_a.deferred = []);
        inst._zod.deferred?.push(() => {
          inst._zod.run = inst._zod.parse;
        });
      } else {
        const runChecks = (payload, checks2, ctx) => {
          let isAborted2 = aborted(payload);
          let asyncResult;
          for (const ch of checks2) {
            if (ch._zod.def.when) {
              const shouldRun = ch._zod.def.when(payload);
              if (!shouldRun)
                continue;
            } else if (isAborted2) {
              continue;
            }
            const currLen = payload.issues.length;
            const _ = ch._zod.check(payload);
            if (_ instanceof Promise && ctx?.async === false) {
              throw new $ZodAsyncError();
            }
            if (asyncResult || _ instanceof Promise) {
              asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
                await _;
                const nextLen = payload.issues.length;
                if (nextLen === currLen)
                  return;
                if (!isAborted2)
                  isAborted2 = aborted(payload, currLen);
              });
            } else {
              const nextLen = payload.issues.length;
              if (nextLen === currLen)
                continue;
              if (!isAborted2)
                isAborted2 = aborted(payload, currLen);
            }
          }
          if (asyncResult) {
            return asyncResult.then(() => {
              return payload;
            });
          }
          return payload;
        };
        const handleCanaryResult = (canary, payload, ctx) => {
          if (aborted(canary)) {
            canary.aborted = true;
            return canary;
          }
          const checkResult = runChecks(payload, checks, ctx);
          if (checkResult instanceof Promise) {
            if (ctx.async === false)
              throw new $ZodAsyncError();
            return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
          }
          return inst._zod.parse(checkResult, ctx);
        };
        inst._zod.run = (payload, ctx) => {
          if (ctx.skipChecks) {
            return inst._zod.parse(payload, ctx);
          }
          if (ctx.direction === "backward") {
            const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
            if (canary instanceof Promise) {
              return canary.then((canary2) => {
                return handleCanaryResult(canary2, payload, ctx);
              });
            }
            return handleCanaryResult(canary, payload, ctx);
          }
          const result = inst._zod.parse(payload, ctx);
          if (result instanceof Promise) {
            if (ctx.async === false)
              throw new $ZodAsyncError();
            return result.then((result2) => runChecks(result2, checks, ctx));
          }
          return runChecks(result, checks, ctx);
        };
      }
      inst["~standard"] = {
        validate: (value) => {
          try {
            const r = safeParse(inst, value);
            return r.success ? { value: r.data } : { issues: r.error?.issues };
          } catch (_) {
            return safeParseAsync(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
          }
        },
        vendor: "zod",
        version: 1
      };
    });
    $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string(inst._zod.bag);
      inst._zod.parse = (payload, _) => {
        if (def.coerce)
          try {
            payload.value = String(payload.value);
          } catch (_2) {
          }
        if (typeof payload.value === "string")
          return payload;
        payload.issues.push({
          expected: "string",
          code: "invalid_type",
          input: payload.value,
          inst
        });
        return payload;
      };
    });
    $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
      $ZodCheckStringFormat.init(inst, def);
      $ZodString.init(inst, def);
    });
    $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
      def.pattern ?? (def.pattern = guid);
      $ZodStringFormat.init(inst, def);
    });
    $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
      if (def.version) {
        const versionMap = {
          v1: 1,
          v2: 2,
          v3: 3,
          v4: 4,
          v5: 5,
          v6: 6,
          v7: 7,
          v8: 8
        };
        const v = versionMap[def.version];
        if (v === void 0)
          throw new Error(`Invalid UUID version: "${def.version}"`);
        def.pattern ?? (def.pattern = uuid(v));
      } else
        def.pattern ?? (def.pattern = uuid());
      $ZodStringFormat.init(inst, def);
    });
    $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
      def.pattern ?? (def.pattern = email);
      $ZodStringFormat.init(inst, def);
    });
    $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
      $ZodStringFormat.init(inst, def);
      inst._zod.check = (payload) => {
        try {
          const trimmed = payload.value.trim();
          const url2 = new URL(trimmed);
          if (def.hostname) {
            def.hostname.lastIndex = 0;
            if (!def.hostname.test(url2.hostname)) {
              payload.issues.push({
                code: "invalid_format",
                format: "url",
                note: "Invalid hostname",
                pattern: hostname.source,
                input: payload.value,
                inst,
                continue: !def.abort
              });
            }
          }
          if (def.protocol) {
            def.protocol.lastIndex = 0;
            if (!def.protocol.test(url2.protocol.endsWith(":") ? url2.protocol.slice(0, -1) : url2.protocol)) {
              payload.issues.push({
                code: "invalid_format",
                format: "url",
                note: "Invalid protocol",
                pattern: def.protocol.source,
                input: payload.value,
                inst,
                continue: !def.abort
              });
            }
          }
          if (def.normalize) {
            payload.value = url2.href;
          } else {
            payload.value = trimmed;
          }
          return;
        } catch (_) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      };
    });
    $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
      def.pattern ?? (def.pattern = emoji());
      $ZodStringFormat.init(inst, def);
    });
    $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
      def.pattern ?? (def.pattern = nanoid);
      $ZodStringFormat.init(inst, def);
    });
    $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
      def.pattern ?? (def.pattern = cuid);
      $ZodStringFormat.init(inst, def);
    });
    $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
      def.pattern ?? (def.pattern = cuid2);
      $ZodStringFormat.init(inst, def);
    });
    $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
      def.pattern ?? (def.pattern = ulid);
      $ZodStringFormat.init(inst, def);
    });
    $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
      def.pattern ?? (def.pattern = xid);
      $ZodStringFormat.init(inst, def);
    });
    $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
      def.pattern ?? (def.pattern = ksuid);
      $ZodStringFormat.init(inst, def);
    });
    $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
      def.pattern ?? (def.pattern = datetime(def));
      $ZodStringFormat.init(inst, def);
    });
    $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
      def.pattern ?? (def.pattern = date);
      $ZodStringFormat.init(inst, def);
    });
    $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
      def.pattern ?? (def.pattern = time(def));
      $ZodStringFormat.init(inst, def);
    });
    $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
      def.pattern ?? (def.pattern = duration);
      $ZodStringFormat.init(inst, def);
    });
    $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
      def.pattern ?? (def.pattern = ipv4);
      $ZodStringFormat.init(inst, def);
      inst._zod.onattach.push((inst2) => {
        const bag = inst2._zod.bag;
        bag.format = `ipv4`;
      });
    });
    $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
      def.pattern ?? (def.pattern = ipv6);
      $ZodStringFormat.init(inst, def);
      inst._zod.onattach.push((inst2) => {
        const bag = inst2._zod.bag;
        bag.format = `ipv6`;
      });
      inst._zod.check = (payload) => {
        try {
          new URL(`http://[${payload.value}]`);
        } catch {
          payload.issues.push({
            code: "invalid_format",
            format: "ipv6",
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      };
    });
    $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
      def.pattern ?? (def.pattern = cidrv4);
      $ZodStringFormat.init(inst, def);
    });
    $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
      def.pattern ?? (def.pattern = cidrv6);
      $ZodStringFormat.init(inst, def);
      inst._zod.check = (payload) => {
        const parts = payload.value.split("/");
        try {
          if (parts.length !== 2)
            throw new Error();
          const [address, prefix] = parts;
          if (!prefix)
            throw new Error();
          const prefixNum = Number(prefix);
          if (`${prefixNum}` !== prefix)
            throw new Error();
          if (prefixNum < 0 || prefixNum > 128)
            throw new Error();
          new URL(`http://[${address}]`);
        } catch {
          payload.issues.push({
            code: "invalid_format",
            format: "cidrv6",
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      };
    });
    $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
      def.pattern ?? (def.pattern = base64);
      $ZodStringFormat.init(inst, def);
      inst._zod.onattach.push((inst2) => {
        inst2._zod.bag.contentEncoding = "base64";
      });
      inst._zod.check = (payload) => {
        if (isValidBase64(payload.value))
          return;
        payload.issues.push({
          code: "invalid_format",
          format: "base64",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
      def.pattern ?? (def.pattern = base64url);
      $ZodStringFormat.init(inst, def);
      inst._zod.onattach.push((inst2) => {
        inst2._zod.bag.contentEncoding = "base64url";
      });
      inst._zod.check = (payload) => {
        if (isValidBase64URL(payload.value))
          return;
        payload.issues.push({
          code: "invalid_format",
          format: "base64url",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
      def.pattern ?? (def.pattern = e164);
      $ZodStringFormat.init(inst, def);
    });
    $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
      $ZodStringFormat.init(inst, def);
      inst._zod.check = (payload) => {
        if (isValidJWT(payload.value, def.alg))
          return;
        payload.issues.push({
          code: "invalid_format",
          format: "jwt",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodCustomStringFormat = /* @__PURE__ */ $constructor("$ZodCustomStringFormat", (inst, def) => {
      $ZodStringFormat.init(inst, def);
      inst._zod.check = (payload) => {
        if (def.fn(payload.value))
          return;
        payload.issues.push({
          code: "invalid_format",
          format: def.format,
          input: payload.value,
          inst,
          continue: !def.abort
        });
      };
    });
    $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.pattern = inst._zod.bag.pattern ?? number;
      inst._zod.parse = (payload, _ctx) => {
        if (def.coerce)
          try {
            payload.value = Number(payload.value);
          } catch (_) {
          }
        const input = payload.value;
        if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
          return payload;
        }
        const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
        payload.issues.push({
          expected: "number",
          code: "invalid_type",
          input,
          inst,
          ...received ? { received } : {}
        });
        return payload;
      };
    });
    $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
      $ZodCheckNumberFormat.init(inst, def);
      $ZodNumber.init(inst, def);
    });
    $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.pattern = boolean;
      inst._zod.parse = (payload, _ctx) => {
        if (def.coerce)
          try {
            payload.value = Boolean(payload.value);
          } catch (_) {
          }
        const input = payload.value;
        if (typeof input === "boolean")
          return payload;
        payload.issues.push({
          expected: "boolean",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      };
    });
    $ZodBigInt = /* @__PURE__ */ $constructor("$ZodBigInt", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.pattern = bigint;
      inst._zod.parse = (payload, _ctx) => {
        if (def.coerce)
          try {
            payload.value = BigInt(payload.value);
          } catch (_) {
          }
        if (typeof payload.value === "bigint")
          return payload;
        payload.issues.push({
          expected: "bigint",
          code: "invalid_type",
          input: payload.value,
          inst
        });
        return payload;
      };
    });
    $ZodBigIntFormat = /* @__PURE__ */ $constructor("$ZodBigInt", (inst, def) => {
      $ZodCheckBigIntFormat.init(inst, def);
      $ZodBigInt.init(inst, def);
    });
    $ZodSymbol = /* @__PURE__ */ $constructor("$ZodSymbol", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (typeof input === "symbol")
          return payload;
        payload.issues.push({
          expected: "symbol",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      };
    });
    $ZodUndefined = /* @__PURE__ */ $constructor("$ZodUndefined", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.pattern = _undefined;
      inst._zod.values = /* @__PURE__ */ new Set([void 0]);
      inst._zod.optin = "optional";
      inst._zod.optout = "optional";
      inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (typeof input === "undefined")
          return payload;
        payload.issues.push({
          expected: "undefined",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      };
    });
    $ZodNull = /* @__PURE__ */ $constructor("$ZodNull", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.pattern = _null;
      inst._zod.values = /* @__PURE__ */ new Set([null]);
      inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (input === null)
          return payload;
        payload.issues.push({
          expected: "null",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      };
    });
    $ZodAny = /* @__PURE__ */ $constructor("$ZodAny", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.parse = (payload) => payload;
    });
    $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.parse = (payload) => payload;
    });
    $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.parse = (payload, _ctx) => {
        payload.issues.push({
          expected: "never",
          code: "invalid_type",
          input: payload.value,
          inst
        });
        return payload;
      };
    });
    $ZodVoid = /* @__PURE__ */ $constructor("$ZodVoid", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (typeof input === "undefined")
          return payload;
        payload.issues.push({
          expected: "void",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      };
    });
    $ZodDate = /* @__PURE__ */ $constructor("$ZodDate", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.parse = (payload, _ctx) => {
        if (def.coerce) {
          try {
            payload.value = new Date(payload.value);
          } catch (_err) {
          }
        }
        const input = payload.value;
        const isDate = input instanceof Date;
        const isValidDate = isDate && !Number.isNaN(input.getTime());
        if (isValidDate)
          return payload;
        payload.issues.push({
          expected: "date",
          code: "invalid_type",
          input,
          ...isDate ? { received: "Invalid Date" } : {},
          inst
        });
        return payload;
      };
    });
    $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!Array.isArray(input)) {
          payload.issues.push({
            expected: "array",
            code: "invalid_type",
            input,
            inst
          });
          return payload;
        }
        payload.value = Array(input.length);
        const proms = [];
        for (let i = 0; i < input.length; i++) {
          const item = input[i];
          const result = def.element._zod.run({
            value: item,
            issues: []
          }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
          } else {
            handleArrayResult(result, payload, i);
          }
        }
        if (proms.length) {
          return Promise.all(proms).then(() => payload);
        }
        return payload;
      };
    });
    $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
      $ZodType.init(inst, def);
      const desc = Object.getOwnPropertyDescriptor(def, "shape");
      if (!desc?.get) {
        const sh = def.shape;
        Object.defineProperty(def, "shape", {
          get: () => {
            const newSh = { ...sh };
            Object.defineProperty(def, "shape", {
              value: newSh
            });
            return newSh;
          }
        });
      }
      const _normalized = cached(() => normalizeDef(def));
      defineLazy(inst._zod, "propValues", () => {
        const shape = def.shape;
        const propValues = {};
        for (const key in shape) {
          const field = shape[key]._zod;
          if (field.values) {
            propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
            for (const v of field.values)
              propValues[key].add(v);
          }
        }
        return propValues;
      });
      const isObject2 = isObject;
      const catchall = def.catchall;
      let value;
      inst._zod.parse = (payload, ctx) => {
        value ?? (value = _normalized.value);
        const input = payload.value;
        if (!isObject2(input)) {
          payload.issues.push({
            expected: "object",
            code: "invalid_type",
            input,
            inst
          });
          return payload;
        }
        payload.value = {};
        const proms = [];
        const shape = value.shape;
        for (const key of value.keys) {
          const el = shape[key];
          const r = el._zod.run({ value: input[key], issues: [] }, ctx);
          if (r instanceof Promise) {
            proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input)));
          } else {
            handlePropertyResult(r, payload, key, input);
          }
        }
        if (!catchall) {
          return proms.length ? Promise.all(proms).then(() => payload) : payload;
        }
        return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
      };
    });
    $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
      $ZodObject.init(inst, def);
      const superParse = inst._zod.parse;
      const _normalized = cached(() => normalizeDef(def));
      const generateFastpass = (shape) => {
        const doc = new Doc(["shape", "payload", "ctx"]);
        const normalized = _normalized.value;
        const parseStr = (key) => {
          const k = esc(key);
          return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
        };
        doc.write(`const input = payload.value;`);
        const ids = /* @__PURE__ */ Object.create(null);
        let counter = 0;
        for (const key of normalized.keys) {
          ids[key] = `key_${counter++}`;
        }
        doc.write(`const newResult = {};`);
        for (const key of normalized.keys) {
          const id = ids[key];
          const k = esc(key);
          doc.write(`const ${id} = ${parseStr(key)};`);
          doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
        }
        doc.write(`payload.value = newResult;`);
        doc.write(`return payload;`);
        const fn = doc.compile();
        return (payload, ctx) => fn(shape, payload, ctx);
      };
      let fastpass;
      const isObject2 = isObject;
      const jit = !globalConfig.jitless;
      const allowsEval2 = allowsEval;
      const fastEnabled = jit && allowsEval2.value;
      const catchall = def.catchall;
      let value;
      inst._zod.parse = (payload, ctx) => {
        value ?? (value = _normalized.value);
        const input = payload.value;
        if (!isObject2(input)) {
          payload.issues.push({
            expected: "object",
            code: "invalid_type",
            input,
            inst
          });
          return payload;
        }
        if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
          if (!fastpass)
            fastpass = generateFastpass(def.shape);
          payload = fastpass(payload, ctx);
          if (!catchall)
            return payload;
          return handleCatchall([], input, payload, ctx, value, inst);
        }
        return superParse(payload, ctx);
      };
    });
    $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
      $ZodType.init(inst, def);
      defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
      defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
      defineLazy(inst._zod, "values", () => {
        if (def.options.every((o) => o._zod.values)) {
          return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
        }
        return void 0;
      });
      defineLazy(inst._zod, "pattern", () => {
        if (def.options.every((o) => o._zod.pattern)) {
          const patterns = def.options.map((o) => o._zod.pattern);
          return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
        }
        return void 0;
      });
      const single = def.options.length === 1;
      const first = def.options[0]._zod.run;
      inst._zod.parse = (payload, ctx) => {
        if (single) {
          return first(payload, ctx);
        }
        let async = false;
        const results = [];
        for (const option of def.options) {
          const result = option._zod.run({
            value: payload.value,
            issues: []
          }, ctx);
          if (result instanceof Promise) {
            results.push(result);
            async = true;
          } else {
            if (result.issues.length === 0)
              return result;
            results.push(result);
          }
        }
        if (!async)
          return handleUnionResults(results, payload, inst, ctx);
        return Promise.all(results).then((results2) => {
          return handleUnionResults(results2, payload, inst, ctx);
        });
      };
    });
    $ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
      $ZodUnion.init(inst, def);
      const _super = inst._zod.parse;
      defineLazy(inst._zod, "propValues", () => {
        const propValues = {};
        for (const option of def.options) {
          const pv = option._zod.propValues;
          if (!pv || Object.keys(pv).length === 0)
            throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
          for (const [k, v] of Object.entries(pv)) {
            if (!propValues[k])
              propValues[k] = /* @__PURE__ */ new Set();
            for (const val of v) {
              propValues[k].add(val);
            }
          }
        }
        return propValues;
      });
      const disc = cached(() => {
        const opts = def.options;
        const map2 = /* @__PURE__ */ new Map();
        for (const o of opts) {
          const values = o._zod.propValues?.[def.discriminator];
          if (!values || values.size === 0)
            throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(o)}"`);
          for (const v of values) {
            if (map2.has(v)) {
              throw new Error(`Duplicate discriminator value "${String(v)}"`);
            }
            map2.set(v, o);
          }
        }
        return map2;
      });
      inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!isObject(input)) {
          payload.issues.push({
            code: "invalid_type",
            expected: "object",
            input,
            inst
          });
          return payload;
        }
        const opt = disc.value.get(input?.[def.discriminator]);
        if (opt) {
          return opt._zod.run(payload, ctx);
        }
        if (def.unionFallback) {
          return _super(payload, ctx);
        }
        payload.issues.push({
          code: "invalid_union",
          errors: [],
          note: "No matching discriminator",
          discriminator: def.discriminator,
          input,
          path: [def.discriminator],
          inst
        });
        return payload;
      };
    });
    $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        const left = def.left._zod.run({ value: input, issues: [] }, ctx);
        const right = def.right._zod.run({ value: input, issues: [] }, ctx);
        const async = left instanceof Promise || right instanceof Promise;
        if (async) {
          return Promise.all([left, right]).then(([left2, right2]) => {
            return handleIntersectionResults(payload, left2, right2);
          });
        }
        return handleIntersectionResults(payload, left, right);
      };
    });
    $ZodTuple = /* @__PURE__ */ $constructor("$ZodTuple", (inst, def) => {
      $ZodType.init(inst, def);
      const items = def.items;
      const optStart = items.length - [...items].reverse().findIndex((item) => item._zod.optin !== "optional");
      inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!Array.isArray(input)) {
          payload.issues.push({
            input,
            inst,
            expected: "tuple",
            code: "invalid_type"
          });
          return payload;
        }
        payload.value = [];
        const proms = [];
        if (!def.rest) {
          const tooBig = input.length > items.length;
          const tooSmall = input.length < optStart - 1;
          if (tooBig || tooSmall) {
            payload.issues.push({
              ...tooBig ? { code: "too_big", maximum: items.length } : { code: "too_small", minimum: items.length },
              input,
              inst,
              origin: "array"
            });
            return payload;
          }
        }
        let i = -1;
        for (const item of items) {
          i++;
          if (i >= input.length) {
            if (i >= optStart)
              continue;
          }
          const result = item._zod.run({
            value: input[i],
            issues: []
          }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => handleTupleResult(result2, payload, i)));
          } else {
            handleTupleResult(result, payload, i);
          }
        }
        if (def.rest) {
          const rest = input.slice(items.length);
          for (const el of rest) {
            i++;
            const result = def.rest._zod.run({
              value: el,
              issues: []
            }, ctx);
            if (result instanceof Promise) {
              proms.push(result.then((result2) => handleTupleResult(result2, payload, i)));
            } else {
              handleTupleResult(result, payload, i);
            }
          }
        }
        if (proms.length)
          return Promise.all(proms).then(() => payload);
        return payload;
      };
    });
    $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!isPlainObject(input)) {
          payload.issues.push({
            expected: "record",
            code: "invalid_type",
            input,
            inst
          });
          return payload;
        }
        const proms = [];
        if (def.keyType._zod.values) {
          const values = def.keyType._zod.values;
          payload.value = {};
          for (const key of values) {
            if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
              const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
              if (result instanceof Promise) {
                proms.push(result.then((result2) => {
                  if (result2.issues.length) {
                    payload.issues.push(...prefixIssues(key, result2.issues));
                  }
                  payload.value[key] = result2.value;
                }));
              } else {
                if (result.issues.length) {
                  payload.issues.push(...prefixIssues(key, result.issues));
                }
                payload.value[key] = result.value;
              }
            }
          }
          let unrecognized;
          for (const key in input) {
            if (!values.has(key)) {
              unrecognized = unrecognized ?? [];
              unrecognized.push(key);
            }
          }
          if (unrecognized && unrecognized.length > 0) {
            payload.issues.push({
              code: "unrecognized_keys",
              input,
              inst,
              keys: unrecognized
            });
          }
        } else {
          payload.value = {};
          for (const key of Reflect.ownKeys(input)) {
            if (key === "__proto__")
              continue;
            const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
            if (keyResult instanceof Promise) {
              throw new Error("Async schemas not supported in object keys currently");
            }
            if (keyResult.issues.length) {
              payload.issues.push({
                code: "invalid_key",
                origin: "record",
                issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
                input: key,
                path: [key],
                inst
              });
              payload.value[keyResult.value] = keyResult.value;
              continue;
            }
            const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
            if (result instanceof Promise) {
              proms.push(result.then((result2) => {
                if (result2.issues.length) {
                  payload.issues.push(...prefixIssues(key, result2.issues));
                }
                payload.value[keyResult.value] = result2.value;
              }));
            } else {
              if (result.issues.length) {
                payload.issues.push(...prefixIssues(key, result.issues));
              }
              payload.value[keyResult.value] = result.value;
            }
          }
        }
        if (proms.length) {
          return Promise.all(proms).then(() => payload);
        }
        return payload;
      };
    });
    $ZodMap = /* @__PURE__ */ $constructor("$ZodMap", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!(input instanceof Map)) {
          payload.issues.push({
            expected: "map",
            code: "invalid_type",
            input,
            inst
          });
          return payload;
        }
        const proms = [];
        payload.value = /* @__PURE__ */ new Map();
        for (const [key, value] of input) {
          const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
          const valueResult = def.valueType._zod.run({ value, issues: [] }, ctx);
          if (keyResult instanceof Promise || valueResult instanceof Promise) {
            proms.push(Promise.all([keyResult, valueResult]).then(([keyResult2, valueResult2]) => {
              handleMapResult(keyResult2, valueResult2, payload, key, input, inst, ctx);
            }));
          } else {
            handleMapResult(keyResult, valueResult, payload, key, input, inst, ctx);
          }
        }
        if (proms.length)
          return Promise.all(proms).then(() => payload);
        return payload;
      };
    });
    $ZodSet = /* @__PURE__ */ $constructor("$ZodSet", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.parse = (payload, ctx) => {
        const input = payload.value;
        if (!(input instanceof Set)) {
          payload.issues.push({
            input,
            inst,
            expected: "set",
            code: "invalid_type"
          });
          return payload;
        }
        const proms = [];
        payload.value = /* @__PURE__ */ new Set();
        for (const item of input) {
          const result = def.valueType._zod.run({ value: item, issues: [] }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => handleSetResult(result2, payload)));
          } else
            handleSetResult(result, payload);
        }
        if (proms.length)
          return Promise.all(proms).then(() => payload);
        return payload;
      };
    });
    $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
      $ZodType.init(inst, def);
      const values = getEnumValues(def.entries);
      const valuesSet = new Set(values);
      inst._zod.values = valuesSet;
      inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
      inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (valuesSet.has(input)) {
          return payload;
        }
        payload.issues.push({
          code: "invalid_value",
          values,
          input,
          inst
        });
        return payload;
      };
    });
    $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
      $ZodType.init(inst, def);
      if (def.values.length === 0) {
        throw new Error("Cannot create literal schema with no valid values");
      }
      inst._zod.values = new Set(def.values);
      inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
      inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (inst._zod.values.has(input)) {
          return payload;
        }
        payload.issues.push({
          code: "invalid_value",
          values: def.values,
          input,
          inst
        });
        return payload;
      };
    });
    $ZodFile = /* @__PURE__ */ $constructor("$ZodFile", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.parse = (payload, _ctx) => {
        const input = payload.value;
        if (input instanceof File)
          return payload;
        payload.issues.push({
          expected: "file",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      };
    });
    $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
          throw new $ZodEncodeError(inst.constructor.name);
        }
        const _out = def.transform(payload.value, payload);
        if (ctx.async) {
          const output = _out instanceof Promise ? _out : Promise.resolve(_out);
          return output.then((output2) => {
            payload.value = output2;
            return payload;
          });
        }
        if (_out instanceof Promise) {
          throw new $ZodAsyncError();
        }
        payload.value = _out;
        return payload;
      };
    });
    $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.optin = "optional";
      inst._zod.optout = "optional";
      defineLazy(inst._zod, "values", () => {
        return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
      });
      defineLazy(inst._zod, "pattern", () => {
        const pattern = def.innerType._zod.pattern;
        return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
      });
      inst._zod.parse = (payload, ctx) => {
        if (def.innerType._zod.optin === "optional") {
          const result = def.innerType._zod.run(payload, ctx);
          if (result instanceof Promise)
            return result.then((r) => handleOptionalResult(r, payload.value));
          return handleOptionalResult(result, payload.value);
        }
        if (payload.value === void 0) {
          return payload;
        }
        return def.innerType._zod.run(payload, ctx);
      };
    });
    $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
      $ZodType.init(inst, def);
      defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
      defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
      defineLazy(inst._zod, "pattern", () => {
        const pattern = def.innerType._zod.pattern;
        return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
      });
      defineLazy(inst._zod, "values", () => {
        return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
      });
      inst._zod.parse = (payload, ctx) => {
        if (payload.value === null)
          return payload;
        return def.innerType._zod.run(payload, ctx);
      };
    });
    $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.optin = "optional";
      defineLazy(inst._zod, "values", () => def.innerType._zod.values);
      inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
          return def.innerType._zod.run(payload, ctx);
        }
        if (payload.value === void 0) {
          payload.value = def.defaultValue;
          return payload;
        }
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise) {
          return result.then((result2) => handleDefaultResult(result2, def));
        }
        return handleDefaultResult(result, def);
      };
    });
    $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.optin = "optional";
      defineLazy(inst._zod, "values", () => def.innerType._zod.values);
      inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
          return def.innerType._zod.run(payload, ctx);
        }
        if (payload.value === void 0) {
          payload.value = def.defaultValue;
        }
        return def.innerType._zod.run(payload, ctx);
      };
    });
    $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
      $ZodType.init(inst, def);
      defineLazy(inst._zod, "values", () => {
        const v = def.innerType._zod.values;
        return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
      });
      inst._zod.parse = (payload, ctx) => {
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise) {
          return result.then((result2) => handleNonOptionalResult(result2, inst));
        }
        return handleNonOptionalResult(result, inst);
      };
    });
    $ZodSuccess = /* @__PURE__ */ $constructor("$ZodSuccess", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
          throw new $ZodEncodeError("ZodSuccess");
        }
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise) {
          return result.then((result2) => {
            payload.value = result2.issues.length === 0;
            return payload;
          });
        }
        payload.value = result.issues.length === 0;
        return payload;
      };
    });
    $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
      $ZodType.init(inst, def);
      defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
      defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
      defineLazy(inst._zod, "values", () => def.innerType._zod.values);
      inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
          return def.innerType._zod.run(payload, ctx);
        }
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise) {
          return result.then((result2) => {
            payload.value = result2.value;
            if (result2.issues.length) {
              payload.value = def.catchValue({
                ...payload,
                error: {
                  issues: result2.issues.map((iss) => finalizeIssue(iss, ctx, config()))
                },
                input: payload.value
              });
              payload.issues = [];
            }
            return payload;
          });
        }
        payload.value = result.value;
        if (result.issues.length) {
          payload.value = def.catchValue({
            ...payload,
            error: {
              issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
            },
            input: payload.value
          });
          payload.issues = [];
        }
        return payload;
      };
    });
    $ZodNaN = /* @__PURE__ */ $constructor("$ZodNaN", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.parse = (payload, _ctx) => {
        if (typeof payload.value !== "number" || !Number.isNaN(payload.value)) {
          payload.issues.push({
            input: payload.value,
            inst,
            expected: "nan",
            code: "invalid_type"
          });
          return payload;
        }
        return payload;
      };
    });
    $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
      $ZodType.init(inst, def);
      defineLazy(inst._zod, "values", () => def.in._zod.values);
      defineLazy(inst._zod, "optin", () => def.in._zod.optin);
      defineLazy(inst._zod, "optout", () => def.out._zod.optout);
      defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
      inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
          const right = def.out._zod.run(payload, ctx);
          if (right instanceof Promise) {
            return right.then((right2) => handlePipeResult(right2, def.in, ctx));
          }
          return handlePipeResult(right, def.in, ctx);
        }
        const left = def.in._zod.run(payload, ctx);
        if (left instanceof Promise) {
          return left.then((left2) => handlePipeResult(left2, def.out, ctx));
        }
        return handlePipeResult(left, def.out, ctx);
      };
    });
    $ZodCodec = /* @__PURE__ */ $constructor("$ZodCodec", (inst, def) => {
      $ZodType.init(inst, def);
      defineLazy(inst._zod, "values", () => def.in._zod.values);
      defineLazy(inst._zod, "optin", () => def.in._zod.optin);
      defineLazy(inst._zod, "optout", () => def.out._zod.optout);
      defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
      inst._zod.parse = (payload, ctx) => {
        const direction = ctx.direction || "forward";
        if (direction === "forward") {
          const left = def.in._zod.run(payload, ctx);
          if (left instanceof Promise) {
            return left.then((left2) => handleCodecAResult(left2, def, ctx));
          }
          return handleCodecAResult(left, def, ctx);
        } else {
          const right = def.out._zod.run(payload, ctx);
          if (right instanceof Promise) {
            return right.then((right2) => handleCodecAResult(right2, def, ctx));
          }
          return handleCodecAResult(right, def, ctx);
        }
      };
    });
    $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
      $ZodType.init(inst, def);
      defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
      defineLazy(inst._zod, "values", () => def.innerType._zod.values);
      defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
      defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
      inst._zod.parse = (payload, ctx) => {
        if (ctx.direction === "backward") {
          return def.innerType._zod.run(payload, ctx);
        }
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise) {
          return result.then(handleReadonlyResult);
        }
        return handleReadonlyResult(result);
      };
    });
    $ZodTemplateLiteral = /* @__PURE__ */ $constructor("$ZodTemplateLiteral", (inst, def) => {
      $ZodType.init(inst, def);
      const regexParts = [];
      for (const part of def.parts) {
        if (typeof part === "object" && part !== null) {
          if (!part._zod.pattern) {
            throw new Error(`Invalid template literal part, no pattern found: ${[...part._zod.traits].shift()}`);
          }
          const source = part._zod.pattern instanceof RegExp ? part._zod.pattern.source : part._zod.pattern;
          if (!source)
            throw new Error(`Invalid template literal part: ${part._zod.traits}`);
          const start = source.startsWith("^") ? 1 : 0;
          const end = source.endsWith("$") ? source.length - 1 : source.length;
          regexParts.push(source.slice(start, end));
        } else if (part === null || primitiveTypes.has(typeof part)) {
          regexParts.push(escapeRegex(`${part}`));
        } else {
          throw new Error(`Invalid template literal part: ${part}`);
        }
      }
      inst._zod.pattern = new RegExp(`^${regexParts.join("")}$`);
      inst._zod.parse = (payload, _ctx) => {
        if (typeof payload.value !== "string") {
          payload.issues.push({
            input: payload.value,
            inst,
            expected: "template_literal",
            code: "invalid_type"
          });
          return payload;
        }
        inst._zod.pattern.lastIndex = 0;
        if (!inst._zod.pattern.test(payload.value)) {
          payload.issues.push({
            input: payload.value,
            inst,
            code: "invalid_format",
            format: def.format ?? "template_literal",
            pattern: inst._zod.pattern.source
          });
          return payload;
        }
        return payload;
      };
    });
    $ZodFunction = /* @__PURE__ */ $constructor("$ZodFunction", (inst, def) => {
      $ZodType.init(inst, def);
      inst._def = def;
      inst._zod.def = def;
      inst.implement = (func) => {
        if (typeof func !== "function") {
          throw new Error("implement() must be called with a function");
        }
        return function(...args) {
          const parsedArgs = inst._def.input ? parse(inst._def.input, args) : args;
          const result = Reflect.apply(func, this, parsedArgs);
          if (inst._def.output) {
            return parse(inst._def.output, result);
          }
          return result;
        };
      };
      inst.implementAsync = (func) => {
        if (typeof func !== "function") {
          throw new Error("implementAsync() must be called with a function");
        }
        return async function(...args) {
          const parsedArgs = inst._def.input ? await parseAsync(inst._def.input, args) : args;
          const result = await Reflect.apply(func, this, parsedArgs);
          if (inst._def.output) {
            return await parseAsync(inst._def.output, result);
          }
          return result;
        };
      };
      inst._zod.parse = (payload, _ctx) => {
        if (typeof payload.value !== "function") {
          payload.issues.push({
            code: "invalid_type",
            expected: "function",
            input: payload.value,
            inst
          });
          return payload;
        }
        const hasPromiseOutput = inst._def.output && inst._def.output._zod.def.type === "promise";
        if (hasPromiseOutput) {
          payload.value = inst.implementAsync(payload.value);
        } else {
          payload.value = inst.implement(payload.value);
        }
        return payload;
      };
      inst.input = (...args) => {
        const F = inst.constructor;
        if (Array.isArray(args[0])) {
          return new F({
            type: "function",
            input: new $ZodTuple({
              type: "tuple",
              items: args[0],
              rest: args[1]
            }),
            output: inst._def.output
          });
        }
        return new F({
          type: "function",
          input: args[0],
          output: inst._def.output
        });
      };
      inst.output = (output) => {
        const F = inst.constructor;
        return new F({
          type: "function",
          input: inst._def.input,
          output
        });
      };
      return inst;
    });
    $ZodPromise = /* @__PURE__ */ $constructor("$ZodPromise", (inst, def) => {
      $ZodType.init(inst, def);
      inst._zod.parse = (payload, ctx) => {
        return Promise.resolve(payload.value).then((inner) => def.innerType._zod.run({ value: inner, issues: [] }, ctx));
      };
    });
    $ZodLazy = /* @__PURE__ */ $constructor("$ZodLazy", (inst, def) => {
      $ZodType.init(inst, def);
      defineLazy(inst._zod, "innerType", () => def.getter());
      defineLazy(inst._zod, "pattern", () => inst._zod.innerType._zod.pattern);
      defineLazy(inst._zod, "propValues", () => inst._zod.innerType._zod.propValues);
      defineLazy(inst._zod, "optin", () => inst._zod.innerType._zod.optin ?? void 0);
      defineLazy(inst._zod, "optout", () => inst._zod.innerType._zod.optout ?? void 0);
      inst._zod.parse = (payload, ctx) => {
        const inner = inst._zod.innerType;
        return inner._zod.run(payload, ctx);
      };
    });
    $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
      $ZodCheck.init(inst, def);
      $ZodType.init(inst, def);
      inst._zod.parse = (payload, _) => {
        return payload;
      };
      inst._zod.check = (payload) => {
        const input = payload.value;
        const r = def.fn(input);
        if (r instanceof Promise) {
          return r.then((r2) => handleRefineResult(r2, payload, input, inst));
        }
        handleRefineResult(r, payload, input, inst);
        return;
      };
    });
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/ar.js
function ar_default() {
  return {
    localeError: error()
  };
}
var error;
var init_ar = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/ar.js"() {
    init_util();
    error = () => {
      const Sizable = {
        string: { unit: "\u062D\u0631\u0641", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" },
        file: { unit: "\u0628\u0627\u064A\u062A", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" },
        array: { unit: "\u0639\u0646\u0635\u0631", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" },
        set: { unit: "\u0639\u0646\u0635\u0631", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "number";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "array";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "\u0645\u062F\u062E\u0644",
        email: "\u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A",
        url: "\u0631\u0627\u0628\u0637",
        emoji: "\u0625\u064A\u0645\u0648\u062C\u064A",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "\u062A\u0627\u0631\u064A\u062E \u0648\u0648\u0642\u062A \u0628\u0645\u0639\u064A\u0627\u0631 ISO",
        date: "\u062A\u0627\u0631\u064A\u062E \u0628\u0645\u0639\u064A\u0627\u0631 ISO",
        time: "\u0648\u0642\u062A \u0628\u0645\u0639\u064A\u0627\u0631 ISO",
        duration: "\u0645\u062F\u0629 \u0628\u0645\u0639\u064A\u0627\u0631 ISO",
        ipv4: "\u0639\u0646\u0648\u0627\u0646 IPv4",
        ipv6: "\u0639\u0646\u0648\u0627\u0646 IPv6",
        cidrv4: "\u0645\u062F\u0649 \u0639\u0646\u0627\u0648\u064A\u0646 \u0628\u0635\u064A\u063A\u0629 IPv4",
        cidrv6: "\u0645\u062F\u0649 \u0639\u0646\u0627\u0648\u064A\u0646 \u0628\u0635\u064A\u063A\u0629 IPv6",
        base64: "\u0646\u064E\u0635 \u0628\u062A\u0631\u0645\u064A\u0632 base64-encoded",
        base64url: "\u0646\u064E\u0635 \u0628\u062A\u0631\u0645\u064A\u0632 base64url-encoded",
        json_string: "\u0646\u064E\u0635 \u0639\u0644\u0649 \u0647\u064A\u0626\u0629 JSON",
        e164: "\u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u0628\u0645\u0639\u064A\u0627\u0631 E.164",
        jwt: "JWT",
        template_literal: "\u0645\u062F\u062E\u0644"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `\u0645\u062F\u062E\u0644\u0627\u062A \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644\u0629: \u064A\u0641\u062A\u0631\u0636 \u0625\u062F\u062E\u0627\u0644 ${issue2.expected}\u060C \u0648\u0644\u0643\u0646 \u062A\u0645 \u0625\u062F\u062E\u0627\u0644 ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `\u0645\u062F\u062E\u0644\u0627\u062A \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644\u0629: \u064A\u0641\u062A\u0631\u0636 \u0625\u062F\u062E\u0627\u0644 ${stringifyPrimitive(issue2.values[0])}`;
            return `\u0627\u062E\u062A\u064A\u0627\u0631 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062A\u0648\u0642\u0639 \u0627\u0646\u062A\u0642\u0627\u0621 \u0623\u062D\u062F \u0647\u0630\u0647 \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A: ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return ` \u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0623\u0646 \u062A\u0643\u0648\u0646 ${issue2.origin ?? "\u0627\u0644\u0642\u064A\u0645\u0629"} ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "\u0639\u0646\u0635\u0631"}`;
            return `\u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0623\u0646 \u062A\u0643\u0648\u0646 ${issue2.origin ?? "\u0627\u0644\u0642\u064A\u0645\u0629"} ${adj} ${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `\u0623\u0635\u063A\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0644\u0640 ${issue2.origin} \u0623\u0646 \u064A\u0643\u0648\u0646 ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `\u0623\u0635\u063A\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0644\u0640 ${issue2.origin} \u0623\u0646 \u064A\u0643\u0648\u0646 ${adj} ${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0628\u062F\u0623 \u0628\u0640 "${issue2.prefix}"`;
            if (_issue.format === "ends_with")
              return `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0646\u062A\u0647\u064A \u0628\u0640 "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u062A\u0636\u0645\u0651\u064E\u0646 "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0637\u0627\u0628\u0642 \u0627\u0644\u0646\u0645\u0637 ${_issue.pattern}`;
            return `${Nouns[_issue.format] ?? issue2.format} \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644`;
          }
          case "not_multiple_of":
            return `\u0631\u0642\u0645 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0645\u0646 \u0645\u0636\u0627\u0639\u0641\u0627\u062A ${issue2.divisor}`;
          case "unrecognized_keys":
            return `\u0645\u0639\u0631\u0641${issue2.keys.length > 1 ? "\u0627\u062A" : ""} \u063A\u0631\u064A\u0628${issue2.keys.length > 1 ? "\u0629" : ""}: ${joinValues(issue2.keys, "\u060C ")}`;
          case "invalid_key":
            return `\u0645\u0639\u0631\u0641 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644 \u0641\u064A ${issue2.origin}`;
          case "invalid_union":
            return "\u0645\u062F\u062E\u0644 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644";
          case "invalid_element":
            return `\u0645\u062F\u062E\u0644 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644 \u0641\u064A ${issue2.origin}`;
          default:
            return "\u0645\u062F\u062E\u0644 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644";
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/az.js
function az_default() {
  return {
    localeError: error2()
  };
}
var error2;
var init_az = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/az.js"() {
    init_util();
    error2 = () => {
      const Sizable = {
        string: { unit: "simvol", verb: "olmal\u0131d\u0131r" },
        file: { unit: "bayt", verb: "olmal\u0131d\u0131r" },
        array: { unit: "element", verb: "olmal\u0131d\u0131r" },
        set: { unit: "element", verb: "olmal\u0131d\u0131r" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "number";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "array";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "input",
        email: "email address",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO datetime",
        date: "ISO date",
        time: "ISO time",
        duration: "ISO duration",
        ipv4: "IPv4 address",
        ipv6: "IPv6 address",
        cidrv4: "IPv4 range",
        cidrv6: "IPv6 range",
        base64: "base64-encoded string",
        base64url: "base64url-encoded string",
        json_string: "JSON string",
        e164: "E.164 number",
        jwt: "JWT",
        template_literal: "input"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Yanl\u0131\u015F d\u0259y\u0259r: g\xF6zl\u0259nil\u0259n ${issue2.expected}, daxil olan ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Yanl\u0131\u015F d\u0259y\u0259r: g\xF6zl\u0259nil\u0259n ${stringifyPrimitive(issue2.values[0])}`;
            return `Yanl\u0131\u015F se\xE7im: a\u015Fa\u011F\u0131dak\u0131lardan biri olmal\u0131d\u0131r: ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `\xC7ox b\xF6y\xFCk: g\xF6zl\u0259nil\u0259n ${issue2.origin ?? "d\u0259y\u0259r"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "element"}`;
            return `\xC7ox b\xF6y\xFCk: g\xF6zl\u0259nil\u0259n ${issue2.origin ?? "d\u0259y\u0259r"} ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `\xC7ox ki\xE7ik: g\xF6zl\u0259nil\u0259n ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            return `\xC7ox ki\xE7ik: g\xF6zl\u0259nil\u0259n ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `Yanl\u0131\u015F m\u0259tn: "${_issue.prefix}" il\u0259 ba\u015Flamal\u0131d\u0131r`;
            if (_issue.format === "ends_with")
              return `Yanl\u0131\u015F m\u0259tn: "${_issue.suffix}" il\u0259 bitm\u0259lidir`;
            if (_issue.format === "includes")
              return `Yanl\u0131\u015F m\u0259tn: "${_issue.includes}" daxil olmal\u0131d\u0131r`;
            if (_issue.format === "regex")
              return `Yanl\u0131\u015F m\u0259tn: ${_issue.pattern} \u015Fablonuna uy\u011Fun olmal\u0131d\u0131r`;
            return `Yanl\u0131\u015F ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `Yanl\u0131\u015F \u0259d\u0259d: ${issue2.divisor} il\u0259 b\xF6l\xFCn\u0259 bil\u0259n olmal\u0131d\u0131r`;
          case "unrecognized_keys":
            return `Tan\u0131nmayan a\xE7ar${issue2.keys.length > 1 ? "lar" : ""}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `${issue2.origin} daxilind\u0259 yanl\u0131\u015F a\xE7ar`;
          case "invalid_union":
            return "Yanl\u0131\u015F d\u0259y\u0259r";
          case "invalid_element":
            return `${issue2.origin} daxilind\u0259 yanl\u0131\u015F d\u0259y\u0259r`;
          default:
            return `Yanl\u0131\u015F d\u0259y\u0259r`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/be.js
function getBelarusianPlural(count, one, few, many) {
  const absCount = Math.abs(count);
  const lastDigit = absCount % 10;
  const lastTwoDigits = absCount % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return many;
  }
  if (lastDigit === 1) {
    return one;
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return few;
  }
  return many;
}
function be_default() {
  return {
    localeError: error3()
  };
}
var error3;
var init_be = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/be.js"() {
    init_util();
    error3 = () => {
      const Sizable = {
        string: {
          unit: {
            one: "\u0441\u0456\u043C\u0432\u0430\u043B",
            few: "\u0441\u0456\u043C\u0432\u0430\u043B\u044B",
            many: "\u0441\u0456\u043C\u0432\u0430\u043B\u0430\u045E"
          },
          verb: "\u043C\u0435\u0446\u044C"
        },
        array: {
          unit: {
            one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442",
            few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B",
            many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430\u045E"
          },
          verb: "\u043C\u0435\u0446\u044C"
        },
        set: {
          unit: {
            one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442",
            few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B",
            many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430\u045E"
          },
          verb: "\u043C\u0435\u0446\u044C"
        },
        file: {
          unit: {
            one: "\u0431\u0430\u0439\u0442",
            few: "\u0431\u0430\u0439\u0442\u044B",
            many: "\u0431\u0430\u0439\u0442\u0430\u045E"
          },
          verb: "\u043C\u0435\u0446\u044C"
        }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "\u043B\u0456\u043A";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "\u043C\u0430\u0441\u0456\u045E";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "\u0443\u0432\u043E\u0434",
        email: "email \u0430\u0434\u0440\u0430\u0441",
        url: "URL",
        emoji: "\u044D\u043C\u043E\u0434\u0437\u0456",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO \u0434\u0430\u0442\u0430 \u0456 \u0447\u0430\u0441",
        date: "ISO \u0434\u0430\u0442\u0430",
        time: "ISO \u0447\u0430\u0441",
        duration: "ISO \u043F\u0440\u0430\u0446\u044F\u0433\u043B\u0430\u0441\u0446\u044C",
        ipv4: "IPv4 \u0430\u0434\u0440\u0430\u0441",
        ipv6: "IPv6 \u0430\u0434\u0440\u0430\u0441",
        cidrv4: "IPv4 \u0434\u044B\u044F\u043F\u0430\u0437\u043E\u043D",
        cidrv6: "IPv6 \u0434\u044B\u044F\u043F\u0430\u0437\u043E\u043D",
        base64: "\u0440\u0430\u0434\u043E\u043A \u0443 \u0444\u0430\u0440\u043C\u0430\u0446\u0435 base64",
        base64url: "\u0440\u0430\u0434\u043E\u043A \u0443 \u0444\u0430\u0440\u043C\u0430\u0446\u0435 base64url",
        json_string: "JSON \u0440\u0430\u0434\u043E\u043A",
        e164: "\u043D\u0443\u043C\u0430\u0440 E.164",
        jwt: "JWT",
        template_literal: "\u0443\u0432\u043E\u0434"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434: \u0447\u0430\u043A\u0430\u045E\u0441\u044F ${issue2.expected}, \u0430\u0442\u0440\u044B\u043C\u0430\u043D\u0430 ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F ${stringifyPrimitive(issue2.values[0])}`;
            return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0432\u0430\u0440\u044B\u044F\u043D\u0442: \u0447\u0430\u043A\u0430\u045E\u0441\u044F \u0430\u0434\u0437\u0456\u043D \u0437 ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              const maxValue = Number(issue2.maximum);
              const unit = getBelarusianPlural(maxValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
              return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u0432\u044F\u043B\u0456\u043A\u0456: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${issue2.origin ?? "\u0437\u043D\u0430\u0447\u044D\u043D\u043D\u0435"} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 ${sizing.verb} ${adj}${issue2.maximum.toString()} ${unit}`;
            }
            return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u0432\u044F\u043B\u0456\u043A\u0456: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${issue2.origin ?? "\u0437\u043D\u0430\u0447\u044D\u043D\u043D\u0435"} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 \u0431\u044B\u0446\u044C ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              const minValue = Number(issue2.minimum);
              const unit = getBelarusianPlural(minValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
              return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u043C\u0430\u043B\u044B: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${issue2.origin} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 ${sizing.verb} ${adj}${issue2.minimum.toString()} ${unit}`;
            }
            return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u043C\u0430\u043B\u044B: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${issue2.origin} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 \u0431\u044B\u0446\u044C ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u043F\u0430\u0447\u044B\u043D\u0430\u0446\u0446\u0430 \u0437 "${_issue.prefix}"`;
            if (_issue.format === "ends_with")
              return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0437\u0430\u043A\u0430\u043D\u0447\u0432\u0430\u0446\u0446\u0430 \u043D\u0430 "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0437\u043C\u044F\u0448\u0447\u0430\u0446\u044C "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0430\u0434\u043F\u0430\u0432\u044F\u0434\u0430\u0446\u044C \u0448\u0430\u0431\u043B\u043E\u043D\u0443 ${_issue.pattern}`;
            return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u043B\u0456\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0431\u044B\u0446\u044C \u043A\u0440\u0430\u0442\u043D\u044B\u043C ${issue2.divisor}`;
          case "unrecognized_keys":
            return `\u041D\u0435\u0440\u0430\u0441\u043F\u0430\u0437\u043D\u0430\u043D\u044B ${issue2.keys.length > 1 ? "\u043A\u043B\u044E\u0447\u044B" : "\u043A\u043B\u044E\u0447"}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u043A\u043B\u044E\u0447 \u0443 ${issue2.origin}`;
          case "invalid_union":
            return "\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434";
          case "invalid_element":
            return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u0430\u0435 \u0437\u043D\u0430\u0447\u044D\u043D\u043D\u0435 \u045E ${issue2.origin}`;
          default:
            return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/bg.js
function bg_default() {
  return {
    localeError: error4()
  };
}
var parsedType, error4;
var init_bg = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/bg.js"() {
    init_util();
    parsedType = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "\u0447\u0438\u0441\u043B\u043E";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u043C\u0430\u0441\u0438\u0432";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    error4 = () => {
      const Sizable = {
        string: { unit: "\u0441\u0438\u043C\u0432\u043E\u043B\u0430", verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430" },
        file: { unit: "\u0431\u0430\u0439\u0442\u0430", verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430" },
        array: { unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430", verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430" },
        set: { unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430", verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const Nouns = {
        regex: "\u0432\u0445\u043E\u0434",
        email: "\u0438\u043C\u0435\u0439\u043B \u0430\u0434\u0440\u0435\u0441",
        url: "URL",
        emoji: "\u0435\u043C\u043E\u0434\u0436\u0438",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO \u0432\u0440\u0435\u043C\u0435",
        date: "ISO \u0434\u0430\u0442\u0430",
        time: "ISO \u0432\u0440\u0435\u043C\u0435",
        duration: "ISO \u043F\u0440\u043E\u0434\u044A\u043B\u0436\u0438\u0442\u0435\u043B\u043D\u043E\u0441\u0442",
        ipv4: "IPv4 \u0430\u0434\u0440\u0435\u0441",
        ipv6: "IPv6 \u0430\u0434\u0440\u0435\u0441",
        cidrv4: "IPv4 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D",
        cidrv6: "IPv6 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D",
        base64: "base64-\u043A\u043E\u0434\u0438\u0440\u0430\u043D \u043D\u0438\u0437",
        base64url: "base64url-\u043A\u043E\u0434\u0438\u0440\u0430\u043D \u043D\u0438\u0437",
        json_string: "JSON \u043D\u0438\u0437",
        e164: "E.164 \u043D\u043E\u043C\u0435\u0440",
        jwt: "JWT",
        template_literal: "\u0432\u0445\u043E\u0434"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434: \u043E\u0447\u0430\u043A\u0432\u0430\u043D ${issue2.expected}, \u043F\u043E\u043B\u0443\u0447\u0435\u043D ${parsedType(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434: \u043E\u0447\u0430\u043A\u0432\u0430\u043D ${stringifyPrimitive(issue2.values[0])}`;
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430 \u043E\u043F\u0446\u0438\u044F: \u043E\u0447\u0430\u043A\u0432\u0430\u043D\u043E \u0435\u0434\u043D\u043E \u043E\u0442 ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `\u0422\u0432\u044A\u0440\u0434\u0435 \u0433\u043E\u043B\u044F\u043C\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${issue2.origin ?? "\u0441\u0442\u043E\u0439\u043D\u043E\u0441\u0442"} \u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430 ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430"}`;
            return `\u0422\u0432\u044A\u0440\u0434\u0435 \u0433\u043E\u043B\u044F\u043C\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${issue2.origin ?? "\u0441\u0442\u043E\u0439\u043D\u043E\u0441\u0442"} \u0434\u0430 \u0431\u044A\u0434\u0435 ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `\u0422\u0432\u044A\u0440\u0434\u0435 \u043C\u0430\u043B\u043A\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${issue2.origin} \u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430 ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `\u0422\u0432\u044A\u0440\u0434\u0435 \u043C\u0430\u043B\u043A\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${issue2.origin} \u0434\u0430 \u0431\u044A\u0434\u0435 ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with") {
              return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0437\u0430\u043F\u043E\u0447\u0432\u0430 \u0441 "${_issue.prefix}"`;
            }
            if (_issue.format === "ends_with")
              return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0437\u0430\u0432\u044A\u0440\u0448\u0432\u0430 \u0441 "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0432\u043A\u043B\u044E\u0447\u0432\u0430 "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0441\u044A\u0432\u043F\u0430\u0434\u0430 \u0441 ${_issue.pattern}`;
            let invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D";
            if (_issue.format === "emoji")
              invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E";
            if (_issue.format === "datetime")
              invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E";
            if (_issue.format === "date")
              invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430";
            if (_issue.format === "time")
              invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E";
            if (_issue.format === "duration")
              invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430";
            return `${invalid_adj} ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E \u0447\u0438\u0441\u043B\u043E: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0431\u044A\u0434\u0435 \u043A\u0440\u0430\u0442\u043D\u043E \u043D\u0430 ${issue2.divisor}`;
          case "unrecognized_keys":
            return `\u041D\u0435\u0440\u0430\u0437\u043F\u043E\u0437\u043D\u0430\u0442${issue2.keys.length > 1 ? "\u0438" : ""} \u043A\u043B\u044E\u0447${issue2.keys.length > 1 ? "\u043E\u0432\u0435" : ""}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043A\u043B\u044E\u0447 \u0432 ${issue2.origin}`;
          case "invalid_union":
            return "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434";
          case "invalid_element":
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430 \u0441\u0442\u043E\u0439\u043D\u043E\u0441\u0442 \u0432 ${issue2.origin}`;
          default:
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/ca.js
function ca_default() {
  return {
    localeError: error5()
  };
}
var error5;
var init_ca = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/ca.js"() {
    init_util();
    error5 = () => {
      const Sizable = {
        string: { unit: "car\xE0cters", verb: "contenir" },
        file: { unit: "bytes", verb: "contenir" },
        array: { unit: "elements", verb: "contenir" },
        set: { unit: "elements", verb: "contenir" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "number";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "array";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "entrada",
        email: "adre\xE7a electr\xF2nica",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "data i hora ISO",
        date: "data ISO",
        time: "hora ISO",
        duration: "durada ISO",
        ipv4: "adre\xE7a IPv4",
        ipv6: "adre\xE7a IPv6",
        cidrv4: "rang IPv4",
        cidrv6: "rang IPv6",
        base64: "cadena codificada en base64",
        base64url: "cadena codificada en base64url",
        json_string: "cadena JSON",
        e164: "n\xFAmero E.164",
        jwt: "JWT",
        template_literal: "entrada"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Tipus inv\xE0lid: s'esperava ${issue2.expected}, s'ha rebut ${parsedType8(issue2.input)}`;
          // return `Tipus invàlid: s'esperava ${issue.expected}, s'ha rebut ${util.getParsedType(issue.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Valor inv\xE0lid: s'esperava ${stringifyPrimitive(issue2.values[0])}`;
            return `Opci\xF3 inv\xE0lida: s'esperava una de ${joinValues(issue2.values, " o ")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "com a m\xE0xim" : "menys de";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `Massa gran: s'esperava que ${issue2.origin ?? "el valor"} contingu\xE9s ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "elements"}`;
            return `Massa gran: s'esperava que ${issue2.origin ?? "el valor"} fos ${adj} ${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? "com a m\xEDnim" : "m\xE9s de";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `Massa petit: s'esperava que ${issue2.origin} contingu\xE9s ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `Massa petit: s'esperava que ${issue2.origin} fos ${adj} ${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with") {
              return `Format inv\xE0lid: ha de comen\xE7ar amb "${_issue.prefix}"`;
            }
            if (_issue.format === "ends_with")
              return `Format inv\xE0lid: ha d'acabar amb "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `Format inv\xE0lid: ha d'incloure "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `Format inv\xE0lid: ha de coincidir amb el patr\xF3 ${_issue.pattern}`;
            return `Format inv\xE0lid per a ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `N\xFAmero inv\xE0lid: ha de ser m\xFAltiple de ${issue2.divisor}`;
          case "unrecognized_keys":
            return `Clau${issue2.keys.length > 1 ? "s" : ""} no reconeguda${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `Clau inv\xE0lida a ${issue2.origin}`;
          case "invalid_union":
            return "Entrada inv\xE0lida";
          // Could also be "Tipus d'unió invàlid" but "Entrada invàlida" is more general
          case "invalid_element":
            return `Element inv\xE0lid a ${issue2.origin}`;
          default:
            return `Entrada inv\xE0lida`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/cs.js
function cs_default() {
  return {
    localeError: error6()
  };
}
var error6;
var init_cs = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/cs.js"() {
    init_util();
    error6 = () => {
      const Sizable = {
        string: { unit: "znak\u016F", verb: "m\xEDt" },
        file: { unit: "bajt\u016F", verb: "m\xEDt" },
        array: { unit: "prvk\u016F", verb: "m\xEDt" },
        set: { unit: "prvk\u016F", verb: "m\xEDt" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "\u010D\xEDslo";
          }
          case "string": {
            return "\u0159et\u011Bzec";
          }
          case "boolean": {
            return "boolean";
          }
          case "bigint": {
            return "bigint";
          }
          case "function": {
            return "funkce";
          }
          case "symbol": {
            return "symbol";
          }
          case "undefined": {
            return "undefined";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "pole";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "regul\xE1rn\xED v\xFDraz",
        email: "e-mailov\xE1 adresa",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "datum a \u010Das ve form\xE1tu ISO",
        date: "datum ve form\xE1tu ISO",
        time: "\u010Das ve form\xE1tu ISO",
        duration: "doba trv\xE1n\xED ISO",
        ipv4: "IPv4 adresa",
        ipv6: "IPv6 adresa",
        cidrv4: "rozsah IPv4",
        cidrv6: "rozsah IPv6",
        base64: "\u0159et\u011Bzec zak\xF3dovan\xFD ve form\xE1tu base64",
        base64url: "\u0159et\u011Bzec zak\xF3dovan\xFD ve form\xE1tu base64url",
        json_string: "\u0159et\u011Bzec ve form\xE1tu JSON",
        e164: "\u010D\xEDslo E.164",
        jwt: "JWT",
        template_literal: "vstup"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Neplatn\xFD vstup: o\u010Dek\xE1v\xE1no ${issue2.expected}, obdr\u017Eeno ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Neplatn\xFD vstup: o\u010Dek\xE1v\xE1no ${stringifyPrimitive(issue2.values[0])}`;
            return `Neplatn\xE1 mo\u017Enost: o\u010Dek\xE1v\xE1na jedna z hodnot ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `Hodnota je p\u0159\xEDli\u0161 velk\xE1: ${issue2.origin ?? "hodnota"} mus\xED m\xEDt ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "prvk\u016F"}`;
            }
            return `Hodnota je p\u0159\xEDli\u0161 velk\xE1: ${issue2.origin ?? "hodnota"} mus\xED b\xFDt ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `Hodnota je p\u0159\xEDli\u0161 mal\xE1: ${issue2.origin ?? "hodnota"} mus\xED m\xEDt ${adj}${issue2.minimum.toString()} ${sizing.unit ?? "prvk\u016F"}`;
            }
            return `Hodnota je p\u0159\xEDli\u0161 mal\xE1: ${issue2.origin ?? "hodnota"} mus\xED b\xFDt ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `Neplatn\xFD \u0159et\u011Bzec: mus\xED za\u010D\xEDnat na "${_issue.prefix}"`;
            if (_issue.format === "ends_with")
              return `Neplatn\xFD \u0159et\u011Bzec: mus\xED kon\u010Dit na "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `Neplatn\xFD \u0159et\u011Bzec: mus\xED obsahovat "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `Neplatn\xFD \u0159et\u011Bzec: mus\xED odpov\xEDdat vzoru ${_issue.pattern}`;
            return `Neplatn\xFD form\xE1t ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `Neplatn\xE9 \u010D\xEDslo: mus\xED b\xFDt n\xE1sobkem ${issue2.divisor}`;
          case "unrecognized_keys":
            return `Nezn\xE1m\xE9 kl\xED\u010De: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `Neplatn\xFD kl\xED\u010D v ${issue2.origin}`;
          case "invalid_union":
            return "Neplatn\xFD vstup";
          case "invalid_element":
            return `Neplatn\xE1 hodnota v ${issue2.origin}`;
          default:
            return `Neplatn\xFD vstup`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/da.js
function da_default() {
  return {
    localeError: error7()
  };
}
var error7;
var init_da = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/da.js"() {
    init_util();
    error7 = () => {
      const Sizable = {
        string: { unit: "tegn", verb: "havde" },
        file: { unit: "bytes", verb: "havde" },
        array: { unit: "elementer", verb: "indeholdt" },
        set: { unit: "elementer", verb: "indeholdt" }
      };
      const TypeNames = {
        string: "streng",
        number: "tal",
        boolean: "boolean",
        array: "liste",
        object: "objekt",
        set: "s\xE6t",
        file: "fil"
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      function getTypeName(type) {
        return TypeNames[type] ?? type;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "tal";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "liste";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
            return "objekt";
          }
        }
        return t;
      };
      const Nouns = {
        regex: "input",
        email: "e-mailadresse",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO dato- og klokkesl\xE6t",
        date: "ISO-dato",
        time: "ISO-klokkesl\xE6t",
        duration: "ISO-varighed",
        ipv4: "IPv4-omr\xE5de",
        ipv6: "IPv6-omr\xE5de",
        cidrv4: "IPv4-spektrum",
        cidrv6: "IPv6-spektrum",
        base64: "base64-kodet streng",
        base64url: "base64url-kodet streng",
        json_string: "JSON-streng",
        e164: "E.164-nummer",
        jwt: "JWT",
        template_literal: "input"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Ugyldigt input: forventede ${getTypeName(issue2.expected)}, fik ${getTypeName(parsedType8(issue2.input))}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Ugyldig v\xE6rdi: forventede ${stringifyPrimitive(issue2.values[0])}`;
            return `Ugyldigt valg: forventede en af f\xF8lgende ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            const origin = getTypeName(issue2.origin);
            if (sizing)
              return `For stor: forventede ${origin ?? "value"} ${sizing.verb} ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "elementer"}`;
            return `For stor: forventede ${origin ?? "value"} havde ${adj} ${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            const origin = getTypeName(issue2.origin);
            if (sizing) {
              return `For lille: forventede ${origin} ${sizing.verb} ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `For lille: forventede ${origin} havde ${adj} ${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `Ugyldig streng: skal starte med "${_issue.prefix}"`;
            if (_issue.format === "ends_with")
              return `Ugyldig streng: skal ende med "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `Ugyldig streng: skal indeholde "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `Ugyldig streng: skal matche m\xF8nsteret ${_issue.pattern}`;
            return `Ugyldig ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `Ugyldigt tal: skal v\xE6re deleligt med ${issue2.divisor}`;
          case "unrecognized_keys":
            return `${issue2.keys.length > 1 ? "Ukendte n\xF8gler" : "Ukendt n\xF8gle"}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `Ugyldig n\xF8gle i ${issue2.origin}`;
          case "invalid_union":
            return "Ugyldigt input: matcher ingen af de tilladte typer";
          case "invalid_element":
            return `Ugyldig v\xE6rdi i ${issue2.origin}`;
          default:
            return `Ugyldigt input`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/de.js
function de_default() {
  return {
    localeError: error8()
  };
}
var error8;
var init_de = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/de.js"() {
    init_util();
    error8 = () => {
      const Sizable = {
        string: { unit: "Zeichen", verb: "zu haben" },
        file: { unit: "Bytes", verb: "zu haben" },
        array: { unit: "Elemente", verb: "zu haben" },
        set: { unit: "Elemente", verb: "zu haben" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "Zahl";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "Array";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "Eingabe",
        email: "E-Mail-Adresse",
        url: "URL",
        emoji: "Emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO-Datum und -Uhrzeit",
        date: "ISO-Datum",
        time: "ISO-Uhrzeit",
        duration: "ISO-Dauer",
        ipv4: "IPv4-Adresse",
        ipv6: "IPv6-Adresse",
        cidrv4: "IPv4-Bereich",
        cidrv6: "IPv6-Bereich",
        base64: "Base64-codierter String",
        base64url: "Base64-URL-codierter String",
        json_string: "JSON-String",
        e164: "E.164-Nummer",
        jwt: "JWT",
        template_literal: "Eingabe"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Ung\xFCltige Eingabe: erwartet ${issue2.expected}, erhalten ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Ung\xFCltige Eingabe: erwartet ${stringifyPrimitive(issue2.values[0])}`;
            return `Ung\xFCltige Option: erwartet eine von ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `Zu gro\xDF: erwartet, dass ${issue2.origin ?? "Wert"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "Elemente"} hat`;
            return `Zu gro\xDF: erwartet, dass ${issue2.origin ?? "Wert"} ${adj}${issue2.maximum.toString()} ist`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `Zu klein: erwartet, dass ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} hat`;
            }
            return `Zu klein: erwartet, dass ${issue2.origin} ${adj}${issue2.minimum.toString()} ist`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `Ung\xFCltiger String: muss mit "${_issue.prefix}" beginnen`;
            if (_issue.format === "ends_with")
              return `Ung\xFCltiger String: muss mit "${_issue.suffix}" enden`;
            if (_issue.format === "includes")
              return `Ung\xFCltiger String: muss "${_issue.includes}" enthalten`;
            if (_issue.format === "regex")
              return `Ung\xFCltiger String: muss dem Muster ${_issue.pattern} entsprechen`;
            return `Ung\xFCltig: ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `Ung\xFCltige Zahl: muss ein Vielfaches von ${issue2.divisor} sein`;
          case "unrecognized_keys":
            return `${issue2.keys.length > 1 ? "Unbekannte Schl\xFCssel" : "Unbekannter Schl\xFCssel"}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `Ung\xFCltiger Schl\xFCssel in ${issue2.origin}`;
          case "invalid_union":
            return "Ung\xFCltige Eingabe";
          case "invalid_element":
            return `Ung\xFCltiger Wert in ${issue2.origin}`;
          default:
            return `Ung\xFCltige Eingabe`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/en.js
function en_default() {
  return {
    localeError: error9()
  };
}
var parsedType2, error9;
var init_en = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/en.js"() {
    init_util();
    parsedType2 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "number";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    error9 = () => {
      const Sizable = {
        string: { unit: "characters", verb: "to have" },
        file: { unit: "bytes", verb: "to have" },
        array: { unit: "items", verb: "to have" },
        set: { unit: "items", verb: "to have" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const Nouns = {
        regex: "input",
        email: "email address",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO datetime",
        date: "ISO date",
        time: "ISO time",
        duration: "ISO duration",
        ipv4: "IPv4 address",
        ipv6: "IPv6 address",
        cidrv4: "IPv4 range",
        cidrv6: "IPv6 range",
        base64: "base64-encoded string",
        base64url: "base64url-encoded string",
        json_string: "JSON string",
        e164: "E.164 number",
        jwt: "JWT",
        template_literal: "input"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Invalid input: expected ${issue2.expected}, received ${parsedType2(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Invalid input: expected ${stringifyPrimitive(issue2.values[0])}`;
            return `Invalid option: expected one of ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `Too big: expected ${issue2.origin ?? "value"} to have ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elements"}`;
            return `Too big: expected ${issue2.origin ?? "value"} to be ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `Too small: expected ${issue2.origin} to have ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `Too small: expected ${issue2.origin} to be ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with") {
              return `Invalid string: must start with "${_issue.prefix}"`;
            }
            if (_issue.format === "ends_with")
              return `Invalid string: must end with "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `Invalid string: must include "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `Invalid string: must match pattern ${_issue.pattern}`;
            return `Invalid ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `Invalid number: must be a multiple of ${issue2.divisor}`;
          case "unrecognized_keys":
            return `Unrecognized key${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `Invalid key in ${issue2.origin}`;
          case "invalid_union":
            return "Invalid input";
          case "invalid_element":
            return `Invalid value in ${issue2.origin}`;
          default:
            return `Invalid input`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/eo.js
function eo_default() {
  return {
    localeError: error10()
  };
}
var parsedType3, error10;
var init_eo = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/eo.js"() {
    init_util();
    parsedType3 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "nombro";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "tabelo";
          }
          if (data === null) {
            return "senvalora";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    error10 = () => {
      const Sizable = {
        string: { unit: "karaktrojn", verb: "havi" },
        file: { unit: "bajtojn", verb: "havi" },
        array: { unit: "elementojn", verb: "havi" },
        set: { unit: "elementojn", verb: "havi" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const Nouns = {
        regex: "enigo",
        email: "retadreso",
        url: "URL",
        emoji: "emo\u011Dio",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO-datotempo",
        date: "ISO-dato",
        time: "ISO-tempo",
        duration: "ISO-da\u016Dro",
        ipv4: "IPv4-adreso",
        ipv6: "IPv6-adreso",
        cidrv4: "IPv4-rango",
        cidrv6: "IPv6-rango",
        base64: "64-ume kodita karaktraro",
        base64url: "URL-64-ume kodita karaktraro",
        json_string: "JSON-karaktraro",
        e164: "E.164-nombro",
        jwt: "JWT",
        template_literal: "enigo"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Nevalida enigo: atendi\u011Dis ${issue2.expected}, ricevi\u011Dis ${parsedType3(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Nevalida enigo: atendi\u011Dis ${stringifyPrimitive(issue2.values[0])}`;
            return `Nevalida opcio: atendi\u011Dis unu el ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `Tro granda: atendi\u011Dis ke ${issue2.origin ?? "valoro"} havu ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementojn"}`;
            return `Tro granda: atendi\u011Dis ke ${issue2.origin ?? "valoro"} havu ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `Tro malgranda: atendi\u011Dis ke ${issue2.origin} havu ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `Tro malgranda: atendi\u011Dis ke ${issue2.origin} estu ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `Nevalida karaktraro: devas komenci\u011Di per "${_issue.prefix}"`;
            if (_issue.format === "ends_with")
              return `Nevalida karaktraro: devas fini\u011Di per "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `Nevalida karaktraro: devas inkluzivi "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `Nevalida karaktraro: devas kongrui kun la modelo ${_issue.pattern}`;
            return `Nevalida ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `Nevalida nombro: devas esti oblo de ${issue2.divisor}`;
          case "unrecognized_keys":
            return `Nekonata${issue2.keys.length > 1 ? "j" : ""} \u015Dlosilo${issue2.keys.length > 1 ? "j" : ""}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `Nevalida \u015Dlosilo en ${issue2.origin}`;
          case "invalid_union":
            return "Nevalida enigo";
          case "invalid_element":
            return `Nevalida valoro en ${issue2.origin}`;
          default:
            return `Nevalida enigo`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/es.js
function es_default() {
  return {
    localeError: error11()
  };
}
var error11;
var init_es = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/es.js"() {
    init_util();
    error11 = () => {
      const Sizable = {
        string: { unit: "caracteres", verb: "tener" },
        file: { unit: "bytes", verb: "tener" },
        array: { unit: "elementos", verb: "tener" },
        set: { unit: "elementos", verb: "tener" }
      };
      const TypeNames = {
        string: "texto",
        number: "n\xFAmero",
        boolean: "booleano",
        array: "arreglo",
        object: "objeto",
        set: "conjunto",
        file: "archivo",
        date: "fecha",
        bigint: "n\xFAmero grande",
        symbol: "s\xEDmbolo",
        undefined: "indefinido",
        null: "nulo",
        function: "funci\xF3n",
        map: "mapa",
        record: "registro",
        tuple: "tupla",
        enum: "enumeraci\xF3n",
        union: "uni\xF3n",
        literal: "literal",
        promise: "promesa",
        void: "vac\xEDo",
        never: "nunca",
        unknown: "desconocido",
        any: "cualquiera"
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      function getTypeName(type) {
        return TypeNames[type] ?? type;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "number";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "array";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype) {
              return data.constructor.name;
            }
            return "object";
          }
        }
        return t;
      };
      const Nouns = {
        regex: "entrada",
        email: "direcci\xF3n de correo electr\xF3nico",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "fecha y hora ISO",
        date: "fecha ISO",
        time: "hora ISO",
        duration: "duraci\xF3n ISO",
        ipv4: "direcci\xF3n IPv4",
        ipv6: "direcci\xF3n IPv6",
        cidrv4: "rango IPv4",
        cidrv6: "rango IPv6",
        base64: "cadena codificada en base64",
        base64url: "URL codificada en base64",
        json_string: "cadena JSON",
        e164: "n\xFAmero E.164",
        jwt: "JWT",
        template_literal: "entrada"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Entrada inv\xE1lida: se esperaba ${getTypeName(issue2.expected)}, recibido ${getTypeName(parsedType8(issue2.input))}`;
          // return `Entrada inválida: se esperaba ${issue.expected}, recibido ${util.getParsedType(issue.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Entrada inv\xE1lida: se esperaba ${stringifyPrimitive(issue2.values[0])}`;
            return `Opci\xF3n inv\xE1lida: se esperaba una de ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            const origin = getTypeName(issue2.origin);
            if (sizing)
              return `Demasiado grande: se esperaba que ${origin ?? "valor"} tuviera ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementos"}`;
            return `Demasiado grande: se esperaba que ${origin ?? "valor"} fuera ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            const origin = getTypeName(issue2.origin);
            if (sizing) {
              return `Demasiado peque\xF1o: se esperaba que ${origin} tuviera ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `Demasiado peque\xF1o: se esperaba que ${origin} fuera ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `Cadena inv\xE1lida: debe comenzar con "${_issue.prefix}"`;
            if (_issue.format === "ends_with")
              return `Cadena inv\xE1lida: debe terminar en "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `Cadena inv\xE1lida: debe incluir "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `Cadena inv\xE1lida: debe coincidir con el patr\xF3n ${_issue.pattern}`;
            return `Inv\xE1lido ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `N\xFAmero inv\xE1lido: debe ser m\xFAltiplo de ${issue2.divisor}`;
          case "unrecognized_keys":
            return `Llave${issue2.keys.length > 1 ? "s" : ""} desconocida${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `Llave inv\xE1lida en ${getTypeName(issue2.origin)}`;
          case "invalid_union":
            return "Entrada inv\xE1lida";
          case "invalid_element":
            return `Valor inv\xE1lido en ${getTypeName(issue2.origin)}`;
          default:
            return `Entrada inv\xE1lida`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/fa.js
function fa_default() {
  return {
    localeError: error12()
  };
}
var error12;
var init_fa = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/fa.js"() {
    init_util();
    error12 = () => {
      const Sizable = {
        string: { unit: "\u06A9\u0627\u0631\u0627\u06A9\u062A\u0631", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" },
        file: { unit: "\u0628\u0627\u06CC\u062A", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" },
        array: { unit: "\u0622\u06CC\u062A\u0645", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" },
        set: { unit: "\u0622\u06CC\u062A\u0645", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "\u0639\u062F\u062F";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "\u0622\u0631\u0627\u06CC\u0647";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "\u0648\u0631\u0648\u062F\u06CC",
        email: "\u0622\u062F\u0631\u0633 \u0627\u06CC\u0645\u06CC\u0644",
        url: "URL",
        emoji: "\u0627\u06CC\u0645\u0648\u062C\u06CC",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "\u062A\u0627\u0631\u06CC\u062E \u0648 \u0632\u0645\u0627\u0646 \u0627\u06CC\u0632\u0648",
        date: "\u062A\u0627\u0631\u06CC\u062E \u0627\u06CC\u0632\u0648",
        time: "\u0632\u0645\u0627\u0646 \u0627\u06CC\u0632\u0648",
        duration: "\u0645\u062F\u062A \u0632\u0645\u0627\u0646 \u0627\u06CC\u0632\u0648",
        ipv4: "IPv4 \u0622\u062F\u0631\u0633",
        ipv6: "IPv6 \u0622\u062F\u0631\u0633",
        cidrv4: "IPv4 \u062F\u0627\u0645\u0646\u0647",
        cidrv6: "IPv6 \u062F\u0627\u0645\u0646\u0647",
        base64: "base64-encoded \u0631\u0634\u062A\u0647",
        base64url: "base64url-encoded \u0631\u0634\u062A\u0647",
        json_string: "JSON \u0631\u0634\u062A\u0647",
        e164: "E.164 \u0639\u062F\u062F",
        jwt: "JWT",
        template_literal: "\u0648\u0631\u0648\u062F\u06CC"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A ${issue2.expected} \u0645\u06CC\u200C\u0628\u0648\u062F\u060C ${parsedType8(issue2.input)} \u062F\u0631\u06CC\u0627\u0641\u062A \u0634\u062F`;
          case "invalid_value":
            if (issue2.values.length === 1) {
              return `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A ${stringifyPrimitive(issue2.values[0])} \u0645\u06CC\u200C\u0628\u0648\u062F`;
            }
            return `\u06AF\u0632\u06CC\u0646\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A \u06CC\u06A9\u06CC \u0627\u0632 ${joinValues(issue2.values, "|")} \u0645\u06CC\u200C\u0628\u0648\u062F`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `\u062E\u06CC\u0644\u06CC \u0628\u0632\u0631\u06AF: ${issue2.origin ?? "\u0645\u0642\u062F\u0627\u0631"} \u0628\u0627\u06CC\u062F ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "\u0639\u0646\u0635\u0631"} \u0628\u0627\u0634\u062F`;
            }
            return `\u062E\u06CC\u0644\u06CC \u0628\u0632\u0631\u06AF: ${issue2.origin ?? "\u0645\u0642\u062F\u0627\u0631"} \u0628\u0627\u06CC\u062F ${adj}${issue2.maximum.toString()} \u0628\u0627\u0634\u062F`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `\u062E\u06CC\u0644\u06CC \u06A9\u0648\u0686\u06A9: ${issue2.origin} \u0628\u0627\u06CC\u062F ${adj}${issue2.minimum.toString()} ${sizing.unit} \u0628\u0627\u0634\u062F`;
            }
            return `\u062E\u06CC\u0644\u06CC \u06A9\u0648\u0686\u06A9: ${issue2.origin} \u0628\u0627\u06CC\u062F ${adj}${issue2.minimum.toString()} \u0628\u0627\u0634\u062F`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with") {
              return `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0628\u0627 "${_issue.prefix}" \u0634\u0631\u0648\u0639 \u0634\u0648\u062F`;
            }
            if (_issue.format === "ends_with") {
              return `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0628\u0627 "${_issue.suffix}" \u062A\u0645\u0627\u0645 \u0634\u0648\u062F`;
            }
            if (_issue.format === "includes") {
              return `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0634\u0627\u0645\u0644 "${_issue.includes}" \u0628\u0627\u0634\u062F`;
            }
            if (_issue.format === "regex") {
              return `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0628\u0627 \u0627\u0644\u06AF\u0648\u06CC ${_issue.pattern} \u0645\u0637\u0627\u0628\u0642\u062A \u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F`;
            }
            return `${Nouns[_issue.format] ?? issue2.format} \u0646\u0627\u0645\u0639\u062A\u0628\u0631`;
          }
          case "not_multiple_of":
            return `\u0639\u062F\u062F \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0645\u0636\u0631\u0628 ${issue2.divisor} \u0628\u0627\u0634\u062F`;
          case "unrecognized_keys":
            return `\u06A9\u0644\u06CC\u062F${issue2.keys.length > 1 ? "\u0647\u0627\u06CC" : ""} \u0646\u0627\u0634\u0646\u0627\u0633: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `\u06A9\u0644\u06CC\u062F \u0646\u0627\u0634\u0646\u0627\u0633 \u062F\u0631 ${issue2.origin}`;
          case "invalid_union":
            return `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631`;
          case "invalid_element":
            return `\u0645\u0642\u062F\u0627\u0631 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u062F\u0631 ${issue2.origin}`;
          default:
            return `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/fi.js
function fi_default() {
  return {
    localeError: error13()
  };
}
var error13;
var init_fi = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/fi.js"() {
    init_util();
    error13 = () => {
      const Sizable = {
        string: { unit: "merkki\xE4", subject: "merkkijonon" },
        file: { unit: "tavua", subject: "tiedoston" },
        array: { unit: "alkiota", subject: "listan" },
        set: { unit: "alkiota", subject: "joukon" },
        number: { unit: "", subject: "luvun" },
        bigint: { unit: "", subject: "suuren kokonaisluvun" },
        int: { unit: "", subject: "kokonaisluvun" },
        date: { unit: "", subject: "p\xE4iv\xE4m\xE4\xE4r\xE4n" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "number";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "array";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "s\xE4\xE4nn\xF6llinen lauseke",
        email: "s\xE4hk\xF6postiosoite",
        url: "URL-osoite",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO-aikaleima",
        date: "ISO-p\xE4iv\xE4m\xE4\xE4r\xE4",
        time: "ISO-aika",
        duration: "ISO-kesto",
        ipv4: "IPv4-osoite",
        ipv6: "IPv6-osoite",
        cidrv4: "IPv4-alue",
        cidrv6: "IPv6-alue",
        base64: "base64-koodattu merkkijono",
        base64url: "base64url-koodattu merkkijono",
        json_string: "JSON-merkkijono",
        e164: "E.164-luku",
        jwt: "JWT",
        template_literal: "templaattimerkkijono"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Virheellinen tyyppi: odotettiin ${issue2.expected}, oli ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Virheellinen sy\xF6te: t\xE4ytyy olla ${stringifyPrimitive(issue2.values[0])}`;
            return `Virheellinen valinta: t\xE4ytyy olla yksi seuraavista: ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `Liian suuri: ${sizing.subject} t\xE4ytyy olla ${adj}${issue2.maximum.toString()} ${sizing.unit}`.trim();
            }
            return `Liian suuri: arvon t\xE4ytyy olla ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `Liian pieni: ${sizing.subject} t\xE4ytyy olla ${adj}${issue2.minimum.toString()} ${sizing.unit}`.trim();
            }
            return `Liian pieni: arvon t\xE4ytyy olla ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `Virheellinen sy\xF6te: t\xE4ytyy alkaa "${_issue.prefix}"`;
            if (_issue.format === "ends_with")
              return `Virheellinen sy\xF6te: t\xE4ytyy loppua "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `Virheellinen sy\xF6te: t\xE4ytyy sis\xE4lt\xE4\xE4 "${_issue.includes}"`;
            if (_issue.format === "regex") {
              return `Virheellinen sy\xF6te: t\xE4ytyy vastata s\xE4\xE4nn\xF6llist\xE4 lauseketta ${_issue.pattern}`;
            }
            return `Virheellinen ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `Virheellinen luku: t\xE4ytyy olla luvun ${issue2.divisor} monikerta`;
          case "unrecognized_keys":
            return `${issue2.keys.length > 1 ? "Tuntemattomat avaimet" : "Tuntematon avain"}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return "Virheellinen avain tietueessa";
          case "invalid_union":
            return "Virheellinen unioni";
          case "invalid_element":
            return "Virheellinen arvo joukossa";
          default:
            return `Virheellinen sy\xF6te`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/fr.js
function fr_default() {
  return {
    localeError: error14()
  };
}
var error14;
var init_fr = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/fr.js"() {
    init_util();
    error14 = () => {
      const Sizable = {
        string: { unit: "caract\xE8res", verb: "avoir" },
        file: { unit: "octets", verb: "avoir" },
        array: { unit: "\xE9l\xE9ments", verb: "avoir" },
        set: { unit: "\xE9l\xE9ments", verb: "avoir" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "nombre";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "tableau";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "entr\xE9e",
        email: "adresse e-mail",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "date et heure ISO",
        date: "date ISO",
        time: "heure ISO",
        duration: "dur\xE9e ISO",
        ipv4: "adresse IPv4",
        ipv6: "adresse IPv6",
        cidrv4: "plage IPv4",
        cidrv6: "plage IPv6",
        base64: "cha\xEEne encod\xE9e en base64",
        base64url: "cha\xEEne encod\xE9e en base64url",
        json_string: "cha\xEEne JSON",
        e164: "num\xE9ro E.164",
        jwt: "JWT",
        template_literal: "entr\xE9e"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Entr\xE9e invalide : ${issue2.expected} attendu, ${parsedType8(issue2.input)} re\xE7u`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Entr\xE9e invalide : ${stringifyPrimitive(issue2.values[0])} attendu`;
            return `Option invalide : une valeur parmi ${joinValues(issue2.values, "|")} attendue`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `Trop grand : ${issue2.origin ?? "valeur"} doit ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "\xE9l\xE9ment(s)"}`;
            return `Trop grand : ${issue2.origin ?? "valeur"} doit \xEAtre ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `Trop petit : ${issue2.origin} doit ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `Trop petit : ${issue2.origin} doit \xEAtre ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `Cha\xEEne invalide : doit commencer par "${_issue.prefix}"`;
            if (_issue.format === "ends_with")
              return `Cha\xEEne invalide : doit se terminer par "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `Cha\xEEne invalide : doit inclure "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `Cha\xEEne invalide : doit correspondre au mod\xE8le ${_issue.pattern}`;
            return `${Nouns[_issue.format] ?? issue2.format} invalide`;
          }
          case "not_multiple_of":
            return `Nombre invalide : doit \xEAtre un multiple de ${issue2.divisor}`;
          case "unrecognized_keys":
            return `Cl\xE9${issue2.keys.length > 1 ? "s" : ""} non reconnue${issue2.keys.length > 1 ? "s" : ""} : ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `Cl\xE9 invalide dans ${issue2.origin}`;
          case "invalid_union":
            return "Entr\xE9e invalide";
          case "invalid_element":
            return `Valeur invalide dans ${issue2.origin}`;
          default:
            return `Entr\xE9e invalide`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/fr-CA.js
function fr_CA_default() {
  return {
    localeError: error15()
  };
}
var error15;
var init_fr_CA = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/fr-CA.js"() {
    init_util();
    error15 = () => {
      const Sizable = {
        string: { unit: "caract\xE8res", verb: "avoir" },
        file: { unit: "octets", verb: "avoir" },
        array: { unit: "\xE9l\xE9ments", verb: "avoir" },
        set: { unit: "\xE9l\xE9ments", verb: "avoir" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "number";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "array";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "entr\xE9e",
        email: "adresse courriel",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "date-heure ISO",
        date: "date ISO",
        time: "heure ISO",
        duration: "dur\xE9e ISO",
        ipv4: "adresse IPv4",
        ipv6: "adresse IPv6",
        cidrv4: "plage IPv4",
        cidrv6: "plage IPv6",
        base64: "cha\xEEne encod\xE9e en base64",
        base64url: "cha\xEEne encod\xE9e en base64url",
        json_string: "cha\xEEne JSON",
        e164: "num\xE9ro E.164",
        jwt: "JWT",
        template_literal: "entr\xE9e"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Entr\xE9e invalide : attendu ${issue2.expected}, re\xE7u ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Entr\xE9e invalide : attendu ${stringifyPrimitive(issue2.values[0])}`;
            return `Option invalide : attendu l'une des valeurs suivantes ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "\u2264" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `Trop grand : attendu que ${issue2.origin ?? "la valeur"} ait ${adj}${issue2.maximum.toString()} ${sizing.unit}`;
            return `Trop grand : attendu que ${issue2.origin ?? "la valeur"} soit ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? "\u2265" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `Trop petit : attendu que ${issue2.origin} ait ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `Trop petit : attendu que ${issue2.origin} soit ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with") {
              return `Cha\xEEne invalide : doit commencer par "${_issue.prefix}"`;
            }
            if (_issue.format === "ends_with")
              return `Cha\xEEne invalide : doit se terminer par "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `Cha\xEEne invalide : doit inclure "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `Cha\xEEne invalide : doit correspondre au motif ${_issue.pattern}`;
            return `${Nouns[_issue.format] ?? issue2.format} invalide`;
          }
          case "not_multiple_of":
            return `Nombre invalide : doit \xEAtre un multiple de ${issue2.divisor}`;
          case "unrecognized_keys":
            return `Cl\xE9${issue2.keys.length > 1 ? "s" : ""} non reconnue${issue2.keys.length > 1 ? "s" : ""} : ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `Cl\xE9 invalide dans ${issue2.origin}`;
          case "invalid_union":
            return "Entr\xE9e invalide";
          case "invalid_element":
            return `Valeur invalide dans ${issue2.origin}`;
          default:
            return `Entr\xE9e invalide`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/he.js
function he_default() {
  return {
    localeError: error16()
  };
}
var error16;
var init_he = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/he.js"() {
    init_util();
    error16 = () => {
      const Sizable = {
        string: { unit: "\u05D0\u05D5\u05EA\u05D9\u05D5\u05EA", verb: "\u05DC\u05DB\u05DC\u05D5\u05DC" },
        file: { unit: "\u05D1\u05D9\u05D9\u05D8\u05D9\u05DD", verb: "\u05DC\u05DB\u05DC\u05D5\u05DC" },
        array: { unit: "\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD", verb: "\u05DC\u05DB\u05DC\u05D5\u05DC" },
        set: { unit: "\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD", verb: "\u05DC\u05DB\u05DC\u05D5\u05DC" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "number";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "array";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "\u05E7\u05DC\u05D8",
        email: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC",
        url: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05E8\u05E9\u05EA",
        emoji: "\u05D0\u05D9\u05DE\u05D5\u05D2'\u05D9",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "\u05EA\u05D0\u05E8\u05D9\u05DA \u05D5\u05D6\u05DE\u05DF ISO",
        date: "\u05EA\u05D0\u05E8\u05D9\u05DA ISO",
        time: "\u05D6\u05DE\u05DF ISO",
        duration: "\u05DE\u05E9\u05DA \u05D6\u05DE\u05DF ISO",
        ipv4: "\u05DB\u05EA\u05D5\u05D1\u05EA IPv4",
        ipv6: "\u05DB\u05EA\u05D5\u05D1\u05EA IPv6",
        cidrv4: "\u05D8\u05D5\u05D5\u05D7 IPv4",
        cidrv6: "\u05D8\u05D5\u05D5\u05D7 IPv6",
        base64: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D1\u05D1\u05E1\u05D9\u05E1 64",
        base64url: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D1\u05D1\u05E1\u05D9\u05E1 64 \u05DC\u05DB\u05EA\u05D5\u05D1\u05D5\u05EA \u05E8\u05E9\u05EA",
        json_string: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA JSON",
        e164: "\u05DE\u05E1\u05E4\u05E8 E.164",
        jwt: "JWT",
        template_literal: "\u05E7\u05DC\u05D8"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA ${issue2.expected}, \u05D4\u05EA\u05E7\u05D1\u05DC ${parsedType8(issue2.input)}`;
          // return `Invalid input: expected ${issue.expected}, received ${util.getParsedType(issue.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA ${stringifyPrimitive(issue2.values[0])}`;
            return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA \u05D0\u05D7\u05EA \u05DE\u05D4\u05D0\u05E4\u05E9\u05E8\u05D5\u05D9\u05D5\u05EA  ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `\u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9: ${issue2.origin ?? "value"} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elements"}`;
            return `\u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9: ${issue2.origin ?? "value"} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `\u05E7\u05D8\u05DF \u05DE\u05D3\u05D9: ${issue2.origin} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `\u05E7\u05D8\u05DF \u05DE\u05D3\u05D9: ${issue2.origin} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4: \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05EA\u05D7\u05D9\u05DC \u05D1"${_issue.prefix}"`;
            if (_issue.format === "ends_with")
              return `\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4: \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05E1\u05EA\u05D9\u05D9\u05DD \u05D1 "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4: \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05DB\u05DC\u05D5\u05DC "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4: \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05EA\u05D0\u05D9\u05DD \u05DC\u05EA\u05D1\u05E0\u05D9\u05EA ${_issue.pattern}`;
            return `${Nouns[_issue.format] ?? issue2.format} \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF`;
          }
          case "not_multiple_of":
            return `\u05DE\u05E1\u05E4\u05E8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05DE\u05DB\u05E4\u05DC\u05D4 \u05E9\u05DC ${issue2.divisor}`;
          case "unrecognized_keys":
            return `\u05DE\u05E4\u05EA\u05D7${issue2.keys.length > 1 ? "\u05D5\u05EA" : ""} \u05DC\u05D0 \u05DE\u05D6\u05D5\u05D4${issue2.keys.length > 1 ? "\u05D9\u05DD" : "\u05D4"}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `\u05DE\u05E4\u05EA\u05D7 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D1${issue2.origin}`;
          case "invalid_union":
            return "\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF";
          case "invalid_element":
            return `\u05E2\u05E8\u05DA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D1${issue2.origin}`;
          default:
            return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/hu.js
function hu_default() {
  return {
    localeError: error17()
  };
}
var error17;
var init_hu = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/hu.js"() {
    init_util();
    error17 = () => {
      const Sizable = {
        string: { unit: "karakter", verb: "legyen" },
        file: { unit: "byte", verb: "legyen" },
        array: { unit: "elem", verb: "legyen" },
        set: { unit: "elem", verb: "legyen" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "sz\xE1m";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "t\xF6mb";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "bemenet",
        email: "email c\xEDm",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO id\u0151b\xE9lyeg",
        date: "ISO d\xE1tum",
        time: "ISO id\u0151",
        duration: "ISO id\u0151intervallum",
        ipv4: "IPv4 c\xEDm",
        ipv6: "IPv6 c\xEDm",
        cidrv4: "IPv4 tartom\xE1ny",
        cidrv6: "IPv6 tartom\xE1ny",
        base64: "base64-k\xF3dolt string",
        base64url: "base64url-k\xF3dolt string",
        json_string: "JSON string",
        e164: "E.164 sz\xE1m",
        jwt: "JWT",
        template_literal: "bemenet"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `\xC9rv\xE9nytelen bemenet: a v\xE1rt \xE9rt\xE9k ${issue2.expected}, a kapott \xE9rt\xE9k ${parsedType8(issue2.input)}`;
          // return `Invalid input: expected ${issue.expected}, received ${util.getParsedType(issue.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `\xC9rv\xE9nytelen bemenet: a v\xE1rt \xE9rt\xE9k ${stringifyPrimitive(issue2.values[0])}`;
            return `\xC9rv\xE9nytelen opci\xF3: valamelyik \xE9rt\xE9k v\xE1rt ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `T\xFAl nagy: ${issue2.origin ?? "\xE9rt\xE9k"} m\xE9rete t\xFAl nagy ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elem"}`;
            return `T\xFAl nagy: a bemeneti \xE9rt\xE9k ${issue2.origin ?? "\xE9rt\xE9k"} t\xFAl nagy: ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `T\xFAl kicsi: a bemeneti \xE9rt\xE9k ${issue2.origin} m\xE9rete t\xFAl kicsi ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `T\xFAl kicsi: a bemeneti \xE9rt\xE9k ${issue2.origin} t\xFAl kicsi ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `\xC9rv\xE9nytelen string: "${_issue.prefix}" \xE9rt\xE9kkel kell kezd\u0151dnie`;
            if (_issue.format === "ends_with")
              return `\xC9rv\xE9nytelen string: "${_issue.suffix}" \xE9rt\xE9kkel kell v\xE9gz\u0151dnie`;
            if (_issue.format === "includes")
              return `\xC9rv\xE9nytelen string: "${_issue.includes}" \xE9rt\xE9ket kell tartalmaznia`;
            if (_issue.format === "regex")
              return `\xC9rv\xE9nytelen string: ${_issue.pattern} mint\xE1nak kell megfelelnie`;
            return `\xC9rv\xE9nytelen ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `\xC9rv\xE9nytelen sz\xE1m: ${issue2.divisor} t\xF6bbsz\xF6r\xF6s\xE9nek kell lennie`;
          case "unrecognized_keys":
            return `Ismeretlen kulcs${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `\xC9rv\xE9nytelen kulcs ${issue2.origin}`;
          case "invalid_union":
            return "\xC9rv\xE9nytelen bemenet";
          case "invalid_element":
            return `\xC9rv\xE9nytelen \xE9rt\xE9k: ${issue2.origin}`;
          default:
            return `\xC9rv\xE9nytelen bemenet`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/id.js
function id_default() {
  return {
    localeError: error18()
  };
}
var error18;
var init_id = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/id.js"() {
    init_util();
    error18 = () => {
      const Sizable = {
        string: { unit: "karakter", verb: "memiliki" },
        file: { unit: "byte", verb: "memiliki" },
        array: { unit: "item", verb: "memiliki" },
        set: { unit: "item", verb: "memiliki" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "number";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "array";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "input",
        email: "alamat email",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "tanggal dan waktu format ISO",
        date: "tanggal format ISO",
        time: "jam format ISO",
        duration: "durasi format ISO",
        ipv4: "alamat IPv4",
        ipv6: "alamat IPv6",
        cidrv4: "rentang alamat IPv4",
        cidrv6: "rentang alamat IPv6",
        base64: "string dengan enkode base64",
        base64url: "string dengan enkode base64url",
        json_string: "string JSON",
        e164: "angka E.164",
        jwt: "JWT",
        template_literal: "input"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Input tidak valid: diharapkan ${issue2.expected}, diterima ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Input tidak valid: diharapkan ${stringifyPrimitive(issue2.values[0])}`;
            return `Pilihan tidak valid: diharapkan salah satu dari ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `Terlalu besar: diharapkan ${issue2.origin ?? "value"} memiliki ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elemen"}`;
            return `Terlalu besar: diharapkan ${issue2.origin ?? "value"} menjadi ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `Terlalu kecil: diharapkan ${issue2.origin} memiliki ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `Terlalu kecil: diharapkan ${issue2.origin} menjadi ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `String tidak valid: harus dimulai dengan "${_issue.prefix}"`;
            if (_issue.format === "ends_with")
              return `String tidak valid: harus berakhir dengan "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `String tidak valid: harus menyertakan "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `String tidak valid: harus sesuai pola ${_issue.pattern}`;
            return `${Nouns[_issue.format] ?? issue2.format} tidak valid`;
          }
          case "not_multiple_of":
            return `Angka tidak valid: harus kelipatan dari ${issue2.divisor}`;
          case "unrecognized_keys":
            return `Kunci tidak dikenali ${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `Kunci tidak valid di ${issue2.origin}`;
          case "invalid_union":
            return "Input tidak valid";
          case "invalid_element":
            return `Nilai tidak valid di ${issue2.origin}`;
          default:
            return `Input tidak valid`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/is.js
function is_default() {
  return {
    localeError: error19()
  };
}
var parsedType4, error19;
var init_is = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/is.js"() {
    init_util();
    parsedType4 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "n\xFAmer";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "fylki";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    error19 = () => {
      const Sizable = {
        string: { unit: "stafi", verb: "a\xF0 hafa" },
        file: { unit: "b\xE6ti", verb: "a\xF0 hafa" },
        array: { unit: "hluti", verb: "a\xF0 hafa" },
        set: { unit: "hluti", verb: "a\xF0 hafa" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const Nouns = {
        regex: "gildi",
        email: "netfang",
        url: "vefsl\xF3\xF0",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO dagsetning og t\xEDmi",
        date: "ISO dagsetning",
        time: "ISO t\xEDmi",
        duration: "ISO t\xEDmalengd",
        ipv4: "IPv4 address",
        ipv6: "IPv6 address",
        cidrv4: "IPv4 range",
        cidrv6: "IPv6 range",
        base64: "base64-encoded strengur",
        base64url: "base64url-encoded strengur",
        json_string: "JSON strengur",
        e164: "E.164 t\xF6lugildi",
        jwt: "JWT",
        template_literal: "gildi"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Rangt gildi: \xDE\xFA sl\xF3st inn ${parsedType4(issue2.input)} \xFEar sem \xE1 a\xF0 vera ${issue2.expected}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Rangt gildi: gert r\xE1\xF0 fyrir ${stringifyPrimitive(issue2.values[0])}`;
            return `\xD3gilt val: m\xE1 vera eitt af eftirfarandi ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `Of st\xF3rt: gert er r\xE1\xF0 fyrir a\xF0 ${issue2.origin ?? "gildi"} hafi ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "hluti"}`;
            return `Of st\xF3rt: gert er r\xE1\xF0 fyrir a\xF0 ${issue2.origin ?? "gildi"} s\xE9 ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `Of l\xEDti\xF0: gert er r\xE1\xF0 fyrir a\xF0 ${issue2.origin} hafi ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `Of l\xEDti\xF0: gert er r\xE1\xF0 fyrir a\xF0 ${issue2.origin} s\xE9 ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with") {
              return `\xD3gildur strengur: ver\xF0ur a\xF0 byrja \xE1 "${_issue.prefix}"`;
            }
            if (_issue.format === "ends_with")
              return `\xD3gildur strengur: ver\xF0ur a\xF0 enda \xE1 "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `\xD3gildur strengur: ver\xF0ur a\xF0 innihalda "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `\xD3gildur strengur: ver\xF0ur a\xF0 fylgja mynstri ${_issue.pattern}`;
            return `Rangt ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `R\xF6ng tala: ver\xF0ur a\xF0 vera margfeldi af ${issue2.divisor}`;
          case "unrecognized_keys":
            return `\xD3\xFEekkt ${issue2.keys.length > 1 ? "ir lyklar" : "ur lykill"}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `Rangur lykill \xED ${issue2.origin}`;
          case "invalid_union":
            return "Rangt gildi";
          case "invalid_element":
            return `Rangt gildi \xED ${issue2.origin}`;
          default:
            return `Rangt gildi`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/it.js
function it_default() {
  return {
    localeError: error20()
  };
}
var error20;
var init_it = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/it.js"() {
    init_util();
    error20 = () => {
      const Sizable = {
        string: { unit: "caratteri", verb: "avere" },
        file: { unit: "byte", verb: "avere" },
        array: { unit: "elementi", verb: "avere" },
        set: { unit: "elementi", verb: "avere" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "numero";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "vettore";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "input",
        email: "indirizzo email",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "data e ora ISO",
        date: "data ISO",
        time: "ora ISO",
        duration: "durata ISO",
        ipv4: "indirizzo IPv4",
        ipv6: "indirizzo IPv6",
        cidrv4: "intervallo IPv4",
        cidrv6: "intervallo IPv6",
        base64: "stringa codificata in base64",
        base64url: "URL codificata in base64",
        json_string: "stringa JSON",
        e164: "numero E.164",
        jwt: "JWT",
        template_literal: "input"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Input non valido: atteso ${issue2.expected}, ricevuto ${parsedType8(issue2.input)}`;
          // return `Input non valido: atteso ${issue.expected}, ricevuto ${util.getParsedType(issue.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Input non valido: atteso ${stringifyPrimitive(issue2.values[0])}`;
            return `Opzione non valida: atteso uno tra ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `Troppo grande: ${issue2.origin ?? "valore"} deve avere ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementi"}`;
            return `Troppo grande: ${issue2.origin ?? "valore"} deve essere ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `Troppo piccolo: ${issue2.origin} deve avere ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `Troppo piccolo: ${issue2.origin} deve essere ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `Stringa non valida: deve iniziare con "${_issue.prefix}"`;
            if (_issue.format === "ends_with")
              return `Stringa non valida: deve terminare con "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `Stringa non valida: deve includere "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `Stringa non valida: deve corrispondere al pattern ${_issue.pattern}`;
            return `Invalid ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `Numero non valido: deve essere un multiplo di ${issue2.divisor}`;
          case "unrecognized_keys":
            return `Chiav${issue2.keys.length > 1 ? "i" : "e"} non riconosciut${issue2.keys.length > 1 ? "e" : "a"}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `Chiave non valida in ${issue2.origin}`;
          case "invalid_union":
            return "Input non valido";
          case "invalid_element":
            return `Valore non valido in ${issue2.origin}`;
          default:
            return `Input non valido`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/ja.js
function ja_default() {
  return {
    localeError: error21()
  };
}
var error21;
var init_ja = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/ja.js"() {
    init_util();
    error21 = () => {
      const Sizable = {
        string: { unit: "\u6587\u5B57", verb: "\u3067\u3042\u308B" },
        file: { unit: "\u30D0\u30A4\u30C8", verb: "\u3067\u3042\u308B" },
        array: { unit: "\u8981\u7D20", verb: "\u3067\u3042\u308B" },
        set: { unit: "\u8981\u7D20", verb: "\u3067\u3042\u308B" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "\u6570\u5024";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "\u914D\u5217";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "\u5165\u529B\u5024",
        email: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9",
        url: "URL",
        emoji: "\u7D75\u6587\u5B57",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO\u65E5\u6642",
        date: "ISO\u65E5\u4ED8",
        time: "ISO\u6642\u523B",
        duration: "ISO\u671F\u9593",
        ipv4: "IPv4\u30A2\u30C9\u30EC\u30B9",
        ipv6: "IPv6\u30A2\u30C9\u30EC\u30B9",
        cidrv4: "IPv4\u7BC4\u56F2",
        cidrv6: "IPv6\u7BC4\u56F2",
        base64: "base64\u30A8\u30F3\u30B3\u30FC\u30C9\u6587\u5B57\u5217",
        base64url: "base64url\u30A8\u30F3\u30B3\u30FC\u30C9\u6587\u5B57\u5217",
        json_string: "JSON\u6587\u5B57\u5217",
        e164: "E.164\u756A\u53F7",
        jwt: "JWT",
        template_literal: "\u5165\u529B\u5024"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `\u7121\u52B9\u306A\u5165\u529B: ${issue2.expected}\u304C\u671F\u5F85\u3055\u308C\u307E\u3057\u305F\u304C\u3001${parsedType8(issue2.input)}\u304C\u5165\u529B\u3055\u308C\u307E\u3057\u305F`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `\u7121\u52B9\u306A\u5165\u529B: ${stringifyPrimitive(issue2.values[0])}\u304C\u671F\u5F85\u3055\u308C\u307E\u3057\u305F`;
            return `\u7121\u52B9\u306A\u9078\u629E: ${joinValues(issue2.values, "\u3001")}\u306E\u3044\u305A\u308C\u304B\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
          case "too_big": {
            const adj = issue2.inclusive ? "\u4EE5\u4E0B\u3067\u3042\u308B" : "\u3088\u308A\u5C0F\u3055\u3044";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `\u5927\u304D\u3059\u304E\u308B\u5024: ${issue2.origin ?? "\u5024"}\u306F${issue2.maximum.toString()}${sizing.unit ?? "\u8981\u7D20"}${adj}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
            return `\u5927\u304D\u3059\u304E\u308B\u5024: ${issue2.origin ?? "\u5024"}\u306F${issue2.maximum.toString()}${adj}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? "\u4EE5\u4E0A\u3067\u3042\u308B" : "\u3088\u308A\u5927\u304D\u3044";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `\u5C0F\u3055\u3059\u304E\u308B\u5024: ${issue2.origin}\u306F${issue2.minimum.toString()}${sizing.unit}${adj}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
            return `\u5C0F\u3055\u3059\u304E\u308B\u5024: ${issue2.origin}\u306F${issue2.minimum.toString()}${adj}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${_issue.prefix}"\u3067\u59CB\u307E\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
            if (_issue.format === "ends_with")
              return `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${_issue.suffix}"\u3067\u7D42\u308F\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
            if (_issue.format === "includes")
              return `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${_issue.includes}"\u3092\u542B\u3080\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
            if (_issue.format === "regex")
              return `\u7121\u52B9\u306A\u6587\u5B57\u5217: \u30D1\u30BF\u30FC\u30F3${_issue.pattern}\u306B\u4E00\u81F4\u3059\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
            return `\u7121\u52B9\u306A${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `\u7121\u52B9\u306A\u6570\u5024: ${issue2.divisor}\u306E\u500D\u6570\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
          case "unrecognized_keys":
            return `\u8A8D\u8B58\u3055\u308C\u3066\u3044\u306A\u3044\u30AD\u30FC${issue2.keys.length > 1 ? "\u7FA4" : ""}: ${joinValues(issue2.keys, "\u3001")}`;
          case "invalid_key":
            return `${issue2.origin}\u5185\u306E\u7121\u52B9\u306A\u30AD\u30FC`;
          case "invalid_union":
            return "\u7121\u52B9\u306A\u5165\u529B";
          case "invalid_element":
            return `${issue2.origin}\u5185\u306E\u7121\u52B9\u306A\u5024`;
          default:
            return `\u7121\u52B9\u306A\u5165\u529B`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/ka.js
function ka_default() {
  return {
    localeError: error22()
  };
}
var parsedType5, error22;
var init_ka = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/ka.js"() {
    init_util();
    parsedType5 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "\u10E0\u10D8\u10EA\u10EE\u10D5\u10D8";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u10DB\u10D0\u10E1\u10D8\u10D5\u10D8";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      const typeMap = {
        string: "\u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8",
        boolean: "\u10D1\u10E3\u10DA\u10D4\u10D0\u10DC\u10D8",
        undefined: "undefined",
        bigint: "bigint",
        symbol: "symbol",
        function: "\u10E4\u10E3\u10DC\u10E5\u10EA\u10D8\u10D0"
      };
      return typeMap[t] ?? t;
    };
    error22 = () => {
      const Sizable = {
        string: { unit: "\u10E1\u10D8\u10DB\u10D1\u10DD\u10DA\u10DD", verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1" },
        file: { unit: "\u10D1\u10D0\u10D8\u10E2\u10D8", verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1" },
        array: { unit: "\u10D4\u10DA\u10D4\u10DB\u10D4\u10DC\u10E2\u10D8", verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1" },
        set: { unit: "\u10D4\u10DA\u10D4\u10DB\u10D4\u10DC\u10E2\u10D8", verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const Nouns = {
        regex: "\u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0",
        email: "\u10D4\u10DA-\u10E4\u10DD\u10E1\u10E2\u10D8\u10E1 \u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8",
        url: "URL",
        emoji: "\u10D4\u10DB\u10DD\u10EF\u10D8",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "\u10D7\u10D0\u10E0\u10D8\u10E6\u10D8-\u10D3\u10E0\u10DD",
        date: "\u10D7\u10D0\u10E0\u10D8\u10E6\u10D8",
        time: "\u10D3\u10E0\u10DD",
        duration: "\u10EE\u10D0\u10DC\u10D2\u10E0\u10EB\u10DA\u10D8\u10D5\u10DD\u10D1\u10D0",
        ipv4: "IPv4 \u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8",
        ipv6: "IPv6 \u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8",
        cidrv4: "IPv4 \u10D3\u10D8\u10D0\u10DE\u10D0\u10D6\u10DD\u10DC\u10D8",
        cidrv6: "IPv6 \u10D3\u10D8\u10D0\u10DE\u10D0\u10D6\u10DD\u10DC\u10D8",
        base64: "base64-\u10D9\u10DD\u10D3\u10D8\u10E0\u10D4\u10D1\u10E3\u10DA\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8",
        base64url: "base64url-\u10D9\u10DD\u10D3\u10D8\u10E0\u10D4\u10D1\u10E3\u10DA\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8",
        json_string: "JSON \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8",
        e164: "E.164 \u10DC\u10DD\u10DB\u10D4\u10E0\u10D8",
        jwt: "JWT",
        template_literal: "\u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${issue2.expected}, \u10DB\u10D8\u10E6\u10D4\u10D1\u10E3\u10DA\u10D8 ${parsedType5(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${stringifyPrimitive(issue2.values[0])}`;
            return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10D5\u10D0\u10E0\u10D8\u10D0\u10DC\u10E2\u10D8: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8\u10D0 \u10D4\u10E0\u10D7-\u10D4\u10E0\u10D7\u10D8 ${joinValues(issue2.values, "|")}-\u10D3\u10D0\u10DC`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10D3\u10D8\u10D3\u10D8: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${issue2.origin ?? "\u10DB\u10DC\u10D8\u10E8\u10D5\u10DC\u10D4\u10DA\u10DD\u10D1\u10D0"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit}`;
            return `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10D3\u10D8\u10D3\u10D8: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${issue2.origin ?? "\u10DB\u10DC\u10D8\u10E8\u10D5\u10DC\u10D4\u10DA\u10DD\u10D1\u10D0"} \u10D8\u10E7\u10DD\u10E1 ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10DE\u10D0\u10E2\u10D0\u10E0\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10DE\u10D0\u10E2\u10D0\u10E0\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${issue2.origin} \u10D8\u10E7\u10DD\u10E1 ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with") {
              return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10D8\u10EC\u10E7\u10D4\u10D1\u10DD\u10D3\u10D4\u10E1 "${_issue.prefix}"-\u10D8\u10D7`;
            }
            if (_issue.format === "ends_with")
              return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10DB\u10D7\u10D0\u10D5\u10E0\u10D3\u10D4\u10D1\u10DD\u10D3\u10D4\u10E1 "${_issue.suffix}"-\u10D8\u10D7`;
            if (_issue.format === "includes")
              return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1 "${_issue.includes}"-\u10E1`;
            if (_issue.format === "regex")
              return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D4\u10E1\u10D0\u10D1\u10D0\u10DB\u10D4\u10D1\u10DD\u10D3\u10D4\u10E1 \u10E8\u10D0\u10D1\u10DA\u10DD\u10DC\u10E1 ${_issue.pattern}`;
            return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E0\u10D8\u10EA\u10EE\u10D5\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10D8\u10E7\u10DD\u10E1 ${issue2.divisor}-\u10D8\u10E1 \u10EF\u10D4\u10E0\u10D0\u10D3\u10D8`;
          case "unrecognized_keys":
            return `\u10E3\u10EA\u10DC\u10DD\u10D1\u10D8 \u10D2\u10D0\u10E1\u10D0\u10E6\u10D4\u10D1${issue2.keys.length > 1 ? "\u10D4\u10D1\u10D8" : "\u10D8"}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10D2\u10D0\u10E1\u10D0\u10E6\u10D4\u10D1\u10D8 ${issue2.origin}-\u10E8\u10D8`;
          case "invalid_union":
            return "\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0";
          case "invalid_element":
            return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10DB\u10DC\u10D8\u10E8\u10D5\u10DC\u10D4\u10DA\u10DD\u10D1\u10D0 ${issue2.origin}-\u10E8\u10D8`;
          default:
            return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/km.js
function km_default() {
  return {
    localeError: error23()
  };
}
var error23;
var init_km = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/km.js"() {
    init_util();
    error23 = () => {
      const Sizable = {
        string: { unit: "\u178F\u17BD\u17A2\u1780\u17D2\u179F\u179A", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" },
        file: { unit: "\u1794\u17C3", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" },
        array: { unit: "\u1792\u17B6\u178F\u17BB", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" },
        set: { unit: "\u1792\u17B6\u178F\u17BB", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "\u1798\u17B7\u1793\u1798\u17C2\u1793\u1787\u17B6\u179B\u17C1\u1781 (NaN)" : "\u179B\u17C1\u1781";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "\u17A2\u17B6\u179A\u17C1 (Array)";
            }
            if (data === null) {
              return "\u1782\u17D2\u1798\u17B6\u1793\u178F\u1798\u17D2\u179B\u17C3 (null)";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B",
        email: "\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793\u17A2\u17CA\u17B8\u1798\u17C2\u179B",
        url: "URL",
        emoji: "\u179F\u1789\u17D2\u1789\u17B6\u17A2\u17B6\u179A\u1798\u17D2\u1798\u178E\u17CD",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "\u1780\u17B6\u179B\u1794\u179A\u17B7\u1785\u17D2\u1786\u17C1\u1791 \u1793\u17B7\u1784\u1798\u17C9\u17C4\u1784 ISO",
        date: "\u1780\u17B6\u179B\u1794\u179A\u17B7\u1785\u17D2\u1786\u17C1\u1791 ISO",
        time: "\u1798\u17C9\u17C4\u1784 ISO",
        duration: "\u179A\u1799\u17C8\u1796\u17C1\u179B ISO",
        ipv4: "\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv4",
        ipv6: "\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv6",
        cidrv4: "\u178A\u17C2\u1793\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv4",
        cidrv6: "\u178A\u17C2\u1793\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv6",
        base64: "\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u17A2\u17CA\u17B7\u1780\u17BC\u178A base64",
        base64url: "\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u17A2\u17CA\u17B7\u1780\u17BC\u178A base64url",
        json_string: "\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A JSON",
        e164: "\u179B\u17C1\u1781 E.164",
        jwt: "JWT",
        template_literal: "\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${issue2.expected} \u1794\u17C9\u17BB\u1793\u17D2\u178F\u17C2\u1791\u1791\u17BD\u179B\u1794\u17B6\u1793 ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${stringifyPrimitive(issue2.values[0])}`;
            return `\u1787\u1798\u17D2\u179A\u17BE\u179F\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1787\u17B6\u1798\u17BD\u1799\u1780\u17D2\u1793\u17BB\u1784\u1785\u17C6\u178E\u17C4\u1798 ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `\u1792\u17C6\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${issue2.origin ?? "\u178F\u1798\u17D2\u179B\u17C3"} ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "\u1792\u17B6\u178F\u17BB"}`;
            return `\u1792\u17C6\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${issue2.origin ?? "\u178F\u1798\u17D2\u179B\u17C3"} ${adj} ${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `\u178F\u17BC\u1785\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${issue2.origin} ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `\u178F\u17BC\u1785\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${issue2.origin} ${adj} ${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with") {
              return `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1785\u17B6\u1794\u17CB\u1795\u17D2\u178F\u17BE\u1798\u178A\u17C4\u1799 "${_issue.prefix}"`;
            }
            if (_issue.format === "ends_with")
              return `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1794\u1789\u17D2\u1785\u1794\u17CB\u178A\u17C4\u1799 "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1798\u17B6\u1793 "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u178F\u17C2\u1795\u17D2\u1782\u17BC\u1795\u17D2\u1782\u1784\u1793\u17B9\u1784\u1791\u1798\u17D2\u179A\u1784\u17CB\u178A\u17C2\u179B\u1794\u17B6\u1793\u1780\u17C6\u178E\u178F\u17CB ${_issue.pattern}`;
            return `\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `\u179B\u17C1\u1781\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u178F\u17C2\u1787\u17B6\u1796\u17A0\u17BB\u1782\u17BB\u178E\u1793\u17C3 ${issue2.divisor}`;
          case "unrecognized_keys":
            return `\u179A\u1780\u1783\u17BE\u1789\u179F\u17C4\u1798\u17B7\u1793\u179F\u17D2\u1782\u17B6\u179B\u17CB\u17D6 ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `\u179F\u17C4\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u1793\u17C5\u1780\u17D2\u1793\u17BB\u1784 ${issue2.origin}`;
          case "invalid_union":
            return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C`;
          case "invalid_element":
            return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u1793\u17C5\u1780\u17D2\u1793\u17BB\u1784 ${issue2.origin}`;
          default:
            return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/kh.js
function kh_default() {
  return km_default();
}
var init_kh = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/kh.js"() {
    init_km();
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/ko.js
function ko_default() {
  return {
    localeError: error24()
  };
}
var error24;
var init_ko = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/ko.js"() {
    init_util();
    error24 = () => {
      const Sizable = {
        string: { unit: "\uBB38\uC790", verb: "to have" },
        file: { unit: "\uBC14\uC774\uD2B8", verb: "to have" },
        array: { unit: "\uAC1C", verb: "to have" },
        set: { unit: "\uAC1C", verb: "to have" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "number";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "array";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "\uC785\uB825",
        email: "\uC774\uBA54\uC77C \uC8FC\uC18C",
        url: "URL",
        emoji: "\uC774\uBAA8\uC9C0",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO \uB0A0\uC9DC\uC2DC\uAC04",
        date: "ISO \uB0A0\uC9DC",
        time: "ISO \uC2DC\uAC04",
        duration: "ISO \uAE30\uAC04",
        ipv4: "IPv4 \uC8FC\uC18C",
        ipv6: "IPv6 \uC8FC\uC18C",
        cidrv4: "IPv4 \uBC94\uC704",
        cidrv6: "IPv6 \uBC94\uC704",
        base64: "base64 \uC778\uCF54\uB529 \uBB38\uC790\uC5F4",
        base64url: "base64url \uC778\uCF54\uB529 \uBB38\uC790\uC5F4",
        json_string: "JSON \uBB38\uC790\uC5F4",
        e164: "E.164 \uBC88\uD638",
        jwt: "JWT",
        template_literal: "\uC785\uB825"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `\uC798\uBABB\uB41C \uC785\uB825: \uC608\uC0C1 \uD0C0\uC785\uC740 ${issue2.expected}, \uBC1B\uC740 \uD0C0\uC785\uC740 ${parsedType8(issue2.input)}\uC785\uB2C8\uB2E4`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `\uC798\uBABB\uB41C \uC785\uB825: \uAC12\uC740 ${stringifyPrimitive(issue2.values[0])} \uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4`;
            return `\uC798\uBABB\uB41C \uC635\uC158: ${joinValues(issue2.values, "\uB610\uB294 ")} \uC911 \uD558\uB098\uC5EC\uC57C \uD569\uB2C8\uB2E4`;
          case "too_big": {
            const adj = issue2.inclusive ? "\uC774\uD558" : "\uBBF8\uB9CC";
            const suffix = adj === "\uBBF8\uB9CC" ? "\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4" : "\uC5EC\uC57C \uD569\uB2C8\uB2E4";
            const sizing = getSizing(issue2.origin);
            const unit = sizing?.unit ?? "\uC694\uC18C";
            if (sizing)
              return `${issue2.origin ?? "\uAC12"}\uC774 \uB108\uBB34 \uD07D\uB2C8\uB2E4: ${issue2.maximum.toString()}${unit} ${adj}${suffix}`;
            return `${issue2.origin ?? "\uAC12"}\uC774 \uB108\uBB34 \uD07D\uB2C8\uB2E4: ${issue2.maximum.toString()} ${adj}${suffix}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? "\uC774\uC0C1" : "\uCD08\uACFC";
            const suffix = adj === "\uC774\uC0C1" ? "\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4" : "\uC5EC\uC57C \uD569\uB2C8\uB2E4";
            const sizing = getSizing(issue2.origin);
            const unit = sizing?.unit ?? "\uC694\uC18C";
            if (sizing) {
              return `${issue2.origin ?? "\uAC12"}\uC774 \uB108\uBB34 \uC791\uC2B5\uB2C8\uB2E4: ${issue2.minimum.toString()}${unit} ${adj}${suffix}`;
            }
            return `${issue2.origin ?? "\uAC12"}\uC774 \uB108\uBB34 \uC791\uC2B5\uB2C8\uB2E4: ${issue2.minimum.toString()} ${adj}${suffix}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with") {
              return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${_issue.prefix}"(\uC73C)\uB85C \uC2DC\uC791\uD574\uC57C \uD569\uB2C8\uB2E4`;
            }
            if (_issue.format === "ends_with")
              return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${_issue.suffix}"(\uC73C)\uB85C \uB05D\uB098\uC57C \uD569\uB2C8\uB2E4`;
            if (_issue.format === "includes")
              return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${_issue.includes}"\uC744(\uB97C) \uD3EC\uD568\uD574\uC57C \uD569\uB2C8\uB2E4`;
            if (_issue.format === "regex")
              return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: \uC815\uADDC\uC2DD ${_issue.pattern} \uD328\uD134\uACFC \uC77C\uCE58\uD574\uC57C \uD569\uB2C8\uB2E4`;
            return `\uC798\uBABB\uB41C ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `\uC798\uBABB\uB41C \uC22B\uC790: ${issue2.divisor}\uC758 \uBC30\uC218\uC5EC\uC57C \uD569\uB2C8\uB2E4`;
          case "unrecognized_keys":
            return `\uC778\uC2DD\uD560 \uC218 \uC5C6\uB294 \uD0A4: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `\uC798\uBABB\uB41C \uD0A4: ${issue2.origin}`;
          case "invalid_union":
            return `\uC798\uBABB\uB41C \uC785\uB825`;
          case "invalid_element":
            return `\uC798\uBABB\uB41C \uAC12: ${issue2.origin}`;
          default:
            return `\uC798\uBABB\uB41C \uC785\uB825`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/lt.js
function getUnitTypeFromNumber(number4) {
  const abs = Math.abs(number4);
  const last = abs % 10;
  const last2 = abs % 100;
  if (last2 >= 11 && last2 <= 19 || last === 0)
    return "many";
  if (last === 1)
    return "one";
  return "few";
}
function lt_default() {
  return {
    localeError: error25()
  };
}
var parsedType6, parsedTypeFromType, capitalizeFirstCharacter, error25;
var init_lt = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/lt.js"() {
    init_util();
    parsedType6 = (data) => {
      const t = typeof data;
      return parsedTypeFromType(t, data);
    };
    parsedTypeFromType = (t, data = void 0) => {
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "skai\u010Dius";
        }
        case "bigint": {
          return "sveikasis skai\u010Dius";
        }
        case "string": {
          return "eilut\u0117";
        }
        case "boolean": {
          return "login\u0117 reik\u0161m\u0117";
        }
        case "undefined":
        case "void": {
          return "neapibr\u0117\u017Eta reik\u0161m\u0117";
        }
        case "function": {
          return "funkcija";
        }
        case "symbol": {
          return "simbolis";
        }
        case "object": {
          if (data === void 0)
            return "ne\u017Einomas objektas";
          if (data === null)
            return "nulin\u0117 reik\u0161m\u0117";
          if (Array.isArray(data))
            return "masyvas";
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
          return "objektas";
        }
        //Zod types below
        case "null": {
          return "nulin\u0117 reik\u0161m\u0117";
        }
      }
      return t;
    };
    capitalizeFirstCharacter = (text) => {
      return text.charAt(0).toUpperCase() + text.slice(1);
    };
    error25 = () => {
      const Sizable = {
        string: {
          unit: {
            one: "simbolis",
            few: "simboliai",
            many: "simboli\u0173"
          },
          verb: {
            smaller: {
              inclusive: "turi b\u016Bti ne ilgesn\u0117 kaip",
              notInclusive: "turi b\u016Bti trumpesn\u0117 kaip"
            },
            bigger: {
              inclusive: "turi b\u016Bti ne trumpesn\u0117 kaip",
              notInclusive: "turi b\u016Bti ilgesn\u0117 kaip"
            }
          }
        },
        file: {
          unit: {
            one: "baitas",
            few: "baitai",
            many: "bait\u0173"
          },
          verb: {
            smaller: {
              inclusive: "turi b\u016Bti ne didesnis kaip",
              notInclusive: "turi b\u016Bti ma\u017Eesnis kaip"
            },
            bigger: {
              inclusive: "turi b\u016Bti ne ma\u017Eesnis kaip",
              notInclusive: "turi b\u016Bti didesnis kaip"
            }
          }
        },
        array: {
          unit: {
            one: "element\u0105",
            few: "elementus",
            many: "element\u0173"
          },
          verb: {
            smaller: {
              inclusive: "turi tur\u0117ti ne daugiau kaip",
              notInclusive: "turi tur\u0117ti ma\u017Eiau kaip"
            },
            bigger: {
              inclusive: "turi tur\u0117ti ne ma\u017Eiau kaip",
              notInclusive: "turi tur\u0117ti daugiau kaip"
            }
          }
        },
        set: {
          unit: {
            one: "element\u0105",
            few: "elementus",
            many: "element\u0173"
          },
          verb: {
            smaller: {
              inclusive: "turi tur\u0117ti ne daugiau kaip",
              notInclusive: "turi tur\u0117ti ma\u017Eiau kaip"
            },
            bigger: {
              inclusive: "turi tur\u0117ti ne ma\u017Eiau kaip",
              notInclusive: "turi tur\u0117ti daugiau kaip"
            }
          }
        }
      };
      function getSizing(origin, unitType, inclusive, targetShouldBe) {
        const result = Sizable[origin] ?? null;
        if (result === null)
          return result;
        return {
          unit: result.unit[unitType],
          verb: result.verb[targetShouldBe][inclusive ? "inclusive" : "notInclusive"]
        };
      }
      const Nouns = {
        regex: "\u012Fvestis",
        email: "el. pa\u0161to adresas",
        url: "URL",
        emoji: "jaustukas",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO data ir laikas",
        date: "ISO data",
        time: "ISO laikas",
        duration: "ISO trukm\u0117",
        ipv4: "IPv4 adresas",
        ipv6: "IPv6 adresas",
        cidrv4: "IPv4 tinklo prefiksas (CIDR)",
        cidrv6: "IPv6 tinklo prefiksas (CIDR)",
        base64: "base64 u\u017Ekoduota eilut\u0117",
        base64url: "base64url u\u017Ekoduota eilut\u0117",
        json_string: "JSON eilut\u0117",
        e164: "E.164 numeris",
        jwt: "JWT",
        template_literal: "\u012Fvestis"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Gautas tipas ${parsedType6(issue2.input)}, o tik\u0117tasi - ${parsedTypeFromType(issue2.expected)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Privalo b\u016Bti ${stringifyPrimitive(issue2.values[0])}`;
            return `Privalo b\u016Bti vienas i\u0161 ${joinValues(issue2.values, "|")} pasirinkim\u0173`;
          case "too_big": {
            const origin = parsedTypeFromType(issue2.origin);
            const sizing = getSizing(issue2.origin, getUnitTypeFromNumber(Number(issue2.maximum)), issue2.inclusive ?? false, "smaller");
            if (sizing?.verb)
              return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reik\u0161m\u0117")} ${sizing.verb} ${issue2.maximum.toString()} ${sizing.unit ?? "element\u0173"}`;
            const adj = issue2.inclusive ? "ne didesnis kaip" : "ma\u017Eesnis kaip";
            return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reik\u0161m\u0117")} turi b\u016Bti ${adj} ${issue2.maximum.toString()} ${sizing?.unit}`;
          }
          case "too_small": {
            const origin = parsedTypeFromType(issue2.origin);
            const sizing = getSizing(issue2.origin, getUnitTypeFromNumber(Number(issue2.minimum)), issue2.inclusive ?? false, "bigger");
            if (sizing?.verb)
              return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reik\u0161m\u0117")} ${sizing.verb} ${issue2.minimum.toString()} ${sizing.unit ?? "element\u0173"}`;
            const adj = issue2.inclusive ? "ne ma\u017Eesnis kaip" : "didesnis kaip";
            return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reik\u0161m\u0117")} turi b\u016Bti ${adj} ${issue2.minimum.toString()} ${sizing?.unit}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with") {
              return `Eilut\u0117 privalo prasid\u0117ti "${_issue.prefix}"`;
            }
            if (_issue.format === "ends_with")
              return `Eilut\u0117 privalo pasibaigti "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `Eilut\u0117 privalo \u012Ftraukti "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `Eilut\u0117 privalo atitikti ${_issue.pattern}`;
            return `Neteisingas ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `Skai\u010Dius privalo b\u016Bti ${issue2.divisor} kartotinis.`;
          case "unrecognized_keys":
            return `Neatpa\u017Eint${issue2.keys.length > 1 ? "i" : "as"} rakt${issue2.keys.length > 1 ? "ai" : "as"}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return "Rastas klaidingas raktas";
          case "invalid_union":
            return "Klaidinga \u012Fvestis";
          case "invalid_element": {
            const origin = parsedTypeFromType(issue2.origin);
            return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reik\u0161m\u0117")} turi klaiding\u0105 \u012Fvest\u012F`;
          }
          default:
            return "Klaidinga \u012Fvestis";
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/mk.js
function mk_default() {
  return {
    localeError: error26()
  };
}
var error26;
var init_mk = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/mk.js"() {
    init_util();
    error26 = () => {
      const Sizable = {
        string: { unit: "\u0437\u043D\u0430\u0446\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" },
        file: { unit: "\u0431\u0430\u0458\u0442\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" },
        array: { unit: "\u0441\u0442\u0430\u0432\u043A\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" },
        set: { unit: "\u0441\u0442\u0430\u0432\u043A\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "\u0431\u0440\u043E\u0458";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "\u043D\u0438\u0437\u0430";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "\u0432\u043D\u0435\u0441",
        email: "\u0430\u0434\u0440\u0435\u0441\u0430 \u043D\u0430 \u0435-\u043F\u043E\u0448\u0442\u0430",
        url: "URL",
        emoji: "\u0435\u043C\u043E\u045F\u0438",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO \u0434\u0430\u0442\u0443\u043C \u0438 \u0432\u0440\u0435\u043C\u0435",
        date: "ISO \u0434\u0430\u0442\u0443\u043C",
        time: "ISO \u0432\u0440\u0435\u043C\u0435",
        duration: "ISO \u0432\u0440\u0435\u043C\u0435\u0442\u0440\u0430\u0435\u045A\u0435",
        ipv4: "IPv4 \u0430\u0434\u0440\u0435\u0441\u0430",
        ipv6: "IPv6 \u0430\u0434\u0440\u0435\u0441\u0430",
        cidrv4: "IPv4 \u043E\u043F\u0441\u0435\u0433",
        cidrv6: "IPv6 \u043E\u043F\u0441\u0435\u0433",
        base64: "base64-\u0435\u043D\u043A\u043E\u0434\u0438\u0440\u0430\u043D\u0430 \u043D\u0438\u0437\u0430",
        base64url: "base64url-\u0435\u043D\u043A\u043E\u0434\u0438\u0440\u0430\u043D\u0430 \u043D\u0438\u0437\u0430",
        json_string: "JSON \u043D\u0438\u0437\u0430",
        e164: "E.164 \u0431\u0440\u043E\u0458",
        jwt: "JWT",
        template_literal: "\u0432\u043D\u0435\u0441"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `\u0413\u0440\u0435\u0448\u0435\u043D \u0432\u043D\u0435\u0441: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${issue2.expected}, \u043F\u0440\u0438\u043C\u0435\u043D\u043E ${parsedType8(issue2.input)}`;
          // return `Invalid input: expected ${issue.expected}, received ${util.getParsedType(issue.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Invalid input: expected ${stringifyPrimitive(issue2.values[0])}`;
            return `\u0413\u0440\u0435\u0448\u0430\u043D\u0430 \u043E\u043F\u0446\u0438\u0458\u0430: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 \u0435\u0434\u043D\u0430 ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u0433\u043E\u043B\u0435\u043C: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${issue2.origin ?? "\u0432\u0440\u0435\u0434\u043D\u043E\u0441\u0442\u0430"} \u0434\u0430 \u0438\u043C\u0430 ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0438"}`;
            return `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u0433\u043E\u043B\u0435\u043C: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${issue2.origin ?? "\u0432\u0440\u0435\u0434\u043D\u043E\u0441\u0442\u0430"} \u0434\u0430 \u0431\u0438\u0434\u0435 ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u043C\u0430\u043B: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${issue2.origin} \u0434\u0430 \u0438\u043C\u0430 ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u043C\u0430\u043B: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${issue2.origin} \u0434\u0430 \u0431\u0438\u0434\u0435 ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with") {
              return `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0437\u0430\u043F\u043E\u0447\u043D\u0443\u0432\u0430 \u0441\u043E "${_issue.prefix}"`;
            }
            if (_issue.format === "ends_with")
              return `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0437\u0430\u0432\u0440\u0448\u0443\u0432\u0430 \u0441\u043E "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0432\u043A\u043B\u0443\u0447\u0443\u0432\u0430 "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u043E\u0434\u0433\u043E\u0430\u0440\u0430 \u043D\u0430 \u043F\u0430\u0442\u0435\u0440\u043D\u043E\u0442 ${_issue.pattern}`;
            return `Invalid ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `\u0413\u0440\u0435\u0448\u0435\u043D \u0431\u0440\u043E\u0458: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0431\u0438\u0434\u0435 \u0434\u0435\u043B\u0438\u0432 \u0441\u043E ${issue2.divisor}`;
          case "unrecognized_keys":
            return `${issue2.keys.length > 1 ? "\u041D\u0435\u043F\u0440\u0435\u043F\u043E\u0437\u043D\u0430\u0435\u043D\u0438 \u043A\u043B\u0443\u0447\u0435\u0432\u0438" : "\u041D\u0435\u043F\u0440\u0435\u043F\u043E\u0437\u043D\u0430\u0435\u043D \u043A\u043B\u0443\u0447"}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `\u0413\u0440\u0435\u0448\u0435\u043D \u043A\u043B\u0443\u0447 \u0432\u043E ${issue2.origin}`;
          case "invalid_union":
            return "\u0413\u0440\u0435\u0448\u0435\u043D \u0432\u043D\u0435\u0441";
          case "invalid_element":
            return `\u0413\u0440\u0435\u0448\u043D\u0430 \u0432\u0440\u0435\u0434\u043D\u043E\u0441\u0442 \u0432\u043E ${issue2.origin}`;
          default:
            return `\u0413\u0440\u0435\u0448\u0435\u043D \u0432\u043D\u0435\u0441`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/ms.js
function ms_default() {
  return {
    localeError: error27()
  };
}
var error27;
var init_ms = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/ms.js"() {
    init_util();
    error27 = () => {
      const Sizable = {
        string: { unit: "aksara", verb: "mempunyai" },
        file: { unit: "bait", verb: "mempunyai" },
        array: { unit: "elemen", verb: "mempunyai" },
        set: { unit: "elemen", verb: "mempunyai" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "nombor";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "array";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "input",
        email: "alamat e-mel",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "tarikh masa ISO",
        date: "tarikh ISO",
        time: "masa ISO",
        duration: "tempoh ISO",
        ipv4: "alamat IPv4",
        ipv6: "alamat IPv6",
        cidrv4: "julat IPv4",
        cidrv6: "julat IPv6",
        base64: "string dikodkan base64",
        base64url: "string dikodkan base64url",
        json_string: "string JSON",
        e164: "nombor E.164",
        jwt: "JWT",
        template_literal: "input"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Input tidak sah: dijangka ${issue2.expected}, diterima ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Input tidak sah: dijangka ${stringifyPrimitive(issue2.values[0])}`;
            return `Pilihan tidak sah: dijangka salah satu daripada ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `Terlalu besar: dijangka ${issue2.origin ?? "nilai"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elemen"}`;
            return `Terlalu besar: dijangka ${issue2.origin ?? "nilai"} adalah ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `Terlalu kecil: dijangka ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `Terlalu kecil: dijangka ${issue2.origin} adalah ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `String tidak sah: mesti bermula dengan "${_issue.prefix}"`;
            if (_issue.format === "ends_with")
              return `String tidak sah: mesti berakhir dengan "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `String tidak sah: mesti mengandungi "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `String tidak sah: mesti sepadan dengan corak ${_issue.pattern}`;
            return `${Nouns[_issue.format] ?? issue2.format} tidak sah`;
          }
          case "not_multiple_of":
            return `Nombor tidak sah: perlu gandaan ${issue2.divisor}`;
          case "unrecognized_keys":
            return `Kunci tidak dikenali: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `Kunci tidak sah dalam ${issue2.origin}`;
          case "invalid_union":
            return "Input tidak sah";
          case "invalid_element":
            return `Nilai tidak sah dalam ${issue2.origin}`;
          default:
            return `Input tidak sah`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/nl.js
function nl_default() {
  return {
    localeError: error28()
  };
}
var error28;
var init_nl = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/nl.js"() {
    init_util();
    error28 = () => {
      const Sizable = {
        string: { unit: "tekens" },
        file: { unit: "bytes" },
        array: { unit: "elementen" },
        set: { unit: "elementen" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "getal";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "array";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "invoer",
        email: "emailadres",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO datum en tijd",
        date: "ISO datum",
        time: "ISO tijd",
        duration: "ISO duur",
        ipv4: "IPv4-adres",
        ipv6: "IPv6-adres",
        cidrv4: "IPv4-bereik",
        cidrv6: "IPv6-bereik",
        base64: "base64-gecodeerde tekst",
        base64url: "base64 URL-gecodeerde tekst",
        json_string: "JSON string",
        e164: "E.164-nummer",
        jwt: "JWT",
        template_literal: "invoer"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Ongeldige invoer: verwacht ${issue2.expected}, ontving ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Ongeldige invoer: verwacht ${stringifyPrimitive(issue2.values[0])}`;
            return `Ongeldige optie: verwacht \xE9\xE9n van ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `Te lang: verwacht dat ${issue2.origin ?? "waarde"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementen"} bevat`;
            return `Te lang: verwacht dat ${issue2.origin ?? "waarde"} ${adj}${issue2.maximum.toString()} is`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `Te kort: verwacht dat ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} bevat`;
            }
            return `Te kort: verwacht dat ${issue2.origin} ${adj}${issue2.minimum.toString()} is`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with") {
              return `Ongeldige tekst: moet met "${_issue.prefix}" beginnen`;
            }
            if (_issue.format === "ends_with")
              return `Ongeldige tekst: moet op "${_issue.suffix}" eindigen`;
            if (_issue.format === "includes")
              return `Ongeldige tekst: moet "${_issue.includes}" bevatten`;
            if (_issue.format === "regex")
              return `Ongeldige tekst: moet overeenkomen met patroon ${_issue.pattern}`;
            return `Ongeldig: ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `Ongeldig getal: moet een veelvoud van ${issue2.divisor} zijn`;
          case "unrecognized_keys":
            return `Onbekende key${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `Ongeldige key in ${issue2.origin}`;
          case "invalid_union":
            return "Ongeldige invoer";
          case "invalid_element":
            return `Ongeldige waarde in ${issue2.origin}`;
          default:
            return `Ongeldige invoer`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/no.js
function no_default() {
  return {
    localeError: error29()
  };
}
var error29;
var init_no = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/no.js"() {
    init_util();
    error29 = () => {
      const Sizable = {
        string: { unit: "tegn", verb: "\xE5 ha" },
        file: { unit: "bytes", verb: "\xE5 ha" },
        array: { unit: "elementer", verb: "\xE5 inneholde" },
        set: { unit: "elementer", verb: "\xE5 inneholde" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "tall";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "liste";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "input",
        email: "e-postadresse",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO dato- og klokkeslett",
        date: "ISO-dato",
        time: "ISO-klokkeslett",
        duration: "ISO-varighet",
        ipv4: "IPv4-omr\xE5de",
        ipv6: "IPv6-omr\xE5de",
        cidrv4: "IPv4-spekter",
        cidrv6: "IPv6-spekter",
        base64: "base64-enkodet streng",
        base64url: "base64url-enkodet streng",
        json_string: "JSON-streng",
        e164: "E.164-nummer",
        jwt: "JWT",
        template_literal: "input"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Ugyldig input: forventet ${issue2.expected}, fikk ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Ugyldig verdi: forventet ${stringifyPrimitive(issue2.values[0])}`;
            return `Ugyldig valg: forventet en av ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `For stor(t): forventet ${issue2.origin ?? "value"} til \xE5 ha ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementer"}`;
            return `For stor(t): forventet ${issue2.origin ?? "value"} til \xE5 ha ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `For lite(n): forventet ${issue2.origin} til \xE5 ha ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `For lite(n): forventet ${issue2.origin} til \xE5 ha ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `Ugyldig streng: m\xE5 starte med "${_issue.prefix}"`;
            if (_issue.format === "ends_with")
              return `Ugyldig streng: m\xE5 ende med "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `Ugyldig streng: m\xE5 inneholde "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `Ugyldig streng: m\xE5 matche m\xF8nsteret ${_issue.pattern}`;
            return `Ugyldig ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `Ugyldig tall: m\xE5 v\xE6re et multiplum av ${issue2.divisor}`;
          case "unrecognized_keys":
            return `${issue2.keys.length > 1 ? "Ukjente n\xF8kler" : "Ukjent n\xF8kkel"}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `Ugyldig n\xF8kkel i ${issue2.origin}`;
          case "invalid_union":
            return "Ugyldig input";
          case "invalid_element":
            return `Ugyldig verdi i ${issue2.origin}`;
          default:
            return `Ugyldig input`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/ota.js
function ota_default() {
  return {
    localeError: error30()
  };
}
var error30;
var init_ota = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/ota.js"() {
    init_util();
    error30 = () => {
      const Sizable = {
        string: { unit: "harf", verb: "olmal\u0131d\u0131r" },
        file: { unit: "bayt", verb: "olmal\u0131d\u0131r" },
        array: { unit: "unsur", verb: "olmal\u0131d\u0131r" },
        set: { unit: "unsur", verb: "olmal\u0131d\u0131r" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "numara";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "saf";
            }
            if (data === null) {
              return "gayb";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "giren",
        email: "epostag\xE2h",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO heng\xE2m\u0131",
        date: "ISO tarihi",
        time: "ISO zaman\u0131",
        duration: "ISO m\xFCddeti",
        ipv4: "IPv4 ni\u015F\xE2n\u0131",
        ipv6: "IPv6 ni\u015F\xE2n\u0131",
        cidrv4: "IPv4 menzili",
        cidrv6: "IPv6 menzili",
        base64: "base64-\u015Fifreli metin",
        base64url: "base64url-\u015Fifreli metin",
        json_string: "JSON metin",
        e164: "E.164 say\u0131s\u0131",
        jwt: "JWT",
        template_literal: "giren"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `F\xE2sit giren: umulan ${issue2.expected}, al\u0131nan ${parsedType8(issue2.input)}`;
          // return `Fâsit giren: umulan ${issue.expected}, alınan ${util.getParsedType(issue.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `F\xE2sit giren: umulan ${stringifyPrimitive(issue2.values[0])}`;
            return `F\xE2sit tercih: m\xFBteberler ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `Fazla b\xFCy\xFCk: ${issue2.origin ?? "value"}, ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elements"} sahip olmal\u0131yd\u0131.`;
            return `Fazla b\xFCy\xFCk: ${issue2.origin ?? "value"}, ${adj}${issue2.maximum.toString()} olmal\u0131yd\u0131.`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `Fazla k\xFC\xE7\xFCk: ${issue2.origin}, ${adj}${issue2.minimum.toString()} ${sizing.unit} sahip olmal\u0131yd\u0131.`;
            }
            return `Fazla k\xFC\xE7\xFCk: ${issue2.origin}, ${adj}${issue2.minimum.toString()} olmal\u0131yd\u0131.`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `F\xE2sit metin: "${_issue.prefix}" ile ba\u015Flamal\u0131.`;
            if (_issue.format === "ends_with")
              return `F\xE2sit metin: "${_issue.suffix}" ile bitmeli.`;
            if (_issue.format === "includes")
              return `F\xE2sit metin: "${_issue.includes}" ihtiv\xE2 etmeli.`;
            if (_issue.format === "regex")
              return `F\xE2sit metin: ${_issue.pattern} nak\u015F\u0131na uymal\u0131.`;
            return `F\xE2sit ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `F\xE2sit say\u0131: ${issue2.divisor} kat\u0131 olmal\u0131yd\u0131.`;
          case "unrecognized_keys":
            return `Tan\u0131nmayan anahtar ${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `${issue2.origin} i\xE7in tan\u0131nmayan anahtar var.`;
          case "invalid_union":
            return "Giren tan\u0131namad\u0131.";
          case "invalid_element":
            return `${issue2.origin} i\xE7in tan\u0131nmayan k\u0131ymet var.`;
          default:
            return `K\u0131ymet tan\u0131namad\u0131.`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/ps.js
function ps_default() {
  return {
    localeError: error31()
  };
}
var error31;
var init_ps = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/ps.js"() {
    init_util();
    error31 = () => {
      const Sizable = {
        string: { unit: "\u062A\u0648\u06A9\u064A", verb: "\u0648\u0644\u0631\u064A" },
        file: { unit: "\u0628\u0627\u06CC\u067C\u0633", verb: "\u0648\u0644\u0631\u064A" },
        array: { unit: "\u062A\u0648\u06A9\u064A", verb: "\u0648\u0644\u0631\u064A" },
        set: { unit: "\u062A\u0648\u06A9\u064A", verb: "\u0648\u0644\u0631\u064A" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "\u0639\u062F\u062F";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "\u0627\u0631\u06D0";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "\u0648\u0631\u0648\u062F\u064A",
        email: "\u0628\u0631\u06CC\u069A\u0646\u0627\u0644\u06CC\u06A9",
        url: "\u06CC\u0648 \u0622\u0631 \u0627\u0644",
        emoji: "\u0627\u06CC\u0645\u0648\u062C\u064A",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "\u0646\u06CC\u067C\u0647 \u0627\u0648 \u0648\u062E\u062A",
        date: "\u0646\u06D0\u067C\u0647",
        time: "\u0648\u062E\u062A",
        duration: "\u0645\u0648\u062F\u0647",
        ipv4: "\u062F IPv4 \u067E\u062A\u0647",
        ipv6: "\u062F IPv6 \u067E\u062A\u0647",
        cidrv4: "\u062F IPv4 \u0633\u0627\u062D\u0647",
        cidrv6: "\u062F IPv6 \u0633\u0627\u062D\u0647",
        base64: "base64-encoded \u0645\u062A\u0646",
        base64url: "base64url-encoded \u0645\u062A\u0646",
        json_string: "JSON \u0645\u062A\u0646",
        e164: "\u062F E.164 \u0634\u0645\u06D0\u0631\u0647",
        jwt: "JWT",
        template_literal: "\u0648\u0631\u0648\u062F\u064A"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `\u0646\u0627\u0633\u0645 \u0648\u0631\u0648\u062F\u064A: \u0628\u0627\u06CC\u062F ${issue2.expected} \u0648\u0627\u06CC, \u0645\u06AB\u0631 ${parsedType8(issue2.input)} \u062A\u0631\u0644\u0627\u0633\u0647 \u0634\u0648`;
          case "invalid_value":
            if (issue2.values.length === 1) {
              return `\u0646\u0627\u0633\u0645 \u0648\u0631\u0648\u062F\u064A: \u0628\u0627\u06CC\u062F ${stringifyPrimitive(issue2.values[0])} \u0648\u0627\u06CC`;
            }
            return `\u0646\u0627\u0633\u0645 \u0627\u0646\u062A\u062E\u0627\u0628: \u0628\u0627\u06CC\u062F \u06CC\u0648 \u0644\u0647 ${joinValues(issue2.values, "|")} \u0685\u062E\u0647 \u0648\u0627\u06CC`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `\u0689\u06CC\u0631 \u0644\u0648\u06CC: ${issue2.origin ?? "\u0627\u0631\u0632\u069A\u062A"} \u0628\u0627\u06CC\u062F ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "\u0639\u0646\u0635\u0631\u0648\u0646\u0647"} \u0648\u0644\u0631\u064A`;
            }
            return `\u0689\u06CC\u0631 \u0644\u0648\u06CC: ${issue2.origin ?? "\u0627\u0631\u0632\u069A\u062A"} \u0628\u0627\u06CC\u062F ${adj}${issue2.maximum.toString()} \u0648\u064A`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `\u0689\u06CC\u0631 \u06A9\u0648\u0686\u0646\u06CC: ${issue2.origin} \u0628\u0627\u06CC\u062F ${adj}${issue2.minimum.toString()} ${sizing.unit} \u0648\u0644\u0631\u064A`;
            }
            return `\u0689\u06CC\u0631 \u06A9\u0648\u0686\u0646\u06CC: ${issue2.origin} \u0628\u0627\u06CC\u062F ${adj}${issue2.minimum.toString()} \u0648\u064A`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with") {
              return `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F \u062F "${_issue.prefix}" \u0633\u0631\u0647 \u067E\u06CC\u0644 \u0634\u064A`;
            }
            if (_issue.format === "ends_with") {
              return `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F \u062F "${_issue.suffix}" \u0633\u0631\u0647 \u067E\u0627\u06CC \u062A\u0647 \u0648\u0631\u0633\u064A\u0696\u064A`;
            }
            if (_issue.format === "includes") {
              return `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F "${_issue.includes}" \u0648\u0644\u0631\u064A`;
            }
            if (_issue.format === "regex") {
              return `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F \u062F ${_issue.pattern} \u0633\u0631\u0647 \u0645\u0637\u0627\u0628\u0642\u062A \u0648\u0644\u0631\u064A`;
            }
            return `${Nouns[_issue.format] ?? issue2.format} \u0646\u0627\u0633\u0645 \u062F\u06CC`;
          }
          case "not_multiple_of":
            return `\u0646\u0627\u0633\u0645 \u0639\u062F\u062F: \u0628\u0627\u06CC\u062F \u062F ${issue2.divisor} \u0645\u0636\u0631\u0628 \u0648\u064A`;
          case "unrecognized_keys":
            return `\u0646\u0627\u0633\u0645 ${issue2.keys.length > 1 ? "\u06A9\u0644\u06CC\u0689\u0648\u0646\u0647" : "\u06A9\u0644\u06CC\u0689"}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `\u0646\u0627\u0633\u0645 \u06A9\u0644\u06CC\u0689 \u067E\u0647 ${issue2.origin} \u06A9\u06D0`;
          case "invalid_union":
            return `\u0646\u0627\u0633\u0645\u0647 \u0648\u0631\u0648\u062F\u064A`;
          case "invalid_element":
            return `\u0646\u0627\u0633\u0645 \u0639\u0646\u0635\u0631 \u067E\u0647 ${issue2.origin} \u06A9\u06D0`;
          default:
            return `\u0646\u0627\u0633\u0645\u0647 \u0648\u0631\u0648\u062F\u064A`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/pl.js
function pl_default() {
  return {
    localeError: error32()
  };
}
var error32;
var init_pl = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/pl.js"() {
    init_util();
    error32 = () => {
      const Sizable = {
        string: { unit: "znak\xF3w", verb: "mie\u0107" },
        file: { unit: "bajt\xF3w", verb: "mie\u0107" },
        array: { unit: "element\xF3w", verb: "mie\u0107" },
        set: { unit: "element\xF3w", verb: "mie\u0107" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "liczba";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "tablica";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "wyra\u017Cenie",
        email: "adres email",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "data i godzina w formacie ISO",
        date: "data w formacie ISO",
        time: "godzina w formacie ISO",
        duration: "czas trwania ISO",
        ipv4: "adres IPv4",
        ipv6: "adres IPv6",
        cidrv4: "zakres IPv4",
        cidrv6: "zakres IPv6",
        base64: "ci\u0105g znak\xF3w zakodowany w formacie base64",
        base64url: "ci\u0105g znak\xF3w zakodowany w formacie base64url",
        json_string: "ci\u0105g znak\xF3w w formacie JSON",
        e164: "liczba E.164",
        jwt: "JWT",
        template_literal: "wej\u015Bcie"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Nieprawid\u0142owe dane wej\u015Bciowe: oczekiwano ${issue2.expected}, otrzymano ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Nieprawid\u0142owe dane wej\u015Bciowe: oczekiwano ${stringifyPrimitive(issue2.values[0])}`;
            return `Nieprawid\u0142owa opcja: oczekiwano jednej z warto\u015Bci ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `Za du\u017Ca warto\u015B\u0107: oczekiwano, \u017Ce ${issue2.origin ?? "warto\u015B\u0107"} b\u0119dzie mie\u0107 ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "element\xF3w"}`;
            }
            return `Zbyt du\u017C(y/a/e): oczekiwano, \u017Ce ${issue2.origin ?? "warto\u015B\u0107"} b\u0119dzie wynosi\u0107 ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `Za ma\u0142a warto\u015B\u0107: oczekiwano, \u017Ce ${issue2.origin ?? "warto\u015B\u0107"} b\u0119dzie mie\u0107 ${adj}${issue2.minimum.toString()} ${sizing.unit ?? "element\xF3w"}`;
            }
            return `Zbyt ma\u0142(y/a/e): oczekiwano, \u017Ce ${issue2.origin ?? "warto\u015B\u0107"} b\u0119dzie wynosi\u0107 ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi zaczyna\u0107 si\u0119 od "${_issue.prefix}"`;
            if (_issue.format === "ends_with")
              return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi ko\u0144czy\u0107 si\u0119 na "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi zawiera\u0107 "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi odpowiada\u0107 wzorcowi ${_issue.pattern}`;
            return `Nieprawid\u0142ow(y/a/e) ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `Nieprawid\u0142owa liczba: musi by\u0107 wielokrotno\u015Bci\u0105 ${issue2.divisor}`;
          case "unrecognized_keys":
            return `Nierozpoznane klucze${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `Nieprawid\u0142owy klucz w ${issue2.origin}`;
          case "invalid_union":
            return "Nieprawid\u0142owe dane wej\u015Bciowe";
          case "invalid_element":
            return `Nieprawid\u0142owa warto\u015B\u0107 w ${issue2.origin}`;
          default:
            return `Nieprawid\u0142owe dane wej\u015Bciowe`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/pt.js
function pt_default() {
  return {
    localeError: error33()
  };
}
var error33;
var init_pt = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/pt.js"() {
    init_util();
    error33 = () => {
      const Sizable = {
        string: { unit: "caracteres", verb: "ter" },
        file: { unit: "bytes", verb: "ter" },
        array: { unit: "itens", verb: "ter" },
        set: { unit: "itens", verb: "ter" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "n\xFAmero";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "array";
            }
            if (data === null) {
              return "nulo";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "padr\xE3o",
        email: "endere\xE7o de e-mail",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "data e hora ISO",
        date: "data ISO",
        time: "hora ISO",
        duration: "dura\xE7\xE3o ISO",
        ipv4: "endere\xE7o IPv4",
        ipv6: "endere\xE7o IPv6",
        cidrv4: "faixa de IPv4",
        cidrv6: "faixa de IPv6",
        base64: "texto codificado em base64",
        base64url: "URL codificada em base64",
        json_string: "texto JSON",
        e164: "n\xFAmero E.164",
        jwt: "JWT",
        template_literal: "entrada"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Tipo inv\xE1lido: esperado ${issue2.expected}, recebido ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Entrada inv\xE1lida: esperado ${stringifyPrimitive(issue2.values[0])}`;
            return `Op\xE7\xE3o inv\xE1lida: esperada uma das ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `Muito grande: esperado que ${issue2.origin ?? "valor"} tivesse ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementos"}`;
            return `Muito grande: esperado que ${issue2.origin ?? "valor"} fosse ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `Muito pequeno: esperado que ${issue2.origin} tivesse ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `Muito pequeno: esperado que ${issue2.origin} fosse ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `Texto inv\xE1lido: deve come\xE7ar com "${_issue.prefix}"`;
            if (_issue.format === "ends_with")
              return `Texto inv\xE1lido: deve terminar com "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `Texto inv\xE1lido: deve incluir "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `Texto inv\xE1lido: deve corresponder ao padr\xE3o ${_issue.pattern}`;
            return `${Nouns[_issue.format] ?? issue2.format} inv\xE1lido`;
          }
          case "not_multiple_of":
            return `N\xFAmero inv\xE1lido: deve ser m\xFAltiplo de ${issue2.divisor}`;
          case "unrecognized_keys":
            return `Chave${issue2.keys.length > 1 ? "s" : ""} desconhecida${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `Chave inv\xE1lida em ${issue2.origin}`;
          case "invalid_union":
            return "Entrada inv\xE1lida";
          case "invalid_element":
            return `Valor inv\xE1lido em ${issue2.origin}`;
          default:
            return `Campo inv\xE1lido`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/ru.js
function getRussianPlural(count, one, few, many) {
  const absCount = Math.abs(count);
  const lastDigit = absCount % 10;
  const lastTwoDigits = absCount % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return many;
  }
  if (lastDigit === 1) {
    return one;
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return few;
  }
  return many;
}
function ru_default() {
  return {
    localeError: error34()
  };
}
var error34;
var init_ru = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/ru.js"() {
    init_util();
    error34 = () => {
      const Sizable = {
        string: {
          unit: {
            one: "\u0441\u0438\u043C\u0432\u043E\u043B",
            few: "\u0441\u0438\u043C\u0432\u043E\u043B\u0430",
            many: "\u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432"
          },
          verb: "\u0438\u043C\u0435\u0442\u044C"
        },
        file: {
          unit: {
            one: "\u0431\u0430\u0439\u0442",
            few: "\u0431\u0430\u0439\u0442\u0430",
            many: "\u0431\u0430\u0439\u0442"
          },
          verb: "\u0438\u043C\u0435\u0442\u044C"
        },
        array: {
          unit: {
            one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442",
            few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430",
            many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432"
          },
          verb: "\u0438\u043C\u0435\u0442\u044C"
        },
        set: {
          unit: {
            one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442",
            few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430",
            many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432"
          },
          verb: "\u0438\u043C\u0435\u0442\u044C"
        }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "\u0447\u0438\u0441\u043B\u043E";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "\u043C\u0430\u0441\u0441\u0438\u0432";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "\u0432\u0432\u043E\u0434",
        email: "email \u0430\u0434\u0440\u0435\u0441",
        url: "URL",
        emoji: "\u044D\u043C\u043E\u0434\u0437\u0438",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO \u0434\u0430\u0442\u0430 \u0438 \u0432\u0440\u0435\u043C\u044F",
        date: "ISO \u0434\u0430\u0442\u0430",
        time: "ISO \u0432\u0440\u0435\u043C\u044F",
        duration: "ISO \u0434\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C",
        ipv4: "IPv4 \u0430\u0434\u0440\u0435\u0441",
        ipv6: "IPv6 \u0430\u0434\u0440\u0435\u0441",
        cidrv4: "IPv4 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D",
        cidrv6: "IPv6 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D",
        base64: "\u0441\u0442\u0440\u043E\u043A\u0430 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 base64",
        base64url: "\u0441\u0442\u0440\u043E\u043A\u0430 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 base64url",
        json_string: "JSON \u0441\u0442\u0440\u043E\u043A\u0430",
        e164: "\u043D\u043E\u043C\u0435\u0440 E.164",
        jwt: "JWT",
        template_literal: "\u0432\u0432\u043E\u0434"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0432\u043E\u0434: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C ${issue2.expected}, \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0432\u043E\u0434: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C ${stringifyPrimitive(issue2.values[0])}`;
            return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0434\u043D\u043E \u0438\u0437 ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              const maxValue = Number(issue2.maximum);
              const unit = getRussianPlural(maxValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
              return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${issue2.origin ?? "\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435"} \u0431\u0443\u0434\u0435\u0442 \u0438\u043C\u0435\u0442\u044C ${adj}${issue2.maximum.toString()} ${unit}`;
            }
            return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${issue2.origin ?? "\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435"} \u0431\u0443\u0434\u0435\u0442 ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              const minValue = Number(issue2.minimum);
              const unit = getRussianPlural(minValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
              return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${issue2.origin} \u0431\u0443\u0434\u0435\u0442 \u0438\u043C\u0435\u0442\u044C ${adj}${issue2.minimum.toString()} ${unit}`;
            }
            return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${issue2.origin} \u0431\u0443\u0434\u0435\u0442 ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u043D\u0430\u0447\u0438\u043D\u0430\u0442\u044C\u0441\u044F \u0441 "${_issue.prefix}"`;
            if (_issue.format === "ends_with")
              return `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u0437\u0430\u043A\u0430\u043D\u0447\u0438\u0432\u0430\u0442\u044C\u0441\u044F \u043D\u0430 "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C \u0448\u0430\u0431\u043B\u043E\u043D\u0443 ${_issue.pattern}`;
            return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `\u041D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0447\u0438\u0441\u043B\u043E: \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043A\u0440\u0430\u0442\u043D\u044B\u043C ${issue2.divisor}`;
          case "unrecognized_keys":
            return `\u041D\u0435\u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D\u043D${issue2.keys.length > 1 ? "\u044B\u0435" : "\u044B\u0439"} \u043A\u043B\u044E\u0447${issue2.keys.length > 1 ? "\u0438" : ""}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043A\u043B\u044E\u0447 \u0432 ${issue2.origin}`;
          case "invalid_union":
            return "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0432\u0445\u043E\u0434\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435";
          case "invalid_element":
            return `\u041D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0432 ${issue2.origin}`;
          default:
            return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0432\u0445\u043E\u0434\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/sl.js
function sl_default() {
  return {
    localeError: error35()
  };
}
var error35;
var init_sl = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/sl.js"() {
    init_util();
    error35 = () => {
      const Sizable = {
        string: { unit: "znakov", verb: "imeti" },
        file: { unit: "bajtov", verb: "imeti" },
        array: { unit: "elementov", verb: "imeti" },
        set: { unit: "elementov", verb: "imeti" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "\u0161tevilo";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "tabela";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "vnos",
        email: "e-po\u0161tni naslov",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO datum in \u010Das",
        date: "ISO datum",
        time: "ISO \u010Das",
        duration: "ISO trajanje",
        ipv4: "IPv4 naslov",
        ipv6: "IPv6 naslov",
        cidrv4: "obseg IPv4",
        cidrv6: "obseg IPv6",
        base64: "base64 kodiran niz",
        base64url: "base64url kodiran niz",
        json_string: "JSON niz",
        e164: "E.164 \u0161tevilka",
        jwt: "JWT",
        template_literal: "vnos"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Neveljaven vnos: pri\u010Dakovano ${issue2.expected}, prejeto ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Neveljaven vnos: pri\u010Dakovano ${stringifyPrimitive(issue2.values[0])}`;
            return `Neveljavna mo\u017Enost: pri\u010Dakovano eno izmed ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `Preveliko: pri\u010Dakovano, da bo ${issue2.origin ?? "vrednost"} imelo ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementov"}`;
            return `Preveliko: pri\u010Dakovano, da bo ${issue2.origin ?? "vrednost"} ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `Premajhno: pri\u010Dakovano, da bo ${issue2.origin} imelo ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `Premajhno: pri\u010Dakovano, da bo ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with") {
              return `Neveljaven niz: mora se za\u010Deti z "${_issue.prefix}"`;
            }
            if (_issue.format === "ends_with")
              return `Neveljaven niz: mora se kon\u010Dati z "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `Neveljaven niz: mora vsebovati "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `Neveljaven niz: mora ustrezati vzorcu ${_issue.pattern}`;
            return `Neveljaven ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `Neveljavno \u0161tevilo: mora biti ve\u010Dkratnik ${issue2.divisor}`;
          case "unrecognized_keys":
            return `Neprepoznan${issue2.keys.length > 1 ? "i klju\u010Di" : " klju\u010D"}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `Neveljaven klju\u010D v ${issue2.origin}`;
          case "invalid_union":
            return "Neveljaven vnos";
          case "invalid_element":
            return `Neveljavna vrednost v ${issue2.origin}`;
          default:
            return "Neveljaven vnos";
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/sv.js
function sv_default() {
  return {
    localeError: error36()
  };
}
var error36;
var init_sv = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/sv.js"() {
    init_util();
    error36 = () => {
      const Sizable = {
        string: { unit: "tecken", verb: "att ha" },
        file: { unit: "bytes", verb: "att ha" },
        array: { unit: "objekt", verb: "att inneh\xE5lla" },
        set: { unit: "objekt", verb: "att inneh\xE5lla" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "antal";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "lista";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "regulj\xE4rt uttryck",
        email: "e-postadress",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO-datum och tid",
        date: "ISO-datum",
        time: "ISO-tid",
        duration: "ISO-varaktighet",
        ipv4: "IPv4-intervall",
        ipv6: "IPv6-intervall",
        cidrv4: "IPv4-spektrum",
        cidrv6: "IPv6-spektrum",
        base64: "base64-kodad str\xE4ng",
        base64url: "base64url-kodad str\xE4ng",
        json_string: "JSON-str\xE4ng",
        e164: "E.164-nummer",
        jwt: "JWT",
        template_literal: "mall-literal"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Ogiltig inmatning: f\xF6rv\xE4ntat ${issue2.expected}, fick ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Ogiltig inmatning: f\xF6rv\xE4ntat ${stringifyPrimitive(issue2.values[0])}`;
            return `Ogiltigt val: f\xF6rv\xE4ntade en av ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `F\xF6r stor(t): f\xF6rv\xE4ntade ${issue2.origin ?? "v\xE4rdet"} att ha ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "element"}`;
            }
            return `F\xF6r stor(t): f\xF6rv\xE4ntat ${issue2.origin ?? "v\xE4rdet"} att ha ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `F\xF6r lite(t): f\xF6rv\xE4ntade ${issue2.origin ?? "v\xE4rdet"} att ha ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `F\xF6r lite(t): f\xF6rv\xE4ntade ${issue2.origin ?? "v\xE4rdet"} att ha ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with") {
              return `Ogiltig str\xE4ng: m\xE5ste b\xF6rja med "${_issue.prefix}"`;
            }
            if (_issue.format === "ends_with")
              return `Ogiltig str\xE4ng: m\xE5ste sluta med "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `Ogiltig str\xE4ng: m\xE5ste inneh\xE5lla "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `Ogiltig str\xE4ng: m\xE5ste matcha m\xF6nstret "${_issue.pattern}"`;
            return `Ogiltig(t) ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `Ogiltigt tal: m\xE5ste vara en multipel av ${issue2.divisor}`;
          case "unrecognized_keys":
            return `${issue2.keys.length > 1 ? "Ok\xE4nda nycklar" : "Ok\xE4nd nyckel"}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `Ogiltig nyckel i ${issue2.origin ?? "v\xE4rdet"}`;
          case "invalid_union":
            return "Ogiltig input";
          case "invalid_element":
            return `Ogiltigt v\xE4rde i ${issue2.origin ?? "v\xE4rdet"}`;
          default:
            return `Ogiltig input`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/ta.js
function ta_default() {
  return {
    localeError: error37()
  };
}
var error37;
var init_ta = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/ta.js"() {
    init_util();
    error37 = () => {
      const Sizable = {
        string: { unit: "\u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0B95\u0BCD\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" },
        file: { unit: "\u0BAA\u0BC8\u0B9F\u0BCD\u0B9F\u0BC1\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" },
        array: { unit: "\u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" },
        set: { unit: "\u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "\u0B8E\u0BA3\u0BCD \u0B85\u0BB2\u0BCD\u0BB2\u0BBE\u0BA4\u0BA4\u0BC1" : "\u0B8E\u0BA3\u0BCD";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "\u0B85\u0BA3\u0BBF";
            }
            if (data === null) {
              return "\u0BB5\u0BC6\u0BB1\u0BC1\u0BAE\u0BC8";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "\u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1",
        email: "\u0BAE\u0BBF\u0BA9\u0BCD\u0BA9\u0B9E\u0BCD\u0B9A\u0BB2\u0BCD \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO \u0BA4\u0BC7\u0BA4\u0BBF \u0BA8\u0BC7\u0BB0\u0BAE\u0BCD",
        date: "ISO \u0BA4\u0BC7\u0BA4\u0BBF",
        time: "ISO \u0BA8\u0BC7\u0BB0\u0BAE\u0BCD",
        duration: "ISO \u0B95\u0BBE\u0BB2 \u0B85\u0BB3\u0BB5\u0BC1",
        ipv4: "IPv4 \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF",
        ipv6: "IPv6 \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF",
        cidrv4: "IPv4 \u0BB5\u0BB0\u0BAE\u0BCD\u0BAA\u0BC1",
        cidrv6: "IPv6 \u0BB5\u0BB0\u0BAE\u0BCD\u0BAA\u0BC1",
        base64: "base64-encoded \u0B9A\u0BB0\u0BAE\u0BCD",
        base64url: "base64url-encoded \u0B9A\u0BB0\u0BAE\u0BCD",
        json_string: "JSON \u0B9A\u0BB0\u0BAE\u0BCD",
        e164: "E.164 \u0B8E\u0BA3\u0BCD",
        jwt: "JWT",
        template_literal: "input"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${issue2.expected}, \u0BAA\u0BC6\u0BB1\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${stringifyPrimitive(issue2.values[0])}`;
            return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0BB5\u0BBF\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0BAE\u0BCD: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${joinValues(issue2.values, "|")} \u0B87\u0BB2\u0BCD \u0B92\u0BA9\u0BCD\u0BB1\u0BC1`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `\u0BAE\u0BBF\u0B95 \u0BAA\u0BC6\u0BB0\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${issue2.origin ?? "\u0BAE\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "\u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD"} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
            }
            return `\u0BAE\u0BBF\u0B95 \u0BAA\u0BC6\u0BB0\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${issue2.origin ?? "\u0BAE\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1"} ${adj}${issue2.maximum.toString()} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `\u0BAE\u0BBF\u0B95\u0B9A\u0BCD \u0B9A\u0BBF\u0BB1\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
            }
            return `\u0BAE\u0BBF\u0B95\u0B9A\u0BCD \u0B9A\u0BBF\u0BB1\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${issue2.origin} ${adj}${issue2.minimum.toString()} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: "${_issue.prefix}" \u0B87\u0BB2\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
            if (_issue.format === "ends_with")
              return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: "${_issue.suffix}" \u0B87\u0BB2\u0BCD \u0BAE\u0BC1\u0B9F\u0BBF\u0BB5\u0B9F\u0BC8\u0BAF \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
            if (_issue.format === "includes")
              return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: "${_issue.includes}" \u0B90 \u0B89\u0BB3\u0BCD\u0BB3\u0B9F\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
            if (_issue.format === "regex")
              return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: ${_issue.pattern} \u0BAE\u0BC1\u0BB1\u0BC8\u0BAA\u0BBE\u0B9F\u0BCD\u0B9F\u0BC1\u0B9F\u0BA9\u0BCD \u0BAA\u0BCA\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
            return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B8E\u0BA3\u0BCD: ${issue2.divisor} \u0B87\u0BA9\u0BCD \u0BAA\u0BB2\u0BAE\u0BBE\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
          case "unrecognized_keys":
            return `\u0B85\u0B9F\u0BC8\u0BAF\u0BBE\u0BB3\u0BAE\u0BCD \u0BA4\u0BC6\u0BB0\u0BBF\u0BAF\u0BBE\u0BA4 \u0BB5\u0BBF\u0B9A\u0BC8${issue2.keys.length > 1 ? "\u0B95\u0BB3\u0BCD" : ""}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `${issue2.origin} \u0B87\u0BB2\u0BCD \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0BB5\u0BBF\u0B9A\u0BC8`;
          case "invalid_union":
            return "\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1";
          case "invalid_element":
            return `${issue2.origin} \u0B87\u0BB2\u0BCD \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0BAE\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1`;
          default:
            return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/th.js
function th_default() {
  return {
    localeError: error38()
  };
}
var error38;
var init_th = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/th.js"() {
    init_util();
    error38 = () => {
      const Sizable = {
        string: { unit: "\u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" },
        file: { unit: "\u0E44\u0E1A\u0E15\u0E4C", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" },
        array: { unit: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" },
        set: { unit: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02 (NaN)" : "\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "\u0E2D\u0E32\u0E23\u0E4C\u0E40\u0E23\u0E22\u0E4C (Array)";
            }
            if (data === null) {
              return "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E04\u0E48\u0E32 (null)";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E1B\u0E49\u0E2D\u0E19",
        email: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48\u0E2D\u0E35\u0E40\u0E21\u0E25",
        url: "URL",
        emoji: "\u0E2D\u0E34\u0E42\u0E21\u0E08\u0E34",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E27\u0E25\u0E32\u0E41\u0E1A\u0E1A ISO",
        date: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E41\u0E1A\u0E1A ISO",
        time: "\u0E40\u0E27\u0E25\u0E32\u0E41\u0E1A\u0E1A ISO",
        duration: "\u0E0A\u0E48\u0E27\u0E07\u0E40\u0E27\u0E25\u0E32\u0E41\u0E1A\u0E1A ISO",
        ipv4: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48 IPv4",
        ipv6: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48 IPv6",
        cidrv4: "\u0E0A\u0E48\u0E27\u0E07 IP \u0E41\u0E1A\u0E1A IPv4",
        cidrv6: "\u0E0A\u0E48\u0E27\u0E07 IP \u0E41\u0E1A\u0E1A IPv6",
        base64: "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E1A\u0E1A Base64",
        base64url: "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E1A\u0E1A Base64 \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A URL",
        json_string: "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E1A\u0E1A JSON",
        e164: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28 (E.164)",
        jwt: "\u0E42\u0E17\u0E40\u0E04\u0E19 JWT",
        template_literal: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E1B\u0E49\u0E2D\u0E19"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19 ${issue2.expected} \u0E41\u0E15\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `\u0E04\u0E48\u0E32\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19 ${stringifyPrimitive(issue2.values[0])}`;
            return `\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E43\u0E19 ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19" : "\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14: ${issue2.origin ?? "\u0E04\u0E48\u0E32"} \u0E04\u0E27\u0E23\u0E21\u0E35${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"}`;
            return `\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14: ${issue2.origin ?? "\u0E04\u0E48\u0E32"} \u0E04\u0E27\u0E23\u0E21\u0E35${adj} ${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? "\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22" : "\u0E21\u0E32\u0E01\u0E01\u0E27\u0E48\u0E32";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32\u0E01\u0E33\u0E2B\u0E19\u0E14: ${issue2.origin} \u0E04\u0E27\u0E23\u0E21\u0E35${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32\u0E01\u0E33\u0E2B\u0E19\u0E14: ${issue2.origin} \u0E04\u0E27\u0E23\u0E21\u0E35${adj} ${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with") {
              return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E02\u0E36\u0E49\u0E19\u0E15\u0E49\u0E19\u0E14\u0E49\u0E27\u0E22 "${_issue.prefix}"`;
            }
            if (_issue.format === "ends_with")
              return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E25\u0E07\u0E17\u0E49\u0E32\u0E22\u0E14\u0E49\u0E27\u0E22 "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35 "${_issue.includes}" \u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21`;
            if (_issue.format === "regex")
              return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E15\u0E49\u0E2D\u0E07\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14 ${_issue.pattern}`;
            return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E08\u0E33\u0E19\u0E27\u0E19\u0E17\u0E35\u0E48\u0E2B\u0E32\u0E23\u0E14\u0E49\u0E27\u0E22 ${issue2.divisor} \u0E44\u0E14\u0E49\u0E25\u0E07\u0E15\u0E31\u0E27`;
          case "unrecognized_keys":
            return `\u0E1E\u0E1A\u0E04\u0E35\u0E22\u0E4C\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `\u0E04\u0E35\u0E22\u0E4C\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E43\u0E19 ${issue2.origin}`;
          case "invalid_union":
            return "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E22\u0E39\u0E40\u0E19\u0E35\u0E22\u0E19\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E44\u0E27\u0E49";
          case "invalid_element":
            return `\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E43\u0E19 ${issue2.origin}`;
          default:
            return `\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/tr.js
function tr_default() {
  return {
    localeError: error39()
  };
}
var parsedType7, error39;
var init_tr = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/tr.js"() {
    init_util();
    parsedType7 = (data) => {
      const t = typeof data;
      switch (t) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "number";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t;
    };
    error39 = () => {
      const Sizable = {
        string: { unit: "karakter", verb: "olmal\u0131" },
        file: { unit: "bayt", verb: "olmal\u0131" },
        array: { unit: "\xF6\u011Fe", verb: "olmal\u0131" },
        set: { unit: "\xF6\u011Fe", verb: "olmal\u0131" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const Nouns = {
        regex: "girdi",
        email: "e-posta adresi",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO tarih ve saat",
        date: "ISO tarih",
        time: "ISO saat",
        duration: "ISO s\xFCre",
        ipv4: "IPv4 adresi",
        ipv6: "IPv6 adresi",
        cidrv4: "IPv4 aral\u0131\u011F\u0131",
        cidrv6: "IPv6 aral\u0131\u011F\u0131",
        base64: "base64 ile \u015Fifrelenmi\u015F metin",
        base64url: "base64url ile \u015Fifrelenmi\u015F metin",
        json_string: "JSON dizesi",
        e164: "E.164 say\u0131s\u0131",
        jwt: "JWT",
        template_literal: "\u015Eablon dizesi"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `Ge\xE7ersiz de\u011Fer: beklenen ${issue2.expected}, al\u0131nan ${parsedType7(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `Ge\xE7ersiz de\u011Fer: beklenen ${stringifyPrimitive(issue2.values[0])}`;
            return `Ge\xE7ersiz se\xE7enek: a\u015Fa\u011F\u0131dakilerden biri olmal\u0131: ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `\xC7ok b\xFCy\xFCk: beklenen ${issue2.origin ?? "de\u011Fer"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "\xF6\u011Fe"}`;
            return `\xC7ok b\xFCy\xFCk: beklenen ${issue2.origin ?? "de\u011Fer"} ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `\xC7ok k\xFC\xE7\xFCk: beklenen ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            return `\xC7ok k\xFC\xE7\xFCk: beklenen ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `Ge\xE7ersiz metin: "${_issue.prefix}" ile ba\u015Flamal\u0131`;
            if (_issue.format === "ends_with")
              return `Ge\xE7ersiz metin: "${_issue.suffix}" ile bitmeli`;
            if (_issue.format === "includes")
              return `Ge\xE7ersiz metin: "${_issue.includes}" i\xE7ermeli`;
            if (_issue.format === "regex")
              return `Ge\xE7ersiz metin: ${_issue.pattern} desenine uymal\u0131`;
            return `Ge\xE7ersiz ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `Ge\xE7ersiz say\u0131: ${issue2.divisor} ile tam b\xF6l\xFCnebilmeli`;
          case "unrecognized_keys":
            return `Tan\u0131nmayan anahtar${issue2.keys.length > 1 ? "lar" : ""}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `${issue2.origin} i\xE7inde ge\xE7ersiz anahtar`;
          case "invalid_union":
            return "Ge\xE7ersiz de\u011Fer";
          case "invalid_element":
            return `${issue2.origin} i\xE7inde ge\xE7ersiz de\u011Fer`;
          default:
            return `Ge\xE7ersiz de\u011Fer`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/uk.js
function uk_default() {
  return {
    localeError: error40()
  };
}
var error40;
var init_uk = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/uk.js"() {
    init_util();
    error40 = () => {
      const Sizable = {
        string: { unit: "\u0441\u0438\u043C\u0432\u043E\u043B\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" },
        file: { unit: "\u0431\u0430\u0439\u0442\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" },
        array: { unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" },
        set: { unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "\u0447\u0438\u0441\u043B\u043E";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "\u043C\u0430\u0441\u0438\u0432";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "\u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456",
        email: "\u0430\u0434\u0440\u0435\u0441\u0430 \u0435\u043B\u0435\u043A\u0442\u0440\u043E\u043D\u043D\u043E\u0457 \u043F\u043E\u0448\u0442\u0438",
        url: "URL",
        emoji: "\u0435\u043C\u043E\u0434\u0437\u0456",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "\u0434\u0430\u0442\u0430 \u0442\u0430 \u0447\u0430\u0441 ISO",
        date: "\u0434\u0430\u0442\u0430 ISO",
        time: "\u0447\u0430\u0441 ISO",
        duration: "\u0442\u0440\u0438\u0432\u0430\u043B\u0456\u0441\u0442\u044C ISO",
        ipv4: "\u0430\u0434\u0440\u0435\u0441\u0430 IPv4",
        ipv6: "\u0430\u0434\u0440\u0435\u0441\u0430 IPv6",
        cidrv4: "\u0434\u0456\u0430\u043F\u0430\u0437\u043E\u043D IPv4",
        cidrv6: "\u0434\u0456\u0430\u043F\u0430\u0437\u043E\u043D IPv6",
        base64: "\u0440\u044F\u0434\u043E\u043A \u0443 \u043A\u043E\u0434\u0443\u0432\u0430\u043D\u043D\u0456 base64",
        base64url: "\u0440\u044F\u0434\u043E\u043A \u0443 \u043A\u043E\u0434\u0443\u0432\u0430\u043D\u043D\u0456 base64url",
        json_string: "\u0440\u044F\u0434\u043E\u043A JSON",
        e164: "\u043D\u043E\u043C\u0435\u0440 E.164",
        jwt: "JWT",
        template_literal: "\u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F ${issue2.expected}, \u043E\u0442\u0440\u0438\u043C\u0430\u043D\u043E ${parsedType8(issue2.input)}`;
          // return `Неправильні вхідні дані: очікується ${issue.expected}, отримано ${util.getParsedType(issue.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F ${stringifyPrimitive(issue2.values[0])}`;
            return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0430 \u043E\u043F\u0446\u0456\u044F: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F \u043E\u0434\u043D\u0435 \u0437 ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u0432\u0435\u043B\u0438\u043A\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${issue2.origin ?? "\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432"}`;
            return `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u0432\u0435\u043B\u0438\u043A\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${issue2.origin ?? "\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F"} \u0431\u0443\u0434\u0435 ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u043C\u0430\u043B\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u043C\u0430\u043B\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${issue2.origin} \u0431\u0443\u0434\u0435 ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u043F\u043E\u0447\u0438\u043D\u0430\u0442\u0438\u0441\u044F \u0437 "${_issue.prefix}"`;
            if (_issue.format === "ends_with")
              return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u0437\u0430\u043A\u0456\u043D\u0447\u0443\u0432\u0430\u0442\u0438\u0441\u044F \u043D\u0430 "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u043C\u0456\u0441\u0442\u0438\u0442\u0438 "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0430\u0442\u0438 \u0448\u0430\u0431\u043B\u043E\u043D\u0443 ${_issue.pattern}`;
            return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0435 \u0447\u0438\u0441\u043B\u043E: \u043F\u043E\u0432\u0438\u043D\u043D\u043E \u0431\u0443\u0442\u0438 \u043A\u0440\u0430\u0442\u043D\u0438\u043C ${issue2.divisor}`;
          case "unrecognized_keys":
            return `\u041D\u0435\u0440\u043E\u0437\u043F\u0456\u0437\u043D\u0430\u043D\u0438\u0439 \u043A\u043B\u044E\u0447${issue2.keys.length > 1 ? "\u0456" : ""}: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u043A\u043B\u044E\u0447 \u0443 ${issue2.origin}`;
          case "invalid_union":
            return "\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456";
          case "invalid_element":
            return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F \u0443 ${issue2.origin}`;
          default:
            return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/ua.js
function ua_default() {
  return uk_default();
}
var init_ua = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/ua.js"() {
    init_uk();
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/ur.js
function ur_default() {
  return {
    localeError: error41()
  };
}
var error41;
var init_ur = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/ur.js"() {
    init_util();
    error41 = () => {
      const Sizable = {
        string: { unit: "\u062D\u0631\u0648\u0641", verb: "\u06C1\u0648\u0646\u0627" },
        file: { unit: "\u0628\u0627\u0626\u0679\u0633", verb: "\u06C1\u0648\u0646\u0627" },
        array: { unit: "\u0622\u0626\u0679\u0645\u0632", verb: "\u06C1\u0648\u0646\u0627" },
        set: { unit: "\u0622\u0626\u0679\u0645\u0632", verb: "\u06C1\u0648\u0646\u0627" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "\u0646\u0645\u0628\u0631";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "\u0622\u0631\u06D2";
            }
            if (data === null) {
              return "\u0646\u0644";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "\u0627\u0646 \u067E\u0679",
        email: "\u0627\u06CC \u0645\u06CC\u0644 \u0627\u06CC\u0688\u0631\u06CC\u0633",
        url: "\u06CC\u0648 \u0622\u0631 \u0627\u06CC\u0644",
        emoji: "\u0627\u06CC\u0645\u0648\u062C\u06CC",
        uuid: "\u06CC\u0648 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC",
        uuidv4: "\u06CC\u0648 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC \u0648\u06CC 4",
        uuidv6: "\u06CC\u0648 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC \u0648\u06CC 6",
        nanoid: "\u0646\u06CC\u0646\u0648 \u0622\u0626\u06CC \u0688\u06CC",
        guid: "\u062C\u06CC \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC",
        cuid: "\u0633\u06CC \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC",
        cuid2: "\u0633\u06CC \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC 2",
        ulid: "\u06CC\u0648 \u0627\u06CC\u0644 \u0622\u0626\u06CC \u0688\u06CC",
        xid: "\u0627\u06CC\u06A9\u0633 \u0622\u0626\u06CC \u0688\u06CC",
        ksuid: "\u06A9\u06D2 \u0627\u06CC\u0633 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC",
        datetime: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u0688\u06CC\u0679 \u0679\u0627\u0626\u0645",
        date: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u062A\u0627\u0631\u06CC\u062E",
        time: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u0648\u0642\u062A",
        duration: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u0645\u062F\u062A",
        ipv4: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 4 \u0627\u06CC\u0688\u0631\u06CC\u0633",
        ipv6: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 6 \u0627\u06CC\u0688\u0631\u06CC\u0633",
        cidrv4: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 4 \u0631\u06CC\u0646\u062C",
        cidrv6: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 6 \u0631\u06CC\u0646\u062C",
        base64: "\u0628\u06CC\u0633 64 \u0627\u0646 \u06A9\u0648\u0688\u0688 \u0633\u0679\u0631\u0646\u06AF",
        base64url: "\u0628\u06CC\u0633 64 \u06CC\u0648 \u0622\u0631 \u0627\u06CC\u0644 \u0627\u0646 \u06A9\u0648\u0688\u0688 \u0633\u0679\u0631\u0646\u06AF",
        json_string: "\u062C\u06D2 \u0627\u06CC\u0633 \u0627\u0648 \u0627\u06CC\u0646 \u0633\u0679\u0631\u0646\u06AF",
        e164: "\u0627\u06CC 164 \u0646\u0645\u0628\u0631",
        jwt: "\u062C\u06D2 \u0688\u0628\u0644\u06CC\u0648 \u0679\u06CC",
        template_literal: "\u0627\u0646 \u067E\u0679"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679: ${issue2.expected} \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627\u060C ${parsedType8(issue2.input)} \u0645\u0648\u0635\u0648\u0644 \u06C1\u0648\u0627`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679: ${stringifyPrimitive(issue2.values[0])} \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
            return `\u063A\u0644\u0637 \u0622\u067E\u0634\u0646: ${joinValues(issue2.values, "|")} \u0645\u06CC\u06BA \u0633\u06D2 \u0627\u06CC\u06A9 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `\u0628\u06C1\u062A \u0628\u0691\u0627: ${issue2.origin ?? "\u0648\u06CC\u0644\u06CC\u0648"} \u06A9\u06D2 ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "\u0639\u0646\u0627\u0635\u0631"} \u06C1\u0648\u0646\u06D2 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u06D2`;
            return `\u0628\u06C1\u062A \u0628\u0691\u0627: ${issue2.origin ?? "\u0648\u06CC\u0644\u06CC\u0648"} \u06A9\u0627 ${adj}${issue2.maximum.toString()} \u06C1\u0648\u0646\u0627 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `\u0628\u06C1\u062A \u0686\u06BE\u0648\u0679\u0627: ${issue2.origin} \u06A9\u06D2 ${adj}${issue2.minimum.toString()} ${sizing.unit} \u06C1\u0648\u0646\u06D2 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u06D2`;
            }
            return `\u0628\u06C1\u062A \u0686\u06BE\u0648\u0679\u0627: ${issue2.origin} \u06A9\u0627 ${adj}${issue2.minimum.toString()} \u06C1\u0648\u0646\u0627 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with") {
              return `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: "${_issue.prefix}" \u0633\u06D2 \u0634\u0631\u0648\u0639 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
            }
            if (_issue.format === "ends_with")
              return `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: "${_issue.suffix}" \u067E\u0631 \u062E\u062A\u0645 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
            if (_issue.format === "includes")
              return `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: "${_issue.includes}" \u0634\u0627\u0645\u0644 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
            if (_issue.format === "regex")
              return `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: \u067E\u06CC\u0679\u0631\u0646 ${_issue.pattern} \u0633\u06D2 \u0645\u06CC\u0686 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
            return `\u063A\u0644\u0637 ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `\u063A\u0644\u0637 \u0646\u0645\u0628\u0631: ${issue2.divisor} \u06A9\u0627 \u0645\u0636\u0627\u0639\u0641 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
          case "unrecognized_keys":
            return `\u063A\u06CC\u0631 \u062A\u0633\u0644\u06CC\u0645 \u0634\u062F\u06C1 \u06A9\u06CC${issue2.keys.length > 1 ? "\u0632" : ""}: ${joinValues(issue2.keys, "\u060C ")}`;
          case "invalid_key":
            return `${issue2.origin} \u0645\u06CC\u06BA \u063A\u0644\u0637 \u06A9\u06CC`;
          case "invalid_union":
            return "\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679";
          case "invalid_element":
            return `${issue2.origin} \u0645\u06CC\u06BA \u063A\u0644\u0637 \u0648\u06CC\u0644\u06CC\u0648`;
          default:
            return `\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/vi.js
function vi_default() {
  return {
    localeError: error42()
  };
}
var error42;
var init_vi = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/vi.js"() {
    init_util();
    error42 = () => {
      const Sizable = {
        string: { unit: "k\xFD t\u1EF1", verb: "c\xF3" },
        file: { unit: "byte", verb: "c\xF3" },
        array: { unit: "ph\u1EA7n t\u1EED", verb: "c\xF3" },
        set: { unit: "ph\u1EA7n t\u1EED", verb: "c\xF3" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "s\u1ED1";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "m\u1EA3ng";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "\u0111\u1EA7u v\xE0o",
        email: "\u0111\u1ECBa ch\u1EC9 email",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ng\xE0y gi\u1EDD ISO",
        date: "ng\xE0y ISO",
        time: "gi\u1EDD ISO",
        duration: "kho\u1EA3ng th\u1EDDi gian ISO",
        ipv4: "\u0111\u1ECBa ch\u1EC9 IPv4",
        ipv6: "\u0111\u1ECBa ch\u1EC9 IPv6",
        cidrv4: "d\u1EA3i IPv4",
        cidrv6: "d\u1EA3i IPv6",
        base64: "chu\u1ED7i m\xE3 h\xF3a base64",
        base64url: "chu\u1ED7i m\xE3 h\xF3a base64url",
        json_string: "chu\u1ED7i JSON",
        e164: "s\u1ED1 E.164",
        jwt: "JWT",
        template_literal: "\u0111\u1EA7u v\xE0o"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i ${issue2.expected}, nh\u1EADn \u0111\u01B0\u1EE3c ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i ${stringifyPrimitive(issue2.values[0])}`;
            return `T\xF9y ch\u1ECDn kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i m\u1ED9t trong c\xE1c gi\xE1 tr\u1ECB ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `Qu\xE1 l\u1EDBn: mong \u0111\u1EE3i ${issue2.origin ?? "gi\xE1 tr\u1ECB"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "ph\u1EA7n t\u1EED"}`;
            return `Qu\xE1 l\u1EDBn: mong \u0111\u1EE3i ${issue2.origin ?? "gi\xE1 tr\u1ECB"} ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `Qu\xE1 nh\u1ECF: mong \u0111\u1EE3i ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `Qu\xE1 nh\u1ECF: mong \u0111\u1EE3i ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i b\u1EAFt \u0111\u1EA7u b\u1EB1ng "${_issue.prefix}"`;
            if (_issue.format === "ends_with")
              return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i k\u1EBFt th\xFAc b\u1EB1ng "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i bao g\u1ED3m "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i kh\u1EDBp v\u1EDBi m\u1EABu ${_issue.pattern}`;
            return `${Nouns[_issue.format] ?? issue2.format} kh\xF4ng h\u1EE3p l\u1EC7`;
          }
          case "not_multiple_of":
            return `S\u1ED1 kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i l\xE0 b\u1ED9i s\u1ED1 c\u1EE7a ${issue2.divisor}`;
          case "unrecognized_keys":
            return `Kh\xF3a kh\xF4ng \u0111\u01B0\u1EE3c nh\u1EADn d\u1EA1ng: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `Kh\xF3a kh\xF4ng h\u1EE3p l\u1EC7 trong ${issue2.origin}`;
          case "invalid_union":
            return "\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7";
          case "invalid_element":
            return `Gi\xE1 tr\u1ECB kh\xF4ng h\u1EE3p l\u1EC7 trong ${issue2.origin}`;
          default:
            return `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/zh-CN.js
function zh_CN_default() {
  return {
    localeError: error43()
  };
}
var error43;
var init_zh_CN = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/zh-CN.js"() {
    init_util();
    error43 = () => {
      const Sizable = {
        string: { unit: "\u5B57\u7B26", verb: "\u5305\u542B" },
        file: { unit: "\u5B57\u8282", verb: "\u5305\u542B" },
        array: { unit: "\u9879", verb: "\u5305\u542B" },
        set: { unit: "\u9879", verb: "\u5305\u542B" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "\u975E\u6570\u5B57(NaN)" : "\u6570\u5B57";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "\u6570\u7EC4";
            }
            if (data === null) {
              return "\u7A7A\u503C(null)";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "\u8F93\u5165",
        email: "\u7535\u5B50\u90AE\u4EF6",
        url: "URL",
        emoji: "\u8868\u60C5\u7B26\u53F7",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO\u65E5\u671F\u65F6\u95F4",
        date: "ISO\u65E5\u671F",
        time: "ISO\u65F6\u95F4",
        duration: "ISO\u65F6\u957F",
        ipv4: "IPv4\u5730\u5740",
        ipv6: "IPv6\u5730\u5740",
        cidrv4: "IPv4\u7F51\u6BB5",
        cidrv6: "IPv6\u7F51\u6BB5",
        base64: "base64\u7F16\u7801\u5B57\u7B26\u4E32",
        base64url: "base64url\u7F16\u7801\u5B57\u7B26\u4E32",
        json_string: "JSON\u5B57\u7B26\u4E32",
        e164: "E.164\u53F7\u7801",
        jwt: "JWT",
        template_literal: "\u8F93\u5165"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `\u65E0\u6548\u8F93\u5165\uFF1A\u671F\u671B ${issue2.expected}\uFF0C\u5B9E\u9645\u63A5\u6536 ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `\u65E0\u6548\u8F93\u5165\uFF1A\u671F\u671B ${stringifyPrimitive(issue2.values[0])}`;
            return `\u65E0\u6548\u9009\u9879\uFF1A\u671F\u671B\u4EE5\u4E0B\u4E4B\u4E00 ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `\u6570\u503C\u8FC7\u5927\uFF1A\u671F\u671B ${issue2.origin ?? "\u503C"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "\u4E2A\u5143\u7D20"}`;
            return `\u6570\u503C\u8FC7\u5927\uFF1A\u671F\u671B ${issue2.origin ?? "\u503C"} ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `\u6570\u503C\u8FC7\u5C0F\uFF1A\u671F\u671B ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `\u6570\u503C\u8FC7\u5C0F\uFF1A\u671F\u671B ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u4EE5 "${_issue.prefix}" \u5F00\u5934`;
            if (_issue.format === "ends_with")
              return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u4EE5 "${_issue.suffix}" \u7ED3\u5C3E`;
            if (_issue.format === "includes")
              return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u5305\u542B "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u6EE1\u8DB3\u6B63\u5219\u8868\u8FBE\u5F0F ${_issue.pattern}`;
            return `\u65E0\u6548${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `\u65E0\u6548\u6570\u5B57\uFF1A\u5FC5\u987B\u662F ${issue2.divisor} \u7684\u500D\u6570`;
          case "unrecognized_keys":
            return `\u51FA\u73B0\u672A\u77E5\u7684\u952E(key): ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `${issue2.origin} \u4E2D\u7684\u952E(key)\u65E0\u6548`;
          case "invalid_union":
            return "\u65E0\u6548\u8F93\u5165";
          case "invalid_element":
            return `${issue2.origin} \u4E2D\u5305\u542B\u65E0\u6548\u503C(value)`;
          default:
            return `\u65E0\u6548\u8F93\u5165`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/zh-TW.js
function zh_TW_default() {
  return {
    localeError: error44()
  };
}
var error44;
var init_zh_TW = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/zh-TW.js"() {
    init_util();
    error44 = () => {
      const Sizable = {
        string: { unit: "\u5B57\u5143", verb: "\u64C1\u6709" },
        file: { unit: "\u4F4D\u5143\u7D44", verb: "\u64C1\u6709" },
        array: { unit: "\u9805\u76EE", verb: "\u64C1\u6709" },
        set: { unit: "\u9805\u76EE", verb: "\u64C1\u6709" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "number";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "array";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "\u8F38\u5165",
        email: "\u90F5\u4EF6\u5730\u5740",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "ISO \u65E5\u671F\u6642\u9593",
        date: "ISO \u65E5\u671F",
        time: "ISO \u6642\u9593",
        duration: "ISO \u671F\u9593",
        ipv4: "IPv4 \u4F4D\u5740",
        ipv6: "IPv6 \u4F4D\u5740",
        cidrv4: "IPv4 \u7BC4\u570D",
        cidrv6: "IPv6 \u7BC4\u570D",
        base64: "base64 \u7DE8\u78BC\u5B57\u4E32",
        base64url: "base64url \u7DE8\u78BC\u5B57\u4E32",
        json_string: "JSON \u5B57\u4E32",
        e164: "E.164 \u6578\u503C",
        jwt: "JWT",
        template_literal: "\u8F38\u5165"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `\u7121\u6548\u7684\u8F38\u5165\u503C\uFF1A\u9810\u671F\u70BA ${issue2.expected}\uFF0C\u4F46\u6536\u5230 ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `\u7121\u6548\u7684\u8F38\u5165\u503C\uFF1A\u9810\u671F\u70BA ${stringifyPrimitive(issue2.values[0])}`;
            return `\u7121\u6548\u7684\u9078\u9805\uFF1A\u9810\u671F\u70BA\u4EE5\u4E0B\u5176\u4E2D\u4E4B\u4E00 ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `\u6578\u503C\u904E\u5927\uFF1A\u9810\u671F ${issue2.origin ?? "\u503C"} \u61C9\u70BA ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "\u500B\u5143\u7D20"}`;
            return `\u6578\u503C\u904E\u5927\uFF1A\u9810\u671F ${issue2.origin ?? "\u503C"} \u61C9\u70BA ${adj}${issue2.maximum.toString()}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing) {
              return `\u6578\u503C\u904E\u5C0F\uFF1A\u9810\u671F ${issue2.origin} \u61C9\u70BA ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
            }
            return `\u6578\u503C\u904E\u5C0F\uFF1A\u9810\u671F ${issue2.origin} \u61C9\u70BA ${adj}${issue2.minimum.toString()}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with") {
              return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u4EE5 "${_issue.prefix}" \u958B\u982D`;
            }
            if (_issue.format === "ends_with")
              return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u4EE5 "${_issue.suffix}" \u7D50\u5C3E`;
            if (_issue.format === "includes")
              return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u5305\u542B "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u7B26\u5408\u683C\u5F0F ${_issue.pattern}`;
            return `\u7121\u6548\u7684 ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `\u7121\u6548\u7684\u6578\u5B57\uFF1A\u5FC5\u9808\u70BA ${issue2.divisor} \u7684\u500D\u6578`;
          case "unrecognized_keys":
            return `\u7121\u6CD5\u8B58\u5225\u7684\u9375\u503C${issue2.keys.length > 1 ? "\u5011" : ""}\uFF1A${joinValues(issue2.keys, "\u3001")}`;
          case "invalid_key":
            return `${issue2.origin} \u4E2D\u6709\u7121\u6548\u7684\u9375\u503C`;
          case "invalid_union":
            return "\u7121\u6548\u7684\u8F38\u5165\u503C";
          case "invalid_element":
            return `${issue2.origin} \u4E2D\u6709\u7121\u6548\u7684\u503C`;
          default:
            return `\u7121\u6548\u7684\u8F38\u5165\u503C`;
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/yo.js
function yo_default() {
  return {
    localeError: error45()
  };
}
var error45;
var init_yo = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/yo.js"() {
    init_util();
    error45 = () => {
      const Sizable = {
        string: { unit: "\xE0mi", verb: "n\xED" },
        file: { unit: "bytes", verb: "n\xED" },
        array: { unit: "nkan", verb: "n\xED" },
        set: { unit: "nkan", verb: "n\xED" }
      };
      function getSizing(origin) {
        return Sizable[origin] ?? null;
      }
      const parsedType8 = (data) => {
        const t = typeof data;
        switch (t) {
          case "number": {
            return Number.isNaN(data) ? "NaN" : "n\u1ECD\u0301mb\xE0";
          }
          case "object": {
            if (Array.isArray(data)) {
              return "akop\u1ECD";
            }
            if (data === null) {
              return "null";
            }
            if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
              return data.constructor.name;
            }
          }
        }
        return t;
      };
      const Nouns = {
        regex: "\u1EB9\u0300r\u1ECD \xECb\xE1w\u1ECDl\xE9",
        email: "\xE0d\xEDr\u1EB9\u0301s\xEC \xECm\u1EB9\u0301l\xEC",
        url: "URL",
        emoji: "emoji",
        uuid: "UUID",
        uuidv4: "UUIDv4",
        uuidv6: "UUIDv6",
        nanoid: "nanoid",
        guid: "GUID",
        cuid: "cuid",
        cuid2: "cuid2",
        ulid: "ULID",
        xid: "XID",
        ksuid: "KSUID",
        datetime: "\xE0k\xF3k\xF2 ISO",
        date: "\u1ECDj\u1ECD\u0301 ISO",
        time: "\xE0k\xF3k\xF2 ISO",
        duration: "\xE0k\xF3k\xF2 t\xF3 p\xE9 ISO",
        ipv4: "\xE0d\xEDr\u1EB9\u0301s\xEC IPv4",
        ipv6: "\xE0d\xEDr\u1EB9\u0301s\xEC IPv6",
        cidrv4: "\xE0gb\xE8gb\xE8 IPv4",
        cidrv6: "\xE0gb\xE8gb\xE8 IPv6",
        base64: "\u1ECD\u0300r\u1ECD\u0300 t\xED a k\u1ECD\u0301 n\xED base64",
        base64url: "\u1ECD\u0300r\u1ECD\u0300 base64url",
        json_string: "\u1ECD\u0300r\u1ECD\u0300 JSON",
        e164: "n\u1ECD\u0301mb\xE0 E.164",
        jwt: "JWT",
        template_literal: "\u1EB9\u0300r\u1ECD \xECb\xE1w\u1ECDl\xE9"
      };
      return (issue2) => {
        switch (issue2.code) {
          case "invalid_type":
            return `\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e: a n\xED l\xE1ti fi ${issue2.expected}, \xE0m\u1ECD\u0300 a r\xED ${parsedType8(issue2.input)}`;
          case "invalid_value":
            if (issue2.values.length === 1)
              return `\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e: a n\xED l\xE1ti fi ${stringifyPrimitive(issue2.values[0])}`;
            return `\xC0\u1E63\xE0y\xE0n a\u1E63\xEC\u1E63e: yan \u1ECD\u0300kan l\xE1ra ${joinValues(issue2.values, "|")}`;
          case "too_big": {
            const adj = issue2.inclusive ? "<=" : "<";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `T\xF3 p\u1ECD\u0300 j\xF9: a n\xED l\xE1ti j\u1EB9\u0301 p\xE9 ${issue2.origin ?? "iye"} ${sizing.verb} ${adj}${issue2.maximum} ${sizing.unit}`;
            return `T\xF3 p\u1ECD\u0300 j\xF9: a n\xED l\xE1ti j\u1EB9\u0301 ${adj}${issue2.maximum}`;
          }
          case "too_small": {
            const adj = issue2.inclusive ? ">=" : ">";
            const sizing = getSizing(issue2.origin);
            if (sizing)
              return `K\xE9r\xE9 ju: a n\xED l\xE1ti j\u1EB9\u0301 p\xE9 ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum} ${sizing.unit}`;
            return `K\xE9r\xE9 ju: a n\xED l\xE1ti j\u1EB9\u0301 ${adj}${issue2.minimum}`;
          }
          case "invalid_format": {
            const _issue = issue2;
            if (_issue.format === "starts_with")
              return `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 b\u1EB9\u0300r\u1EB9\u0300 p\u1EB9\u0300l\xFA "${_issue.prefix}"`;
            if (_issue.format === "ends_with")
              return `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 par\xED p\u1EB9\u0300l\xFA "${_issue.suffix}"`;
            if (_issue.format === "includes")
              return `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 n\xED "${_issue.includes}"`;
            if (_issue.format === "regex")
              return `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 b\xE1 \xE0p\u1EB9\u1EB9r\u1EB9 mu ${_issue.pattern}`;
            return `A\u1E63\xEC\u1E63e: ${Nouns[_issue.format] ?? issue2.format}`;
          }
          case "not_multiple_of":
            return `N\u1ECD\u0301mb\xE0 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 j\u1EB9\u0301 \xE8y\xE0 p\xEDp\xEDn ti ${issue2.divisor}`;
          case "unrecognized_keys":
            return `B\u1ECDt\xECn\xEC \xE0\xECm\u1ECD\u0300: ${joinValues(issue2.keys, ", ")}`;
          case "invalid_key":
            return `B\u1ECDt\xECn\xEC a\u1E63\xEC\u1E63e n\xEDn\xFA ${issue2.origin}`;
          case "invalid_union":
            return "\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e";
          case "invalid_element":
            return `Iye a\u1E63\xEC\u1E63e n\xEDn\xFA ${issue2.origin}`;
          default:
            return "\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e";
        }
      };
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/locales/index.js
var locales_exports = {};
__export(locales_exports, {
  ar: () => ar_default,
  az: () => az_default,
  be: () => be_default,
  bg: () => bg_default,
  ca: () => ca_default,
  cs: () => cs_default,
  da: () => da_default,
  de: () => de_default,
  en: () => en_default,
  eo: () => eo_default,
  es: () => es_default,
  fa: () => fa_default,
  fi: () => fi_default,
  fr: () => fr_default,
  frCA: () => fr_CA_default,
  he: () => he_default,
  hu: () => hu_default,
  id: () => id_default,
  is: () => is_default,
  it: () => it_default,
  ja: () => ja_default,
  ka: () => ka_default,
  kh: () => kh_default,
  km: () => km_default,
  ko: () => ko_default,
  lt: () => lt_default,
  mk: () => mk_default,
  ms: () => ms_default,
  nl: () => nl_default,
  no: () => no_default,
  ota: () => ota_default,
  pl: () => pl_default,
  ps: () => ps_default,
  pt: () => pt_default,
  ru: () => ru_default,
  sl: () => sl_default,
  sv: () => sv_default,
  ta: () => ta_default,
  th: () => th_default,
  tr: () => tr_default,
  ua: () => ua_default,
  uk: () => uk_default,
  ur: () => ur_default,
  vi: () => vi_default,
  yo: () => yo_default,
  zhCN: () => zh_CN_default,
  zhTW: () => zh_TW_default
});
var init_locales = __esm({
  "../../packages/memory-client/node_modules/zod/v4/locales/index.js"() {
    init_ar();
    init_az();
    init_be();
    init_bg();
    init_ca();
    init_cs();
    init_da();
    init_de();
    init_en();
    init_eo();
    init_es();
    init_fa();
    init_fi();
    init_fr();
    init_fr_CA();
    init_he();
    init_hu();
    init_id();
    init_is();
    init_it();
    init_ja();
    init_ka();
    init_kh();
    init_km();
    init_ko();
    init_lt();
    init_mk();
    init_ms();
    init_nl();
    init_no();
    init_ota();
    init_ps();
    init_pl();
    init_pt();
    init_ru();
    init_sl();
    init_sv();
    init_ta();
    init_th();
    init_tr();
    init_ua();
    init_uk();
    init_ur();
    init_vi();
    init_zh_CN();
    init_zh_TW();
    init_yo();
  }
});

// ../../packages/memory-client/node_modules/zod/v4/core/registries.js
function registry() {
  return new $ZodRegistry();
}
var $output, $input, $ZodRegistry, globalRegistry;
var init_registries = __esm({
  "../../packages/memory-client/node_modules/zod/v4/core/registries.js"() {
    $output = /* @__PURE__ */ Symbol("ZodOutput");
    $input = /* @__PURE__ */ Symbol("ZodInput");
    $ZodRegistry = class {
      constructor() {
        this._map = /* @__PURE__ */ new WeakMap();
        this._idmap = /* @__PURE__ */ new Map();
      }
      add(schema, ..._meta) {
        const meta = _meta[0];
        this._map.set(schema, meta);
        if (meta && typeof meta === "object" && "id" in meta) {
          if (this._idmap.has(meta.id)) {
            throw new Error(`ID ${meta.id} already exists in the registry`);
          }
          this._idmap.set(meta.id, schema);
        }
        return this;
      }
      clear() {
        this._map = /* @__PURE__ */ new WeakMap();
        this._idmap = /* @__PURE__ */ new Map();
        return this;
      }
      remove(schema) {
        const meta = this._map.get(schema);
        if (meta && typeof meta === "object" && "id" in meta) {
          this._idmap.delete(meta.id);
        }
        this._map.delete(schema);
        return this;
      }
      get(schema) {
        const p = schema._zod.parent;
        if (p) {
          const pm = { ...this.get(p) ?? {} };
          delete pm.id;
          const f = { ...pm, ...this._map.get(schema) };
          return Object.keys(f).length ? f : void 0;
        }
        return this._map.get(schema);
      }
      has(schema) {
        return this._map.has(schema);
      }
    };
    globalRegistry = /* @__PURE__ */ registry();
  }
});

// ../../packages/memory-client/node_modules/zod/v4/core/api.js
function _string(Class2, params) {
  return new Class2({
    type: "string",
    ...normalizeParams(params)
  });
}
function _coercedString(Class2, params) {
  return new Class2({
    type: "string",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _email(Class2, params) {
  return new Class2({
    type: "string",
    format: "email",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _guid(Class2, params) {
  return new Class2({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _uuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _uuidv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v4",
    ...normalizeParams(params)
  });
}
function _uuidv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v6",
    ...normalizeParams(params)
  });
}
function _uuidv7(Class2, params) {
  return new Class2({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v7",
    ...normalizeParams(params)
  });
}
function _url(Class2, params) {
  return new Class2({
    type: "string",
    format: "url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _emoji2(Class2, params) {
  return new Class2({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _nanoid(Class2, params) {
  return new Class2({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cuid2(Class2, params) {
  return new Class2({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ulid(Class2, params) {
  return new Class2({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _xid(Class2, params) {
  return new Class2({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ksuid(Class2, params) {
  return new Class2({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ipv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _ipv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cidrv4(Class2, params) {
  return new Class2({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _cidrv6(Class2, params) {
  return new Class2({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _base64(Class2, params) {
  return new Class2({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _base64url(Class2, params) {
  return new Class2({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _e164(Class2, params) {
  return new Class2({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _jwt(Class2, params) {
  return new Class2({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
function _isoDateTime(Class2, params) {
  return new Class2({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: false,
    local: false,
    precision: null,
    ...normalizeParams(params)
  });
}
function _isoDate(Class2, params) {
  return new Class2({
    type: "string",
    format: "date",
    check: "string_format",
    ...normalizeParams(params)
  });
}
function _isoTime(Class2, params) {
  return new Class2({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...normalizeParams(params)
  });
}
function _isoDuration(Class2, params) {
  return new Class2({
    type: "string",
    format: "duration",
    check: "string_format",
    ...normalizeParams(params)
  });
}
function _number(Class2, params) {
  return new Class2({
    type: "number",
    checks: [],
    ...normalizeParams(params)
  });
}
function _coercedNumber(Class2, params) {
  return new Class2({
    type: "number",
    coerce: true,
    checks: [],
    ...normalizeParams(params)
  });
}
function _int(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "safeint",
    ...normalizeParams(params)
  });
}
function _float32(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "float32",
    ...normalizeParams(params)
  });
}
function _float64(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "float64",
    ...normalizeParams(params)
  });
}
function _int32(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "int32",
    ...normalizeParams(params)
  });
}
function _uint32(Class2, params) {
  return new Class2({
    type: "number",
    check: "number_format",
    abort: false,
    format: "uint32",
    ...normalizeParams(params)
  });
}
function _boolean(Class2, params) {
  return new Class2({
    type: "boolean",
    ...normalizeParams(params)
  });
}
function _coercedBoolean(Class2, params) {
  return new Class2({
    type: "boolean",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _bigint(Class2, params) {
  return new Class2({
    type: "bigint",
    ...normalizeParams(params)
  });
}
function _coercedBigint(Class2, params) {
  return new Class2({
    type: "bigint",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _int64(Class2, params) {
  return new Class2({
    type: "bigint",
    check: "bigint_format",
    abort: false,
    format: "int64",
    ...normalizeParams(params)
  });
}
function _uint64(Class2, params) {
  return new Class2({
    type: "bigint",
    check: "bigint_format",
    abort: false,
    format: "uint64",
    ...normalizeParams(params)
  });
}
function _symbol(Class2, params) {
  return new Class2({
    type: "symbol",
    ...normalizeParams(params)
  });
}
function _undefined2(Class2, params) {
  return new Class2({
    type: "undefined",
    ...normalizeParams(params)
  });
}
function _null2(Class2, params) {
  return new Class2({
    type: "null",
    ...normalizeParams(params)
  });
}
function _any(Class2) {
  return new Class2({
    type: "any"
  });
}
function _unknown(Class2) {
  return new Class2({
    type: "unknown"
  });
}
function _never(Class2, params) {
  return new Class2({
    type: "never",
    ...normalizeParams(params)
  });
}
function _void(Class2, params) {
  return new Class2({
    type: "void",
    ...normalizeParams(params)
  });
}
function _date(Class2, params) {
  return new Class2({
    type: "date",
    ...normalizeParams(params)
  });
}
function _coercedDate(Class2, params) {
  return new Class2({
    type: "date",
    coerce: true,
    ...normalizeParams(params)
  });
}
function _nan(Class2, params) {
  return new Class2({
    type: "nan",
    ...normalizeParams(params)
  });
}
function _lt(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
function _lte(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
function _gt(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
function _gte(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
function _positive(params) {
  return _gt(0, params);
}
function _negative(params) {
  return _lt(0, params);
}
function _nonpositive(params) {
  return _lte(0, params);
}
function _nonnegative(params) {
  return _gte(0, params);
}
function _multipleOf(value, params) {
  return new $ZodCheckMultipleOf({
    check: "multiple_of",
    ...normalizeParams(params),
    value
  });
}
function _maxSize(maximum, params) {
  return new $ZodCheckMaxSize({
    check: "max_size",
    ...normalizeParams(params),
    maximum
  });
}
function _minSize(minimum, params) {
  return new $ZodCheckMinSize({
    check: "min_size",
    ...normalizeParams(params),
    minimum
  });
}
function _size(size, params) {
  return new $ZodCheckSizeEquals({
    check: "size_equals",
    ...normalizeParams(params),
    size
  });
}
function _maxLength(maximum, params) {
  const ch = new $ZodCheckMaxLength({
    check: "max_length",
    ...normalizeParams(params),
    maximum
  });
  return ch;
}
function _minLength(minimum, params) {
  return new $ZodCheckMinLength({
    check: "min_length",
    ...normalizeParams(params),
    minimum
  });
}
function _length(length, params) {
  return new $ZodCheckLengthEquals({
    check: "length_equals",
    ...normalizeParams(params),
    length
  });
}
function _regex(pattern, params) {
  return new $ZodCheckRegex({
    check: "string_format",
    format: "regex",
    ...normalizeParams(params),
    pattern
  });
}
function _lowercase(params) {
  return new $ZodCheckLowerCase({
    check: "string_format",
    format: "lowercase",
    ...normalizeParams(params)
  });
}
function _uppercase(params) {
  return new $ZodCheckUpperCase({
    check: "string_format",
    format: "uppercase",
    ...normalizeParams(params)
  });
}
function _includes(includes, params) {
  return new $ZodCheckIncludes({
    check: "string_format",
    format: "includes",
    ...normalizeParams(params),
    includes
  });
}
function _startsWith(prefix, params) {
  return new $ZodCheckStartsWith({
    check: "string_format",
    format: "starts_with",
    ...normalizeParams(params),
    prefix
  });
}
function _endsWith(suffix, params) {
  return new $ZodCheckEndsWith({
    check: "string_format",
    format: "ends_with",
    ...normalizeParams(params),
    suffix
  });
}
function _property(property, schema, params) {
  return new $ZodCheckProperty({
    check: "property",
    property,
    schema,
    ...normalizeParams(params)
  });
}
function _mime(types, params) {
  return new $ZodCheckMimeType({
    check: "mime_type",
    mime: types,
    ...normalizeParams(params)
  });
}
function _overwrite(tx) {
  return new $ZodCheckOverwrite({
    check: "overwrite",
    tx
  });
}
function _normalize(form) {
  return _overwrite((input) => input.normalize(form));
}
function _trim() {
  return _overwrite((input) => input.trim());
}
function _toLowerCase() {
  return _overwrite((input) => input.toLowerCase());
}
function _toUpperCase() {
  return _overwrite((input) => input.toUpperCase());
}
function _array(Class2, element, params) {
  return new Class2({
    type: "array",
    element,
    // get element() {
    //   return element;
    // },
    ...normalizeParams(params)
  });
}
function _union(Class2, options, params) {
  return new Class2({
    type: "union",
    options,
    ...normalizeParams(params)
  });
}
function _discriminatedUnion(Class2, discriminator, options, params) {
  return new Class2({
    type: "union",
    options,
    discriminator,
    ...normalizeParams(params)
  });
}
function _intersection(Class2, left, right) {
  return new Class2({
    type: "intersection",
    left,
    right
  });
}
function _tuple(Class2, items, _paramsOrRest, _params) {
  const hasRest = _paramsOrRest instanceof $ZodType;
  const params = hasRest ? _params : _paramsOrRest;
  const rest = hasRest ? _paramsOrRest : null;
  return new Class2({
    type: "tuple",
    items,
    rest,
    ...normalizeParams(params)
  });
}
function _record(Class2, keyType, valueType, params) {
  return new Class2({
    type: "record",
    keyType,
    valueType,
    ...normalizeParams(params)
  });
}
function _map(Class2, keyType, valueType, params) {
  return new Class2({
    type: "map",
    keyType,
    valueType,
    ...normalizeParams(params)
  });
}
function _set(Class2, valueType, params) {
  return new Class2({
    type: "set",
    valueType,
    ...normalizeParams(params)
  });
}
function _enum(Class2, values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new Class2({
    type: "enum",
    entries,
    ...normalizeParams(params)
  });
}
function _nativeEnum(Class2, entries, params) {
  return new Class2({
    type: "enum",
    entries,
    ...normalizeParams(params)
  });
}
function _literal(Class2, value, params) {
  return new Class2({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...normalizeParams(params)
  });
}
function _file(Class2, params) {
  return new Class2({
    type: "file",
    ...normalizeParams(params)
  });
}
function _transform(Class2, fn) {
  return new Class2({
    type: "transform",
    transform: fn
  });
}
function _optional(Class2, innerType) {
  return new Class2({
    type: "optional",
    innerType
  });
}
function _nullable(Class2, innerType) {
  return new Class2({
    type: "nullable",
    innerType
  });
}
function _default(Class2, innerType, defaultValue) {
  return new Class2({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
function _nonoptional(Class2, innerType, params) {
  return new Class2({
    type: "nonoptional",
    innerType,
    ...normalizeParams(params)
  });
}
function _success(Class2, innerType) {
  return new Class2({
    type: "success",
    innerType
  });
}
function _catch(Class2, innerType, catchValue) {
  return new Class2({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
  });
}
function _pipe(Class2, in_, out) {
  return new Class2({
    type: "pipe",
    in: in_,
    out
  });
}
function _readonly(Class2, innerType) {
  return new Class2({
    type: "readonly",
    innerType
  });
}
function _templateLiteral(Class2, parts, params) {
  return new Class2({
    type: "template_literal",
    parts,
    ...normalizeParams(params)
  });
}
function _lazy(Class2, getter) {
  return new Class2({
    type: "lazy",
    getter
  });
}
function _promise(Class2, innerType) {
  return new Class2({
    type: "promise",
    innerType
  });
}
function _custom(Class2, fn, _params) {
  const norm = normalizeParams(_params);
  norm.abort ?? (norm.abort = true);
  const schema = new Class2({
    type: "custom",
    check: "custom",
    fn,
    ...norm
  });
  return schema;
}
function _refine(Class2, fn, _params) {
  const schema = new Class2({
    type: "custom",
    check: "custom",
    fn,
    ...normalizeParams(_params)
  });
  return schema;
}
function _superRefine(fn) {
  const ch = _check((payload) => {
    payload.addIssue = (issue2) => {
      if (typeof issue2 === "string") {
        payload.issues.push(issue(issue2, payload.value, ch._zod.def));
      } else {
        const _issue = issue2;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = ch);
        _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
        payload.issues.push(issue(_issue));
      }
    };
    return fn(payload.value, payload);
  });
  return ch;
}
function _check(fn, params) {
  const ch = new $ZodCheck({
    check: "custom",
    ...normalizeParams(params)
  });
  ch._zod.check = fn;
  return ch;
}
function _stringbool(Classes, _params) {
  const params = normalizeParams(_params);
  let truthyArray = params.truthy ?? ["true", "1", "yes", "on", "y", "enabled"];
  let falsyArray = params.falsy ?? ["false", "0", "no", "off", "n", "disabled"];
  if (params.case !== "sensitive") {
    truthyArray = truthyArray.map((v) => typeof v === "string" ? v.toLowerCase() : v);
    falsyArray = falsyArray.map((v) => typeof v === "string" ? v.toLowerCase() : v);
  }
  const truthySet = new Set(truthyArray);
  const falsySet = new Set(falsyArray);
  const _Codec = Classes.Codec ?? $ZodCodec;
  const _Boolean = Classes.Boolean ?? $ZodBoolean;
  const _String = Classes.String ?? $ZodString;
  const stringSchema = new _String({ type: "string", error: params.error });
  const booleanSchema = new _Boolean({ type: "boolean", error: params.error });
  const codec2 = new _Codec({
    type: "pipe",
    in: stringSchema,
    out: booleanSchema,
    transform: ((input, payload) => {
      let data = input;
      if (params.case !== "sensitive")
        data = data.toLowerCase();
      if (truthySet.has(data)) {
        return true;
      } else if (falsySet.has(data)) {
        return false;
      } else {
        payload.issues.push({
          code: "invalid_value",
          expected: "stringbool",
          values: [...truthySet, ...falsySet],
          input: payload.value,
          inst: codec2,
          continue: false
        });
        return {};
      }
    }),
    reverseTransform: ((input, _payload) => {
      if (input === true) {
        return truthyArray[0] || "true";
      } else {
        return falsyArray[0] || "false";
      }
    }),
    error: params.error
  });
  return codec2;
}
function _stringFormat(Class2, format, fnOrRegex, _params = {}) {
  const params = normalizeParams(_params);
  const def = {
    ...normalizeParams(_params),
    check: "string_format",
    type: "string",
    format,
    fn: typeof fnOrRegex === "function" ? fnOrRegex : (val) => fnOrRegex.test(val),
    ...params
  };
  if (fnOrRegex instanceof RegExp) {
    def.pattern = fnOrRegex;
  }
  const inst = new Class2(def);
  return inst;
}
var TimePrecision;
var init_api = __esm({
  "../../packages/memory-client/node_modules/zod/v4/core/api.js"() {
    init_checks();
    init_schemas();
    init_util();
    TimePrecision = {
      Any: null,
      Minute: -1,
      Second: 0,
      Millisecond: 3,
      Microsecond: 6
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/core/to-json-schema.js
function toJSONSchema(input, _params) {
  if (input instanceof $ZodRegistry) {
    const gen2 = new JSONSchemaGenerator(_params);
    const defs = {};
    for (const entry of input._idmap.entries()) {
      const [_, schema] = entry;
      gen2.process(schema);
    }
    const schemas = {};
    const external = {
      registry: input,
      uri: _params?.uri,
      defs
    };
    for (const entry of input._idmap.entries()) {
      const [key, schema] = entry;
      schemas[key] = gen2.emit(schema, {
        ..._params,
        external
      });
    }
    if (Object.keys(defs).length > 0) {
      const defsSegment = gen2.target === "draft-2020-12" ? "$defs" : "definitions";
      schemas.__shared = {
        [defsSegment]: defs
      };
    }
    return { schemas };
  }
  const gen = new JSONSchemaGenerator(_params);
  gen.process(input);
  return gen.emit(input, _params);
}
function isTransforming(_schema, _ctx) {
  const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
  if (ctx.seen.has(_schema))
    return false;
  ctx.seen.add(_schema);
  const schema = _schema;
  const def = schema._zod.def;
  switch (def.type) {
    case "string":
    case "number":
    case "bigint":
    case "boolean":
    case "date":
    case "symbol":
    case "undefined":
    case "null":
    case "any":
    case "unknown":
    case "never":
    case "void":
    case "literal":
    case "enum":
    case "nan":
    case "file":
    case "template_literal":
      return false;
    case "array": {
      return isTransforming(def.element, ctx);
    }
    case "object": {
      for (const key in def.shape) {
        if (isTransforming(def.shape[key], ctx))
          return true;
      }
      return false;
    }
    case "union": {
      for (const option of def.options) {
        if (isTransforming(option, ctx))
          return true;
      }
      return false;
    }
    case "intersection": {
      return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
    }
    case "tuple": {
      for (const item of def.items) {
        if (isTransforming(item, ctx))
          return true;
      }
      if (def.rest && isTransforming(def.rest, ctx))
        return true;
      return false;
    }
    case "record": {
      return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
    }
    case "map": {
      return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
    }
    case "set": {
      return isTransforming(def.valueType, ctx);
    }
    // inner types
    case "promise":
    case "optional":
    case "nonoptional":
    case "nullable":
    case "readonly":
      return isTransforming(def.innerType, ctx);
    case "lazy":
      return isTransforming(def.getter(), ctx);
    case "default": {
      return isTransforming(def.innerType, ctx);
    }
    case "prefault": {
      return isTransforming(def.innerType, ctx);
    }
    case "custom": {
      return false;
    }
    case "transform": {
      return true;
    }
    case "pipe": {
      return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
    }
    case "success": {
      return false;
    }
    case "catch": {
      return false;
    }
    case "function": {
      return false;
    }
    default:
      def;
  }
  throw new Error(`Unknown schema type: ${def.type}`);
}
var JSONSchemaGenerator;
var init_to_json_schema = __esm({
  "../../packages/memory-client/node_modules/zod/v4/core/to-json-schema.js"() {
    init_registries();
    init_util();
    JSONSchemaGenerator = class {
      constructor(params) {
        this.counter = 0;
        this.metadataRegistry = params?.metadata ?? globalRegistry;
        this.target = params?.target ?? "draft-2020-12";
        this.unrepresentable = params?.unrepresentable ?? "throw";
        this.override = params?.override ?? (() => {
        });
        this.io = params?.io ?? "output";
        this.seen = /* @__PURE__ */ new Map();
      }
      process(schema, _params = { path: [], schemaPath: [] }) {
        var _a;
        const def = schema._zod.def;
        const formatMap = {
          guid: "uuid",
          url: "uri",
          datetime: "date-time",
          json_string: "json-string",
          regex: ""
          // do not set
        };
        const seen = this.seen.get(schema);
        if (seen) {
          seen.count++;
          const isCycle = _params.schemaPath.includes(schema);
          if (isCycle) {
            seen.cycle = _params.path;
          }
          return seen.schema;
        }
        const result = { schema: {}, count: 1, cycle: void 0, path: _params.path };
        this.seen.set(schema, result);
        const overrideSchema = schema._zod.toJSONSchema?.();
        if (overrideSchema) {
          result.schema = overrideSchema;
        } else {
          const params = {
            ..._params,
            schemaPath: [..._params.schemaPath, schema],
            path: _params.path
          };
          const parent = schema._zod.parent;
          if (parent) {
            result.ref = parent;
            this.process(parent, params);
            this.seen.get(parent).isParent = true;
          } else {
            const _json = result.schema;
            switch (def.type) {
              case "string": {
                const json2 = _json;
                json2.type = "string";
                const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
                if (typeof minimum === "number")
                  json2.minLength = minimum;
                if (typeof maximum === "number")
                  json2.maxLength = maximum;
                if (format) {
                  json2.format = formatMap[format] ?? format;
                  if (json2.format === "")
                    delete json2.format;
                }
                if (contentEncoding)
                  json2.contentEncoding = contentEncoding;
                if (patterns && patterns.size > 0) {
                  const regexes = [...patterns];
                  if (regexes.length === 1)
                    json2.pattern = regexes[0].source;
                  else if (regexes.length > 1) {
                    result.schema.allOf = [
                      ...regexes.map((regex) => ({
                        ...this.target === "draft-7" || this.target === "draft-4" || this.target === "openapi-3.0" ? { type: "string" } : {},
                        pattern: regex.source
                      }))
                    ];
                  }
                }
                break;
              }
              case "number": {
                const json2 = _json;
                const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
                if (typeof format === "string" && format.includes("int"))
                  json2.type = "integer";
                else
                  json2.type = "number";
                if (typeof exclusiveMinimum === "number") {
                  if (this.target === "draft-4" || this.target === "openapi-3.0") {
                    json2.minimum = exclusiveMinimum;
                    json2.exclusiveMinimum = true;
                  } else {
                    json2.exclusiveMinimum = exclusiveMinimum;
                  }
                }
                if (typeof minimum === "number") {
                  json2.minimum = minimum;
                  if (typeof exclusiveMinimum === "number" && this.target !== "draft-4") {
                    if (exclusiveMinimum >= minimum)
                      delete json2.minimum;
                    else
                      delete json2.exclusiveMinimum;
                  }
                }
                if (typeof exclusiveMaximum === "number") {
                  if (this.target === "draft-4" || this.target === "openapi-3.0") {
                    json2.maximum = exclusiveMaximum;
                    json2.exclusiveMaximum = true;
                  } else {
                    json2.exclusiveMaximum = exclusiveMaximum;
                  }
                }
                if (typeof maximum === "number") {
                  json2.maximum = maximum;
                  if (typeof exclusiveMaximum === "number" && this.target !== "draft-4") {
                    if (exclusiveMaximum <= maximum)
                      delete json2.maximum;
                    else
                      delete json2.exclusiveMaximum;
                  }
                }
                if (typeof multipleOf === "number")
                  json2.multipleOf = multipleOf;
                break;
              }
              case "boolean": {
                const json2 = _json;
                json2.type = "boolean";
                break;
              }
              case "bigint": {
                if (this.unrepresentable === "throw") {
                  throw new Error("BigInt cannot be represented in JSON Schema");
                }
                break;
              }
              case "symbol": {
                if (this.unrepresentable === "throw") {
                  throw new Error("Symbols cannot be represented in JSON Schema");
                }
                break;
              }
              case "null": {
                if (this.target === "openapi-3.0") {
                  _json.type = "string";
                  _json.nullable = true;
                  _json.enum = [null];
                } else
                  _json.type = "null";
                break;
              }
              case "any": {
                break;
              }
              case "unknown": {
                break;
              }
              case "undefined": {
                if (this.unrepresentable === "throw") {
                  throw new Error("Undefined cannot be represented in JSON Schema");
                }
                break;
              }
              case "void": {
                if (this.unrepresentable === "throw") {
                  throw new Error("Void cannot be represented in JSON Schema");
                }
                break;
              }
              case "never": {
                _json.not = {};
                break;
              }
              case "date": {
                if (this.unrepresentable === "throw") {
                  throw new Error("Date cannot be represented in JSON Schema");
                }
                break;
              }
              case "array": {
                const json2 = _json;
                const { minimum, maximum } = schema._zod.bag;
                if (typeof minimum === "number")
                  json2.minItems = minimum;
                if (typeof maximum === "number")
                  json2.maxItems = maximum;
                json2.type = "array";
                json2.items = this.process(def.element, { ...params, path: [...params.path, "items"] });
                break;
              }
              case "object": {
                const json2 = _json;
                json2.type = "object";
                json2.properties = {};
                const shape = def.shape;
                for (const key in shape) {
                  json2.properties[key] = this.process(shape[key], {
                    ...params,
                    path: [...params.path, "properties", key]
                  });
                }
                const allKeys = new Set(Object.keys(shape));
                const requiredKeys = new Set([...allKeys].filter((key) => {
                  const v = def.shape[key]._zod;
                  if (this.io === "input") {
                    return v.optin === void 0;
                  } else {
                    return v.optout === void 0;
                  }
                }));
                if (requiredKeys.size > 0) {
                  json2.required = Array.from(requiredKeys);
                }
                if (def.catchall?._zod.def.type === "never") {
                  json2.additionalProperties = false;
                } else if (!def.catchall) {
                  if (this.io === "output")
                    json2.additionalProperties = false;
                } else if (def.catchall) {
                  json2.additionalProperties = this.process(def.catchall, {
                    ...params,
                    path: [...params.path, "additionalProperties"]
                  });
                }
                break;
              }
              case "union": {
                const json2 = _json;
                const options = def.options.map((x, i) => this.process(x, {
                  ...params,
                  path: [...params.path, "anyOf", i]
                }));
                json2.anyOf = options;
                break;
              }
              case "intersection": {
                const json2 = _json;
                const a = this.process(def.left, {
                  ...params,
                  path: [...params.path, "allOf", 0]
                });
                const b = this.process(def.right, {
                  ...params,
                  path: [...params.path, "allOf", 1]
                });
                const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
                const allOf = [
                  ...isSimpleIntersection(a) ? a.allOf : [a],
                  ...isSimpleIntersection(b) ? b.allOf : [b]
                ];
                json2.allOf = allOf;
                break;
              }
              case "tuple": {
                const json2 = _json;
                json2.type = "array";
                const prefixPath = this.target === "draft-2020-12" ? "prefixItems" : "items";
                const restPath = this.target === "draft-2020-12" ? "items" : this.target === "openapi-3.0" ? "items" : "additionalItems";
                const prefixItems = def.items.map((x, i) => this.process(x, {
                  ...params,
                  path: [...params.path, prefixPath, i]
                }));
                const rest = def.rest ? this.process(def.rest, {
                  ...params,
                  path: [...params.path, restPath, ...this.target === "openapi-3.0" ? [def.items.length] : []]
                }) : null;
                if (this.target === "draft-2020-12") {
                  json2.prefixItems = prefixItems;
                  if (rest) {
                    json2.items = rest;
                  }
                } else if (this.target === "openapi-3.0") {
                  json2.items = {
                    anyOf: prefixItems
                  };
                  if (rest) {
                    json2.items.anyOf.push(rest);
                  }
                  json2.minItems = prefixItems.length;
                  if (!rest) {
                    json2.maxItems = prefixItems.length;
                  }
                } else {
                  json2.items = prefixItems;
                  if (rest) {
                    json2.additionalItems = rest;
                  }
                }
                const { minimum, maximum } = schema._zod.bag;
                if (typeof minimum === "number")
                  json2.minItems = minimum;
                if (typeof maximum === "number")
                  json2.maxItems = maximum;
                break;
              }
              case "record": {
                const json2 = _json;
                json2.type = "object";
                if (this.target === "draft-7" || this.target === "draft-2020-12") {
                  json2.propertyNames = this.process(def.keyType, {
                    ...params,
                    path: [...params.path, "propertyNames"]
                  });
                }
                json2.additionalProperties = this.process(def.valueType, {
                  ...params,
                  path: [...params.path, "additionalProperties"]
                });
                break;
              }
              case "map": {
                if (this.unrepresentable === "throw") {
                  throw new Error("Map cannot be represented in JSON Schema");
                }
                break;
              }
              case "set": {
                if (this.unrepresentable === "throw") {
                  throw new Error("Set cannot be represented in JSON Schema");
                }
                break;
              }
              case "enum": {
                const json2 = _json;
                const values = getEnumValues(def.entries);
                if (values.every((v) => typeof v === "number"))
                  json2.type = "number";
                if (values.every((v) => typeof v === "string"))
                  json2.type = "string";
                json2.enum = values;
                break;
              }
              case "literal": {
                const json2 = _json;
                const vals = [];
                for (const val of def.values) {
                  if (val === void 0) {
                    if (this.unrepresentable === "throw") {
                      throw new Error("Literal `undefined` cannot be represented in JSON Schema");
                    } else {
                    }
                  } else if (typeof val === "bigint") {
                    if (this.unrepresentable === "throw") {
                      throw new Error("BigInt literals cannot be represented in JSON Schema");
                    } else {
                      vals.push(Number(val));
                    }
                  } else {
                    vals.push(val);
                  }
                }
                if (vals.length === 0) {
                } else if (vals.length === 1) {
                  const val = vals[0];
                  json2.type = val === null ? "null" : typeof val;
                  if (this.target === "draft-4" || this.target === "openapi-3.0") {
                    json2.enum = [val];
                  } else {
                    json2.const = val;
                  }
                } else {
                  if (vals.every((v) => typeof v === "number"))
                    json2.type = "number";
                  if (vals.every((v) => typeof v === "string"))
                    json2.type = "string";
                  if (vals.every((v) => typeof v === "boolean"))
                    json2.type = "string";
                  if (vals.every((v) => v === null))
                    json2.type = "null";
                  json2.enum = vals;
                }
                break;
              }
              case "file": {
                const json2 = _json;
                const file2 = {
                  type: "string",
                  format: "binary",
                  contentEncoding: "binary"
                };
                const { minimum, maximum, mime } = schema._zod.bag;
                if (minimum !== void 0)
                  file2.minLength = minimum;
                if (maximum !== void 0)
                  file2.maxLength = maximum;
                if (mime) {
                  if (mime.length === 1) {
                    file2.contentMediaType = mime[0];
                    Object.assign(json2, file2);
                  } else {
                    json2.anyOf = mime.map((m) => {
                      const mFile = { ...file2, contentMediaType: m };
                      return mFile;
                    });
                  }
                } else {
                  Object.assign(json2, file2);
                }
                break;
              }
              case "transform": {
                if (this.unrepresentable === "throw") {
                  throw new Error("Transforms cannot be represented in JSON Schema");
                }
                break;
              }
              case "nullable": {
                const inner = this.process(def.innerType, params);
                if (this.target === "openapi-3.0") {
                  result.ref = def.innerType;
                  _json.nullable = true;
                } else {
                  _json.anyOf = [inner, { type: "null" }];
                }
                break;
              }
              case "nonoptional": {
                this.process(def.innerType, params);
                result.ref = def.innerType;
                break;
              }
              case "success": {
                const json2 = _json;
                json2.type = "boolean";
                break;
              }
              case "default": {
                this.process(def.innerType, params);
                result.ref = def.innerType;
                _json.default = JSON.parse(JSON.stringify(def.defaultValue));
                break;
              }
              case "prefault": {
                this.process(def.innerType, params);
                result.ref = def.innerType;
                if (this.io === "input")
                  _json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
                break;
              }
              case "catch": {
                this.process(def.innerType, params);
                result.ref = def.innerType;
                let catchValue;
                try {
                  catchValue = def.catchValue(void 0);
                } catch {
                  throw new Error("Dynamic catch values are not supported in JSON Schema");
                }
                _json.default = catchValue;
                break;
              }
              case "nan": {
                if (this.unrepresentable === "throw") {
                  throw new Error("NaN cannot be represented in JSON Schema");
                }
                break;
              }
              case "template_literal": {
                const json2 = _json;
                const pattern = schema._zod.pattern;
                if (!pattern)
                  throw new Error("Pattern not found in template literal");
                json2.type = "string";
                json2.pattern = pattern.source;
                break;
              }
              case "pipe": {
                const innerType = this.io === "input" ? def.in._zod.def.type === "transform" ? def.out : def.in : def.out;
                this.process(innerType, params);
                result.ref = innerType;
                break;
              }
              case "readonly": {
                this.process(def.innerType, params);
                result.ref = def.innerType;
                _json.readOnly = true;
                break;
              }
              // passthrough types
              case "promise": {
                this.process(def.innerType, params);
                result.ref = def.innerType;
                break;
              }
              case "optional": {
                this.process(def.innerType, params);
                result.ref = def.innerType;
                break;
              }
              case "lazy": {
                const innerType = schema._zod.innerType;
                this.process(innerType, params);
                result.ref = innerType;
                break;
              }
              case "custom": {
                if (this.unrepresentable === "throw") {
                  throw new Error("Custom types cannot be represented in JSON Schema");
                }
                break;
              }
              case "function": {
                if (this.unrepresentable === "throw") {
                  throw new Error("Function types cannot be represented in JSON Schema");
                }
                break;
              }
              default: {
                def;
              }
            }
          }
        }
        const meta = this.metadataRegistry.get(schema);
        if (meta)
          Object.assign(result.schema, meta);
        if (this.io === "input" && isTransforming(schema)) {
          delete result.schema.examples;
          delete result.schema.default;
        }
        if (this.io === "input" && result.schema._prefault)
          (_a = result.schema).default ?? (_a.default = result.schema._prefault);
        delete result.schema._prefault;
        const _result = this.seen.get(schema);
        return _result.schema;
      }
      emit(schema, _params) {
        const params = {
          cycles: _params?.cycles ?? "ref",
          reused: _params?.reused ?? "inline",
          // unrepresentable: _params?.unrepresentable ?? "throw",
          // uri: _params?.uri ?? ((id) => `${id}`),
          external: _params?.external ?? void 0
        };
        const root = this.seen.get(schema);
        if (!root)
          throw new Error("Unprocessed schema. This is a bug in Zod.");
        const makeURI = (entry) => {
          const defsSegment = this.target === "draft-2020-12" ? "$defs" : "definitions";
          if (params.external) {
            const externalId = params.external.registry.get(entry[0])?.id;
            const uriGenerator = params.external.uri ?? ((id2) => id2);
            if (externalId) {
              return { ref: uriGenerator(externalId) };
            }
            const id = entry[1].defId ?? entry[1].schema.id ?? `schema${this.counter++}`;
            entry[1].defId = id;
            return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}` };
          }
          if (entry[1] === root) {
            return { ref: "#" };
          }
          const uriPrefix = `#`;
          const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
          const defId = entry[1].schema.id ?? `__schema${this.counter++}`;
          return { defId, ref: defUriPrefix + defId };
        };
        const extractToDef = (entry) => {
          if (entry[1].schema.$ref) {
            return;
          }
          const seen = entry[1];
          const { ref, defId } = makeURI(entry);
          seen.def = { ...seen.schema };
          if (defId)
            seen.defId = defId;
          const schema2 = seen.schema;
          for (const key in schema2) {
            delete schema2[key];
          }
          schema2.$ref = ref;
        };
        if (params.cycles === "throw") {
          for (const entry of this.seen.entries()) {
            const seen = entry[1];
            if (seen.cycle) {
              throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
            }
          }
        }
        for (const entry of this.seen.entries()) {
          const seen = entry[1];
          if (schema === entry[0]) {
            extractToDef(entry);
            continue;
          }
          if (params.external) {
            const ext = params.external.registry.get(entry[0])?.id;
            if (schema !== entry[0] && ext) {
              extractToDef(entry);
              continue;
            }
          }
          const id = this.metadataRegistry.get(entry[0])?.id;
          if (id) {
            extractToDef(entry);
            continue;
          }
          if (seen.cycle) {
            extractToDef(entry);
            continue;
          }
          if (seen.count > 1) {
            if (params.reused === "ref") {
              extractToDef(entry);
              continue;
            }
          }
        }
        const flattenRef = (zodSchema, params2) => {
          const seen = this.seen.get(zodSchema);
          const schema2 = seen.def ?? seen.schema;
          const _cached = { ...schema2 };
          if (seen.ref === null) {
            return;
          }
          const ref = seen.ref;
          seen.ref = null;
          if (ref) {
            flattenRef(ref, params2);
            const refSchema = this.seen.get(ref).schema;
            if (refSchema.$ref && (params2.target === "draft-7" || params2.target === "draft-4" || params2.target === "openapi-3.0")) {
              schema2.allOf = schema2.allOf ?? [];
              schema2.allOf.push(refSchema);
            } else {
              Object.assign(schema2, refSchema);
              Object.assign(schema2, _cached);
            }
          }
          if (!seen.isParent)
            this.override({
              zodSchema,
              jsonSchema: schema2,
              path: seen.path ?? []
            });
        };
        for (const entry of [...this.seen.entries()].reverse()) {
          flattenRef(entry[0], { target: this.target });
        }
        const result = {};
        if (this.target === "draft-2020-12") {
          result.$schema = "https://json-schema.org/draft/2020-12/schema";
        } else if (this.target === "draft-7") {
          result.$schema = "http://json-schema.org/draft-07/schema#";
        } else if (this.target === "draft-4") {
          result.$schema = "http://json-schema.org/draft-04/schema#";
        } else if (this.target === "openapi-3.0") {
        } else {
          console.warn(`Invalid target: ${this.target}`);
        }
        if (params.external?.uri) {
          const id = params.external.registry.get(schema)?.id;
          if (!id)
            throw new Error("Schema is missing an `id` property");
          result.$id = params.external.uri(id);
        }
        Object.assign(result, root.def);
        const defs = params.external?.defs ?? {};
        for (const entry of this.seen.entries()) {
          const seen = entry[1];
          if (seen.def && seen.defId) {
            defs[seen.defId] = seen.def;
          }
        }
        if (params.external) {
        } else {
          if (Object.keys(defs).length > 0) {
            if (this.target === "draft-2020-12") {
              result.$defs = defs;
            } else {
              result.definitions = defs;
            }
          }
        }
        try {
          return JSON.parse(JSON.stringify(result));
        } catch (_err) {
          throw new Error("Error converting schema to JSON.");
        }
      }
    };
  }
});

// ../../packages/memory-client/node_modules/zod/v4/core/json-schema.js
var json_schema_exports = {};
var init_json_schema = __esm({
  "../../packages/memory-client/node_modules/zod/v4/core/json-schema.js"() {
  }
});

// ../../packages/memory-client/node_modules/zod/v4/core/index.js
var core_exports2 = {};
__export(core_exports2, {
  $ZodAny: () => $ZodAny,
  $ZodArray: () => $ZodArray,
  $ZodAsyncError: () => $ZodAsyncError,
  $ZodBase64: () => $ZodBase64,
  $ZodBase64URL: () => $ZodBase64URL,
  $ZodBigInt: () => $ZodBigInt,
  $ZodBigIntFormat: () => $ZodBigIntFormat,
  $ZodBoolean: () => $ZodBoolean,
  $ZodCIDRv4: () => $ZodCIDRv4,
  $ZodCIDRv6: () => $ZodCIDRv6,
  $ZodCUID: () => $ZodCUID,
  $ZodCUID2: () => $ZodCUID2,
  $ZodCatch: () => $ZodCatch,
  $ZodCheck: () => $ZodCheck,
  $ZodCheckBigIntFormat: () => $ZodCheckBigIntFormat,
  $ZodCheckEndsWith: () => $ZodCheckEndsWith,
  $ZodCheckGreaterThan: () => $ZodCheckGreaterThan,
  $ZodCheckIncludes: () => $ZodCheckIncludes,
  $ZodCheckLengthEquals: () => $ZodCheckLengthEquals,
  $ZodCheckLessThan: () => $ZodCheckLessThan,
  $ZodCheckLowerCase: () => $ZodCheckLowerCase,
  $ZodCheckMaxLength: () => $ZodCheckMaxLength,
  $ZodCheckMaxSize: () => $ZodCheckMaxSize,
  $ZodCheckMimeType: () => $ZodCheckMimeType,
  $ZodCheckMinLength: () => $ZodCheckMinLength,
  $ZodCheckMinSize: () => $ZodCheckMinSize,
  $ZodCheckMultipleOf: () => $ZodCheckMultipleOf,
  $ZodCheckNumberFormat: () => $ZodCheckNumberFormat,
  $ZodCheckOverwrite: () => $ZodCheckOverwrite,
  $ZodCheckProperty: () => $ZodCheckProperty,
  $ZodCheckRegex: () => $ZodCheckRegex,
  $ZodCheckSizeEquals: () => $ZodCheckSizeEquals,
  $ZodCheckStartsWith: () => $ZodCheckStartsWith,
  $ZodCheckStringFormat: () => $ZodCheckStringFormat,
  $ZodCheckUpperCase: () => $ZodCheckUpperCase,
  $ZodCodec: () => $ZodCodec,
  $ZodCustom: () => $ZodCustom,
  $ZodCustomStringFormat: () => $ZodCustomStringFormat,
  $ZodDate: () => $ZodDate,
  $ZodDefault: () => $ZodDefault,
  $ZodDiscriminatedUnion: () => $ZodDiscriminatedUnion,
  $ZodE164: () => $ZodE164,
  $ZodEmail: () => $ZodEmail,
  $ZodEmoji: () => $ZodEmoji,
  $ZodEncodeError: () => $ZodEncodeError,
  $ZodEnum: () => $ZodEnum,
  $ZodError: () => $ZodError,
  $ZodFile: () => $ZodFile,
  $ZodFunction: () => $ZodFunction,
  $ZodGUID: () => $ZodGUID,
  $ZodIPv4: () => $ZodIPv4,
  $ZodIPv6: () => $ZodIPv6,
  $ZodISODate: () => $ZodISODate,
  $ZodISODateTime: () => $ZodISODateTime,
  $ZodISODuration: () => $ZodISODuration,
  $ZodISOTime: () => $ZodISOTime,
  $ZodIntersection: () => $ZodIntersection,
  $ZodJWT: () => $ZodJWT,
  $ZodKSUID: () => $ZodKSUID,
  $ZodLazy: () => $ZodLazy,
  $ZodLiteral: () => $ZodLiteral,
  $ZodMap: () => $ZodMap,
  $ZodNaN: () => $ZodNaN,
  $ZodNanoID: () => $ZodNanoID,
  $ZodNever: () => $ZodNever,
  $ZodNonOptional: () => $ZodNonOptional,
  $ZodNull: () => $ZodNull,
  $ZodNullable: () => $ZodNullable,
  $ZodNumber: () => $ZodNumber,
  $ZodNumberFormat: () => $ZodNumberFormat,
  $ZodObject: () => $ZodObject,
  $ZodObjectJIT: () => $ZodObjectJIT,
  $ZodOptional: () => $ZodOptional,
  $ZodPipe: () => $ZodPipe,
  $ZodPrefault: () => $ZodPrefault,
  $ZodPromise: () => $ZodPromise,
  $ZodReadonly: () => $ZodReadonly,
  $ZodRealError: () => $ZodRealError,
  $ZodRecord: () => $ZodRecord,
  $ZodRegistry: () => $ZodRegistry,
  $ZodSet: () => $ZodSet,
  $ZodString: () => $ZodString,
  $ZodStringFormat: () => $ZodStringFormat,
  $ZodSuccess: () => $ZodSuccess,
  $ZodSymbol: () => $ZodSymbol,
  $ZodTemplateLiteral: () => $ZodTemplateLiteral,
  $ZodTransform: () => $ZodTransform,
  $ZodTuple: () => $ZodTuple,
  $ZodType: () => $ZodType,
  $ZodULID: () => $ZodULID,
  $ZodURL: () => $ZodURL,
  $ZodUUID: () => $ZodUUID,
  $ZodUndefined: () => $ZodUndefined,
  $ZodUnion: () => $ZodUnion,
  $ZodUnknown: () => $ZodUnknown,
  $ZodVoid: () => $ZodVoid,
  $ZodXID: () => $ZodXID,
  $brand: () => $brand,
  $constructor: () => $constructor,
  $input: () => $input,
  $output: () => $output,
  Doc: () => Doc,
  JSONSchema: () => json_schema_exports,
  JSONSchemaGenerator: () => JSONSchemaGenerator,
  NEVER: () => NEVER,
  TimePrecision: () => TimePrecision,
  _any: () => _any,
  _array: () => _array,
  _base64: () => _base64,
  _base64url: () => _base64url,
  _bigint: () => _bigint,
  _boolean: () => _boolean,
  _catch: () => _catch,
  _check: () => _check,
  _cidrv4: () => _cidrv4,
  _cidrv6: () => _cidrv6,
  _coercedBigint: () => _coercedBigint,
  _coercedBoolean: () => _coercedBoolean,
  _coercedDate: () => _coercedDate,
  _coercedNumber: () => _coercedNumber,
  _coercedString: () => _coercedString,
  _cuid: () => _cuid,
  _cuid2: () => _cuid2,
  _custom: () => _custom,
  _date: () => _date,
  _decode: () => _decode,
  _decodeAsync: () => _decodeAsync,
  _default: () => _default,
  _discriminatedUnion: () => _discriminatedUnion,
  _e164: () => _e164,
  _email: () => _email,
  _emoji: () => _emoji2,
  _encode: () => _encode,
  _encodeAsync: () => _encodeAsync,
  _endsWith: () => _endsWith,
  _enum: () => _enum,
  _file: () => _file,
  _float32: () => _float32,
  _float64: () => _float64,
  _gt: () => _gt,
  _gte: () => _gte,
  _guid: () => _guid,
  _includes: () => _includes,
  _int: () => _int,
  _int32: () => _int32,
  _int64: () => _int64,
  _intersection: () => _intersection,
  _ipv4: () => _ipv4,
  _ipv6: () => _ipv6,
  _isoDate: () => _isoDate,
  _isoDateTime: () => _isoDateTime,
  _isoDuration: () => _isoDuration,
  _isoTime: () => _isoTime,
  _jwt: () => _jwt,
  _ksuid: () => _ksuid,
  _lazy: () => _lazy,
  _length: () => _length,
  _literal: () => _literal,
  _lowercase: () => _lowercase,
  _lt: () => _lt,
  _lte: () => _lte,
  _map: () => _map,
  _max: () => _lte,
  _maxLength: () => _maxLength,
  _maxSize: () => _maxSize,
  _mime: () => _mime,
  _min: () => _gte,
  _minLength: () => _minLength,
  _minSize: () => _minSize,
  _multipleOf: () => _multipleOf,
  _nan: () => _nan,
  _nanoid: () => _nanoid,
  _nativeEnum: () => _nativeEnum,
  _negative: () => _negative,
  _never: () => _never,
  _nonnegative: () => _nonnegative,
  _nonoptional: () => _nonoptional,
  _nonpositive: () => _nonpositive,
  _normalize: () => _normalize,
  _null: () => _null2,
  _nullable: () => _nullable,
  _number: () => _number,
  _optional: () => _optional,
  _overwrite: () => _overwrite,
  _parse: () => _parse,
  _parseAsync: () => _parseAsync,
  _pipe: () => _pipe,
  _positive: () => _positive,
  _promise: () => _promise,
  _property: () => _property,
  _readonly: () => _readonly,
  _record: () => _record,
  _refine: () => _refine,
  _regex: () => _regex,
  _safeDecode: () => _safeDecode,
  _safeDecodeAsync: () => _safeDecodeAsync,
  _safeEncode: () => _safeEncode,
  _safeEncodeAsync: () => _safeEncodeAsync,
  _safeParse: () => _safeParse,
  _safeParseAsync: () => _safeParseAsync,
  _set: () => _set,
  _size: () => _size,
  _startsWith: () => _startsWith,
  _string: () => _string,
  _stringFormat: () => _stringFormat,
  _stringbool: () => _stringbool,
  _success: () => _success,
  _superRefine: () => _superRefine,
  _symbol: () => _symbol,
  _templateLiteral: () => _templateLiteral,
  _toLowerCase: () => _toLowerCase,
  _toUpperCase: () => _toUpperCase,
  _transform: () => _transform,
  _trim: () => _trim,
  _tuple: () => _tuple,
  _uint32: () => _uint32,
  _uint64: () => _uint64,
  _ulid: () => _ulid,
  _undefined: () => _undefined2,
  _union: () => _union,
  _unknown: () => _unknown,
  _uppercase: () => _uppercase,
  _url: () => _url,
  _uuid: () => _uuid,
  _uuidv4: () => _uuidv4,
  _uuidv6: () => _uuidv6,
  _uuidv7: () => _uuidv7,
  _void: () => _void,
  _xid: () => _xid,
  clone: () => clone,
  config: () => config,
  decode: () => decode,
  decodeAsync: () => decodeAsync,
  encode: () => encode,
  encodeAsync: () => encodeAsync,
  flattenError: () => flattenError,
  formatError: () => formatError,
  globalConfig: () => globalConfig,
  globalRegistry: () => globalRegistry,
  isValidBase64: () => isValidBase64,
  isValidBase64URL: () => isValidBase64URL,
  isValidJWT: () => isValidJWT,
  locales: () => locales_exports,
  parse: () => parse,
  parseAsync: () => parseAsync,
  prettifyError: () => prettifyError,
  regexes: () => regexes_exports,
  registry: () => registry,
  safeDecode: () => safeDecode,
  safeDecodeAsync: () => safeDecodeAsync,
  safeEncode: () => safeEncode,
  safeEncodeAsync: () => safeEncodeAsync,
  safeParse: () => safeParse,
  safeParseAsync: () => safeParseAsync,
  toDotPath: () => toDotPath,
  toJSONSchema: () => toJSONSchema,
  treeifyError: () => treeifyError,
  util: () => util_exports,
  version: () => version
});
var init_core2 = __esm({
  "../../packages/memory-client/node_modules/zod/v4/core/index.js"() {
    init_core();
    init_parse();
    init_errors();
    init_schemas();
    init_checks();
    init_versions();
    init_util();
    init_regexes();
    init_locales();
    init_registries();
    init_doc();
    init_api();
    init_to_json_schema();
    init_json_schema();
  }
});

// ../../packages/memory-client/node_modules/zod/v4/classic/checks.js
var init_checks2 = __esm({
  "../../packages/memory-client/node_modules/zod/v4/classic/checks.js"() {
    init_core2();
  }
});

// ../../packages/memory-client/node_modules/zod/v4/classic/iso.js
var iso_exports = {};
__export(iso_exports, {
  ZodISODate: () => ZodISODate,
  ZodISODateTime: () => ZodISODateTime,
  ZodISODuration: () => ZodISODuration,
  ZodISOTime: () => ZodISOTime,
  date: () => date2,
  datetime: () => datetime2,
  duration: () => duration2,
  time: () => time2
});
function datetime2(params) {
  return _isoDateTime(ZodISODateTime, params);
}
function date2(params) {
  return _isoDate(ZodISODate, params);
}
function time2(params) {
  return _isoTime(ZodISOTime, params);
}
function duration2(params) {
  return _isoDuration(ZodISODuration, params);
}
var ZodISODateTime, ZodISODate, ZodISOTime, ZodISODuration;
var init_iso = __esm({
  "../../packages/memory-client/node_modules/zod/v4/classic/iso.js"() {
    init_core2();
    init_schemas2();
    ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
      $ZodISODateTime.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
      $ZodISODate.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
      $ZodISOTime.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
      $ZodISODuration.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
  }
});

// ../../packages/memory-client/node_modules/zod/v4/classic/errors.js
var initializer2, ZodError, ZodRealError;
var init_errors2 = __esm({
  "../../packages/memory-client/node_modules/zod/v4/classic/errors.js"() {
    init_core2();
    init_core2();
    init_util();
    initializer2 = (inst, issues) => {
      $ZodError.init(inst, issues);
      inst.name = "ZodError";
      Object.defineProperties(inst, {
        format: {
          value: (mapper) => formatError(inst, mapper)
          // enumerable: false,
        },
        flatten: {
          value: (mapper) => flattenError(inst, mapper)
          // enumerable: false,
        },
        addIssue: {
          value: (issue2) => {
            inst.issues.push(issue2);
            inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
          }
          // enumerable: false,
        },
        addIssues: {
          value: (issues2) => {
            inst.issues.push(...issues2);
            inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
          }
          // enumerable: false,
        },
        isEmpty: {
          get() {
            return inst.issues.length === 0;
          }
          // enumerable: false,
        }
      });
    };
    ZodError = $constructor("ZodError", initializer2);
    ZodRealError = $constructor("ZodError", initializer2, {
      Parent: Error
    });
  }
});

// ../../packages/memory-client/node_modules/zod/v4/classic/parse.js
var parse2, parseAsync2, safeParse2, safeParseAsync2, encode2, decode2, encodeAsync2, decodeAsync2, safeEncode2, safeDecode2, safeEncodeAsync2, safeDecodeAsync2;
var init_parse2 = __esm({
  "../../packages/memory-client/node_modules/zod/v4/classic/parse.js"() {
    init_core2();
    init_errors2();
    parse2 = /* @__PURE__ */ _parse(ZodRealError);
    parseAsync2 = /* @__PURE__ */ _parseAsync(ZodRealError);
    safeParse2 = /* @__PURE__ */ _safeParse(ZodRealError);
    safeParseAsync2 = /* @__PURE__ */ _safeParseAsync(ZodRealError);
    encode2 = /* @__PURE__ */ _encode(ZodRealError);
    decode2 = /* @__PURE__ */ _decode(ZodRealError);
    encodeAsync2 = /* @__PURE__ */ _encodeAsync(ZodRealError);
    decodeAsync2 = /* @__PURE__ */ _decodeAsync(ZodRealError);
    safeEncode2 = /* @__PURE__ */ _safeEncode(ZodRealError);
    safeDecode2 = /* @__PURE__ */ _safeDecode(ZodRealError);
    safeEncodeAsync2 = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
    safeDecodeAsync2 = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
  }
});

// ../../packages/memory-client/node_modules/zod/v4/classic/schemas.js
function string2(params) {
  return _string(ZodString, params);
}
function email2(params) {
  return _email(ZodEmail, params);
}
function guid2(params) {
  return _guid(ZodGUID, params);
}
function uuid2(params) {
  return _uuid(ZodUUID, params);
}
function uuidv4(params) {
  return _uuidv4(ZodUUID, params);
}
function uuidv6(params) {
  return _uuidv6(ZodUUID, params);
}
function uuidv7(params) {
  return _uuidv7(ZodUUID, params);
}
function url(params) {
  return _url(ZodURL, params);
}
function httpUrl(params) {
  return _url(ZodURL, {
    protocol: /^https?$/,
    hostname: regexes_exports.domain,
    ...util_exports.normalizeParams(params)
  });
}
function emoji2(params) {
  return _emoji2(ZodEmoji, params);
}
function nanoid2(params) {
  return _nanoid(ZodNanoID, params);
}
function cuid3(params) {
  return _cuid(ZodCUID, params);
}
function cuid22(params) {
  return _cuid2(ZodCUID2, params);
}
function ulid2(params) {
  return _ulid(ZodULID, params);
}
function xid2(params) {
  return _xid(ZodXID, params);
}
function ksuid2(params) {
  return _ksuid(ZodKSUID, params);
}
function ipv42(params) {
  return _ipv4(ZodIPv4, params);
}
function ipv62(params) {
  return _ipv6(ZodIPv6, params);
}
function cidrv42(params) {
  return _cidrv4(ZodCIDRv4, params);
}
function cidrv62(params) {
  return _cidrv6(ZodCIDRv6, params);
}
function base642(params) {
  return _base64(ZodBase64, params);
}
function base64url2(params) {
  return _base64url(ZodBase64URL, params);
}
function e1642(params) {
  return _e164(ZodE164, params);
}
function jwt(params) {
  return _jwt(ZodJWT, params);
}
function stringFormat(format, fnOrRegex, _params = {}) {
  return _stringFormat(ZodCustomStringFormat, format, fnOrRegex, _params);
}
function hostname2(_params) {
  return _stringFormat(ZodCustomStringFormat, "hostname", regexes_exports.hostname, _params);
}
function hex2(_params) {
  return _stringFormat(ZodCustomStringFormat, "hex", regexes_exports.hex, _params);
}
function hash(alg, params) {
  const enc = params?.enc ?? "hex";
  const format = `${alg}_${enc}`;
  const regex = regexes_exports[format];
  if (!regex)
    throw new Error(`Unrecognized hash format: ${format}`);
  return _stringFormat(ZodCustomStringFormat, format, regex, params);
}
function number2(params) {
  return _number(ZodNumber, params);
}
function int(params) {
  return _int(ZodNumberFormat, params);
}
function float32(params) {
  return _float32(ZodNumberFormat, params);
}
function float64(params) {
  return _float64(ZodNumberFormat, params);
}
function int32(params) {
  return _int32(ZodNumberFormat, params);
}
function uint32(params) {
  return _uint32(ZodNumberFormat, params);
}
function boolean2(params) {
  return _boolean(ZodBoolean, params);
}
function bigint2(params) {
  return _bigint(ZodBigInt, params);
}
function int64(params) {
  return _int64(ZodBigIntFormat, params);
}
function uint64(params) {
  return _uint64(ZodBigIntFormat, params);
}
function symbol(params) {
  return _symbol(ZodSymbol, params);
}
function _undefined3(params) {
  return _undefined2(ZodUndefined, params);
}
function _null3(params) {
  return _null2(ZodNull, params);
}
function any() {
  return _any(ZodAny);
}
function unknown() {
  return _unknown(ZodUnknown);
}
function never(params) {
  return _never(ZodNever, params);
}
function _void2(params) {
  return _void(ZodVoid, params);
}
function date3(params) {
  return _date(ZodDate, params);
}
function array(element, params) {
  return _array(ZodArray, element, params);
}
function keyof(schema) {
  const shape = schema._zod.def.shape;
  return _enum2(Object.keys(shape));
}
function object(shape, params) {
  const def = {
    type: "object",
    shape: shape ?? {},
    ...util_exports.normalizeParams(params)
  };
  return new ZodObject(def);
}
function strictObject(shape, params) {
  return new ZodObject({
    type: "object",
    shape,
    catchall: never(),
    ...util_exports.normalizeParams(params)
  });
}
function looseObject(shape, params) {
  return new ZodObject({
    type: "object",
    shape,
    catchall: unknown(),
    ...util_exports.normalizeParams(params)
  });
}
function union(options, params) {
  return new ZodUnion({
    type: "union",
    options,
    ...util_exports.normalizeParams(params)
  });
}
function discriminatedUnion(discriminator, options, params) {
  return new ZodDiscriminatedUnion({
    type: "union",
    options,
    discriminator,
    ...util_exports.normalizeParams(params)
  });
}
function intersection(left, right) {
  return new ZodIntersection({
    type: "intersection",
    left,
    right
  });
}
function tuple(items, _paramsOrRest, _params) {
  const hasRest = _paramsOrRest instanceof $ZodType;
  const params = hasRest ? _params : _paramsOrRest;
  const rest = hasRest ? _paramsOrRest : null;
  return new ZodTuple({
    type: "tuple",
    items,
    rest,
    ...util_exports.normalizeParams(params)
  });
}
function record(keyType, valueType, params) {
  return new ZodRecord({
    type: "record",
    keyType,
    valueType,
    ...util_exports.normalizeParams(params)
  });
}
function partialRecord(keyType, valueType, params) {
  const k = clone(keyType);
  k._zod.values = void 0;
  return new ZodRecord({
    type: "record",
    keyType: k,
    valueType,
    ...util_exports.normalizeParams(params)
  });
}
function map(keyType, valueType, params) {
  return new ZodMap({
    type: "map",
    keyType,
    valueType,
    ...util_exports.normalizeParams(params)
  });
}
function set(valueType, params) {
  return new ZodSet({
    type: "set",
    valueType,
    ...util_exports.normalizeParams(params)
  });
}
function _enum2(values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new ZodEnum({
    type: "enum",
    entries,
    ...util_exports.normalizeParams(params)
  });
}
function nativeEnum(entries, params) {
  return new ZodEnum({
    type: "enum",
    entries,
    ...util_exports.normalizeParams(params)
  });
}
function literal(value, params) {
  return new ZodLiteral({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...util_exports.normalizeParams(params)
  });
}
function file(params) {
  return _file(ZodFile, params);
}
function transform(fn) {
  return new ZodTransform({
    type: "transform",
    transform: fn
  });
}
function optional(innerType) {
  return new ZodOptional({
    type: "optional",
    innerType
  });
}
function nullable(innerType) {
  return new ZodNullable({
    type: "nullable",
    innerType
  });
}
function nullish2(innerType) {
  return optional(nullable(innerType));
}
function _default2(innerType, defaultValue) {
  return new ZodDefault({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : util_exports.shallowClone(defaultValue);
    }
  });
}
function prefault(innerType, defaultValue) {
  return new ZodPrefault({
    type: "prefault",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : util_exports.shallowClone(defaultValue);
    }
  });
}
function nonoptional(innerType, params) {
  return new ZodNonOptional({
    type: "nonoptional",
    innerType,
    ...util_exports.normalizeParams(params)
  });
}
function success(innerType) {
  return new ZodSuccess({
    type: "success",
    innerType
  });
}
function _catch2(innerType, catchValue) {
  return new ZodCatch({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
  });
}
function nan(params) {
  return _nan(ZodNaN, params);
}
function pipe(in_, out) {
  return new ZodPipe({
    type: "pipe",
    in: in_,
    out
    // ...util.normalizeParams(params),
  });
}
function codec(in_, out, params) {
  return new ZodCodec({
    type: "pipe",
    in: in_,
    out,
    transform: params.decode,
    reverseTransform: params.encode
  });
}
function readonly(innerType) {
  return new ZodReadonly({
    type: "readonly",
    innerType
  });
}
function templateLiteral(parts, params) {
  return new ZodTemplateLiteral({
    type: "template_literal",
    parts,
    ...util_exports.normalizeParams(params)
  });
}
function lazy(getter) {
  return new ZodLazy({
    type: "lazy",
    getter
  });
}
function promise(innerType) {
  return new ZodPromise({
    type: "promise",
    innerType
  });
}
function _function(params) {
  return new ZodFunction({
    type: "function",
    input: Array.isArray(params?.input) ? tuple(params?.input) : params?.input ?? array(unknown()),
    output: params?.output ?? unknown()
  });
}
function check(fn) {
  const ch = new $ZodCheck({
    check: "custom"
    // ...util.normalizeParams(params),
  });
  ch._zod.check = fn;
  return ch;
}
function custom(fn, _params) {
  return _custom(ZodCustom, fn ?? (() => true), _params);
}
function refine(fn, _params = {}) {
  return _refine(ZodCustom, fn, _params);
}
function superRefine(fn) {
  return _superRefine(fn);
}
function _instanceof(cls, params = {
  error: `Input not instance of ${cls.name}`
}) {
  const inst = new ZodCustom({
    type: "custom",
    check: "custom",
    fn: (data) => data instanceof cls,
    abort: true,
    ...util_exports.normalizeParams(params)
  });
  inst._zod.bag.Class = cls;
  return inst;
}
function json(params) {
  const jsonSchema = lazy(() => {
    return union([string2(params), number2(), boolean2(), _null3(), array(jsonSchema), record(string2(), jsonSchema)]);
  });
  return jsonSchema;
}
function preprocess(fn, schema) {
  return pipe(transform(fn), schema);
}
var ZodType, _ZodString, ZodString, ZodStringFormat, ZodEmail, ZodGUID, ZodUUID, ZodURL, ZodEmoji, ZodNanoID, ZodCUID, ZodCUID2, ZodULID, ZodXID, ZodKSUID, ZodIPv4, ZodIPv6, ZodCIDRv4, ZodCIDRv6, ZodBase64, ZodBase64URL, ZodE164, ZodJWT, ZodCustomStringFormat, ZodNumber, ZodNumberFormat, ZodBoolean, ZodBigInt, ZodBigIntFormat, ZodSymbol, ZodUndefined, ZodNull, ZodAny, ZodUnknown, ZodNever, ZodVoid, ZodDate, ZodArray, ZodObject, ZodUnion, ZodDiscriminatedUnion, ZodIntersection, ZodTuple, ZodRecord, ZodMap, ZodSet, ZodEnum, ZodLiteral, ZodFile, ZodTransform, ZodOptional, ZodNullable, ZodDefault, ZodPrefault, ZodNonOptional, ZodSuccess, ZodCatch, ZodNaN, ZodPipe, ZodCodec, ZodReadonly, ZodTemplateLiteral, ZodLazy, ZodPromise, ZodFunction, ZodCustom, stringbool;
var init_schemas2 = __esm({
  "../../packages/memory-client/node_modules/zod/v4/classic/schemas.js"() {
    init_core2();
    init_core2();
    init_checks2();
    init_iso();
    init_parse2();
    ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
      $ZodType.init(inst, def);
      inst.def = def;
      inst.type = def.type;
      Object.defineProperty(inst, "_def", { value: def });
      inst.check = (...checks) => {
        return inst.clone(util_exports.mergeDefs(def, {
          checks: [
            ...def.checks ?? [],
            ...checks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
          ]
        }));
      };
      inst.clone = (def2, params) => clone(inst, def2, params);
      inst.brand = () => inst;
      inst.register = ((reg, meta) => {
        reg.add(inst, meta);
        return inst;
      });
      inst.parse = (data, params) => parse2(inst, data, params, { callee: inst.parse });
      inst.safeParse = (data, params) => safeParse2(inst, data, params);
      inst.parseAsync = async (data, params) => parseAsync2(inst, data, params, { callee: inst.parseAsync });
      inst.safeParseAsync = async (data, params) => safeParseAsync2(inst, data, params);
      inst.spa = inst.safeParseAsync;
      inst.encode = (data, params) => encode2(inst, data, params);
      inst.decode = (data, params) => decode2(inst, data, params);
      inst.encodeAsync = async (data, params) => encodeAsync2(inst, data, params);
      inst.decodeAsync = async (data, params) => decodeAsync2(inst, data, params);
      inst.safeEncode = (data, params) => safeEncode2(inst, data, params);
      inst.safeDecode = (data, params) => safeDecode2(inst, data, params);
      inst.safeEncodeAsync = async (data, params) => safeEncodeAsync2(inst, data, params);
      inst.safeDecodeAsync = async (data, params) => safeDecodeAsync2(inst, data, params);
      inst.refine = (check2, params) => inst.check(refine(check2, params));
      inst.superRefine = (refinement) => inst.check(superRefine(refinement));
      inst.overwrite = (fn) => inst.check(_overwrite(fn));
      inst.optional = () => optional(inst);
      inst.nullable = () => nullable(inst);
      inst.nullish = () => optional(nullable(inst));
      inst.nonoptional = (params) => nonoptional(inst, params);
      inst.array = () => array(inst);
      inst.or = (arg) => union([inst, arg]);
      inst.and = (arg) => intersection(inst, arg);
      inst.transform = (tx) => pipe(inst, transform(tx));
      inst.default = (def2) => _default2(inst, def2);
      inst.prefault = (def2) => prefault(inst, def2);
      inst.catch = (params) => _catch2(inst, params);
      inst.pipe = (target) => pipe(inst, target);
      inst.readonly = () => readonly(inst);
      inst.describe = (description) => {
        const cl = inst.clone();
        globalRegistry.add(cl, { description });
        return cl;
      };
      Object.defineProperty(inst, "description", {
        get() {
          return globalRegistry.get(inst)?.description;
        },
        configurable: true
      });
      inst.meta = (...args) => {
        if (args.length === 0) {
          return globalRegistry.get(inst);
        }
        const cl = inst.clone();
        globalRegistry.add(cl, args[0]);
        return cl;
      };
      inst.isOptional = () => inst.safeParse(void 0).success;
      inst.isNullable = () => inst.safeParse(null).success;
      return inst;
    });
    _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
      $ZodString.init(inst, def);
      ZodType.init(inst, def);
      const bag = inst._zod.bag;
      inst.format = bag.format ?? null;
      inst.minLength = bag.minimum ?? null;
      inst.maxLength = bag.maximum ?? null;
      inst.regex = (...args) => inst.check(_regex(...args));
      inst.includes = (...args) => inst.check(_includes(...args));
      inst.startsWith = (...args) => inst.check(_startsWith(...args));
      inst.endsWith = (...args) => inst.check(_endsWith(...args));
      inst.min = (...args) => inst.check(_minLength(...args));
      inst.max = (...args) => inst.check(_maxLength(...args));
      inst.length = (...args) => inst.check(_length(...args));
      inst.nonempty = (...args) => inst.check(_minLength(1, ...args));
      inst.lowercase = (params) => inst.check(_lowercase(params));
      inst.uppercase = (params) => inst.check(_uppercase(params));
      inst.trim = () => inst.check(_trim());
      inst.normalize = (...args) => inst.check(_normalize(...args));
      inst.toLowerCase = () => inst.check(_toLowerCase());
      inst.toUpperCase = () => inst.check(_toUpperCase());
    });
    ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
      $ZodString.init(inst, def);
      _ZodString.init(inst, def);
      inst.email = (params) => inst.check(_email(ZodEmail, params));
      inst.url = (params) => inst.check(_url(ZodURL, params));
      inst.jwt = (params) => inst.check(_jwt(ZodJWT, params));
      inst.emoji = (params) => inst.check(_emoji2(ZodEmoji, params));
      inst.guid = (params) => inst.check(_guid(ZodGUID, params));
      inst.uuid = (params) => inst.check(_uuid(ZodUUID, params));
      inst.uuidv4 = (params) => inst.check(_uuidv4(ZodUUID, params));
      inst.uuidv6 = (params) => inst.check(_uuidv6(ZodUUID, params));
      inst.uuidv7 = (params) => inst.check(_uuidv7(ZodUUID, params));
      inst.nanoid = (params) => inst.check(_nanoid(ZodNanoID, params));
      inst.guid = (params) => inst.check(_guid(ZodGUID, params));
      inst.cuid = (params) => inst.check(_cuid(ZodCUID, params));
      inst.cuid2 = (params) => inst.check(_cuid2(ZodCUID2, params));
      inst.ulid = (params) => inst.check(_ulid(ZodULID, params));
      inst.base64 = (params) => inst.check(_base64(ZodBase64, params));
      inst.base64url = (params) => inst.check(_base64url(ZodBase64URL, params));
      inst.xid = (params) => inst.check(_xid(ZodXID, params));
      inst.ksuid = (params) => inst.check(_ksuid(ZodKSUID, params));
      inst.ipv4 = (params) => inst.check(_ipv4(ZodIPv4, params));
      inst.ipv6 = (params) => inst.check(_ipv6(ZodIPv6, params));
      inst.cidrv4 = (params) => inst.check(_cidrv4(ZodCIDRv4, params));
      inst.cidrv6 = (params) => inst.check(_cidrv6(ZodCIDRv6, params));
      inst.e164 = (params) => inst.check(_e164(ZodE164, params));
      inst.datetime = (params) => inst.check(datetime2(params));
      inst.date = (params) => inst.check(date2(params));
      inst.time = (params) => inst.check(time2(params));
      inst.duration = (params) => inst.check(duration2(params));
    });
    ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
      $ZodStringFormat.init(inst, def);
      _ZodString.init(inst, def);
    });
    ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
      $ZodEmail.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
      $ZodGUID.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
      $ZodUUID.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
      $ZodURL.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
      $ZodEmoji.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
      $ZodNanoID.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
      $ZodCUID.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
      $ZodCUID2.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
      $ZodULID.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
      $ZodXID.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
      $ZodKSUID.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
      $ZodIPv4.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
      $ZodIPv6.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
      $ZodCIDRv4.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
      $ZodCIDRv6.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
      $ZodBase64.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
      $ZodBase64URL.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
      $ZodE164.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
      $ZodJWT.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodCustomStringFormat = /* @__PURE__ */ $constructor("ZodCustomStringFormat", (inst, def) => {
      $ZodCustomStringFormat.init(inst, def);
      ZodStringFormat.init(inst, def);
    });
    ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
      $ZodNumber.init(inst, def);
      ZodType.init(inst, def);
      inst.gt = (value, params) => inst.check(_gt(value, params));
      inst.gte = (value, params) => inst.check(_gte(value, params));
      inst.min = (value, params) => inst.check(_gte(value, params));
      inst.lt = (value, params) => inst.check(_lt(value, params));
      inst.lte = (value, params) => inst.check(_lte(value, params));
      inst.max = (value, params) => inst.check(_lte(value, params));
      inst.int = (params) => inst.check(int(params));
      inst.safe = (params) => inst.check(int(params));
      inst.positive = (params) => inst.check(_gt(0, params));
      inst.nonnegative = (params) => inst.check(_gte(0, params));
      inst.negative = (params) => inst.check(_lt(0, params));
      inst.nonpositive = (params) => inst.check(_lte(0, params));
      inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
      inst.step = (value, params) => inst.check(_multipleOf(value, params));
      inst.finite = () => inst;
      const bag = inst._zod.bag;
      inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
      inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
      inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? 0.5);
      inst.isFinite = true;
      inst.format = bag.format ?? null;
    });
    ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
      $ZodNumberFormat.init(inst, def);
      ZodNumber.init(inst, def);
    });
    ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
      $ZodBoolean.init(inst, def);
      ZodType.init(inst, def);
    });
    ZodBigInt = /* @__PURE__ */ $constructor("ZodBigInt", (inst, def) => {
      $ZodBigInt.init(inst, def);
      ZodType.init(inst, def);
      inst.gte = (value, params) => inst.check(_gte(value, params));
      inst.min = (value, params) => inst.check(_gte(value, params));
      inst.gt = (value, params) => inst.check(_gt(value, params));
      inst.gte = (value, params) => inst.check(_gte(value, params));
      inst.min = (value, params) => inst.check(_gte(value, params));
      inst.lt = (value, params) => inst.check(_lt(value, params));
      inst.lte = (value, params) => inst.check(_lte(value, params));
      inst.max = (value, params) => inst.check(_lte(value, params));
      inst.positive = (params) => inst.check(_gt(BigInt(0), params));
      inst.negative = (params) => inst.check(_lt(BigInt(0), params));
      inst.nonpositive = (params) => inst.check(_lte(BigInt(0), params));
      inst.nonnegative = (params) => inst.check(_gte(BigInt(0), params));
      inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
      const bag = inst._zod.bag;
      inst.minValue = bag.minimum ?? null;
      inst.maxValue = bag.maximum ?? null;
      inst.format = bag.format ?? null;
    });
    ZodBigIntFormat = /* @__PURE__ */ $constructor("ZodBigIntFormat", (inst, def) => {
      $ZodBigIntFormat.init(inst, def);
      ZodBigInt.init(inst, def);
    });
    ZodSymbol = /* @__PURE__ */ $constructor("ZodSymbol", (inst, def) => {
      $ZodSymbol.init(inst, def);
      ZodType.init(inst, def);
    });
    ZodUndefined = /* @__PURE__ */ $constructor("ZodUndefined", (inst, def) => {
      $ZodUndefined.init(inst, def);
      ZodType.init(inst, def);
    });
    ZodNull = /* @__PURE__ */ $constructor("ZodNull", (inst, def) => {
      $ZodNull.init(inst, def);
      ZodType.init(inst, def);
    });
    ZodAny = /* @__PURE__ */ $constructor("ZodAny", (inst, def) => {
      $ZodAny.init(inst, def);
      ZodType.init(inst, def);
    });
    ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
      $ZodUnknown.init(inst, def);
      ZodType.init(inst, def);
    });
    ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
      $ZodNever.init(inst, def);
      ZodType.init(inst, def);
    });
    ZodVoid = /* @__PURE__ */ $constructor("ZodVoid", (inst, def) => {
      $ZodVoid.init(inst, def);
      ZodType.init(inst, def);
    });
    ZodDate = /* @__PURE__ */ $constructor("ZodDate", (inst, def) => {
      $ZodDate.init(inst, def);
      ZodType.init(inst, def);
      inst.min = (value, params) => inst.check(_gte(value, params));
      inst.max = (value, params) => inst.check(_lte(value, params));
      const c = inst._zod.bag;
      inst.minDate = c.minimum ? new Date(c.minimum) : null;
      inst.maxDate = c.maximum ? new Date(c.maximum) : null;
    });
    ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
      $ZodArray.init(inst, def);
      ZodType.init(inst, def);
      inst.element = def.element;
      inst.min = (minLength, params) => inst.check(_minLength(minLength, params));
      inst.nonempty = (params) => inst.check(_minLength(1, params));
      inst.max = (maxLength, params) => inst.check(_maxLength(maxLength, params));
      inst.length = (len, params) => inst.check(_length(len, params));
      inst.unwrap = () => inst.element;
    });
    ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
      $ZodObjectJIT.init(inst, def);
      ZodType.init(inst, def);
      util_exports.defineLazy(inst, "shape", () => {
        return def.shape;
      });
      inst.keyof = () => _enum2(Object.keys(inst._zod.def.shape));
      inst.catchall = (catchall) => inst.clone({ ...inst._zod.def, catchall });
      inst.passthrough = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
      inst.loose = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
      inst.strict = () => inst.clone({ ...inst._zod.def, catchall: never() });
      inst.strip = () => inst.clone({ ...inst._zod.def, catchall: void 0 });
      inst.extend = (incoming) => {
        return util_exports.extend(inst, incoming);
      };
      inst.safeExtend = (incoming) => {
        return util_exports.safeExtend(inst, incoming);
      };
      inst.merge = (other) => util_exports.merge(inst, other);
      inst.pick = (mask) => util_exports.pick(inst, mask);
      inst.omit = (mask) => util_exports.omit(inst, mask);
      inst.partial = (...args) => util_exports.partial(ZodOptional, inst, args[0]);
      inst.required = (...args) => util_exports.required(ZodNonOptional, inst, args[0]);
    });
    ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
      $ZodUnion.init(inst, def);
      ZodType.init(inst, def);
      inst.options = def.options;
    });
    ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("ZodDiscriminatedUnion", (inst, def) => {
      ZodUnion.init(inst, def);
      $ZodDiscriminatedUnion.init(inst, def);
    });
    ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
      $ZodIntersection.init(inst, def);
      ZodType.init(inst, def);
    });
    ZodTuple = /* @__PURE__ */ $constructor("ZodTuple", (inst, def) => {
      $ZodTuple.init(inst, def);
      ZodType.init(inst, def);
      inst.rest = (rest) => inst.clone({
        ...inst._zod.def,
        rest
      });
    });
    ZodRecord = /* @__PURE__ */ $constructor("ZodRecord", (inst, def) => {
      $ZodRecord.init(inst, def);
      ZodType.init(inst, def);
      inst.keyType = def.keyType;
      inst.valueType = def.valueType;
    });
    ZodMap = /* @__PURE__ */ $constructor("ZodMap", (inst, def) => {
      $ZodMap.init(inst, def);
      ZodType.init(inst, def);
      inst.keyType = def.keyType;
      inst.valueType = def.valueType;
    });
    ZodSet = /* @__PURE__ */ $constructor("ZodSet", (inst, def) => {
      $ZodSet.init(inst, def);
      ZodType.init(inst, def);
      inst.min = (...args) => inst.check(_minSize(...args));
      inst.nonempty = (params) => inst.check(_minSize(1, params));
      inst.max = (...args) => inst.check(_maxSize(...args));
      inst.size = (...args) => inst.check(_size(...args));
    });
    ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
      $ZodEnum.init(inst, def);
      ZodType.init(inst, def);
      inst.enum = def.entries;
      inst.options = Object.values(def.entries);
      const keys = new Set(Object.keys(def.entries));
      inst.extract = (values, params) => {
        const newEntries = {};
        for (const value of values) {
          if (keys.has(value)) {
            newEntries[value] = def.entries[value];
          } else
            throw new Error(`Key ${value} not found in enum`);
        }
        return new ZodEnum({
          ...def,
          checks: [],
          ...util_exports.normalizeParams(params),
          entries: newEntries
        });
      };
      inst.exclude = (values, params) => {
        const newEntries = { ...def.entries };
        for (const value of values) {
          if (keys.has(value)) {
            delete newEntries[value];
          } else
            throw new Error(`Key ${value} not found in enum`);
        }
        return new ZodEnum({
          ...def,
          checks: [],
          ...util_exports.normalizeParams(params),
          entries: newEntries
        });
      };
    });
    ZodLiteral = /* @__PURE__ */ $constructor("ZodLiteral", (inst, def) => {
      $ZodLiteral.init(inst, def);
      ZodType.init(inst, def);
      inst.values = new Set(def.values);
      Object.defineProperty(inst, "value", {
        get() {
          if (def.values.length > 1) {
            throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
          }
          return def.values[0];
        }
      });
    });
    ZodFile = /* @__PURE__ */ $constructor("ZodFile", (inst, def) => {
      $ZodFile.init(inst, def);
      ZodType.init(inst, def);
      inst.min = (size, params) => inst.check(_minSize(size, params));
      inst.max = (size, params) => inst.check(_maxSize(size, params));
      inst.mime = (types, params) => inst.check(_mime(Array.isArray(types) ? types : [types], params));
    });
    ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
      $ZodTransform.init(inst, def);
      ZodType.init(inst, def);
      inst._zod.parse = (payload, _ctx) => {
        if (_ctx.direction === "backward") {
          throw new $ZodEncodeError(inst.constructor.name);
        }
        payload.addIssue = (issue2) => {
          if (typeof issue2 === "string") {
            payload.issues.push(util_exports.issue(issue2, payload.value, def));
          } else {
            const _issue = issue2;
            if (_issue.fatal)
              _issue.continue = false;
            _issue.code ?? (_issue.code = "custom");
            _issue.input ?? (_issue.input = payload.value);
            _issue.inst ?? (_issue.inst = inst);
            payload.issues.push(util_exports.issue(_issue));
          }
        };
        const output = def.transform(payload.value, payload);
        if (output instanceof Promise) {
          return output.then((output2) => {
            payload.value = output2;
            return payload;
          });
        }
        payload.value = output;
        return payload;
      };
    });
    ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
      $ZodOptional.init(inst, def);
      ZodType.init(inst, def);
      inst.unwrap = () => inst._zod.def.innerType;
    });
    ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
      $ZodNullable.init(inst, def);
      ZodType.init(inst, def);
      inst.unwrap = () => inst._zod.def.innerType;
    });
    ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
      $ZodDefault.init(inst, def);
      ZodType.init(inst, def);
      inst.unwrap = () => inst._zod.def.innerType;
      inst.removeDefault = inst.unwrap;
    });
    ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
      $ZodPrefault.init(inst, def);
      ZodType.init(inst, def);
      inst.unwrap = () => inst._zod.def.innerType;
    });
    ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
      $ZodNonOptional.init(inst, def);
      ZodType.init(inst, def);
      inst.unwrap = () => inst._zod.def.innerType;
    });
    ZodSuccess = /* @__PURE__ */ $constructor("ZodSuccess", (inst, def) => {
      $ZodSuccess.init(inst, def);
      ZodType.init(inst, def);
      inst.unwrap = () => inst._zod.def.innerType;
    });
    ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
      $ZodCatch.init(inst, def);
      ZodType.init(inst, def);
      inst.unwrap = () => inst._zod.def.innerType;
      inst.removeCatch = inst.unwrap;
    });
    ZodNaN = /* @__PURE__ */ $constructor("ZodNaN", (inst, def) => {
      $ZodNaN.init(inst, def);
      ZodType.init(inst, def);
    });
    ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
      $ZodPipe.init(inst, def);
      ZodType.init(inst, def);
      inst.in = def.in;
      inst.out = def.out;
    });
    ZodCodec = /* @__PURE__ */ $constructor("ZodCodec", (inst, def) => {
      ZodPipe.init(inst, def);
      $ZodCodec.init(inst, def);
    });
    ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
      $ZodReadonly.init(inst, def);
      ZodType.init(inst, def);
      inst.unwrap = () => inst._zod.def.innerType;
    });
    ZodTemplateLiteral = /* @__PURE__ */ $constructor("ZodTemplateLiteral", (inst, def) => {
      $ZodTemplateLiteral.init(inst, def);
      ZodType.init(inst, def);
    });
    ZodLazy = /* @__PURE__ */ $constructor("ZodLazy", (inst, def) => {
      $ZodLazy.init(inst, def);
      ZodType.init(inst, def);
      inst.unwrap = () => inst._zod.def.getter();
    });
    ZodPromise = /* @__PURE__ */ $constructor("ZodPromise", (inst, def) => {
      $ZodPromise.init(inst, def);
      ZodType.init(inst, def);
      inst.unwrap = () => inst._zod.def.innerType;
    });
    ZodFunction = /* @__PURE__ */ $constructor("ZodFunction", (inst, def) => {
      $ZodFunction.init(inst, def);
      ZodType.init(inst, def);
    });
    ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
      $ZodCustom.init(inst, def);
      ZodType.init(inst, def);
    });
    stringbool = (...args) => _stringbool({
      Codec: ZodCodec,
      Boolean: ZodBoolean,
      String: ZodString
    }, ...args);
  }
});

// ../../packages/memory-client/node_modules/zod/v4/classic/compat.js
function setErrorMap(map2) {
  config({
    customError: map2
  });
}
function getErrorMap() {
  return config().customError;
}
var ZodIssueCode, ZodFirstPartyTypeKind;
var init_compat = __esm({
  "../../packages/memory-client/node_modules/zod/v4/classic/compat.js"() {
    init_core2();
    init_core2();
    ZodIssueCode = {
      invalid_type: "invalid_type",
      too_big: "too_big",
      too_small: "too_small",
      invalid_format: "invalid_format",
      not_multiple_of: "not_multiple_of",
      unrecognized_keys: "unrecognized_keys",
      invalid_union: "invalid_union",
      invalid_key: "invalid_key",
      invalid_element: "invalid_element",
      invalid_value: "invalid_value",
      custom: "custom"
    };
    /* @__PURE__ */ (function(ZodFirstPartyTypeKind3) {
    })(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
  }
});

// ../../packages/memory-client/node_modules/zod/v4/classic/coerce.js
var coerce_exports = {};
__export(coerce_exports, {
  bigint: () => bigint3,
  boolean: () => boolean3,
  date: () => date4,
  number: () => number3,
  string: () => string3
});
function string3(params) {
  return _coercedString(ZodString, params);
}
function number3(params) {
  return _coercedNumber(ZodNumber, params);
}
function boolean3(params) {
  return _coercedBoolean(ZodBoolean, params);
}
function bigint3(params) {
  return _coercedBigint(ZodBigInt, params);
}
function date4(params) {
  return _coercedDate(ZodDate, params);
}
var init_coerce = __esm({
  "../../packages/memory-client/node_modules/zod/v4/classic/coerce.js"() {
    init_core2();
    init_schemas2();
  }
});

// ../../packages/memory-client/node_modules/zod/v4/classic/external.js
var external_exports = {};
__export(external_exports, {
  $brand: () => $brand,
  $input: () => $input,
  $output: () => $output,
  NEVER: () => NEVER,
  TimePrecision: () => TimePrecision,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBase64: () => ZodBase64,
  ZodBase64URL: () => ZodBase64URL,
  ZodBigInt: () => ZodBigInt,
  ZodBigIntFormat: () => ZodBigIntFormat,
  ZodBoolean: () => ZodBoolean,
  ZodCIDRv4: () => ZodCIDRv4,
  ZodCIDRv6: () => ZodCIDRv6,
  ZodCUID: () => ZodCUID,
  ZodCUID2: () => ZodCUID2,
  ZodCatch: () => ZodCatch,
  ZodCodec: () => ZodCodec,
  ZodCustom: () => ZodCustom,
  ZodCustomStringFormat: () => ZodCustomStringFormat,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodE164: () => ZodE164,
  ZodEmail: () => ZodEmail,
  ZodEmoji: () => ZodEmoji,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFile: () => ZodFile,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodGUID: () => ZodGUID,
  ZodIPv4: () => ZodIPv4,
  ZodIPv6: () => ZodIPv6,
  ZodISODate: () => ZodISODate,
  ZodISODateTime: () => ZodISODateTime,
  ZodISODuration: () => ZodISODuration,
  ZodISOTime: () => ZodISOTime,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodJWT: () => ZodJWT,
  ZodKSUID: () => ZodKSUID,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNanoID: () => ZodNanoID,
  ZodNever: () => ZodNever,
  ZodNonOptional: () => ZodNonOptional,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodNumberFormat: () => ZodNumberFormat,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodPipe: () => ZodPipe,
  ZodPrefault: () => ZodPrefault,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRealError: () => ZodRealError,
  ZodRecord: () => ZodRecord,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodStringFormat: () => ZodStringFormat,
  ZodSuccess: () => ZodSuccess,
  ZodSymbol: () => ZodSymbol,
  ZodTemplateLiteral: () => ZodTemplateLiteral,
  ZodTransform: () => ZodTransform,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodULID: () => ZodULID,
  ZodURL: () => ZodURL,
  ZodUUID: () => ZodUUID,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  ZodXID: () => ZodXID,
  _ZodString: () => _ZodString,
  _default: () => _default2,
  _function: () => _function,
  any: () => any,
  array: () => array,
  base64: () => base642,
  base64url: () => base64url2,
  bigint: () => bigint2,
  boolean: () => boolean2,
  catch: () => _catch2,
  check: () => check,
  cidrv4: () => cidrv42,
  cidrv6: () => cidrv62,
  clone: () => clone,
  codec: () => codec,
  coerce: () => coerce_exports,
  config: () => config,
  core: () => core_exports2,
  cuid: () => cuid3,
  cuid2: () => cuid22,
  custom: () => custom,
  date: () => date3,
  decode: () => decode2,
  decodeAsync: () => decodeAsync2,
  discriminatedUnion: () => discriminatedUnion,
  e164: () => e1642,
  email: () => email2,
  emoji: () => emoji2,
  encode: () => encode2,
  encodeAsync: () => encodeAsync2,
  endsWith: () => _endsWith,
  enum: () => _enum2,
  file: () => file,
  flattenError: () => flattenError,
  float32: () => float32,
  float64: () => float64,
  formatError: () => formatError,
  function: () => _function,
  getErrorMap: () => getErrorMap,
  globalRegistry: () => globalRegistry,
  gt: () => _gt,
  gte: () => _gte,
  guid: () => guid2,
  hash: () => hash,
  hex: () => hex2,
  hostname: () => hostname2,
  httpUrl: () => httpUrl,
  includes: () => _includes,
  instanceof: () => _instanceof,
  int: () => int,
  int32: () => int32,
  int64: () => int64,
  intersection: () => intersection,
  ipv4: () => ipv42,
  ipv6: () => ipv62,
  iso: () => iso_exports,
  json: () => json,
  jwt: () => jwt,
  keyof: () => keyof,
  ksuid: () => ksuid2,
  lazy: () => lazy,
  length: () => _length,
  literal: () => literal,
  locales: () => locales_exports,
  looseObject: () => looseObject,
  lowercase: () => _lowercase,
  lt: () => _lt,
  lte: () => _lte,
  map: () => map,
  maxLength: () => _maxLength,
  maxSize: () => _maxSize,
  mime: () => _mime,
  minLength: () => _minLength,
  minSize: () => _minSize,
  multipleOf: () => _multipleOf,
  nan: () => nan,
  nanoid: () => nanoid2,
  nativeEnum: () => nativeEnum,
  negative: () => _negative,
  never: () => never,
  nonnegative: () => _nonnegative,
  nonoptional: () => nonoptional,
  nonpositive: () => _nonpositive,
  normalize: () => _normalize,
  null: () => _null3,
  nullable: () => nullable,
  nullish: () => nullish2,
  number: () => number2,
  object: () => object,
  optional: () => optional,
  overwrite: () => _overwrite,
  parse: () => parse2,
  parseAsync: () => parseAsync2,
  partialRecord: () => partialRecord,
  pipe: () => pipe,
  positive: () => _positive,
  prefault: () => prefault,
  preprocess: () => preprocess,
  prettifyError: () => prettifyError,
  promise: () => promise,
  property: () => _property,
  readonly: () => readonly,
  record: () => record,
  refine: () => refine,
  regex: () => _regex,
  regexes: () => regexes_exports,
  registry: () => registry,
  safeDecode: () => safeDecode2,
  safeDecodeAsync: () => safeDecodeAsync2,
  safeEncode: () => safeEncode2,
  safeEncodeAsync: () => safeEncodeAsync2,
  safeParse: () => safeParse2,
  safeParseAsync: () => safeParseAsync2,
  set: () => set,
  setErrorMap: () => setErrorMap,
  size: () => _size,
  startsWith: () => _startsWith,
  strictObject: () => strictObject,
  string: () => string2,
  stringFormat: () => stringFormat,
  stringbool: () => stringbool,
  success: () => success,
  superRefine: () => superRefine,
  symbol: () => symbol,
  templateLiteral: () => templateLiteral,
  toJSONSchema: () => toJSONSchema,
  toLowerCase: () => _toLowerCase,
  toUpperCase: () => _toUpperCase,
  transform: () => transform,
  treeifyError: () => treeifyError,
  trim: () => _trim,
  tuple: () => tuple,
  uint32: () => uint32,
  uint64: () => uint64,
  ulid: () => ulid2,
  undefined: () => _undefined3,
  union: () => union,
  unknown: () => unknown,
  uppercase: () => _uppercase,
  url: () => url,
  util: () => util_exports,
  uuid: () => uuid2,
  uuidv4: () => uuidv4,
  uuidv6: () => uuidv6,
  uuidv7: () => uuidv7,
  void: () => _void2,
  xid: () => xid2
});
var init_external = __esm({
  "../../packages/memory-client/node_modules/zod/v4/classic/external.js"() {
    init_core2();
    init_schemas2();
    init_checks2();
    init_errors2();
    init_parse2();
    init_compat();
    init_core2();
    init_en();
    init_core2();
    init_locales();
    init_iso();
    init_iso();
    init_coerce();
    config(en_default());
  }
});

// ../../packages/memory-client/node_modules/zod/index.js
var init_zod = __esm({
  "../../packages/memory-client/node_modules/zod/index.js"() {
    init_external();
    init_external();
  }
});

// ../../packages/memory-client/src/core/types.ts
var MEMORY_TYPES, WRITE_INTENTS, MEMORY_STATUSES, createMemorySchema, updateMemorySchema, searchMemorySchema, createTopicSchema, suggestTagsSchema, analyzePatternsSchema, intelligenceHealthCheckSchema, findRelatedSchema, detectDuplicatesSchema, extractInsightsSchema, CHUNKING_STRATEGIES, SEARCH_MODES, preprocessingOptionsSchema, enhancedSearchSchema, analyticsDateRangeSchema;
var init_types = __esm({
  "../../packages/memory-client/src/core/types.ts"() {
    init_zod();
    MEMORY_TYPES = ["context", "project", "knowledge", "reference", "personal", "workflow"];
    WRITE_INTENTS = ["new", "continue", "auto"];
    MEMORY_STATUSES = ["active", "archived", "draft", "deleted"];
    createMemorySchema = external_exports.object({
      title: external_exports.string().min(1).max(500),
      content: external_exports.string().min(1).max(5e4),
      summary: external_exports.string().max(1e3).optional(),
      memory_type: external_exports.enum(MEMORY_TYPES).default("context"),
      topic_id: external_exports.string().uuid().optional(),
      topic_key: external_exports.string().min(1).max(100).optional(),
      project_ref: external_exports.string().max(100).optional(),
      tags: external_exports.array(external_exports.string().min(1).max(50)).max(20).default([]),
      metadata: external_exports.record(external_exports.string(), external_exports.unknown()).optional(),
      continuity_key: external_exports.string().min(1).max(255).optional(),
      idempotency_key: external_exports.string().min(1).max(255).optional(),
      write_intent: external_exports.enum(WRITE_INTENTS).optional()
    });
    updateMemorySchema = external_exports.object({
      title: external_exports.string().min(1).max(500).optional(),
      content: external_exports.string().min(1).max(5e4).optional(),
      summary: external_exports.string().max(1e3).optional(),
      memory_type: external_exports.enum(MEMORY_TYPES).optional(),
      status: external_exports.enum(MEMORY_STATUSES).optional(),
      topic_id: external_exports.string().uuid().nullable().optional(),
      topic_key: external_exports.string().min(1).max(100).optional(),
      project_ref: external_exports.string().max(100).nullable().optional(),
      tags: external_exports.array(external_exports.string().min(1).max(50)).max(20).optional(),
      metadata: external_exports.record(external_exports.string(), external_exports.unknown()).optional(),
      continuity_key: external_exports.string().min(1).max(255).optional(),
      idempotency_key: external_exports.string().min(1).max(255).optional(),
      write_intent: external_exports.enum(WRITE_INTENTS).optional()
    });
    searchMemorySchema = external_exports.object({
      query: external_exports.string().min(1).max(1e3),
      memory_types: external_exports.array(external_exports.enum(MEMORY_TYPES)).optional(),
      tags: external_exports.array(external_exports.string()).optional(),
      topic_id: external_exports.string().uuid().optional(),
      topic_key: external_exports.string().min(1).max(100).optional(),
      project_ref: external_exports.string().optional(),
      status: external_exports.enum(MEMORY_STATUSES).default("active"),
      limit: external_exports.number().int().min(1).max(100).default(20),
      threshold: external_exports.number().min(0).max(1).default(0.7),
      include_deleted: external_exports.boolean().optional(),
      response_mode: external_exports.enum(["full", "compact", "timeline"]).optional()
    });
    createTopicSchema = external_exports.object({
      name: external_exports.string().min(1).max(100),
      description: external_exports.string().max(500).optional(),
      color: external_exports.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      icon: external_exports.string().max(50).optional(),
      parent_topic_id: external_exports.string().uuid().optional()
    });
    suggestTagsSchema = external_exports.object({
      memory_id: external_exports.string().uuid().optional(),
      content: external_exports.string().min(1).optional(),
      title: external_exports.string().optional(),
      existing_tags: external_exports.array(external_exports.string()).optional(),
      max_suggestions: external_exports.number().int().min(1).max(10).optional()
    }).refine((data) => data.memory_id || data.content, {
      message: "Either memory_id or content is required"
    });
    analyzePatternsSchema = external_exports.object({
      time_range_days: external_exports.number().int().min(1).max(365).optional(),
      include_insights: external_exports.boolean().optional(),
      response_format: external_exports.enum(["json", "markdown"]).optional()
    });
    intelligenceHealthCheckSchema = external_exports.object({
      include_recommendations: external_exports.boolean().optional(),
      detailed_breakdown: external_exports.boolean().optional()
    });
    findRelatedSchema = external_exports.object({
      memory_id: external_exports.string().uuid().optional(),
      query: external_exports.string().min(1).optional(),
      limit: external_exports.number().int().min(1).max(20).optional(),
      similarity_threshold: external_exports.number().min(0).max(1).optional(),
      exclude_ids: external_exports.array(external_exports.string().uuid()).optional()
    }).refine((data) => data.memory_id || data.query, {
      message: "Either memory_id or query is required"
    });
    detectDuplicatesSchema = external_exports.object({
      similarity_threshold: external_exports.number().min(0).max(1).optional(),
      include_archived: external_exports.boolean().optional(),
      limit: external_exports.number().int().min(1).max(50).optional()
    });
    extractInsightsSchema = external_exports.object({
      memory_ids: external_exports.array(external_exports.string().uuid()).optional(),
      topic: external_exports.string().min(1).optional(),
      time_range_days: external_exports.number().int().min(1).max(365).optional(),
      insight_types: external_exports.array(external_exports.enum(["themes", "connections", "gaps", "actions", "summary"])).optional(),
      detail_level: external_exports.enum(["brief", "detailed", "comprehensive"]).optional()
    });
    CHUNKING_STRATEGIES = ["semantic", "fixed-size", "paragraph", "sentence", "code-block"];
    SEARCH_MODES = ["vector", "text", "hybrid"];
    preprocessingOptionsSchema = external_exports.object({
      chunking: external_exports.object({
        strategy: external_exports.enum(CHUNKING_STRATEGIES).optional(),
        maxChunkSize: external_exports.number().int().min(100).max(1e4).optional(),
        overlap: external_exports.number().int().min(0).max(500).optional()
      }).optional(),
      cleanContent: external_exports.boolean().optional(),
      extractMetadata: external_exports.boolean().optional()
    }).optional();
    enhancedSearchSchema = external_exports.object({
      query: external_exports.string().min(1).max(1e3),
      type: external_exports.enum(MEMORY_TYPES).optional(),
      threshold: external_exports.number().min(0).max(1).default(0.7),
      limit: external_exports.number().int().min(1).max(100).default(20),
      search_mode: external_exports.enum(SEARCH_MODES).default("hybrid"),
      filters: external_exports.object({
        tags: external_exports.array(external_exports.string()).optional(),
        project_id: external_exports.string().uuid().optional(),
        topic_id: external_exports.string().uuid().optional(),
        date_range: external_exports.object({
          from: external_exports.string().optional(),
          to: external_exports.string().optional()
        }).optional()
      }).optional(),
      include_chunks: external_exports.boolean().default(false)
    });
    analyticsDateRangeSchema = external_exports.object({
      from: external_exports.string().optional(),
      to: external_exports.string().optional(),
      group_by: external_exports.enum(["day", "week", "month"]).default("day")
    });
  }
});

// ../../packages/memory-client/src/core/utils.ts
function safeJsonParse(input) {
  try {
    const data = JSON.parse(input);
    return { success: true, data };
  } catch (error46) {
    const message = error46 instanceof Error ? error46.message : "Unknown JSON parse error";
    return { success: false, error: `Invalid JSON: ${message}` };
  }
}
function httpStatusToErrorCode(status) {
  switch (status) {
    case 400:
      return "VALIDATION_ERROR";
    case 401:
      return "AUTH_ERROR";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 408:
      return "TIMEOUT_ERROR";
    case 409:
      return "CONFLICT";
    case 429:
      return "RATE_LIMIT_ERROR";
    case 500:
    case 502:
    case 503:
    case 504:
      return "SERVER_ERROR";
    default:
      return "API_ERROR";
  }
}
function createErrorResponse(message, code = "API_ERROR", statusCode, details) {
  return {
    code,
    message,
    statusCode,
    details,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function createErrorFromResponse(status, statusText, body) {
  const code = httpStatusToErrorCode(status);
  let message = `HTTP ${status}: ${statusText}`;
  let details = void 0;
  if (body && typeof body === "object") {
    const bodyObj = body;
    if (typeof bodyObj.error === "string") {
      message = bodyObj.error;
    } else if (typeof bodyObj.message === "string") {
      message = bodyObj.message;
    }
    if (bodyObj.details) {
      details = bodyObj.details;
    }
  }
  return createErrorResponse(message, code, status, details);
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function calculateRetryDelay(attempt, baseDelay = 1e3, backoff = "exponential", maxDelay = 3e4) {
  let delay;
  if (backoff === "exponential") {
    delay = baseDelay * Math.pow(2, attempt);
  } else {
    delay = baseDelay * (attempt + 1);
  }
  const jitter = delay * 0.2 * (Math.random() * 2 - 1);
  delay = Math.min(delay + jitter, maxDelay);
  return Math.round(delay);
}
function isRetryableError(statusCode) {
  if (!statusCode) return true;
  return statusCode >= 500 || statusCode === 429 || statusCode === 408;
}
var init_utils = __esm({
  "../../packages/memory-client/src/core/utils.ts"() {
  }
});

// ../../packages/memory-client/src/core/constants.ts
var VERSION, CLIENT_NAME, USER_AGENT;
var init_constants = __esm({
  "../../packages/memory-client/src/core/constants.ts"() {
    VERSION = "2.2.1";
    CLIENT_NAME = "@lanonasis/memory-client";
    USER_AGENT = `${CLIENT_NAME}/${VERSION}`;
  }
});

// ../../packages/memory-client/src/core/client.ts
function createMemoryClient(config2) {
  return new CoreMemoryClient(config2);
}
var CoreMemoryClient;
var init_client = __esm({
  "../../packages/memory-client/src/core/client.ts"() {
    init_types();
    init_utils();
    init_constants();
    CoreMemoryClient = class {
      constructor(config2) {
        this.config = {
          timeout: 3e4,
          ...config2
        };
        this.baseHeaders = {
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT,
          "X-Project-Scope": "lanonasis-maas",
          // Required by backend auth middleware
          ...config2.headers
        };
        if (config2.authToken) {
          this.baseHeaders["Authorization"] = `Bearer ${config2.authToken}`;
        } else if (config2.apiKey) {
          this.baseHeaders["X-API-Key"] = config2.apiKey;
        }
        if (config2.organizationId) {
          this.baseHeaders["X-Organization-ID"] = config2.organizationId;
        }
      }
      /**
       * Enrich request body with organization context if configured
       * This ensures the API has the organization_id even if not in auth token
       */
      enrichWithOrgContext(body) {
        if (this.config.organizationId && !body.organization_id) {
          return {
            ...body,
            organization_id: this.config.organizationId
          };
        }
        if (!this.config.organizationId && this.config.userId && !body.organization_id) {
          return {
            ...body,
            organization_id: this.config.userId
          };
        }
        return body;
      }
      /**
       * Make an HTTP request to the API with retry support
       */
      async request(endpoint, options = {}) {
        const startTime = Date.now();
        const maxRetries = this.config.retry?.maxRetries ?? 3;
        const baseDelay = this.config.retry?.retryDelay ?? 1e3;
        const backoff = this.config.retry?.backoff ?? "exponential";
        if (this.config.onRequest) {
          try {
            this.config.onRequest(endpoint);
          } catch (error46) {
            console.warn("onRequest hook error:", error46);
          }
        }
        let baseUrl = this.config.apiUrl;
        baseUrl = baseUrl.replace(/\/api\/v1\/?$/, "");
        baseUrl = baseUrl.replace(/\/api\/?$/, "");
        const url2 = `${baseUrl}/api/v1${endpoint}`;
        let lastError;
        let attempt = 0;
        while (attempt <= maxRetries) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            const response = await fetch(url2, {
              headers: { ...this.baseHeaders, ...options.headers },
              signal: controller.signal,
              ...options
            });
            clearTimeout(timeoutId);
            let data;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              data = await response.json();
            } else {
              data = await response.text();
            }
            if (!response.ok) {
              const error46 = createErrorFromResponse(response.status, response.statusText, data);
              if (isRetryableError(response.status) && attempt < maxRetries) {
                lastError = error46;
                const delay = calculateRetryDelay(attempt, baseDelay, backoff);
                await sleep(delay);
                attempt++;
                continue;
              }
              if (this.config.onError) {
                try {
                  this.config.onError(error46);
                } catch (hookError) {
                  console.warn("onError hook error:", hookError);
                }
              }
              return { error: error46, meta: { duration: Date.now() - startTime, retries: attempt } };
            }
            if (this.config.onResponse) {
              try {
                const duration3 = Date.now() - startTime;
                this.config.onResponse(endpoint, duration3);
              } catch (error46) {
                console.warn("onResponse hook error:", error46);
              }
            }
            return { data, meta: { duration: Date.now() - startTime, retries: attempt } };
          } catch (error46) {
            if (error46 instanceof Error && error46.name === "AbortError") {
              const timeoutError = createErrorResponse("Request timeout", "TIMEOUT_ERROR", 408);
              if (attempt < maxRetries) {
                lastError = timeoutError;
                const delay = calculateRetryDelay(attempt, baseDelay, backoff);
                await sleep(delay);
                attempt++;
                continue;
              }
              if (this.config.onError) {
                try {
                  this.config.onError(timeoutError);
                } catch (hookError) {
                  console.warn("onError hook error:", hookError);
                }
              }
              return { error: timeoutError, meta: { duration: Date.now() - startTime, retries: attempt } };
            }
            const networkError = createErrorResponse(
              error46 instanceof Error ? error46.message : "Network error",
              "NETWORK_ERROR"
            );
            if (attempt < maxRetries) {
              lastError = networkError;
              const delay = calculateRetryDelay(attempt, baseDelay, backoff);
              await sleep(delay);
              attempt++;
              continue;
            }
            if (this.config.onError) {
              try {
                this.config.onError(networkError);
              } catch (hookError) {
                console.warn("onError hook error:", hookError);
              }
            }
            return { error: networkError, meta: { duration: Date.now() - startTime, retries: attempt } };
          }
        }
        return {
          error: lastError ?? createErrorResponse("Max retries exceeded", "API_ERROR"),
          meta: { duration: Date.now() - startTime, retries: attempt }
        };
      }
      shouldRetryRouteFamily(error46) {
        if (!error46) {
          return false;
        }
        const statusCode = error46.statusCode;
        const message = (error46.message || "").toLowerCase();
        if (statusCode === 404 || statusCode === 405) {
          return true;
        }
        return statusCode === 400 && (message.includes("memory proxy route not found") || message.includes("memory id is required"));
      }
      async requestWithFallback(candidates) {
        let lastResponse;
        for (let index = 0; index < candidates.length; index++) {
          const candidate = candidates[index];
          const response = await this.request(candidate.endpoint, candidate.options);
          if (!response.error) {
            return response;
          }
          lastResponse = response;
          if (index === candidates.length - 1 || !this.shouldRetryRouteFamily(response.error)) {
            return response;
          }
        }
        return lastResponse ?? { error: createErrorResponse("No request candidates provided", "API_ERROR") };
      }
      /**
       * Validate input using Zod schema and return validation error if invalid
       */
      validateInput(schema, data) {
        const result = schema.safeParse(data);
        if (!result.success) {
          const zodError = result.error;
          const details = zodError?.issues?.map((issue2) => ({
            field: issue2.path.map(String).join("."),
            message: issue2.message
          })) ?? [];
          return {
            error: createErrorResponse(
              "Validation failed",
              "VALIDATION_ERROR",
              400,
              details
            )
          };
        }
        return null;
      }
      /**
       * Test the API connection and authentication
       */
      async healthCheck() {
        return this.request("/health");
      }
      // Memory Operations
      /**
       * Create a new memory with validation
       */
      async createMemory(memory) {
        const validationError = this.validateInput(createMemorySchema, memory);
        if (validationError) {
          return { error: validationError.error };
        }
        const enrichedMemory = this.enrichWithOrgContext(memory);
        return this.request("/memories", {
          method: "POST",
          body: JSON.stringify(enrichedMemory)
        });
      }
      /**
       * Get a memory by ID
       */
      async getMemory(id) {
        return this.request(`/memories/${encodeURIComponent(id)}`);
      }
      /**
       * Update an existing memory with validation
       */
      async updateMemory(id, updates) {
        const validationError = this.validateInput(updateMemorySchema, updates);
        if (validationError) {
          return { error: validationError.error };
        }
        return this.request(`/memories/${encodeURIComponent(id)}`, {
          method: "PUT",
          body: JSON.stringify(updates)
        });
      }
      /**
       * Delete a memory
       */
      async deleteMemory(id) {
        return this.request(`/memories/${encodeURIComponent(id)}`, {
          method: "DELETE"
        });
      }
      /**
       * List memories with optional filtering and pagination
       */
      async listMemories(options = {}) {
        const params = new URLSearchParams();
        Object.entries(options).forEach(([key, value]) => {
          if (value !== void 0 && value !== null) {
            if (Array.isArray(value)) {
              params.append(key, value.join(","));
            } else {
              params.append(key, String(value));
            }
          }
        });
        const queryString = params.toString();
        const pluralEndpoint = queryString ? `/memories/list?${queryString}` : "/memories/list";
        const singularEndpoint = queryString ? `/memory/list?${queryString}` : "/memory/list";
        return this.requestWithFallback([
          { endpoint: pluralEndpoint },
          { endpoint: singularEndpoint }
        ]);
      }
      /**
       * Search memories using semantic search with validation
       */
      async searchMemories(request) {
        const validationError = this.validateInput(searchMemorySchema, request);
        if (validationError) {
          return { error: validationError.error };
        }
        const enrichedRequest = this.enrichWithOrgContext(request);
        return this.requestWithFallback([
          {
            endpoint: "/memories/search",
            options: {
              method: "POST",
              body: JSON.stringify(enrichedRequest)
            }
          },
          {
            endpoint: "/memory/search",
            options: {
              method: "POST",
              body: JSON.stringify(enrichedRequest)
            }
          }
        ]);
      }
      /**
       * Bulk delete multiple memories
       */
      async bulkDeleteMemories(memoryIds) {
        const enrichedRequest = this.enrichWithOrgContext({ memory_ids: memoryIds });
        return this.request("/memories/bulk/delete", {
          method: "POST",
          body: JSON.stringify(enrichedRequest)
        });
      }
      // Topic Operations
      /**
       * Create a new topic with validation
       */
      async createTopic(topic) {
        const validationError = this.validateInput(createTopicSchema, topic);
        if (validationError) {
          return { error: validationError.error };
        }
        const enrichedTopic = this.enrichWithOrgContext(topic);
        return this.request("/topics", {
          method: "POST",
          body: JSON.stringify(enrichedTopic)
        });
      }
      /**
       * Get all topics
       */
      async getTopics() {
        return this.request("/topics");
      }
      /**
       * Get a topic by ID
       */
      async getTopic(id) {
        return this.request(`/topics/${encodeURIComponent(id)}`);
      }
      /**
       * Update a topic
       */
      async updateTopic(id, updates) {
        return this.request(`/topics/${encodeURIComponent(id)}`, {
          method: "PUT",
          body: JSON.stringify(updates)
        });
      }
      /**
       * Delete a topic
       */
      async deleteTopic(id) {
        return this.request(`/topics/${encodeURIComponent(id)}`, {
          method: "DELETE"
        });
      }
      /**
       * Get user memory statistics
       */
      async getMemoryStats() {
        return this.request("/memories/stats");
      }
      // ========================================
      // Intelligence Features (v2.0)
      // ========================================
      /**
       * Create a memory with preprocessing options (chunking, intelligence extraction)
       *
       * @example
       * ```typescript
       * const result = await client.createMemoryWithPreprocessing({
       *   title: 'Auth System Docs',
       *   content: 'Long content...',
       *   memory_type: 'knowledge',
       *   preprocessing: {
       *     chunking: { strategy: 'semantic', maxChunkSize: 1000 },
       *     extractMetadata: true
       *   }
       * });
       * ```
       */
      async createMemoryWithPreprocessing(memory) {
        const validationError = this.validateInput(createMemorySchema, memory);
        if (validationError) {
          return { error: validationError.error };
        }
        const enrichedMemory = this.enrichWithOrgContext(memory);
        return this.request("/memories", {
          method: "POST",
          body: JSON.stringify(enrichedMemory)
        });
      }
      /**
       * Update a memory with re-chunking and embedding regeneration
       *
       * @example
       * ```typescript
       * const result = await client.updateMemoryWithPreprocessing('mem_123', {
       *   content: 'Updated content...',
       *   rechunk: true,
       *   regenerate_embedding: true
       * });
       * ```
       */
      async updateMemoryWithPreprocessing(id, updates) {
        const validationError = this.validateInput(updateMemorySchema, updates);
        if (validationError) {
          return { error: validationError.error };
        }
        return this.request(`/memories/${encodeURIComponent(id)}`, {
          method: "PUT",
          body: JSON.stringify(updates)
        });
      }
      /**
       * Enhanced semantic search with hybrid mode (vector + text)
       *
       * @example
       * ```typescript
       * const result = await client.enhancedSearch({
       *   query: 'authentication flow',
       *   search_mode: 'hybrid',
       *   filters: { tags: ['auth'], project_id: 'proj_123' },
       *   include_chunks: true
       * });
       * ```
       */
      async enhancedSearch(request) {
        const validationError = this.validateInput(enhancedSearchSchema, request);
        if (validationError) {
          return { error: validationError.error };
        }
        const enrichedRequest = this.enrichWithOrgContext(request);
        return this.requestWithFallback([
          {
            endpoint: "/memories/search",
            options: {
              method: "POST",
              body: JSON.stringify(enrichedRequest)
            }
          },
          {
            endpoint: "/memory/search",
            options: {
              method: "POST",
              body: JSON.stringify(enrichedRequest)
            }
          }
        ]);
      }
      // ========================================
      // Analytics Operations
      // ========================================
      /**
       * Get search analytics data
       *
       * @example
       * ```typescript
       * const analytics = await client.getSearchAnalytics({
       *   from: '2025-01-01',
       *   to: '2025-12-31',
       *   group_by: 'day'
       * });
       * ```
       */
      async getSearchAnalytics(options = {}) {
        const validationError = this.validateInput(analyticsDateRangeSchema, options);
        if (validationError) {
          return { error: validationError.error };
        }
        const params = new URLSearchParams();
        if (options.from) params.append("from", options.from);
        if (options.to) params.append("to", options.to);
        if (options.group_by) params.append("group_by", options.group_by);
        const queryString = params.toString();
        const endpoint = queryString ? `/analytics/search?${queryString}` : "/analytics/search";
        return this.request(endpoint);
      }
      /**
       * Get memory access patterns
       *
       * @example
       * ```typescript
       * const patterns = await client.getAccessPatterns({
       *   from: '2025-01-01',
       *   to: '2025-12-31'
       * });
       * console.log(patterns.data?.most_accessed);
       * ```
       */
      async getAccessPatterns(options = {}) {
        const params = new URLSearchParams();
        if (options.from) params.append("from", options.from);
        if (options.to) params.append("to", options.to);
        const queryString = params.toString();
        const endpoint = queryString ? `/analytics/access?${queryString}` : "/analytics/access";
        return this.request(endpoint);
      }
      /**
       * Get extended memory statistics with storage and activity metrics
       *
       * @example
       * ```typescript
       * const stats = await client.getExtendedStats();
       * console.log(`Total chunks: ${stats.data?.storage.total_chunks}`);
       * console.log(`Created today: ${stats.data?.activity.created_today}`);
       * ```
       */
      async getExtendedStats() {
        return this.request("/analytics/stats");
      }
      /**
       * Get topic with its memories
       *
       * @example
       * ```typescript
       * const topic = await client.getTopicWithMemories('topic_123');
       * console.log(topic.data?.memories);
       * ```
       */
      async getTopicWithMemories(topicId, options = {}) {
        const params = new URLSearchParams();
        if (options.limit) params.append("limit", String(options.limit));
        if (options.offset) params.append("offset", String(options.offset));
        const queryString = params.toString();
        const endpoint = queryString ? `/topics/${encodeURIComponent(topicId)}/memories?${queryString}` : `/topics/${encodeURIComponent(topicId)}/memories`;
        return this.request(endpoint);
      }
      /**
       * Get topics in hierarchical structure
       *
       * @example
       * ```typescript
       * const topics = await client.getTopicsHierarchy();
       * // Returns nested topic tree with children
       * ```
       */
      async getTopicsHierarchy() {
        return this.request("/topics?include_hierarchy=true");
      }
      // Utility Methods
      /**
       * Update authentication token
       */
      setAuthToken(token) {
        this.baseHeaders["Authorization"] = `Bearer ${token}`;
        delete this.baseHeaders["X-API-Key"];
      }
      /**
       * Update API key
       */
      setApiKey(apiKey) {
        this.baseHeaders["X-API-Key"] = apiKey;
        delete this.baseHeaders["Authorization"];
      }
      /**
       * Clear authentication
       */
      clearAuth() {
        delete this.baseHeaders["Authorization"];
        delete this.baseHeaders["X-API-Key"];
      }
      /**
       * Update configuration
       */
      updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        if (updates.headers) {
          this.baseHeaders = { ...this.baseHeaders, ...updates.headers };
        }
      }
      /**
       * Get current configuration (excluding sensitive data)
       */
      getConfig() {
        const { apiKey, authToken, ...safeConfig } = this.config;
        return safeConfig;
      }
    };
  }
});

// ../../packages/memory-client/src/node/cli-integration.ts
var import_child_process, import_util3, execAsync, CLIIntegration, cliIntegration;
var init_cli_integration = __esm({
  "../../packages/memory-client/src/node/cli-integration.ts"() {
    import_child_process = require("child_process");
    import_util3 = require("util");
    init_utils();
    execAsync = (0, import_util3.promisify)(import_child_process.exec);
    CLIIntegration = class {
      constructor() {
        this.cliInfo = null;
        this.detectionPromise = null;
      }
      /**
       * Detect if CLI is available and get its capabilities
       */
      async detectCLI() {
        if (this.cliInfo) {
          return this.cliInfo;
        }
        if (this.detectionPromise) {
          return this.detectionPromise;
        }
        this.detectionPromise = this.performDetection();
        this.cliInfo = await this.detectionPromise;
        return this.cliInfo;
      }
      async performDetection() {
        try {
          let versionOutput = "";
          try {
            const { stdout } = await execAsync("onasis --version 2>/dev/null", { timeout: 5e3 });
            versionOutput = stdout;
          } catch {
            const { stdout } = await execAsync("lanonasis --version 2>/dev/null", { timeout: 5e3 });
            versionOutput = stdout;
          }
          const version4 = versionOutput.trim();
          const versionMatch = version4.match(/(\d+)\.(\d+)\.(\d+)/);
          if (!versionMatch) {
            return { available: false };
          }
          const [, major, minor, patch] = versionMatch.map(Number);
          const isCompatible = major > 1 || major === 1 && minor > 5 || major === 1 && minor === 5 && patch >= 2;
          if (!isCompatible) {
            return {
              available: true,
              version: version4,
              mcpAvailable: false,
              authenticated: false
            };
          }
          let mcpAvailable = false;
          try {
            await execAsync("onasis mcp status --output json 2>/dev/null || lanonasis mcp status --output json 2>/dev/null", {
              timeout: 3e3
            });
            mcpAvailable = true;
          } catch {
          }
          let authenticated = false;
          try {
            const { stdout: authOutput } = await execAsync("onasis auth status --output json 2>/dev/null || lanonasis auth status --output json 2>/dev/null", {
              timeout: 3e3
            });
            const parseResult = safeJsonParse(authOutput);
            if (parseResult.success) {
              authenticated = parseResult.data.authenticated === true;
            }
          } catch {
          }
          return {
            available: true,
            version: version4,
            mcpAvailable,
            authenticated
          };
        } catch {
          return { available: false };
        }
      }
      /**
       * Execute CLI command and return parsed JSON result
       */
      async executeCLICommand(command, options = {}) {
        const cliInfo = await this.detectCLI();
        if (!cliInfo.available) {
          return { error: createErrorResponse("CLI not available", "API_ERROR") };
        }
        if (!cliInfo.authenticated) {
          return { error: createErrorResponse("CLI not authenticated. Run: onasis login", "AUTH_ERROR", 401) };
        }
        try {
          const timeout = options.timeout || 3e4;
          const outputFormat = options.outputFormat || "json";
          const verbose = options.verbose ? "--verbose" : "";
          const cliCmd = await this.getPreferredCLICommand();
          const fullCommand = `${cliCmd} ${command} --output ${outputFormat} ${verbose}`.trim();
          const { stdout, stderr } = await execAsync(fullCommand, {
            timeout,
            maxBuffer: 1024 * 1024
            // 1MB buffer
          });
          if (stderr && stderr.trim()) {
            console.warn("CLI warning:", stderr);
          }
          if (outputFormat === "json") {
            const parseResult = safeJsonParse(stdout);
            if (parseResult.success) {
              return { data: parseResult.data };
            }
            return { error: createErrorResponse("error" in parseResult ? parseResult.error : "Invalid JSON response", "VALIDATION_ERROR", 400) };
          }
          return { data: stdout };
        } catch (error46) {
          if (error46 instanceof Error && error46.message.includes("timeout")) {
            return { error: createErrorResponse("CLI command timeout", "TIMEOUT_ERROR", 408) };
          }
          return {
            error: createErrorResponse(
              error46 instanceof Error ? error46.message : "CLI command failed",
              "API_ERROR"
            )
          };
        }
      }
      /**
       * Get preferred CLI command (onasis for Golden Contract, fallback to lanonasis)
       */
      async getPreferredCLICommand() {
        try {
          (0, import_child_process.execSync)("which onasis", { stdio: "ignore", timeout: 1e3 });
          return "onasis";
        } catch {
          return "lanonasis";
        }
      }
      /**
       * Memory operations via CLI
       */
      async createMemoryViaCLI(title, content, options = {}) {
        const { memoryType = "context", tags = [], topicId } = options;
        let command = `memory create --title "${title}" --content "${content}" --memory-type ${memoryType}`;
        if (tags.length > 0) {
          command += ` --tags "${tags.join(",")}"`;
        }
        if (topicId) {
          command += ` --topic-id "${topicId}"`;
        }
        return this.executeCLICommand(command);
      }
      async listMemoriesViaCLI(options = {}) {
        let command = "memory list";
        if (options.limit) {
          command += ` --limit ${options.limit}`;
        }
        if (options.memoryType) {
          command += ` --memory-type ${options.memoryType}`;
        }
        if (options.tags && options.tags.length > 0) {
          command += ` --tags "${options.tags.join(",")}"`;
        }
        if (options.sortBy) {
          command += ` --sort-by ${options.sortBy}`;
        }
        return this.executeCLICommand(command);
      }
      async searchMemoriesViaCLI(query, options = {}) {
        let command = `memory search "${query}"`;
        if (options.limit) {
          command += ` --limit ${options.limit}`;
        }
        if (options.memoryTypes && options.memoryTypes.length > 0) {
          command += ` --memory-types "${options.memoryTypes.join(",")}"`;
        }
        return this.executeCLICommand(command);
      }
      /**
       * Health check via CLI
       */
      async healthCheckViaCLI() {
        return this.executeCLICommand("health");
      }
      /**
       * MCP-specific operations
       */
      async getMCPStatus() {
        const cliInfo = await this.detectCLI();
        if (!cliInfo.mcpAvailable) {
          return { error: createErrorResponse("MCP not available via CLI", "API_ERROR") };
        }
        return this.executeCLICommand("mcp status");
      }
      async listMCPTools() {
        const cliInfo = await this.detectCLI();
        if (!cliInfo.mcpAvailable) {
          return { error: createErrorResponse("MCP not available via CLI", "API_ERROR") };
        }
        return this.executeCLICommand("mcp tools");
      }
      /**
       * Authentication operations
       */
      async getAuthStatus() {
        return this.executeCLICommand("auth status");
      }
      /**
       * Check if specific CLI features are available
       */
      async getCapabilities() {
        const cliInfo = await this.detectCLI();
        return {
          cliAvailable: cliInfo.available,
          version: cliInfo.version,
          mcpSupport: cliInfo.mcpAvailable || false,
          authenticated: cliInfo.authenticated || false,
          goldenContract: cliInfo.available && this.isGoldenContractCompliant(cliInfo.version)
        };
      }
      isGoldenContractCompliant(version4) {
        if (!version4) return false;
        const versionMatch = version4.match(/(\d+)\.(\d+)\.(\d+)/);
        if (!versionMatch) return false;
        const [, major, minor, patch] = versionMatch.map(Number);
        return major > 1 || major === 1 && minor > 5 || major === 1 && minor === 5 && patch >= 2;
      }
      /**
       * Force refresh CLI detection
       */
      async refresh() {
        this.cliInfo = null;
        this.detectionPromise = null;
        return this.detectCLI();
      }
      /**
       * Get cached CLI info without re-detection
       */
      getCachedInfo() {
        return this.cliInfo;
      }
    };
    cliIntegration = new CLIIntegration();
  }
});

// ../../packages/memory-client/src/node/enhanced-client.ts
async function createNodeMemoryClient(config2) {
  const client = new EnhancedMemoryClient(config2);
  await client.initialize();
  return client;
}
function createEnhancedMemoryClient(config2) {
  return new EnhancedMemoryClient(config2);
}
var EnhancedMemoryClient;
var init_enhanced_client = __esm({
  "../../packages/memory-client/src/node/enhanced-client.ts"() {
    init_client();
    init_cli_integration();
    init_utils();
    EnhancedMemoryClient = class {
      constructor(config2) {
        this.capabilities = null;
        const mergedConfig = {
          ...config2,
          preferCLI: config2.preferCLI ?? true,
          enableMCP: config2.enableMCP ?? true,
          cliDetectionTimeout: config2.cliDetectionTimeout ?? 5e3,
          fallbackToAPI: config2.fallbackToAPI ?? true,
          minCLIVersion: config2.minCLIVersion ?? "1.5.2",
          verbose: config2.verbose ?? false,
          timeout: config2.timeout ?? 3e4,
          apiUrl: config2.apiUrl || "https://api.lanonasis.com",
          apiKey: config2.apiKey || process.env.LANONASIS_API_KEY || "",
          authToken: config2.authToken || "",
          headers: config2.headers || {}
        };
        this.config = mergedConfig;
        this.directClient = new CoreMemoryClient(config2);
        this.cliIntegration = new CLIIntegration();
      }
      createDefaultCapabilities() {
        return {
          cliAvailable: false,
          mcpSupport: false,
          authenticated: false,
          goldenContract: false
        };
      }
      /**
       * Initialize the client and detect capabilities
       */
      async initialize() {
        try {
          const detectionPromise = this.cliIntegration.getCapabilities();
          const capabilities = this.config.cliDetectionTimeout > 0 ? await Promise.race([
            detectionPromise,
            new Promise((resolve) => {
              setTimeout(() => resolve(null), this.config.cliDetectionTimeout);
            })
          ]) : await detectionPromise;
          if (capabilities) {
            this.capabilities = capabilities;
            if (this.config.verbose && capabilities.cliAvailable && !capabilities.authenticated) {
              const suggestedCommand = capabilities.goldenContract ? "onasis login" : "lanonasis login";
              console.warn(
                `CLI detected but not authenticated. Run '${suggestedCommand}' to enable enhanced SDK features.`
              );
            }
          } else {
            this.capabilities = this.createDefaultCapabilities();
            if (this.config.verbose) {
              console.warn(
                `CLI detection timed out after ${this.config.cliDetectionTimeout}ms. Falling back to API mode.`
              );
            }
          }
        } catch (error46) {
          if (this.config.verbose) {
            console.warn("CLI detection failed:", error46);
          }
          this.capabilities = this.createDefaultCapabilities();
        }
      }
      /**
       * Get current capabilities
       */
      async getCapabilities() {
        if (!this.capabilities) {
          await this.initialize();
        }
        if (!this.capabilities) {
          this.capabilities = this.createDefaultCapabilities();
        }
        return this.capabilities;
      }
      /**
       * Determine if operation should use CLI
       */
      async shouldUseCLI() {
        const capabilities = await this.getCapabilities();
        return this.config.preferCLI && capabilities.cliAvailable && capabilities.authenticated && capabilities.goldenContract;
      }
      /**
       * Execute operation with intelligent routing
       */
      async executeOperation(operation, cliOperation, apiOperation) {
        const useCLI = await this.shouldUseCLI();
        const capabilities = await this.getCapabilities();
        if (useCLI) {
          try {
            const result = await cliOperation();
            if (result.error && this.config.fallbackToAPI) {
              console.warn(`CLI ${operation} failed, falling back to API:`, result.error);
              const apiResult = await apiOperation();
              return {
                ...apiResult,
                source: "api",
                mcpUsed: false
              };
            }
            return {
              ...result,
              source: "cli",
              mcpUsed: capabilities.mcpSupport
            };
          } catch (error46) {
            if (this.config.fallbackToAPI) {
              console.warn(`CLI ${operation} error, falling back to API:`, error46);
              const apiResult = await apiOperation();
              return {
                ...apiResult,
                source: "api",
                mcpUsed: false
              };
            }
            return {
              error: createErrorResponse(
                error46 instanceof Error ? error46.message : `CLI ${operation} failed`,
                "API_ERROR"
              ),
              source: "cli",
              mcpUsed: false
            };
          }
        } else {
          const result = await apiOperation();
          return {
            ...result,
            source: "api",
            mcpUsed: false
          };
        }
      }
      // Enhanced API Methods
      /**
       * Health check with intelligent routing
       */
      async healthCheck() {
        return this.executeOperation(
          "health check",
          () => this.cliIntegration.healthCheckViaCLI(),
          () => this.directClient.healthCheck()
        );
      }
      /**
       * Create memory with CLI/API routing
       */
      async createMemory(memory) {
        return this.executeOperation(
          "create memory",
          () => this.cliIntegration.createMemoryViaCLI(
            memory.title,
            memory.content,
            {
              memoryType: memory.memory_type,
              tags: memory.tags,
              topicId: memory.topic_id
            }
          ),
          () => this.directClient.createMemory(memory)
        );
      }
      /**
       * List memories with intelligent routing
       */
      async listMemories(options = {}) {
        return this.executeOperation(
          "list memories",
          () => this.cliIntegration.listMemoriesViaCLI({
            limit: options.limit,
            memoryType: options.memory_type,
            tags: options.tags,
            sortBy: options.sort
          }),
          () => this.directClient.listMemories(options)
        );
      }
      /**
       * Search memories with MCP enhancement when available
       */
      async searchMemories(request) {
        return this.executeOperation(
          "search memories",
          () => this.cliIntegration.searchMemoriesViaCLI(
            request.query,
            {
              limit: request.limit,
              memoryTypes: request.memory_types
            }
          ),
          () => this.directClient.searchMemories(request)
        );
      }
      /**
       * Get memory by ID (API only for now)
       */
      async getMemory(id) {
        const result = await this.directClient.getMemory(id);
        return {
          ...result,
          source: "api",
          mcpUsed: false
        };
      }
      /**
       * Update memory (API only for now)
       */
      async updateMemory(id, updates) {
        const result = await this.directClient.updateMemory(id, updates);
        return {
          ...result,
          source: "api",
          mcpUsed: false
        };
      }
      /**
       * Delete memory (API only for now)
       */
      async deleteMemory(id) {
        const result = await this.directClient.deleteMemory(id);
        return {
          ...result,
          source: "api",
          mcpUsed: false
        };
      }
      // Topic Operations (API only for now)
      async createTopic(topic) {
        const result = await this.directClient.createTopic(topic);
        return { ...result, source: "api", mcpUsed: false };
      }
      async getTopics() {
        const result = await this.directClient.getTopics();
        return { ...result, source: "api", mcpUsed: false };
      }
      async getTopic(id) {
        const result = await this.directClient.getTopic(id);
        return { ...result, source: "api", mcpUsed: false };
      }
      async updateTopic(id, updates) {
        const result = await this.directClient.updateTopic(id, updates);
        return { ...result, source: "api", mcpUsed: false };
      }
      async deleteTopic(id) {
        const result = await this.directClient.deleteTopic(id);
        return { ...result, source: "api", mcpUsed: false };
      }
      /**
       * Get memory statistics
       */
      async getMemoryStats() {
        const result = await this.directClient.getMemoryStats();
        return { ...result, source: "api", mcpUsed: false };
      }
      // Utility Methods
      /**
       * Force CLI re-detection
       */
      async refreshCLIDetection() {
        this.capabilities = null;
        await this.cliIntegration.refresh();
        await this.initialize();
      }
      /**
       * Get authentication status from CLI
       */
      async getAuthStatus() {
        try {
          const result = await this.cliIntegration.getAuthStatus();
          return { ...result, source: "cli", mcpUsed: false };
        } catch (error46) {
          return {
            error: createErrorResponse(
              error46 instanceof Error ? error46.message : "Auth status check failed",
              "API_ERROR"
            ),
            source: "cli",
            mcpUsed: false
          };
        }
      }
      /**
       * Get MCP status when available
       */
      async getMCPStatus() {
        const capabilities = await this.getCapabilities();
        if (!capabilities.mcpSupport) {
          return {
            error: createErrorResponse("MCP not available", "API_ERROR"),
            source: "cli",
            mcpUsed: false
          };
        }
        try {
          const result = await this.cliIntegration.getMCPStatus();
          return { ...result, source: "cli", mcpUsed: true };
        } catch (error46) {
          return {
            error: createErrorResponse(
              error46 instanceof Error ? error46.message : "MCP status check failed",
              "API_ERROR"
            ),
            source: "cli",
            mcpUsed: false
          };
        }
      }
      /**
       * Update authentication for both CLI and API client
       */
      setAuthToken(token) {
        this.directClient.setAuthToken(token);
      }
      setApiKey(apiKey) {
        this.directClient.setApiKey(apiKey);
      }
      clearAuth() {
        this.directClient.clearAuth();
      }
      /**
       * Update configuration
       */
      updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        this.directClient.updateConfig(updates);
      }
      /**
       * Get configuration summary
       */
      getConfigSummary() {
        return {
          apiUrl: this.config.apiUrl,
          preferCLI: this.config.preferCLI,
          enableMCP: this.config.enableMCP,
          capabilities: this.capabilities || void 0
        };
      }
    };
  }
});

// ../../packages/memory-client/src/node/index.ts
var node_exports = {};
__export(node_exports, {
  CLIIntegration: () => CLIIntegration,
  EnhancedMemoryClient: () => EnhancedMemoryClient,
  cliIntegration: () => cliIntegration,
  createEnhancedMemoryClient: () => createEnhancedMemoryClient,
  createNodeMemoryClient: () => createNodeMemoryClient
});
var init_node = __esm({
  "../../packages/memory-client/src/node/index.ts"() {
    init_enhanced_client();
    init_cli_integration();
  }
});

// src/chat/MemoryChatParticipant.ts
var MemoryChatParticipant_exports = {};
__export(MemoryChatParticipant_exports, {
  CHAT_PARTICIPANT_ID: () => CHAT_PARTICIPANT_ID,
  SLASH_COMMANDS: () => SLASH_COMMANDS,
  registerMemoryChatParticipant: () => registerMemoryChatParticipant
});
function registerMemoryChatParticipant(context, memoryService) {
  const participant = vscode15.chat.createChatParticipant(
    CHAT_PARTICIPANT_ID,
    createChatRequestHandler(memoryService)
  );
  participant.iconPath = vscode15.Uri.joinPath(context.extensionUri, "images", "icon.png");
  participant.onDidReceiveFeedback((feedback) => {
    console.log("[MemoryChatParticipant] Received feedback:", feedback.kind);
  });
  context.subscriptions.push(participant);
  console.log("[MemoryChatParticipant] @lanonasis chat participant registered");
  return participant;
}
function createChatRequestHandler(memoryService) {
  return async (request, context, stream, token) => {
    const { prompt, command } = request;
    try {
      if (command) {
        return await handleSlashCommand(command, prompt, memoryService, stream, token);
      }
      return await handleSemanticQuery(prompt, memoryService, stream, context, token);
    } catch (error46) {
      stream.markdown(`\u274C **Error:** ${error46 instanceof Error ? error46.message : "An unexpected error occurred"}`);
      return { errorDetails: { message: error46 instanceof Error ? error46.message : "Unknown error" } };
    }
  };
}
async function handleSlashCommand(command, prompt, memoryService, stream, token) {
  switch (command) {
    case "recall":
      return await handleRecallCommand(prompt, memoryService, stream, token);
    case "save":
      return await handleSaveCommand(prompt, stream);
    case "list":
      return await handleListCommand(memoryService, stream, token);
    case "context":
      return await handleContextCommand(prompt, memoryService, stream, token);
    case "refine":
      return await handleRefineCommand(prompt, memoryService, stream, token);
    default:
      stream.markdown(`Unknown command: \`/${command}\`. Available commands: ${SLASH_COMMANDS.map((c) => `/${c.name}`).join(", ")}`);
      return {};
  }
}
async function handleRecallCommand(query, memoryService, stream, token) {
  if (!query.trim()) {
    stream.markdown("Please provide a search query. Example: `@lanonasis /recall how to deploy to production`");
    return {};
  }
  stream.progress("Searching memories...");
  const results = await memoryService.searchMemories(query, { limit: 5 });
  if (token.isCancellationRequested) {
    return { errorDetails: { message: "Search cancelled" } };
  }
  if (results.length === 0) {
    stream.markdown(`No memories found for "${query}". Try a different search term or create new memories.`);
    stream.button({
      command: "lanonasis.createMemoryFromFile",
      title: "\u{1F4DD} Create Memory"
    });
    return {};
  }
  stream.markdown(`## \u{1F9E0} Found ${results.length} relevant memories

`);
  results.forEach((result, index) => {
    stream.markdown(`### ${index + 1}. ${result.title}
`);
    stream.markdown(`${result.content.substring(0, 300)}${result.content.length > 300 ? "..." : ""}

`);
    if (result.tags && result.tags.length > 0) {
      stream.markdown(`*Tags: ${result.tags.join(", ")}*

`);
    }
    stream.markdown("---\n\n");
  });
  stream.button({
    command: "lanonasis.searchMemory",
    title: "\u{1F50D} Search More"
  });
  return {
    metadata: {
      command: "recall",
      resultCount: results.length
    }
  };
}
async function handleSaveCommand(title, stream) {
  const editor = vscode15.window.activeTextEditor;
  if (editor && !editor.selection.isEmpty) {
    stream.markdown("\u{1F4BE} Saving selected text as a memory...\n\n");
    stream.button({
      command: "lanonasis.createMemory",
      title: "\u{1F4DD} Create from Selection"
    });
  } else {
    stream.markdown("To save a memory:\n\n");
    stream.markdown("1. **Select text** in the editor and run `@lanonasis /save`\n");
    stream.markdown("2. Use **Quick Capture** with `\u2318\u21E7S` / `Ctrl+Shift+S`\n");
    stream.markdown("3. Or click below to create from clipboard:\n\n");
    stream.button({
      command: "lanonasis.captureClipboard",
      title: "\u{1F4CB} Capture Clipboard"
    });
  }
  if (title.trim()) {
    stream.markdown(`
*Suggested title: "${title}"*`);
  }
  return {};
}
async function handleListCommand(memoryService, stream, token) {
  stream.progress("Loading memories...");
  const memories = await memoryService.listMemories(10);
  if (token.isCancellationRequested) {
    return { errorDetails: { message: "List cancelled" } };
  }
  if (!memories || memories.length === 0) {
    stream.markdown("\u{1F4ED} No memories found. Start building your memory bank!\n\n");
    stream.button({
      command: "lanonasis.createMemoryFromFile",
      title: "\u{1F4DD} Create First Memory"
    });
    return {};
  }
  stream.markdown(`## \u{1F4DA} Recent Memories (${memories.length})

`);
  memories.forEach((memory, index) => {
    const typeEmoji = getTypeEmoji(memory.memory_type);
    stream.markdown(`${index + 1}. ${typeEmoji} **${memory.title}** - _${memory.memory_type}_
`);
  });
  stream.markdown("\n");
  stream.button({
    command: "lanonasis.searchMemory",
    title: "\u{1F50D} Search Memories"
  });
  return {
    metadata: {
      command: "list",
      count: memories.length
    }
  };
}
async function handleContextCommand(additionalQuery, memoryService, stream, token) {
  const editor = vscode15.window.activeTextEditor;
  const fileName = editor?.document.fileName || "";
  const fileExtension = fileName.split(".").pop() || "";
  const workspaceName = vscode15.workspace.name || "";
  const contextTerms = [];
  if (workspaceName) contextTerms.push(workspaceName);
  if (fileExtension) contextTerms.push(fileExtension);
  if (additionalQuery) contextTerms.push(additionalQuery);
  const query = contextTerms.join(" ") || "development context";
  stream.progress(`Finding relevant context for ${fileName ? `"${fileName.split("/").pop()}"` : "your workspace"}...`);
  const results = await memoryService.searchMemories(query, { limit: 5 });
  if (token.isCancellationRequested) {
    return { errorDetails: { message: "Context search cancelled" } };
  }
  stream.markdown(`## \u{1F4D1} Relevant Context

`);
  if (results.length === 0) {
    stream.markdown(`No relevant memories found for the current context.

`);
    stream.markdown(`*Search terms: ${query}*

`);
  } else {
    stream.markdown(`Found ${results.length} relevant memories:

`);
    results.forEach((result, index) => {
      stream.markdown(`### ${index + 1}. ${result.title}
`);
      stream.markdown(`${result.content.substring(0, 200)}...

`);
    });
  }
  stream.markdown(`
\u{1F4A1} *Tip: Use \`@lanonasis /save\` to save important context for later.*`);
  return {
    metadata: {
      command: "context",
      query,
      resultCount: results.length
    }
  };
}
async function handleSemanticQuery(prompt, memoryService, stream, context, token) {
  if (!prompt.trim()) {
    stream.markdown("\u{1F44B} **Welcome to LanOnasis Memory!**\n\n");
    stream.markdown("I can help you manage your knowledge and context. Try:\n\n");
    stream.markdown("- `@lanonasis /recall <query>` - Search memories\n");
    stream.markdown("- `@lanonasis /save` - Save current selection\n");
    stream.markdown("- `@lanonasis /list` - View recent memories\n");
    stream.markdown("- `@lanonasis /context` - Get context for current file\n\n");
    stream.markdown("Or just ask me anything about your stored knowledge!\n");
    return {};
  }
  stream.progress("Searching your memory bank...");
  const results = await memoryService.searchMemories(prompt, { limit: 5 });
  if (token.isCancellationRequested) {
    return { errorDetails: { message: "Cancelled" } };
  }
  if (results.length === 0) {
    stream.markdown(`I couldn't find any memories related to "${prompt}".

`);
    stream.markdown(`Would you like to:
`);
    stream.button({
      command: "lanonasis.createMemory",
      title: "\u{1F4DD} Create Memory"
    });
    stream.button({
      command: "lanonasis.searchMemory",
      title: "\u{1F50D} Try Different Search"
    });
    return {};
  }
  stream.markdown(`## \u{1F9E0} Based on your memories:

`);
  const topResult = results[0];
  stream.markdown(`**Most relevant:** ${topResult.title}

`);
  stream.markdown(`${topResult.content}

`);
  if (results.length > 1) {
    stream.markdown(`---

**Related memories:**
`);
    results.slice(1).forEach((result, index) => {
      stream.markdown(`${index + 2}. ${result.title}
`);
    });
  }
  const refined = await maybeCallRefineEndpoint(prompt, results);
  if (refined) {
    stream.markdown(`
### \u2728 Refined Prompt Suggestion
\`\`\`
${refined}
\`\`\`
`);
  }
  return {
    metadata: {
      query: prompt,
      resultCount: results.length,
      topMemory: topResult.id
    }
  };
}
function getTypeEmoji(type) {
  const emojiMap = {
    context: "\u{1F4AD}",
    knowledge: "\u{1F4DA}",
    project: "\u{1F4C1}",
    reference: "\u{1F517}",
    personal: "\u{1F464}",
    workflow: "\u2699\uFE0F",
    conversation: "\u{1F4AC}"
  };
  return emojiMap[type] || "\u{1F4DD}";
}
async function handleRefineCommand(prompt, memoryService, stream, token) {
  if (!prompt.trim()) {
    stream.markdown("Paste a prompt to refine. Example: `@lanonasis /refine Generate a deployment checklist`");
    return {};
  }
  stream.progress("Retrieving context for refinement...");
  const results = await memoryService.searchMemories(prompt, { limit: 5 });
  if (token.isCancellationRequested) return { errorDetails: { message: "Refine cancelled" } };
  const refined = await maybeCallRefineEndpoint(prompt, results);
  stream.markdown("### \u2728 Refined Prompt\n");
  stream.markdown("```\n" + refined + "\n```");
  if (results.length) {
    stream.markdown("\n#### Context used\n");
    results.forEach((r, idx) => {
      stream.markdown(`${idx + 1}. ${r.title}${r.tags?.length ? ` \u2014 tags: ${r.tags.join(", ")}` : ""}`);
    });
  }
  return {
    metadata: {
      command: "refine",
      resultCount: results.length
    }
  };
}
function buildRefinedPrompt(prompt, results) {
  const top = results.slice(0, 3).map((r) => `- ${r.title}${r.tags?.length ? ` (tags: ${r.tags.join(", ")})` : ""}`).join("\n");
  const contextBlock = top ? `Context:
${top}

` : "";
  return `${contextBlock}Task: ${prompt}

Please use the above context, be concise, and include any relevant IDs, tags, or steps.`;
}
async function maybeCallRefineEndpoint(prompt, results) {
  const refinedLocal = buildRefinedPrompt(prompt, results);
  const config2 = vscode15.workspace.getConfiguration("lanonasis");
  const endpoint = config2.get("refineEndpoint");
  const apiKey = config2.get("refineApiKey");
  if (!endpoint || !apiKey) {
    return refinedLocal;
  }
  try {
    const payload = {
      prompt,
      context: results.slice(0, 5).map((r) => ({
        title: r.title,
        tags: r.tags,
        snippet: r.content?.substring(0, 500) || ""
      }))
    };
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      return refinedLocal;
    }
    const data = await resp.json();
    const refined = data?.refinedPrompt || data?.refined_prompt || data?.prompt;
    return typeof refined === "string" && refined.trim().length > 0 ? refined : refinedLocal;
  } catch (err) {
    console.warn("[lanonasis] refine endpoint failed, falling back to local prompt builder", err);
    return refinedLocal;
  }
}
var vscode15, CHAT_PARTICIPANT_ID, SLASH_COMMANDS;
var init_MemoryChatParticipant = __esm({
  "src/chat/MemoryChatParticipant.ts"() {
    "use strict";
    vscode15 = __toESM(require("vscode"));
    CHAT_PARTICIPANT_ID = "lanonasis-memory.memory-assistant";
    SLASH_COMMANDS = [
      { name: "recall", description: "Search and recall memories semantically" },
      { name: "save", description: "Save current context or selection as a memory" },
      { name: "list", description: "List recent memories" },
      { name: "context", description: "Get relevant context for current file/project" },
      { name: "refine", description: "Refine a prompt using your memories as context" }
    ];
  }
});

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode16 = __toESM(require("vscode"));

// src/providers/MemoryTreeProvider.ts
var vscode = __toESM(require("vscode"));
var MemoryTreeItem = class extends vscode.TreeItem {
  constructor(memory, collapsibleState) {
    super(memory.title, collapsibleState);
    this.memory = memory;
    this.tooltip = `${memory.title}

Type: ${memory.memory_type}
Created: ${new Date(memory.created_at).toLocaleDateString()}

${memory.content.substring(0, 200)}${memory.content.length > 200 ? "..." : ""}`;
    this.description = memory.memory_type;
    this.contextValue = "memory";
    this.iconPath = this.getIconForMemoryType(memory.memory_type);
    this.command = {
      command: "lanonasis.openMemory",
      title: "Open Memory",
      arguments: [memory]
    };
  }
  getIconForMemoryType(type) {
    switch (type) {
      case "knowledge":
        return new vscode.ThemeIcon("book");
      case "project":
        return new vscode.ThemeIcon("project");
      case "context":
        return new vscode.ThemeIcon("info");
      case "reference":
        return new vscode.ThemeIcon("references");
      default:
        return new vscode.ThemeIcon("file");
    }
  }
};
var MemoryTypeTreeItem = class extends vscode.TreeItem {
  constructor(memoryType, memories, collapsibleState) {
    super(memoryType, collapsibleState);
    this.memoryType = memoryType;
    this.memories = memories;
    this.tooltip = `${memoryType} (${memories.length} memories)`;
    this.description = `${memories.length} memories`;
    this.contextValue = "memoryType";
    this.iconPath = new vscode.ThemeIcon("folder");
  }
};
var MemoryTreeProvider = class {
  constructor(memoryService) {
    this.memoryService = memoryService;
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.memories = [];
    this.loading = false;
    this.authenticated = false;
    this.authenticated = this.memoryService.isAuthenticated();
    if (this.authenticated) {
      void this.loadMemories();
    }
  }
  async loadMemories() {
    if (!this.authenticated) {
      this.memories = [];
      this.loading = false;
      this._onDidChangeTreeData.fire();
      return;
    }
    try {
      this.loading = true;
      this.memories = await this.memoryService.listMemories(100);
    } catch (error46) {
      this.memories = [];
      if (!(error46 instanceof Error && error46.message.includes("Not authenticated"))) {
        vscode.window.showErrorMessage(`Failed to load memories: ${error46 instanceof Error ? error46.message : "Unknown error"}`);
      }
    } finally {
      this.loading = false;
      this._onDidChangeTreeData.fire();
    }
  }
  refresh() {
    if (!this.authenticated) {
      this.clear();
      return;
    }
    void this.loadMemories();
  }
  setAuthenticated(authenticated) {
    this.authenticated = authenticated;
    if (authenticated) {
      void this.loadMemories();
    } else {
      this.clear();
    }
  }
  clear() {
    this.loading = false;
    this.memories = [];
    this._onDidChangeTreeData.fire();
  }
  getTreeItem(element) {
    return element;
  }
  getChildren(element) {
    if (!this.authenticated) {
      return Promise.resolve([]);
    }
    if (this.loading) {
      return Promise.resolve([]);
    }
    if (!element) {
      return Promise.resolve(this.getMemoryTypeGroups());
    }
    if (element instanceof MemoryTypeTreeItem) {
      return Promise.resolve(
        element.memories.map(
          (memory) => new MemoryTreeItem(memory, vscode.TreeItemCollapsibleState.None)
        )
      );
    }
    return Promise.resolve([]);
  }
  getMemoryTypeGroups() {
    const memoryTypes = ["knowledge", "project", "context", "reference", "personal", "workflow"];
    const groups = [];
    for (const type of memoryTypes) {
      const memoriesForType = this.memories.filter((memory) => memory.memory_type === type);
      if (memoriesForType.length > 0) {
        groups.push(new MemoryTypeTreeItem(
          type,
          memoriesForType,
          vscode.TreeItemCollapsibleState.Collapsed
        ));
      }
    }
    return groups;
  }
  getParent(element) {
    if (!this.authenticated) {
      return null;
    }
    if (element instanceof MemoryTreeItem) {
      const memoryType = element.memory.memory_type;
      const memoriesForType = this.memories.filter((memory) => memory.memory_type === memoryType);
      return new MemoryTypeTreeItem(memoryType, memoriesForType, vscode.TreeItemCollapsibleState.Collapsed);
    }
    return null;
  }
};

// src/providers/MemoryCompletionProvider.ts
var vscode2 = __toESM(require("vscode"));
var MemoryCompletionProvider = class {
  // 5 minutes
  constructor(memoryService) {
    this.memoryService = memoryService;
    this.cache = /* @__PURE__ */ new Map();
    this.cacheTimeout = 5 * 60 * 1e3;
  }
  async provideCompletionItems(document, position, _token, context) {
    if (!this.memoryService.isAuthenticated()) {
      return [];
    }
    const line = document.lineAt(position);
    const lineText = line.text.substring(0, position.character);
    const query = this.extractQuery(lineText, context.triggerCharacter);
    if (!query || query.length < 2) {
      return [];
    }
    try {
      const memories = await this.searchWithCache(query);
      return this.createCompletionItems(memories, query, context.triggerCharacter, document.languageId);
    } catch (error46) {
      console.error("Memory completion error:", error46);
      return [];
    }
  }
  extractQuery(lineText, triggerCharacter) {
    if (!triggerCharacter) {
      return "";
    }
    const lastTriggerIndex = lineText.lastIndexOf(triggerCharacter);
    if (lastTriggerIndex === -1) {
      return "";
    }
    return lineText.substring(lastTriggerIndex + 1).trim();
  }
  async searchWithCache(query) {
    const cacheKey = query.toLowerCase();
    const cached2 = this.cache.get(cacheKey);
    if (cached2 && Date.now() - cached2.timestamp < this.cacheTimeout) {
      return cached2.results;
    }
    const results = await this.memoryService.searchMemories(query, {
      limit: 10,
      threshold: 0.6
    });
    this.cache.set(cacheKey, {
      results,
      timestamp: Date.now()
    });
    this.cleanCache();
    return results;
  }
  cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }
  createCompletionItems(memories, _query, triggerCharacter, languageId = "typescript") {
    return memories.map((memory, index) => {
      const item = new vscode2.CompletionItem(
        memory.title,
        vscode2.CompletionItemKind.Snippet
      );
      let insertText;
      let documentation;
      switch (triggerCharacter) {
        case "@":
          insertText = `@memory:${memory.id} (${memory.title})`;
          documentation = `**Memory Reference**

${memory.content.substring(0, 300)}${memory.content.length > 300 ? "..." : ""}`;
          break;
        case "#":
          insertText = this.formatAsComment(memory, languageId);
          documentation = `**Insert Memory as Comment**

${memory.content}`;
          break;
        case "//":
          insertText = this.formatAsSnippet(memory);
          documentation = `**Code Snippet from Memory**

${memory.content}`;
          break;
        default:
          insertText = memory.content;
          documentation = memory.content;
      }
      item.insertText = insertText;
      item.documentation = new vscode2.MarkdownString(documentation);
      item.detail = `${memory.memory_type} \u2022 ${new Date(memory.created_at).toLocaleDateString()} \u2022 Score: ${Math.round(memory.similarity_score * 100)}%`;
      item.filterText = `${memory.title} ${memory.tags?.join(" ")} ${memory.memory_type}`;
      item.sortText = String(1 - memory.similarity_score).padStart(5, "0") + String(index).padStart(3, "0");
      item.command = {
        command: "lanonasis.openMemory",
        title: "Open Memory",
        arguments: [memory]
      };
      return item;
    });
  }
  formatAsComment(memory, languageId) {
    const commentPrefix = this.getCommentPrefix(languageId);
    const lines = memory.content.split("\n");
    return lines.map((line) => `${commentPrefix} ${line}`).join("\n");
  }
  formatAsSnippet(memory) {
    const codeBlockRegex = /```[\s\S]*?```/g;
    const codeBlocks = memory.content.match(codeBlockRegex);
    if (codeBlocks && codeBlocks.length > 0) {
      return codeBlocks[0].replace(/```\w*\n?/g, "").replace(/```$/g, "");
    }
    return memory.content.substring(0, 500);
  }
  getCommentPrefix(languageId) {
    const commentPrefixes = {
      "javascript": "//",
      "typescript": "//",
      "java": "//",
      "c": "//",
      "cpp": "//",
      "csharp": "//",
      "go": "//",
      "rust": "//",
      "swift": "//",
      "kotlin": "//",
      "scala": "//",
      "python": "#",
      "ruby": "#",
      "perl": "#",
      "shell": "#",
      "bash": "#",
      "powershell": "#",
      "yaml": "#",
      "dockerfile": "#",
      "html": "<!--",
      "xml": "<!--",
      "css": "/*",
      "scss": "//",
      "less": "//",
      "sql": "--",
      "lua": "--",
      "vim": '"',
      "r": "#"
    };
    return commentPrefixes[languageId] || "//";
  }
  resolveCompletionItem(item, _token) {
    return item;
  }
};

// src/providers/ApiKeyTreeProvider.ts
var vscode3 = __toESM(require("vscode"));
var ApiKeyTreeItem = class extends vscode3.TreeItem {
  constructor(apiKey, collapsibleState) {
    super(apiKey.name, collapsibleState);
    this.apiKey = apiKey;
    this.tooltip = `${apiKey.name}
Type: ${apiKey.keyType}
Environment: ${apiKey.environment}
Access Level: ${apiKey.accessLevel}`;
    this.description = `${apiKey.environment} \u2022 ${apiKey.keyType}`;
    this.contextValue = "apiKey";
    this.iconPath = this.getIconForKeyType(apiKey.keyType);
    if (apiKey.expiresAt) {
      const expiresAt = new Date(apiKey.expiresAt);
      const now = /* @__PURE__ */ new Date();
      const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
      if (daysUntilExpiry <= 7) {
        this.description += ` \u26A0\uFE0F Expires in ${daysUntilExpiry} days`;
      }
    }
  }
  getIconForKeyType(keyType) {
    const iconMap = {
      "api_key": "key",
      "database_url": "database",
      "oauth_token": "account",
      "certificate": "certificate",
      "ssh_key": "terminal",
      "webhook_secret": "webhook",
      "encryption_key": "shield"
    };
    return new vscode3.ThemeIcon(iconMap[keyType] || "key");
  }
};
var ProjectTreeItem = class extends vscode3.TreeItem {
  constructor(project, collapsibleState) {
    super(project.name, collapsibleState);
    this.project = project;
    this.tooltip = `${project.name}
${project.description || "No description"}
Organization: ${project.organizationId}`;
    this.description = project.description ? project.description.substring(0, 50) + "..." : "No description";
    this.contextValue = "project";
    this.iconPath = new vscode3.ThemeIcon("folder");
  }
};
var ApiKeyTreeProvider = class {
  constructor(apiKeyService) {
    this.apiKeyService = apiKeyService;
    this._onDidChangeTreeData = new vscode3.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.projects = [];
    this.apiKeys = {};
    this.authenticated = false;
  }
  refresh(resetCache = false) {
    if (resetCache) {
      this.clearCache();
    }
    this._onDidChangeTreeData.fire();
  }
  setAuthenticated(authenticated) {
    this.authenticated = authenticated;
    if (!authenticated) {
      this.clear();
    } else {
      this.clear();
      this.refresh();
    }
  }
  clear() {
    this.clearCache();
    this._onDidChangeTreeData.fire();
  }
  getTreeItem(element) {
    return element;
  }
  async getChildren(element) {
    if (!this.authenticated) {
      const authItem = new vscode3.TreeItem("Not authenticated", vscode3.TreeItemCollapsibleState.None);
      authItem.description = "Click to authenticate";
      authItem.iconPath = new vscode3.ThemeIcon("key");
      authItem.contextValue = "notAuthenticated";
      authItem.command = {
        command: "lanonasis.authenticate",
        title: "Authenticate",
        arguments: ["oauth"]
      };
      return [authItem];
    }
    try {
      if (!element) {
        this.projects = await this.apiKeyService.getProjects();
        if (this.projects.length === 0) {
          const emptyItem = new vscode3.TreeItem("No projects found", vscode3.TreeItemCollapsibleState.None);
          emptyItem.description = "Click + to create a project";
          emptyItem.iconPath = new vscode3.ThemeIcon("info");
          emptyItem.contextValue = "empty";
          return [emptyItem];
        }
        return this.projects.map(
          (project) => new ProjectTreeItem(project, vscode3.TreeItemCollapsibleState.Collapsed)
        );
      } else if (element instanceof ProjectTreeItem) {
        const projectId = element.project.id;
        if (!this.apiKeys[projectId]) {
          this.apiKeys[projectId] = await this.apiKeyService.getApiKeys(projectId);
        }
        if (this.apiKeys[projectId].length === 0) {
          const emptyItem = new vscode3.TreeItem("No API keys in this project", vscode3.TreeItemCollapsibleState.None);
          emptyItem.description = "Right-click project to create a key";
          emptyItem.iconPath = new vscode3.ThemeIcon("info");
          emptyItem.contextValue = "empty";
          return [emptyItem];
        }
        return this.apiKeys[projectId].map(
          (apiKey) => new ApiKeyTreeItem(apiKey, vscode3.TreeItemCollapsibleState.None)
        );
      }
    } catch (error46) {
      console.error("Error loading API keys:", error46);
      const errorMsg = error46 instanceof Error ? error46.message : "Unknown error";
      if (errorMsg.includes("401") || errorMsg.includes("No token") || errorMsg.includes("AUTH_TOKEN_MISSING")) {
        const authItem = new vscode3.TreeItem("Authentication required", vscode3.TreeItemCollapsibleState.None);
        authItem.description = "Click to authenticate";
        authItem.iconPath = new vscode3.ThemeIcon("warning");
        authItem.contextValue = "authRequired";
        authItem.command = {
          command: "lanonasis.authenticate",
          title: "Authenticate",
          arguments: ["oauth"]
        };
        authItem.tooltip = `Authentication error: ${errorMsg}`;
        return [authItem];
      }
      if (errorMsg.includes("405") || errorMsg.includes("404") || errorMsg.includes("Not Found")) {
        const notAvailableItem = new vscode3.TreeItem("API Key Management", vscode3.TreeItemCollapsibleState.None);
        notAvailableItem.description = "Not available on this server";
        notAvailableItem.iconPath = new vscode3.ThemeIcon("info");
        notAvailableItem.contextValue = "notAvailable";
        notAvailableItem.tooltip = "The API key management endpoints are not available on the current server. This feature requires the v-secure module.";
        return [notAvailableItem];
      }
      const errorItem = new vscode3.TreeItem("Error loading data", vscode3.TreeItemCollapsibleState.None);
      errorItem.description = errorMsg.length > 50 ? errorMsg.substring(0, 50) + "..." : errorMsg;
      errorItem.iconPath = new vscode3.ThemeIcon("error");
      errorItem.contextValue = "error";
      errorItem.tooltip = errorMsg;
      return [errorItem];
    }
    return [];
  }
  // Utility methods for managing the tree
  async addProject(project) {
    this.projects.push(project);
    this.refresh();
  }
  async updateProject(updatedProject) {
    const index = this.projects.findIndex((p) => p.id === updatedProject.id);
    if (index !== -1) {
      this.projects[index] = updatedProject;
      this.refresh();
    }
  }
  async removeProject(projectId) {
    this.projects = this.projects.filter((p) => p.id !== projectId);
    delete this.apiKeys[projectId];
    this.refresh();
  }
  async addApiKey(projectId, apiKey) {
    if (!this.apiKeys[projectId]) {
      this.apiKeys[projectId] = [];
    }
    this.apiKeys[projectId].push(apiKey);
    this.refresh();
  }
  async updateApiKey(projectId, updatedApiKey) {
    if (this.apiKeys[projectId]) {
      const index = this.apiKeys[projectId].findIndex((k) => k.id === updatedApiKey.id);
      if (index !== -1) {
        this.apiKeys[projectId][index] = updatedApiKey;
        this.refresh();
      }
    }
  }
  async removeApiKey(projectId, apiKeyId) {
    if (this.apiKeys[projectId]) {
      this.apiKeys[projectId] = this.apiKeys[projectId].filter((k) => k.id !== apiKeyId);
      this.refresh();
    }
  }
  // Clear cache when refreshing
  clearCache() {
    this.projects = [];
    this.apiKeys = {};
  }
};

// src/panels/MemorySidebarProvider.ts
var vscode4 = __toESM(require("vscode"));

// src/services/IMemoryService.ts
function isEnhancedMemoryService(service) {
  return typeof service.getCapabilities === "function";
}

// ../../packages/memory-client/src/index.ts
init_client();
init_constants();
init_client();
init_utils();
init_types();
init_client();
var isNode = typeof globalThis !== "undefined" && "process" in globalThis && globalThis.process?.versions?.node;

// src/panels/MemorySidebarProvider.ts
var MemorySidebarProvider = class {
  constructor(_extensionUri, memoryService) {
    this._extensionUri = _extensionUri;
    this.memoryService = memoryService;
    this._cachedMemories = [];
    this._cacheTimestamp = 0;
    this.CACHE_DURATION = 3e4;
    // 30 seconds
    this._pendingStateUpdate = null;
    this._lastState = {};
  }
  static {
    this.viewType = "lanonasis.sidebar";
  }
  resolveWebviewView(webviewView, _context, _token) {
    console.log("[Lanonasis] MemorySidebarProvider.resolveWebviewView called");
    try {
      const activationChannel = vscode4.window.createOutputChannel("Lanonasis Activation");
      activationChannel.appendLine("[Lanonasis] MemorySidebarProvider.resolveWebviewView called");
    } catch {
    }
    try {
      this._view = webviewView;
      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          vscode4.Uri.joinPath(this._extensionUri, "media"),
          vscode4.Uri.joinPath(this._extensionUri, "out"),
          vscode4.Uri.joinPath(this._extensionUri, "images")
        ]
      };
      webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
      webviewView.webview.onDidReceiveMessage(async (data) => {
        try {
          switch (data.type) {
            case "authenticate":
              await vscode4.commands.executeCommand("lanonasis.authenticate", data.mode);
              break;
            case "searchMemories":
              await this.handleSearch(data.query);
              break;
            case "createMemory":
              await this.handleCreateFromWebview(data.payload);
              break;
            case "updateMemory":
              await this.handleUpdateFromWebview(data.id, data.payload);
              break;
            case "deleteMemory":
              await this.handleDeleteFromWebview(data.id);
              break;
            case "bulkDelete":
              await this.handleBulkDeleteFromWebview(data.ids);
              break;
            case "bulkTag":
              await this.handleBulkTagFromWebview(data.ids, data.tags);
              break;
            case "restoreMemory":
              await this.handleCreateFromWebview(data.payload);
              break;
            case "openMemory":
              await vscode4.commands.executeCommand("lanonasis.openMemory", data.memory);
              break;
            case "refresh":
              await this.refresh(true);
              break;
            case "showSettings":
              await vscode4.commands.executeCommand("workbench.action.openSettings", "lanonasis");
              break;
            case "getApiKey":
              await vscode4.env.openExternal(vscode4.Uri.parse("https://api.lanonasis.com"));
              break;
            case "openCommandPalette":
              await vscode4.commands.executeCommand("workbench.action.quickOpen", ">Lanonasis: Authenticate");
              break;
          }
        } catch (error46) {
          console.error("[Lanonasis] Error handling webview message:", error46);
          this._view?.webview.postMessage({
            type: "error",
            message: `Action failed: ${error46 instanceof Error ? error46.message : String(error46)}`
          });
        }
      });
      setTimeout(async () => {
        try {
          const isAuthenticated = this.memoryService.isAuthenticated();
          if (!isAuthenticated) {
            this._view?.webview.postMessage({
              type: "updateState",
              state: {
                authenticated: false,
                memories: [],
                loading: false,
                enhancedMode: false,
                cliVersion: null
              }
            });
            return;
          }
          await this.refresh();
        } catch (error46) {
          console.error("[Lanonasis] Failed to load sidebar:", error46);
          this._view?.webview.postMessage({
            type: "updateState",
            state: {
              authenticated: false,
              memories: [],
              loading: false
            }
          });
        }
      }, 300);
    } catch (error46) {
      console.error("[Lanonasis] Fatal error in resolveWebviewView:", error46);
      vscode4.window.showErrorMessage(`Lanonasis extension failed to load: ${error46 instanceof Error ? error46.message : String(error46)}`);
    }
  }
  async refresh(forceRefresh = false) {
    if (this._view) {
      try {
        const authenticated = this.memoryService.isAuthenticated();
        const now = Date.now();
        const useCache = !forceRefresh && this._cachedMemories.length > 0 && now - this._cacheTimestamp < this.CACHE_DURATION;
        if (useCache) {
          const enhancedInfo2 = isEnhancedMemoryService(this.memoryService) ? this.memoryService.getCapabilities() : null;
          this.sendStateUpdate({
            authenticated,
            memories: this._cachedMemories,
            loading: false,
            enhancedMode: enhancedInfo2?.cliAvailable || false,
            cliVersion: enhancedInfo2?.version || null,
            cached: true
          }, true);
          return;
        }
        if (authenticated) {
          this.sendStateUpdate({ loading: true });
        }
        if (!authenticated) {
          this._cachedMemories = [];
          this._cacheTimestamp = 0;
          this.sendStateUpdate({
            authenticated: false,
            memories: [],
            loading: false,
            enhancedMode: false,
            cliVersion: null
          }, true);
          return;
        }
        const memories = await this.memoryService.listMemories(50);
        const enhancedInfo = isEnhancedMemoryService(this.memoryService) ? this.memoryService.getCapabilities() : null;
        this._cachedMemories = memories;
        this._cacheTimestamp = Date.now();
        this.sendStateUpdate({
          authenticated,
          memories,
          loading: false,
          enhancedMode: enhancedInfo?.cliAvailable || false,
          cliVersion: enhancedInfo?.version || null,
          cached: false
        }, true);
      } catch (error46) {
        const errorMsg = error46 instanceof Error ? error46.message : String(error46);
        if (errorMsg.includes("Not authenticated") || errorMsg.includes("401") || errorMsg.includes("Authentication required")) {
          this._cachedMemories = [];
          this._cacheTimestamp = 0;
          this.sendStateUpdate({
            authenticated: false,
            memories: [],
            loading: false
          }, true);
          return;
        }
        if (this._cachedMemories.length > 0) {
          this._view.webview.postMessage({
            type: "error",
            message: `Failed to refresh: ${errorMsg}. Showing cached data.`
          });
          const enhancedInfo = isEnhancedMemoryService(this.memoryService) ? this.memoryService.getCapabilities() : null;
          this.sendStateUpdate({
            authenticated: true,
            memories: this._cachedMemories,
            loading: false,
            enhancedMode: enhancedInfo?.cliAvailable || false,
            cliVersion: enhancedInfo?.version || null,
            cached: true
          }, true);
        } else {
          this._view.webview.postMessage({
            type: "error",
            message: `Connection failed: ${errorMsg}`
          });
          this.sendStateUpdate({
            authenticated: false,
            memories: [],
            loading: false
          }, true);
        }
      }
    }
  }
  clearCache() {
    this._cachedMemories = [];
    this._cacheTimestamp = 0;
  }
  /**
   * Debounced state update to prevent rapid re-renders that cause blank screen
   * Only sends update if state actually changed
   */
  sendStateUpdate(state, immediate = false) {
    if (this._pendingStateUpdate) {
      clearTimeout(this._pendingStateUpdate);
      this._pendingStateUpdate = null;
    }
    const stateStr = JSON.stringify(state);
    const lastStateStr = JSON.stringify(this._lastState);
    if (stateStr === lastStateStr && !immediate) {
      return;
    }
    const doUpdate = () => {
      this._lastState = state;
      this._view?.webview.postMessage({
        type: "updateState",
        state
      });
    };
    if (immediate) {
      doUpdate();
    } else {
      this._pendingStateUpdate = setTimeout(doUpdate, 50);
    }
  }
  async handleSearch(query) {
    if (!this._view) return;
    if (!this.memoryService.isAuthenticated()) {
      this._view.webview.postMessage({
        type: "updateState",
        state: {
          authenticated: false,
          memories: [],
          loading: false
        }
      });
      return;
    }
    try {
      this._view.webview.postMessage({
        type: "updateState",
        state: { loading: true }
      });
      const results = await this.memoryService.searchMemories(query);
      this._view.webview.postMessage({
        type: "searchResults",
        results,
        query
      });
    } catch (error46) {
      this._view.webview.postMessage({
        type: "error",
        message: error46 instanceof Error ? error46.message : "Search failed"
      });
    } finally {
      this._view.webview.postMessage({
        type: "updateState",
        state: { loading: false }
      });
    }
  }
  async handleCreateFromWebview(payload) {
    if (!this._view) return;
    if (!this.memoryService.isAuthenticated()) {
      this._view.webview.postMessage({
        type: "error",
        message: "Not authenticated. Please sign in first."
      });
      return;
    }
    try {
      const validated = createMemorySchema.parse(payload);
      await this.memoryService.createMemory(validated);
      this._view.webview.postMessage({
        type: "memoryCreated",
        message: "Memory created successfully"
      });
      await this.refresh(true);
    } catch (error46) {
      this._view.webview.postMessage({
        type: "error",
        message: error46 instanceof Error ? error46.message : "Failed to create memory"
      });
    }
  }
  async handleUpdateFromWebview(id, payload) {
    if (!this._view) return;
    if (!this.memoryService.isAuthenticated()) {
      this._view.webview.postMessage({
        type: "error",
        message: "Not authenticated. Please sign in first."
      });
      return;
    }
    try {
      const validated = updateMemorySchema.parse(payload);
      const sanitized = {
        ...validated,
        topic_id: validated.topic_id === null ? void 0 : validated.topic_id,
        project_ref: validated.project_ref === null ? void 0 : validated.project_ref
      };
      await this.memoryService.updateMemory(id, sanitized);
      this._view.webview.postMessage({
        type: "memoryUpdated",
        message: "Memory updated successfully"
      });
      await this.refresh(true);
    } catch (error46) {
      this._view.webview.postMessage({
        type: "error",
        message: error46 instanceof Error ? error46.message : "Failed to update memory"
      });
    }
  }
  async handleDeleteFromWebview(id) {
    if (!this._view) return;
    if (!this.memoryService.isAuthenticated()) {
      this._view.webview.postMessage({
        type: "error",
        message: "Not authenticated. Please sign in first."
      });
      return;
    }
    try {
      await this.memoryService.deleteMemory(id);
      this._view.webview.postMessage({
        type: "memoryDeleted",
        message: "Memory deleted successfully"
      });
      await this.refresh(true);
    } catch (error46) {
      this._view.webview.postMessage({
        type: "error",
        message: error46 instanceof Error ? error46.message : "Failed to delete memory"
      });
    }
  }
  async handleBulkDeleteFromWebview(ids) {
    if (!this._view) return;
    if (!this.memoryService.isAuthenticated()) {
      this._view.webview.postMessage({
        type: "error",
        message: "Not authenticated. Please sign in first."
      });
      return;
    }
    try {
      const results = await Promise.allSettled(
        ids.map((id) => this.memoryService.deleteMemory(id))
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      const succeeded = results.length - failed;
      this._view.webview.postMessage({
        type: "bulkDeleteComplete",
        message: `Deleted ${succeeded} memories${failed > 0 ? `, ${failed} failed` : ""}`
      });
      await this.refresh(true);
    } catch (error46) {
      this._view.webview.postMessage({
        type: "error",
        message: error46 instanceof Error ? error46.message : "Failed to delete memories"
      });
    }
  }
  async handleBulkTagFromWebview(ids, tags) {
    if (!this._view) return;
    if (!this.memoryService.isAuthenticated()) {
      this._view.webview.postMessage({
        type: "error",
        message: "Not authenticated. Please sign in first."
      });
      return;
    }
    try {
      const results = await Promise.allSettled(
        ids.map((id) => this.memoryService.updateMemory(id, { tags }))
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      const succeeded = results.length - failed;
      this._view.webview.postMessage({
        type: "bulkTagComplete",
        message: `Updated tags for ${succeeded} memories${failed > 0 ? `, ${failed} failed` : ""}`
      });
      await this.refresh(true);
    } catch (error46) {
      this._view.webview.postMessage({
        type: "error",
        message: error46 instanceof Error ? error46.message : "Failed to update tags"
      });
    }
  }
  _getHtmlForWebview(webview) {
    const styleUri = webview.asWebviewUri(vscode4.Uri.joinPath(this._extensionUri, "media", "sidebar.css"));
    const scriptUri = webview.asWebviewUri(vscode4.Uri.joinPath(this._extensionUri, "media", "sidebar.js"));
    const nonce = getNonce();
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:; font-src ${webview.cspSource};">
            <link href="${styleUri}" rel="stylesheet">
            <title>Lanonasis Memory</title>
        </head>
        <body>
            <div id="root">
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Loading Lanonasis Memory...</p>
                </div>
            </div>
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
  }
};
function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// src/panels/EnhancedSidebarProvider.ts
var vscode5 = __toESM(require("vscode"));

// src/bridges/PrototypeUIBridge.ts
var PrototypeUIBridge = class {
  constructor(memoryService, cacheBridge) {
    this.memoryService = memoryService;
    this.cacheBridge = cacheBridge;
    this.searchCache = /* @__PURE__ */ new Map();
    this.searchCacheTtlMs = 5 * 60 * 1e3;
  }
  // Map memory types to icon types
  getIconType(type) {
    const iconMap = {
      conversation: "user",
      knowledge: "lightbulb",
      project: "briefcase",
      context: "terminal",
      reference: "hash",
      personal: "user",
      workflow: "settings"
    };
    return iconMap[type] || "terminal";
  }
  // Transform live extension memory to prototype format
  transformToPrototypeFormat(memory) {
    return {
      id: memory.id,
      title: memory.title,
      type: memory.memory_type,
      date: new Date(memory.created_at),
      tags: memory.tags,
      content: memory.content,
      iconType: this.getIconType(memory.memory_type),
      status: memory.status
    };
  }
  // Transform search results to prototype format
  transformSearchResults(results) {
    return results.map((result) => ({
      ...this.transformToPrototypeFormat(result),
      // Include similarity score for search results
      similarityScore: result.similarity_score
    }));
  }
  normalizeSearchQuery(query) {
    return query.trim().toLowerCase();
  }
  getCachedSearch(query) {
    const key = this.normalizeSearchQuery(query);
    const cached2 = this.searchCache.get(key);
    if (!cached2) return null;
    if (Date.now() - cached2.timestamp > this.searchCacheTtlMs) {
      this.searchCache.delete(key);
      return null;
    }
    return cached2.results;
  }
  setSearchCache(query, results) {
    const key = this.normalizeSearchQuery(query);
    this.searchCache.set(key, { timestamp: Date.now(), results });
    if (this.searchCache.size > 20) {
      const oldestKey = this.searchCache.keys().next().value;
      if (oldestKey) {
        this.searchCache.delete(oldestKey);
      }
    }
  }
  clearSearchCache() {
    this.searchCache.clear();
  }
  sortBySimilarity(results) {
    return [...results].sort((a, b) => {
      const aScore = typeof a.similarityScore === "number" ? a.similarityScore : -1;
      const bScore = typeof b.similarityScore === "number" ? b.similarityScore : -1;
      return bScore - aScore;
    });
  }
  // Search memories with prototype interface
  async searchMemories(query) {
    try {
      const cached2 = this.getCachedSearch(query);
      if (cached2) {
        return cached2;
      }
      const results = this.cacheBridge ? await this.cacheBridge.searchMemories(query) : await this.memoryService.searchMemories(query);
      const transformed = this.transformSearchResults(results);
      const sorted = this.sortBySimilarity(transformed);
      this.setSearchCache(query, sorted);
      return sorted;
    } catch (error46) {
      console.error("[PrototypeUIBridge] Search failed:", error46);
      throw new Error(`Search failed: ${error46 instanceof Error ? error46.message : String(error46)}`);
    }
  }
  // Create memory with prototype interface
  async createMemory(memoryData) {
    try {
      const result = await this.memoryService.createMemory(memoryData);
      if (this.cacheBridge) {
        await this.cacheBridge.upsert(result);
      }
      this.clearSearchCache();
      return this.transformToPrototypeFormat(result);
    } catch (error46) {
      console.error("[PrototypeUIBridge] Create memory failed:", error46);
      throw new Error(`Create memory failed: ${error46 instanceof Error ? error46.message : String(error46)}`);
    }
  }
  // Get all memories
  async getAllMemories() {
    try {
      const memories = this.cacheBridge ? await this.cacheBridge.getMemories({ limit: 50 }) : await this.memoryService.listMemories(50);
      return memories.map((memory) => this.transformToPrototypeFormat(memory));
    } catch (error46) {
      console.error("[PrototypeUIBridge] Get memories failed:", error46);
      throw new Error(`Get memories failed: ${error46 instanceof Error ? error46.message : String(error46)}`);
    }
  }
  // Get memory by ID
  async getMemoryById(id) {
    try {
      if (this.cacheBridge) {
        const cached2 = (await this.cacheBridge.getMemories()).find((item) => item.id === id);
        if (cached2) {
          return this.transformToPrototypeFormat(cached2);
        }
      }
      const memory = await this.memoryService.getMemory(id);
      if (memory && this.cacheBridge) {
        await this.cacheBridge.upsert(memory);
      }
      return memory ? this.transformToPrototypeFormat(memory) : null;
    } catch (error46) {
      console.error("[PrototypeUIBridge] Get memory by ID failed:", error46);
      throw new Error(`Get memory failed: ${error46 instanceof Error ? error46.message : String(error46)}`);
    }
  }
  // Update memory (placeholder - not implemented in base service)
  async updateMemory(_id, _updates) {
    try {
      const updated = await this.memoryService.updateMemory(_id, _updates);
      if (this.cacheBridge) {
        await this.cacheBridge.upsert(updated);
      }
      this.clearSearchCache();
      return this.transformToPrototypeFormat(updated);
    } catch (error46) {
      console.error("[PrototypeUIBridge] Update memory failed:", error46);
      throw new Error(`Update memory failed: ${error46 instanceof Error ? error46.message : String(error46)}`);
    }
  }
  // Delete memory (placeholder - not implemented in base service)
  async deleteMemory(_id) {
    try {
      await this.memoryService.deleteMemory(_id);
      if (this.cacheBridge) {
        await this.cacheBridge.remove(_id);
      }
      this.clearSearchCache();
    } catch (error46) {
      console.error("[PrototypeUIBridge] Delete memory failed:", error46);
      throw new Error(`Delete memory failed: ${error46 instanceof Error ? error46.message : String(error46)}`);
    }
  }
  // Check authentication status
  async isAuthenticated() {
    try {
      return await this.memoryService.isAuthenticated();
    } catch (error46) {
      console.error("[PrototypeUIBridge] Auth check failed:", error46);
      return false;
    }
  }
};

// src/panels/EnhancedSidebarProvider.ts
var EnhancedSidebarProvider = class {
  constructor(_extensionUri, memoryService, apiKeyService, cacheBridge, onboardingService, offlineService, offlineQueue) {
    this._extensionUri = _extensionUri;
    this.memoryService = memoryService;
    this.offlineService = offlineService;
    this.offlineQueue = offlineQueue;
    this._bridge = new PrototypeUIBridge(memoryService, cacheBridge);
    this._apiKeyService = apiKeyService;
    this.cacheBridge = cacheBridge;
    this.onboardingService = onboardingService;
  }
  static {
    this.viewType = "lanonasis.sidebar";
  }
  resolveWebviewView(webviewView, _context, _token) {
    console.log("[Lanonasis] EnhancedSidebarProvider.resolveWebviewView called");
    try {
      this._view = webviewView;
      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          vscode5.Uri.joinPath(this._extensionUri, "media"),
          vscode5.Uri.joinPath(this._extensionUri, "out"),
          vscode5.Uri.joinPath(this._extensionUri, "images")
        ]
      };
      webviewView.webview.html = this._getReactHtmlForWebview(webviewView.webview);
      webviewView.webview.onDidReceiveMessage(async (data) => {
        try {
          await this.handleWebviewMessage(data);
        } catch (error46) {
          console.error("[Lanonasis] Enhanced sidebar error:", error46);
          this._view?.webview.postMessage({
            type: "error",
            message: `Action failed: ${error46 instanceof Error ? error46.message : String(error46)}`
          });
        }
      });
      this.sendInitialData().catch((error46) => {
        console.error("[Lanonasis] Failed to load enhanced sidebar:", error46);
        this._view?.webview.postMessage({
          type: "error",
          message: "Failed to load enhanced UI. Falling back to original interface."
        });
      });
    } catch (error46) {
      console.error("[Lanonasis] Enhanced sidebar initialization failed:", error46);
      throw error46;
    }
  }
  async handleWebviewMessage(data) {
    try {
      switch (data.type) {
        case "getAuthState":
          await this.sendAuthState();
          break;
        case "getOnboardingState":
          await this.sendOnboardingState();
          break;
        case "authenticate": {
          const authData = data.data;
          await this.handleAuthentication(authData?.mode);
          break;
        }
        case "logout":
          await this.handleLogout();
          break;
        case "getMemories":
          await this.sendMemories();
          break;
        case "searchMemories":
          await this.handleSearch(data.data);
          break;
        case "updateMemory":
          await this.handleUpdateMemory(data.data);
          break;
        case "deleteMemory":
          await this.handleDeleteMemory(data.data);
          break;
        case "chatQuery":
          await this.handleChatQuery(data.data);
          break;
        case "pasteFromClipboard":
          await this.handlePasteFromClipboard();
          break;
        case "copyToClipboard":
          await this.handleCopyToClipboard(data.data);
          break;
        case "executeCommand":
          await vscode5.commands.executeCommand(data.data);
          break;
        case "completeOnboardingStep":
          await this.handleCompleteOnboardingStep(data.data);
          break;
        case "skipOnboarding":
          await this.handleSkipOnboarding();
          break;
        case "resetOnboarding":
          await this.handleResetOnboarding();
          break;
        case "selectMemory":
          await this.handleMemorySelection(data.data);
          break;
        case "createMemory":
          await this.handleCreateMemory(data.data);
          break;
        case "getApiKeys":
          await this.handleGetApiKeys();
          break;
        case "createApiKey":
          await this.handleCreateApiKey(data.data);
          break;
        case "deleteApiKey":
          await this.handleDeleteApiKey(data.data);
          break;
        case "storeApiKey":
          await this.handleStoreApiKey();
          break;
        case "manageApiKeys":
          await vscode5.commands.executeCommand("lanonasis.manageApiKeys");
          break;
        case "openSettings":
          await vscode5.commands.executeCommand("workbench.action.openSettings", "lanonasis");
          break;
        case "getSidebarPreferences":
          await this.sendSidebarPreferences();
          break;
        case "updateSidebarPreferences":
          await this.handleUpdateSidebarPreferences(data.data);
          break;
        case "getConnectionStatus":
          await this.sendConnectionStatus();
          break;
        case "captureClipboard":
          await this.handleCaptureClipboard();
          break;
        case "saveAsMemory":
          await this.handleSaveAsMemory(data.data);
          break;
        case "getClipboardContent":
          await this.handleGetClipboardContent();
          break;
        default:
          console.warn("[EnhancedSidebarProvider] Unknown message type:", data.type);
      }
    } catch (error46) {
      console.error("[EnhancedSidebarProvider] Message handling error:", error46);
      this._view?.webview.postMessage({
        type: "error",
        data: error46 instanceof Error ? error46.message : String(error46)
      });
    }
  }
  async sendAuthState() {
    try {
      const authPromise = this._bridge.isAuthenticated();
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Auth check timeout")), 5e3)
      );
      const isAuthenticated = await Promise.race([authPromise, timeoutPromise]);
      let user = null;
      if (isAuthenticated && this._apiKeyService) {
        try {
          user = await this._apiKeyService.getUserInfo();
        } catch (error46) {
          console.warn("[EnhancedSidebarProvider] Failed to fetch user profile:", error46);
        }
      }
      this._view?.webview.postMessage({
        type: "authState",
        data: { authenticated: isAuthenticated, user }
      });
    } catch (error46) {
      console.warn("[EnhancedSidebarProvider] Auth check failed:", error46);
      this._view?.webview.postMessage({
        type: "authState",
        data: { authenticated: false, user: null, error: "Failed to check authentication state" }
      });
    }
  }
  async sendOnboardingState() {
    if (!this.onboardingService) {
      return;
    }
    const status = await this.onboardingService.getStatus();
    this._view?.webview.postMessage({
      type: "onboardingState",
      data: status
    });
  }
  async handleLogout() {
    try {
      await vscode5.commands.executeCommand("lanonasis.logout");
      await this.sendAuthState();
    } catch (error46) {
      this._view?.webview.postMessage({
        type: "error",
        data: "Logout failed: " + (error46 instanceof Error ? error46.message : String(error46))
      });
    }
  }
  async handleAuthentication(mode) {
    try {
      this._view?.webview.postMessage({
        type: "authLoading",
        data: true
      });
      await vscode5.commands.executeCommand("lanonasis.authenticate", mode);
      setTimeout(async () => {
        await this.sendAuthState();
        await this.sendMemories();
        this._view?.webview.postMessage({
          type: "authLoading",
          data: false
        });
      }, 1e3);
    } catch (error46) {
      this._view?.webview.postMessage({
        type: "error",
        data: "Authentication failed: " + (error46 instanceof Error ? error46.message : String(error46))
      });
      this._view?.webview.postMessage({
        type: "authLoading",
        data: false
      });
    }
  }
  async handleCompleteOnboardingStep(payload) {
    if (!this.onboardingService) {
      return;
    }
    await this.onboardingService.markStepComplete(payload.step);
    await this.sendOnboardingState();
  }
  async handleSkipOnboarding() {
    if (!this.onboardingService) {
      return;
    }
    await this.onboardingService.skip();
    await this.sendOnboardingState();
  }
  async handleResetOnboarding() {
    if (!this.onboardingService) {
      return;
    }
    await this.onboardingService.reset();
    await this.sendOnboardingState();
  }
  async updateOnboardingStep(step) {
    if (!this.onboardingService) {
      return;
    }
    try {
      await this.onboardingService.markStepComplete(step);
      await this.sendOnboardingState();
    } catch (error46) {
      console.warn("[EnhancedSidebarProvider] Failed to update onboarding step:", error46);
    }
  }
  async handleChatQuery(queryData) {
    if (!this._view) return;
    const query = typeof queryData === "string" ? queryData : queryData.query;
    const attachedMemories = typeof queryData === "object" && queryData.attachedMemories ? queryData.attachedMemories : [];
    try {
      this._view.webview.postMessage({
        type: "chatLoading",
        data: true
      });
      let attachedContext = "";
      if (attachedMemories.length > 0) {
        attachedContext = "\n\n## Attached Context:\n" + attachedMemories.map(
          (m, i) => `**${i + 1}. ${m.title}**
${m.content.substring(0, 500)}${m.content.length > 500 ? "..." : ""}`
        ).join("\n\n");
      }
      const searchResults = await this._bridge.searchMemories(query);
      const attachedMemoryIds = attachedMemories.map((m) => m.id);
      const response = this.formatChatResponse(query, searchResults, attachedContext);
      this._view.webview.postMessage({
        type: "chatResponse",
        data: {
          query,
          response,
          memories: searchResults.slice(0, 5),
          // Include top 5 relevant memories
          attachedMemoryIds
        }
      });
    } catch (error46) {
      this._view.webview.postMessage({
        type: "chatError",
        data: `Failed to process query: ${error46 instanceof Error ? error46.message : String(error46)}`
      });
    } finally {
      this._view.webview.postMessage({
        type: "chatLoading",
        data: false
      });
    }
  }
  formatChatResponse(query, memories, attachedContext) {
    let response = "";
    if (attachedContext) {
      response += `\u{1F4CE} **Using your attached context:**
${attachedContext}

---

`;
    }
    if (memories.length === 0 && !attachedContext) {
      return `I couldn't find any memories related to "${query}". Would you like me to help you create one?`;
    }
    if (memories.length === 0 && attachedContext) {
      response += `Based on your attached context, I can help with "${query}".

`;
      response += `No additional related memories were found in your memory bank.`;
      return response;
    }
    const topMemory = memories[0];
    response += `Found **${memories.length}** relevant ${memories.length > 1 ? "memories" : "memory"} for "${query}":

`;
    response += `**Most relevant:** ${topMemory.title}
`;
    response += `${topMemory.content.substring(0, 300)}${topMemory.content.length > 300 ? "..." : ""}

`;
    if (memories.length > 1) {
      response += `**Other related memories:**
`;
      memories.slice(1, 4).forEach((mem, idx) => {
        response += `${idx + 2}. ${mem.title}
`;
      });
    }
    return response;
  }
  async handleGetApiKeys() {
    try {
      let apiKeys = [];
      if (this._apiKeyService) {
        try {
          apiKeys = await this._apiKeyService.getApiKeys();
        } catch (error46) {
          console.warn("[EnhancedSidebarProvider] Failed to fetch API keys from service:", error46);
        }
      }
      const transformedKeys = apiKeys.map((key) => {
        const lastUsedAt = key.lastUsed ?? key.lastUsedAt ?? key.createdAt;
        return {
          id: key.id || key.keyId || String(Math.random()),
          name: key.name || "Unnamed Key",
          scope: key.scope || key.accessLevel || key.keyType || "read,write",
          lastUsed: lastUsedAt ? this.formatLastUsed(lastUsedAt) : "Never"
        };
      });
      this._view?.webview.postMessage({
        type: "apiKeys",
        data: transformedKeys
      });
    } catch {
      console.warn("[EnhancedSidebarProvider] Failed to fetch API keys");
      this._view?.webview.postMessage({
        type: "apiKeys",
        data: []
      });
      this._view?.webview.postMessage({
        type: "apiKeyError",
        data: "Unable to load API keys. Please check your connection or authentication."
      });
    }
  }
  formatLastUsed(date5) {
    try {
      const dateObj = typeof date5 === "string" ? new Date(date5) : date5;
      const now = /* @__PURE__ */ new Date();
      const diffMs = now.getTime() - dateObj.getTime();
      const diffMins = Math.floor(diffMs / 6e4);
      const diffHours = Math.floor(diffMs / 36e5);
      const diffDays = Math.floor(diffMs / 864e5);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
      return dateObj.toLocaleDateString();
    } catch {
      return "Unknown";
    }
  }
  async handleCreateApiKey(_keyData) {
    try {
      await vscode5.commands.executeCommand("lanonasis.createApiKey");
      await this.handleGetApiKeys();
      this._view?.webview.postMessage({
        type: "apiKeyCreated",
        data: { success: true, message: "API key created." }
      });
    } catch (error46) {
      this._view?.webview.postMessage({
        type: "apiKeyError",
        data: "Failed to create API key: " + (error46 instanceof Error ? error46.message : String(error46))
      });
    }
  }
  async handleDeleteApiKey(keyId) {
    try {
      if (this._apiKeyService && keyId) {
        await this._apiKeyService.deleteApiKey(keyId);
      } else {
        await vscode5.commands.executeCommand("lanonasis.refreshApiKeys");
      }
      await this.handleGetApiKeys();
      this._view?.webview.postMessage({
        type: "apiKeyDeleted",
        data: { success: true, message: "API key deleted." }
      });
    } catch (error46) {
      this._view?.webview.postMessage({
        type: "apiKeyError",
        data: "Failed to delete API key: " + (error46 instanceof Error ? error46.message : String(error46))
      });
    }
  }
  async handleStoreApiKey() {
    try {
      await vscode5.commands.executeCommand("lanonasis.authenticate", "apikey");
      await this.sendAuthState();
    } catch (error46) {
      this._view?.webview.postMessage({
        type: "apiKeyError",
        data: "Failed to store API key: " + (error46 instanceof Error ? error46.message : String(error46))
      });
    }
  }
  async handleCaptureClipboard() {
    try {
      const clipboardContent = await vscode5.env.clipboard.readText();
      if (!clipboardContent.trim()) {
        this._view?.webview.postMessage({
          type: "clipboardError",
          data: "Clipboard is empty"
        });
        return;
      }
      const title = await vscode5.window.showInputBox({
        prompt: "Title for this memory",
        placeHolder: "Enter a title...",
        value: clipboardContent.substring(0, 50).replace(/\n/g, " ")
      });
      if (title) {
        const memory = await this._bridge.createMemory({
          title,
          content: clipboardContent,
          memory_type: "context",
          tags: ["clipboard", "captured"]
        });
        this._view?.webview.postMessage({
          type: "memoryCaptured",
          data: memory
        });
        vscode5.window.showInformationMessage("\u{1F4DD} Memory captured from clipboard!");
        await this.sendMemories();
      }
    } catch (error46) {
      this._view?.webview.postMessage({
        type: "clipboardError",
        data: "Failed to capture clipboard: " + (error46 instanceof Error ? error46.message : String(error46))
      });
    }
  }
  async handleGetClipboardContent() {
    try {
      const clipboardContent = await vscode5.env.clipboard.readText();
      this._view?.webview.postMessage({
        type: "clipboardContent",
        data: clipboardContent
      });
    } catch (error46) {
      this._view?.webview.postMessage({
        type: "clipboardError",
        data: "Failed to read clipboard: " + (error46 instanceof Error ? error46.message : String(error46))
      });
    }
  }
  async handlePasteFromClipboard() {
    try {
      const clipboardContent = await vscode5.env.clipboard.readText();
      if (!clipboardContent || !clipboardContent.trim()) {
        vscode5.window.showWarningMessage("Clipboard is empty");
        return;
      }
      this._view?.webview.postMessage({
        type: "clipboardContent",
        data: clipboardContent
      });
      vscode5.window.showInformationMessage(
        `Clipboard content ready (${clipboardContent.length} chars)`,
        "Create Memory"
      ).then((action) => {
        if (action === "Create Memory") {
          vscode5.commands.executeCommand("lanonasis.captureClipboard");
        }
      });
    } catch (error46) {
      this._view?.webview.postMessage({
        type: "error",
        data: "Failed to read clipboard: " + (error46 instanceof Error ? error46.message : String(error46))
      });
    }
  }
  async handleCopyToClipboard(text) {
    try {
      if (!text) {
        vscode5.window.showWarningMessage("Nothing to copy");
        return;
      }
      await vscode5.env.clipboard.writeText(text);
      this._view?.webview.postMessage({
        type: "copySuccess",
        data: true
      });
      vscode5.window.setStatusBarMessage("\u{1F4CB} Copied to clipboard", 2e3);
    } catch (error46) {
      this._view?.webview.postMessage({
        type: "error",
        data: "Failed to copy: " + (error46 instanceof Error ? error46.message : String(error46))
      });
    }
  }
  async handleSaveAsMemory(data) {
    try {
      const defaultTitle = data.content.substring(0, 50).replace(/\n/g, " ").trim();
      const title = await vscode5.window.showInputBox({
        prompt: "Title for this memory",
        placeHolder: "Enter a title...",
        value: data.title || defaultTitle
      });
      if (!title) return;
      const memoryType = await vscode5.window.showQuickPick(
        ["context", "knowledge", "reference", "project", "personal", "workflow"],
        {
          placeHolder: "Select memory type",
          title: "Memory Type"
        }
      );
      if (!memoryType) return;
      const memory = await this._bridge.createMemory({
        title,
        content: data.content,
        memory_type: memoryType,
        tags: ["chat-response", "ai-generated"]
      });
      this._view?.webview.postMessage({
        type: "memorySaved",
        data: memory
      });
      vscode5.window.showInformationMessage(`\u{1F4BE} Saved as memory: "${title}"`);
      await this.sendMemories();
      await this.updateOnboardingStep("create_memory");
    } catch (error46) {
      this._view?.webview.postMessage({
        type: "error",
        data: "Failed to save memory: " + (error46 instanceof Error ? error46.message : String(error46))
      });
    }
  }
  async handleMemorySelection(memoryId) {
    try {
      const memory = await this._bridge.getMemoryById(memoryId);
      this._view?.webview.postMessage({
        type: "memory",
        data: memory
      });
    } catch (error46) {
      this._view?.webview.postMessage({
        type: "error",
        data: "Failed to load memory: " + (error46 instanceof Error ? error46.message : String(error46))
      });
    }
  }
  async handleCreateMemory(memoryData) {
    try {
      const createMemoryData = {
        title: memoryData.title || "New Memory",
        content: memoryData.content || "",
        memory_type: memoryData.memory_type || "context",
        tags: Array.isArray(memoryData.tags) ? memoryData.tags : [],
        summary: memoryData.summary,
        topic_id: memoryData.topic_id,
        project_ref: memoryData.project_ref,
        metadata: memoryData.metadata
      };
      const memory = await this._bridge.createMemory(createMemoryData);
      this._view?.webview.postMessage({
        type: "memory",
        data: memory
      });
      await this.sendMemories();
      await this.updateOnboardingStep("create_memory");
    } catch (error46) {
      this._view?.webview.postMessage({
        type: "error",
        data: "Failed to create memory: " + (error46 instanceof Error ? error46.message : String(error46))
      });
    }
  }
  async handleUpdateMemory(payload) {
    try {
      const { id, updates } = payload;
      if (!id) {
        throw new Error("Missing memory id");
      }
      const updated = await this._bridge.updateMemory(id, updates);
      this._view?.webview.postMessage({
        type: "memoryUpdated",
        data: updated
      });
      await this.sendMemories();
    } catch (error46) {
      this._view?.webview.postMessage({
        type: "error",
        data: "Failed to update memory: " + (error46 instanceof Error ? error46.message : String(error46))
      });
    }
  }
  async handleDeleteMemory(memoryId) {
    try {
      if (!memoryId) {
        throw new Error("Missing memory id");
      }
      await this._bridge.deleteMemory(memoryId);
      this._view?.webview.postMessage({
        type: "memoryDeleted",
        data: { id: memoryId }
      });
      await this.sendMemories();
    } catch (error46) {
      this._view?.webview.postMessage({
        type: "error",
        data: "Failed to delete memory: " + (error46 instanceof Error ? error46.message : String(error46))
      });
    }
  }
  async sendSidebarPreferences() {
    const config2 = vscode5.workspace.getConfiguration("lanonasis");
    const typeOrder = config2.get("sidebarTypeOrder", []);
    const hiddenTypes = config2.get("sidebarHiddenTypes", []);
    const theme = config2.get("sidebarTheme", "default");
    this._view?.webview.postMessage({
      type: "sidebarPreferences",
      data: { typeOrder, hiddenTypes, theme }
    });
  }
  async handleUpdateSidebarPreferences(preferences) {
    const config2 = vscode5.workspace.getConfiguration("lanonasis");
    if (preferences.typeOrder) {
      await config2.update("sidebarTypeOrder", preferences.typeOrder, vscode5.ConfigurationTarget.Global);
    }
    if (preferences.hiddenTypes) {
      await config2.update("sidebarHiddenTypes", preferences.hiddenTypes, vscode5.ConfigurationTarget.Global);
    }
    if (preferences.theme) {
      await config2.update("sidebarTheme", preferences.theme, vscode5.ConfigurationTarget.Global);
    }
    await this.sendSidebarPreferences();
  }
  async sendConnectionStatus() {
    const capabilities = this.isEnhancedService(this.memoryService) ? this.memoryService.getCapabilities() : null;
    const cacheStatus = this.cacheBridge?.getStatus() ?? null;
    const authenticated = capabilities?.authenticated ?? this.memoryService.isAuthenticated();
    const connectionMode = capabilities?.cliAvailable ? "cli" : "http";
    const offlineStatus = this.offlineService?.getStatus() ?? null;
    const queueStatus = this.offlineQueue?.getStatus() ?? null;
    this._view?.webview.postMessage({
      type: "connectionStatus",
      data: {
        authenticated,
        connectionMode,
        capabilities,
        cacheStatus,
        offline: offlineStatus ? !offlineStatus.online : void 0,
        queueStatus
      }
    });
  }
  isEnhancedService(service) {
    return typeof service.getCapabilities === "function";
  }
  async sendMemories() {
    this._view?.webview.postMessage({
      type: "loading",
      data: true
    });
    try {
      const memoriesPromise = this._bridge.getAllMemories();
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Memory fetch timeout")), 1e4)
      );
      const memories = await Promise.race([memoriesPromise, timeoutPromise]);
      this._view?.webview.postMessage({
        type: "memories",
        data: memories
      });
    } catch (error46) {
      console.warn("[EnhancedSidebarProvider] Failed to fetch memories:", error46);
      this._view?.webview.postMessage({
        type: "memories",
        data: []
      });
      this._view?.webview.postMessage({
        type: "error",
        data: error46 instanceof Error ? error46.message : "Failed to load memories"
      });
    } finally {
      this._view?.webview.postMessage({
        type: "loading",
        data: false
      });
      await this.sendConnectionStatus();
    }
  }
  async handleSearch(query) {
    this._view?.webview.postMessage({
      type: "loading",
      data: true
    });
    try {
      const searchPromise = this._bridge.searchMemories(query);
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Search timeout")), 1e4)
      );
      const results = await Promise.race([searchPromise, timeoutPromise]);
      this._view?.webview.postMessage({
        type: "memories",
        data: results
      });
      await this.updateOnboardingStep("search");
    } catch (error46) {
      console.warn("[EnhancedSidebarProvider] Search failed:", error46);
      this._view?.webview.postMessage({
        type: "memories",
        data: []
      });
      this._view?.webview.postMessage({
        type: "error",
        data: `Search failed: ${error46 instanceof Error ? error46.message : String(error46)}`
      });
    } finally {
      this._view?.webview.postMessage({
        type: "loading",
        data: false
      });
      await this.sendConnectionStatus();
    }
  }
  async sendInitialData() {
    console.log("[EnhancedSidebarProvider] Sending initial data...");
    try {
      await this.sendAuthState();
      await this.sendOnboardingState();
      await this.sendSidebarPreferences();
      await this.sendConnectionStatus();
      await this.sendMemories();
      console.log("[EnhancedSidebarProvider] Initial data sent successfully");
    } catch (error46) {
      console.error("[EnhancedSidebarProvider] Failed to send initial data:", error46);
      this._view?.webview.postMessage({
        type: "loading",
        data: false
      });
      this._view?.webview.postMessage({
        type: "error",
        data: "Failed to initialize. Please refresh or re-authenticate."
      });
    }
  }
  async refresh(_force = false) {
    try {
      if (this._view) {
        await this.sendInitialData();
      }
    } catch (error46) {
      console.error("[Lanonasis] Enhanced refresh failed:", error46);
    }
  }
  _getReactHtmlForWebview(webview) {
    const reactScriptUri = webview.asWebviewUri(vscode5.Uri.joinPath(this._extensionUri, "media", "sidebar-react.js"));
    const styleUri = webview.asWebviewUri(vscode5.Uri.joinPath(this._extensionUri, "media", "react-styles.css"));
    const nonce = this.getNonce();
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:; font-src ${webview.cspSource};">
            <link href="${styleUri}" rel="stylesheet">
            <title>Lanonasis Memory - Enhanced UI</title>
        </head>
        <body>
            <div id="root">
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Loading Enhanced UI...</p>
                </div>
            </div>
            <script nonce="${nonce}">
                // Initialize VS Code API before React loads
                (function() {
                    const vscode = acquireVsCodeApi();
                    window.vscode = vscode;
                })();
            </script>
            <script nonce="${nonce}">
                window.addEventListener('error', (event) => {
                    console.error('Uncaught error:', event.error);
                    window.vscode.postMessage({
                        type: 'reactError',
                        error: event.error.message,
                        stack: event.error.stack
                    });
                });
            </script>
            <script nonce="${nonce}" src="${reactScriptUri}"></script>
        </body>
        </html>`;
  }
  getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
};

// src/services/MemoryService.ts
var vscode6 = __toESM(require("vscode"));
var MemoryService = class {
  constructor(secureApiKeyService) {
    this.client = null;
    this.initializePromise = null;
    this.authenticated = false;
    this.secureApiKeyService = secureApiKeyService;
    this.config = vscode6.workspace.getConfiguration("lanonasis");
    void this.ensureClient();
  }
  async resolveApiKey() {
    if (this.secureApiKeyService) {
      try {
        const secureKey = await this.secureApiKeyService.getApiKey();
        if (secureKey && secureKey.trim().length > 0) {
          return secureKey;
        }
      } catch (error46) {
        console.warn("[MemoryService] Failed to read secure API key", error46);
      }
    }
    const legacyKey = this.config.get("apiKey");
    if (legacyKey && legacyKey.trim().length > 0) {
      return legacyKey;
    }
    return null;
  }
  async loadClient() {
    const apiUrl = this.config.get("apiUrl", "https://api.lanonasis.com");
    const gatewayUrl = this.config.get("gatewayUrl", "https://api.lanonasis.com");
    const useGateway = this.config.get("useGateway", false);
    const effectiveUrl = useGateway ? gatewayUrl : apiUrl;
    let authToken = null;
    let apiKey = null;
    if (this.secureApiKeyService) {
      try {
        const credential = await this.secureApiKeyService.getStoredCredentials();
        console.log("[MemoryService] getStoredCredentials result:", {
          hasCredential: !!credential,
          type: credential?.type,
          tokenLength: credential?.token?.length,
          tokenPrefix: credential?.token?.substring(0, 12)
        });
        if (credential?.type === "oauth") {
          authToken = credential.token;
          console.log("[MemoryService] Using OAuth token");
        } else if (credential?.type === "apiKey") {
          apiKey = credential.token;
          console.log("[MemoryService] Using API key");
        } else if (credential) {
          console.warn("[MemoryService] Unknown credential type:", credential.type);
        }
      } catch (error46) {
        console.warn("[MemoryService] Failed to read stored credentials", error46);
      }
    } else {
      console.warn("[MemoryService] No secureApiKeyService available");
    }
    if (!authToken && !apiKey) {
      apiKey = await this.resolveApiKey();
    }
    if (authToken || apiKey) {
      console.log("[MemoryService] Creating client with:", {
        hasAuthToken: !!authToken,
        hasApiKey: !!apiKey,
        apiKeyPrefix: apiKey ? apiKey.substring(0, 8) + "..." : null,
        apiUrl: effectiveUrl
      });
      this.client = createMemoryClient({
        apiUrl: effectiveUrl,
        authToken: authToken || void 0,
        apiKey: apiKey || void 0,
        timeout: 3e4
      });
      this.authenticated = true;
    } else {
      console.log("[MemoryService] No credentials found - client not created");
      this.client = null;
      this.authenticated = false;
    }
  }
  async ensureClient() {
    if (this.client) {
      return;
    }
    if (!this.initializePromise) {
      this.initializePromise = this.loadClient();
    }
    try {
      await this.initializePromise;
    } finally {
      this.initializePromise = null;
    }
  }
  isAuthenticated() {
    if (!this.client && !this.initializePromise) {
      void this.ensureClient();
    }
    return this.authenticated;
  }
  async testConnection(apiKey) {
    const apiUrl = this.config.get("apiUrl", "https://api.lanonasis.com");
    const gatewayUrl = this.config.get("gatewayUrl", "https://api.lanonasis.com");
    const useGateway = this.config.get("useGateway", false);
    const effectiveUrl = useGateway ? gatewayUrl : apiUrl;
    let testClient = null;
    if (apiKey && apiKey.trim().length > 0) {
      testClient = createMemoryClient({
        apiUrl: effectiveUrl,
        apiKey,
        timeout: 1e4
      });
    } else {
      await this.ensureClient();
      testClient = this.client;
    }
    if (!testClient) {
      throw new Error("No API key configured");
    }
    const response = await testClient.healthCheck();
    if (response.error) {
      throw new Error(this.getErrorMessage(response.error, "Connection test failed"));
    }
  }
  async createMemory(memory) {
    await this.ensureClient();
    const client = this.client;
    if (!client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const response = await client.createMemory(memory);
    if (response.error || !response.data) {
      throw new Error(this.getErrorMessage(response.error, "Failed to create memory"));
    }
    return response.data;
  }
  async updateMemory(id, memory) {
    await this.ensureClient();
    const client = this.client;
    if (!client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const response = await client.updateMemory(id, memory);
    if (response.error || !response.data) {
      throw new Error(this.getErrorMessage(response.error, "Failed to update memory"));
    }
    return response.data;
  }
  async searchMemories(query, options = {}) {
    await this.ensureClient();
    const client = this.client;
    if (!client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const searchRequest = {
      query,
      limit: 20,
      threshold: 0.7,
      status: "active",
      ...options
    };
    const response = await client.searchMemories(searchRequest);
    if (response.error || !response.data) {
      throw new Error(this.getErrorMessage(response.error, "Search failed"));
    }
    return response.data.results;
  }
  async getMemory(id) {
    await this.ensureClient();
    const client = this.client;
    if (!client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const response = await client.getMemory(id);
    if (response.error || !response.data) {
      throw new Error(this.getErrorMessage(response.error, "Memory not found"));
    }
    return response.data;
  }
  async listMemories(limit = 50) {
    await this.ensureClient();
    const client = this.client;
    if (!client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    if (typeof limit !== "number" || limit < 0) {
      throw new Error("limit must be a non-negative number");
    }
    const validatedLimit = Math.min(Math.max(1, Math.floor(limit)), 1e3);
    const response = await client.listMemories({
      limit: validatedLimit,
      sort: "updated_at",
      order: "desc"
    });
    if (response.error || !response.data) {
      const message = this.getErrorMessage(response.error, "Failed to fetch memories");
      if (this.isAuthError(message)) {
        await this.refreshClient();
        if (!this.client) {
          throw new Error(message);
        }
        const retry = await this.client.listMemories({
          limit: validatedLimit,
          sort: "updated_at",
          order: "desc"
        });
        if (retry.error || !retry.data) {
          throw new Error(this.getErrorMessage(retry.error, message));
        }
        return retry.data.data;
      }
      throw new Error(message);
    }
    return response.data.data;
  }
  async deleteMemory(id) {
    await this.ensureClient();
    const client = this.client;
    if (!client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const response = await client.deleteMemory(id);
    if (response.error) {
      throw new Error(this.getErrorMessage(response.error, "Failed to delete memory"));
    }
  }
  async getMemoryStats() {
    await this.ensureClient();
    const client = this.client;
    if (!client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const response = await client.getMemoryStats();
    if (response.error || !response.data) {
      throw new Error(this.getErrorMessage(response.error, "Failed to fetch stats"));
    }
    return response.data;
  }
  async refreshClient() {
    this.config = vscode6.workspace.getConfiguration("lanonasis");
    this.client = null;
    this.authenticated = false;
    await this.ensureClient();
  }
  isAuthError(message) {
    const normalized = message.toLowerCase();
    return normalized.includes("authentication required") || normalized.includes("unauthorized") || normalized.includes("401") || normalized.includes("auth token") || normalized.includes("bearer");
  }
  getErrorMessage(error46, fallback) {
    if (typeof error46 === "string" && error46.trim().length > 0) {
      return error46;
    }
    if (error46 && typeof error46 === "object" && typeof error46.message === "string" && error46.message.trim().length > 0) {
      return error46.message;
    }
    return fallback;
  }
};

// src/services/EnhancedMemoryService.ts
var vscode7 = __toESM(require("vscode"));
var EXTENSION_VERSION = "2.1.1";
function getErrorMessage(error46, fallback) {
  if (!error46) return fallback;
  if (typeof error46 === "string") return error46;
  return error46.message || fallback;
}
var cachedMemoryClientModule;
var attemptedMemoryClientLoad = false;
function getMemoryClientModule() {
  if (!attemptedMemoryClientLoad) {
    attemptedMemoryClientLoad = true;
    try {
      cachedMemoryClientModule = (init_node(), __toCommonJS(node_exports));
    } catch (error46) {
      console.warn("[EnhancedMemoryService] @lanonasis/memory-client/node not available. Falling back to basic service.", error46);
      cachedMemoryClientModule = void 0;
    }
  }
  return cachedMemoryClientModule;
}
var EnhancedMemoryService = class _EnhancedMemoryService {
  constructor(secureApiKeyService) {
    this.client = null;
    this.connectionCapabilities = null;
    const sdkModule = getMemoryClientModule();
    if (!sdkModule) {
      throw new Error("@lanonasis/memory-client/node module not available");
    }
    this.sdk = sdkModule;
    this.secureApiKeyService = secureApiKeyService;
    this.config = vscode7.workspace.getConfiguration("lanonasis");
    this.showPerformanceFeedback = this.config.get("showPerformanceFeedback", false);
    this.statusBarItem = vscode7.window.createStatusBarItem(
      vscode7.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = "lanonasis.showConnectionInfo";
    this.initializeClient();
  }
  async initializeClient() {
    const { createNodeMemoryClient: createNodeMemoryClient2 } = this.sdk;
    const credential = await this.secureApiKeyService.getStoredCredentials();
    if (!credential) {
      this.client = null;
      this.updateStatusBar(false, "No API Key");
      return;
    }
    try {
      const clientConfig = this.buildClientConfigFromCredential(credential);
      const apiUrl = this.config.get("apiUrl", "https://api.lanonasis.com");
      const useGateway = this.config.get("useGateway", true);
      clientConfig.apiUrl = useGateway ? this.config.get("gatewayUrl", "https://api.lanonasis.com") : apiUrl;
      const verbose = this.config.get("verboseLogging", false);
      clientConfig.preferCLI = this.config.get("preferCLI", true);
      clientConfig.enableMCP = this.config.get("enableMCP", true);
      clientConfig.cliDetectionTimeout = this.config.get("cliDetectionTimeout", 2e3);
      clientConfig.fallbackToAPI = true;
      clientConfig.verbose = verbose;
      if (verbose && false) {
        verboseLoggingWarningShown = true;
        console.info(
          "[EnhancedMemoryService] Note: Verbose logging is enabled. Disable via Settings > Lanonasis > Verbose Logging for production use."
        );
      }
      this.client = await createNodeMemoryClient2(clientConfig);
      this.connectionCapabilities = await this.detectCapabilities();
      this.updateStatusBar(true, this.getConnectionStatus());
    } catch (error46) {
      console.warn("Enhanced Memory Service initialization failed:", error46);
      this.client = null;
      this.updateStatusBar(false, "Initialization Failed");
      throw error46;
    }
  }
  async detectCapabilities() {
    if (!this.client) {
      return {
        authenticated: false,
        cliAvailable: false,
        mcpSupport: false,
        goldenContract: false,
        connectionMode: "http"
      };
    }
    try {
      const cliCapabilities = await this.client.getCapabilities();
      const healthResult = await this.client.healthCheck();
      return {
        authenticated: healthResult.error === void 0,
        cliAvailable: cliCapabilities.cliAvailable,
        mcpSupport: cliCapabilities.mcpSupport,
        goldenContract: cliCapabilities.goldenContract,
        version: cliCapabilities.version,
        connectionMode: cliCapabilities.cliAvailable ? cliCapabilities.mcpSupport ? "cli+mcp" : "cli" : "http"
      };
    } catch {
      return {
        authenticated: false,
        cliAvailable: false,
        mcpSupport: false,
        goldenContract: false,
        connectionMode: "http"
      };
    }
  }
  getConnectionStatus() {
    if (!this.connectionCapabilities) return "Unknown";
    if (!this.connectionCapabilities.authenticated) return "Disconnected";
    if (this.connectionCapabilities.connectionMode === "cli+mcp") return "CLI+MCP";
    if (this.connectionCapabilities.connectionMode === "cli") return "CLI";
    return "HTTP API";
  }
  updateStatusBar(connected, status) {
    if (connected) {
      this.statusBarItem.text = `$(database) ${status}`;
      this.statusBarItem.backgroundColor = void 0;
      this.statusBarItem.tooltip = `Lanonasis Memory: Connected via ${status}`;
    } else {
      this.statusBarItem.text = `$(alert) ${status}`;
      this.statusBarItem.backgroundColor = new vscode7.ThemeColor("statusBarItem.errorBackground");
      this.statusBarItem.tooltip = `Lanonasis Memory: ${status}`;
    }
    this.statusBarItem.show();
  }
  async refreshClient() {
    this.config = vscode7.workspace.getConfiguration("lanonasis");
    await this.initializeClient();
  }
  async refreshConfig() {
    await this.refreshClient();
  }
  isAuthenticated() {
    return this.client !== null;
  }
  getCapabilities() {
    if (!this.connectionCapabilities) return null;
    return {
      cliAvailable: this.connectionCapabilities.cliAvailable,
      mcpSupport: this.connectionCapabilities.mcpSupport,
      authenticated: this.connectionCapabilities.authenticated,
      goldenContract: this.connectionCapabilities.goldenContract,
      version: this.connectionCapabilities.version,
      activeTransport: this.connectionCapabilities.connectionMode === "http" ? "http-only" : void 0,
      connectionHealth: this.connectionCapabilities.authenticated ? "healthy" : "disconnected"
    };
  }
  async testConnection(apiKey) {
    const { createNodeMemoryClient: createNodeMemoryClient2 } = this.sdk;
    let testClient = this.client;
    if (apiKey) {
      const config2 = this.buildClientConfigFromCredential({ type: "apiKey", token: apiKey });
      testClient = await createNodeMemoryClient2(config2);
    }
    if (!testClient) {
      const credential = await this.secureApiKeyService.getStoredCredentials();
      if (!credential) {
        throw new Error("No API key configured");
      }
      const config2 = this.buildClientConfigFromCredential(credential);
      testClient = await createNodeMemoryClient2(config2);
    }
    const testRequest = this.toSDKSearchRequest({
      query: "connection test",
      limit: 1,
      status: "active",
      threshold: 0.1
    });
    const result = await testClient.searchMemories(testRequest);
    if (result.error) {
      throw new Error(getErrorMessage(result.error, "Connection test failed"));
    }
    if (!apiKey) {
      this.connectionCapabilities = await this.detectCapabilities();
      this.updateStatusBar(true, this.getConnectionStatus());
    }
  }
  async createMemory(memory) {
    if (!this.client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const sdkMemory = this.toSDKCreateRequest(memory);
    const result = await this.client.createMemory(sdkMemory);
    if (result.error || !result.data) {
      throw new Error(getErrorMessage(result.error, "Failed to create memory"));
    }
    this.showOperationFeedback("create", result);
    return this.convertSDKMemoryEntry(result.data);
  }
  async updateMemory(id, memory) {
    if (!this.client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const sdkMemory = this.toSDKUpdateRequest(memory);
    const result = await this.client.updateMemory(id, sdkMemory);
    if (result.error || !result.data) {
      throw new Error(getErrorMessage(result.error, "Failed to update memory"));
    }
    this.showOperationFeedback("update", result);
    return this.convertSDKMemoryEntry(result.data);
  }
  async searchMemories(query, options = {}) {
    if (!this.client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const searchRequest = {
      query,
      limit: 20,
      threshold: 0.7,
      status: "active",
      ...options
    };
    const sdkSearchRequest = this.toSDKSearchRequest(searchRequest);
    const result = await this.client.searchMemories(sdkSearchRequest);
    if (result.error || !result.data) {
      throw new Error(getErrorMessage(result.error, "Search failed"));
    }
    if (this.config.get("verboseLogging", false)) {
      this.showOperationFeedback("search", result);
    }
    return this.convertSDKSearchResults(result.data.results);
  }
  async getMemory(id) {
    if (!this.client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const result = await this.client.getMemory(id);
    if (result.error || !result.data) {
      throw new Error(getErrorMessage(result.error, "Memory not found"));
    }
    return this.convertSDKMemoryEntry(result.data);
  }
  async listMemories(limit = 50) {
    if (!this.client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    if (typeof limit !== "number" || limit < 0) {
      throw new Error("limit must be a non-negative number");
    }
    const validatedLimit = Math.min(Math.max(1, Math.floor(limit)), 1e3);
    const result = await this.client.listMemories({
      limit: validatedLimit,
      sort: "updated_at",
      order: "desc"
    });
    if (result.error || !result.data) {
      const message = getErrorMessage(result.error, "Failed to fetch memories");
      if (this.isAuthError(message)) {
        await this.refreshClient();
        if (!this.client) {
          throw new Error(message);
        }
        const retry = await this.client.listMemories({
          limit: validatedLimit,
          sort: "updated_at",
          order: "desc"
        });
        if (retry.error || !retry.data) {
          throw new Error(getErrorMessage(retry.error, message));
        }
        return retry.data.data.map((entry) => this.convertSDKMemoryEntry(entry));
      }
      throw new Error(message);
    }
    return result.data.data.map((entry) => this.convertSDKMemoryEntry(entry));
  }
  async deleteMemory(id) {
    if (!this.client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const result = await this.client.deleteMemory(id);
    if (result.error) {
      throw new Error(getErrorMessage(result.error, "Failed to delete memory"));
    }
    this.showOperationFeedback("delete", result);
  }
  async getMemoryStats() {
    if (!this.client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const result = await this.client.getMemoryStats();
    if (result.error || !result.data) {
      throw new Error(getErrorMessage(result.error, "Failed to fetch stats"));
    }
    return this.convertSDKUserMemoryStats(result.data);
  }
  showOperationFeedback(operation, result) {
    if (!this.showPerformanceFeedback) return;
    const source = result.source === "cli" ? result.mcpUsed ? "CLI+MCP" : "CLI" : "API";
    const message = `${operation} completed via ${source}`;
    vscode7.window.setStatusBarMessage(
      `$(check) ${message}`,
      2e3
    );
  }
  async showConnectionInfo() {
    const caps = this.connectionCapabilities;
    if (!caps) {
      vscode7.window.showInformationMessage("Connection status: Unknown");
      return;
    }
    const details = [
      `Connection Mode: ${caps.connectionMode.toUpperCase()}`,
      `Authenticated: ${caps.authenticated ? "\u2705" : "\u274C"}`,
      `CLI Available: ${caps.cliAvailable ? "\u2705" : "\u274C"}`,
      `MCP Support: ${caps.mcpSupport ? "\u2705" : "\u274C"}`,
      `Golden Contract: ${caps.goldenContract ? "\u2705" : "\u274C"}`
    ];
    const message = `Lanonasis Memory Connection Status:

${details.join("\n")}`;
    if (caps.authenticated && caps.cliAvailable) {
      vscode7.window.showInformationMessage(
        `${message}

Connected via ${this.getConnectionStatus()}.`
      );
    } else if (caps.authenticated) {
      vscode7.window.showInformationMessage(
        `${message}

Connected via HTTP API.`
      );
    } else {
      vscode7.window.showWarningMessage(
        `${message}

Please authenticate to access memory features.`
      );
    }
  }
  toSDKCreateRequest(memory) {
    const { memory_type, ...rest } = memory;
    return {
      ...rest,
      memory_type: this.mapMemoryType(memory_type)
    };
  }
  toSDKUpdateRequest(memory) {
    const { memory_type, ...rest } = memory;
    const result = { ...rest };
    if (memory_type !== void 0) {
      result.memory_type = this.mapMemoryType(memory_type);
    }
    return result;
  }
  toSDKSearchRequest(request) {
    const { memory_types, ...rest } = request;
    const sdkTypes = memory_types?.map((type) => this.mapMemoryType(type));
    const sdkRequest = {
      ...rest,
      ...sdkTypes ? { memory_types: sdkTypes } : {}
    };
    return sdkRequest;
  }
  mapMemoryType(vscodeType) {
    const typeMap = {
      knowledge: "knowledge",
      project: "project",
      context: "context",
      reference: "reference",
      personal: "personal",
      workflow: "workflow"
    };
    return typeMap[vscodeType] ?? "context";
  }
  mapMemoryTypeFromSDK(sdkType) {
    const typeMap = {
      context: "context",
      project: "project",
      knowledge: "knowledge",
      reference: "reference",
      personal: "personal",
      workflow: "workflow"
    };
    return typeMap[sdkType] ?? "context";
  }
  convertSDKMemoryEntry(sdkEntry) {
    return {
      ...sdkEntry,
      memory_type: this.mapMemoryTypeFromSDK(sdkEntry.memory_type)
    };
  }
  buildClientConfigFromCredential(credential) {
    const vscodeConfig = vscode7.workspace.getConfiguration("lanonasis");
    const apiUrl = vscodeConfig.get("apiUrl", "https://api.lanonasis.com");
    const config2 = {
      apiUrl,
      apiKey: credential.type === "apiKey" ? credential.token : void 0,
      timeout: 3e4,
      retry: {
        maxRetries: 3,
        retryDelay: 1e3,
        backoff: "exponential"
      },
      headers: {
        "X-Client-Type": "vscode-extension",
        "X-Client-Version": EXTENSION_VERSION,
        "X-Project-Scope": "lanonasis-maas"
        // Required by backend auth middleware
      }
    };
    if (credential.type === "oauth") {
      config2.apiKey = void 0;
      config2.authToken = credential.token;
      try {
        const parts = credential.token.split(".");
        if (parts.length >= 2) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
          if (payload.sub || payload.user_id) {
            config2.userId = payload.sub || payload.user_id;
          }
        }
      } catch {
      }
    }
    const organizationId = vscodeConfig.get("organizationId");
    if (organizationId) {
      config2.headers = {
        ...config2.headers,
        "X-Organization-ID": organizationId
      };
      config2.organizationId = organizationId;
    }
    return config2;
  }
  convertSDKSearchResults(sdkResults) {
    return sdkResults.map((result) => ({
      ...result,
      memory_type: this.mapMemoryTypeFromSDK(result.memory_type)
    }));
  }
  isAuthError(message) {
    const normalized = message.toLowerCase();
    return normalized.includes("authentication required") || normalized.includes("unauthorized") || normalized.includes("401") || normalized.includes("auth token") || normalized.includes("bearer");
  }
  convertSDKUserMemoryStats(stats) {
    const initial = {
      knowledge: 0,
      project: 0,
      context: 0,
      reference: 0,
      personal: 0,
      workflow: 0
    };
    const memoriesByType = { ...initial };
    for (const [key, value] of Object.entries(stats.memories_by_type)) {
      const mappedKey = this.mapMemoryTypeFromSDK(key);
      memoriesByType[mappedKey] = value;
    }
    return {
      ...stats,
      memories_by_type: memoriesByType
    };
  }
  dispose() {
    this.statusBarItem.dispose();
  }
  // Migration helper for existing MemoryService users
  static async migrateFromBasicService(secureApiKeyService) {
    const enhanced = new _EnhancedMemoryService(secureApiKeyService);
    vscode7.window.showInformationMessage(
      "Upgraded to Enhanced Memory Service!",
      "Learn More"
    ).then((selection) => {
      if (selection === "Learn More") {
        vscode7.env.openExternal(vscode7.Uri.parse("https://docs.lanonasis.com/sdk"));
      }
    });
    return enhanced;
  }
};

// src/services/MemoryCache.ts
var CACHE_KEYS = {
  MEMORIES: "lanonasis.memories.cache",
  LAST_SYNC: "lanonasis.memories.lastSync"
};
var MemoryCache = class {
  constructor(context, output) {
    this.context = context;
    this.output = output;
    this.maxSize = 50;
    this.memories = [];
    this.lastSyncAt = null;
    this.isRefreshing = false;
    this.loadFromStorage();
  }
  loadFromStorage() {
    try {
      const cached2 = this.context.globalState.get(CACHE_KEYS.MEMORIES, []);
      const lastSync = this.context.globalState.get(CACHE_KEYS.LAST_SYNC, null);
      this.memories = cached2;
      this.lastSyncAt = lastSync;
      this.trimToLimit();
      this.output.appendLine(`[MemoryCache] Loaded ${this.memories.length} cached memories`);
    } catch (err) {
      this.output.appendLine(`[MemoryCache] Load error: ${err}`);
    }
  }
  async saveToStorage() {
    try {
      await this.context.globalState.update(CACHE_KEYS.MEMORIES, this.memories);
      await this.context.globalState.update(CACHE_KEYS.LAST_SYNC, this.lastSyncAt);
    } catch (err) {
      this.output.appendLine(`[MemoryCache] Save error: ${err}`);
    }
  }
  getStatus() {
    return {
      lastSyncAt: this.lastSyncAt,
      isRefreshing: this.isRefreshing,
      count: this.memories.length
    };
  }
  getMemories(limit = this.maxSize) {
    return [...this.memories].slice(0, limit);
  }
  getMemory(id) {
    return this.memories.find((memory) => memory.id === id);
  }
  setRefreshing(refreshing) {
    this.isRefreshing = refreshing;
  }
  async clear() {
    this.memories = [];
    this.lastSyncAt = null;
    await this.saveToStorage();
  }
  async updateFromApi(memories) {
    this.memories = memories.map((memory) => ({
      ...memory,
      _cachedAt: Date.now()
    }));
    this.trimToLimit();
    this.lastSyncAt = Date.now();
    await this.saveToStorage();
  }
  async upsert(memory) {
    const index = this.memories.findIndex((item) => item.id === memory.id);
    if (index >= 0) {
      this.memories[index] = { ...memory, _cachedAt: Date.now() };
    } else {
      this.memories.unshift({ ...memory, _cachedAt: Date.now() });
    }
    this.trimToLimit();
    await this.saveToStorage();
  }
  async replace(tempId, memory) {
    const index = this.memories.findIndex((item) => item.id === tempId);
    if (index >= 0) {
      this.memories[index] = { ...memory, _cachedAt: Date.now() };
    } else {
      this.memories.unshift({ ...memory, _cachedAt: Date.now() });
    }
    this.trimToLimit();
    await this.saveToStorage();
  }
  async remove(id) {
    this.memories = this.memories.filter((memory) => memory.id !== id);
    await this.saveToStorage();
  }
  searchLocal(query) {
    const q = query.toLowerCase();
    const findPatterns = [
      /find\s+(?:my\s+)?(.+)/i,
      /search\s+(?:for\s+)?(.+)/i,
      /show\s+(?:me\s+)?(.+)/i,
      /get\s+(?:my\s+)?(.+)/i,
      /recall\s+(.+)/i,
      /what\s+(?:was|were|is|are)\s+(?:my\s+)?(.+)/i,
      /where\s+(?:is|are|did)\s+(?:my\s+)?(.+)/i
    ];
    let searchTerms = q;
    for (const pattern of findPatterns) {
      const match = q.match(pattern);
      if (match) {
        searchTerms = match[1] || match[2] || q;
        break;
      }
    }
    const stopWords = ["the", "a", "an", "my", "that", "this", "about", "notes", "note", "memory", "memories"];
    const keywords = searchTerms.split(/\s+/).filter((word) => word.length > 2 && !stopWords.includes(word));
    if (keywords.length === 0) {
      return this.memories.slice(0, 10);
    }
    const scored = this.memories.map((memory) => {
      let score = 0;
      const titleLower = memory.title.toLowerCase();
      const contentLower = memory.content.toLowerCase();
      const tagsLower = memory.tags.map((tag) => tag.toLowerCase());
      for (const keyword of keywords) {
        if (titleLower.includes(keyword)) score += 3;
        if (contentLower.includes(keyword)) score += 1;
        if (tagsLower.some((tag) => tag.includes(keyword))) score += 2;
      }
      return { memory, score };
    });
    return scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 10).map((item) => item.memory);
  }
  trimToLimit() {
    if (this.memories.length <= this.maxSize) return;
    this.memories = [...this.memories].sort((a, b) => (b._cachedAt || 0) - (a._cachedAt || 0)).slice(0, this.maxSize);
  }
};

// src/services/ApiKeyService.ts
var vscode8 = __toESM(require("vscode"));
var ApiKeyService = class {
  constructor(secureApiKeyService) {
    this.baseUrl = "https://api.lanonasis.com";
    this.secureApiKeyService = secureApiKeyService;
    this.config = vscode8.workspace.getConfiguration("lanonasis");
    this.updateConfig();
  }
  updateConfig() {
    const useGateway = this.config.get("useGateway", true);
    const apiUrl = this.config.get("apiUrl", "https://api.lanonasis.com");
    const gatewayUrl = this.config.get("gatewayUrl", "https://api.lanonasis.com");
    this.baseUrl = this.sanitizeBaseUrl(useGateway ? gatewayUrl : apiUrl);
  }
  refreshConfig() {
    this.config = vscode8.workspace.getConfiguration("lanonasis");
    this.updateConfig();
  }
  async makeRequest(endpoint, options = {}) {
    const credentials = await this.resolveCredentials();
    const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url2 = `${this.baseUrl}${normalizedEndpoint}`;
    const authHeaders = credentials.type === "oauth" ? { "Authorization": `Bearer ${credentials.token}` } : { "X-API-Key": credentials.token };
    const response = await fetch(url2, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...options.headers
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    return response.json();
  }
  sanitizeBaseUrl(url2) {
    if (!url2) {
      return "https://api.lanonasis.com";
    }
    let clean = url2.trim();
    clean = clean.replace(/\/+$/, "");
    clean = clean.replace(/\/api\/v1$/i, "").replace(/\/api$/i, "");
    return clean || "https://api.lanonasis.com";
  }
  async resolveCredentials() {
    let credentials = await this.secureApiKeyService.getStoredCredentials();
    if (!credentials) {
      const value = await this.secureApiKeyService.getApiKeyOrPrompt();
      if (!value) {
        throw new Error("API key not configured. Please configure your API key to use Lanonasis services.");
      }
      credentials = await this.secureApiKeyService.getStoredCredentials();
      if (!credentials) {
        credentials = {
          type: this.looksLikeJwt(value) ? "oauth" : "apiKey",
          token: value
        };
      }
    }
    return credentials;
  }
  looksLikeJwt(token) {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return false;
    }
    const jwtSegment = /^[A-Za-z0-9-_]+$/;
    return parts.every((segment) => jwtSegment.test(segment));
  }
  isFallbackableError(error46) {
    const message = error46 instanceof Error ? error46.message : String(error46);
    return message.includes("404") || message.includes("405") || message.includes("Not Found") || message.includes("Method Not Allowed");
  }
  isPostRequiredError(error46) {
    const message = error46 instanceof Error ? error46.message : String(error46);
    return message.includes("Use POST") || message.includes("Method not allowed") || message.includes("Method Not Allowed");
  }
  normalizeApiKeysResponse(response) {
    if (response && typeof response === "object" && "data" in response && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  }
  // ============================================================================
  // PROJECT MANAGEMENT
  // ============================================================================
  async getProjects() {
    return this.makeRequest("/api/v1/projects");
  }
  async getProject(projectId) {
    return this.makeRequest(`/api/v1/projects/${projectId}`);
  }
  async createProject(request) {
    return this.makeRequest("/api/v1/projects", {
      method: "POST",
      body: JSON.stringify(request)
    });
  }
  async updateProject(projectId, updates) {
    return this.makeRequest(`/api/v1/projects/${projectId}`, {
      method: "PUT",
      body: JSON.stringify(updates)
    });
  }
  async deleteProject(projectId) {
    await this.makeRequest(`/api/v1/projects/${projectId}`, {
      method: "DELETE"
    });
  }
  // ============================================================================
  // API KEY MANAGEMENT
  // ============================================================================
  async getApiKeys(projectId) {
    const primaryEndpoint = projectId ? `/api/v1/api-keys?projectId=${encodeURIComponent(projectId)}` : "/api/v1/api-keys";
    const legacyEndpoint = projectId ? `/api/v1/projects/${projectId}/api-keys` : "/api/v1/auth/api-keys";
    try {
      const response = await this.makeRequest(primaryEndpoint);
      return this.normalizeApiKeysResponse(response);
    } catch (error46) {
      if (!this.isFallbackableError(error46)) {
        throw error46;
      }
      try {
        const response = await this.makeRequest(legacyEndpoint);
        return this.normalizeApiKeysResponse(response);
      } catch (legacyError) {
        if (!this.isPostRequiredError(legacyError) || !legacyEndpoint.includes("/auth/api-keys")) {
          throw legacyError;
        }
        const response = await this.makeRequest(legacyEndpoint, {
          method: "POST",
          body: JSON.stringify(projectId ? { projectId } : {})
        });
        return this.normalizeApiKeysResponse(response);
      }
    }
  }
  async getApiKey(keyId) {
    try {
      return await this.makeRequest(`/api/v1/api-keys/${keyId}`);
    } catch (error46) {
      if (!this.isFallbackableError(error46)) {
        throw error46;
      }
      return this.makeRequest(`/api/v1/auth/api-keys/${keyId}`);
    }
  }
  async createApiKey(request) {
    try {
      return await this.makeRequest("/api/v1/api-keys", {
        method: "POST",
        body: JSON.stringify(request)
      });
    } catch (error46) {
      if (!this.isFallbackableError(error46)) {
        throw error46;
      }
      return this.makeRequest("/api/v1/auth/api-keys", {
        method: "POST",
        body: JSON.stringify(request)
      });
    }
  }
  async updateApiKey(keyId, updates) {
    try {
      return await this.makeRequest(`/api/v1/api-keys/${keyId}`, {
        method: "PUT",
        body: JSON.stringify(updates)
      });
    } catch (error46) {
      if (!this.isFallbackableError(error46)) {
        throw error46;
      }
      return this.makeRequest(`/api/v1/auth/api-keys/${keyId}`, {
        method: "PUT",
        body: JSON.stringify(updates)
      });
    }
  }
  async deleteApiKey(keyId) {
    try {
      await this.makeRequest(`/api/v1/api-keys/${keyId}`, {
        method: "DELETE"
      });
    } catch (error46) {
      if (!this.isFallbackableError(error46)) {
        throw error46;
      }
      await this.makeRequest(`/api/v1/auth/api-keys/${keyId}`, {
        method: "DELETE"
      });
    }
  }
  async rotateApiKey(keyId) {
    try {
      return await this.makeRequest(`/api/v1/api-keys/${keyId}/rotate`, {
        method: "POST"
      });
    } catch (error46) {
      if (!this.isFallbackableError(error46)) {
        throw error46;
      }
      return this.makeRequest(`/api/v1/auth/api-keys/${keyId}/rotate`, {
        method: "POST"
      });
    }
  }
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  async testConnection() {
    try {
      const credentials = await this.resolveCredentials();
      if (credentials.type === "oauth") {
        const response = await fetch(`${this.baseUrl}/oauth/introspect`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Bearer ${credentials.token}`
          },
          body: new URLSearchParams({ token: credentials.token })
        });
        if (!response.ok) {
          return false;
        }
        const data = await response.json();
        return data.active === true;
      }
      await this.makeRequest("/health");
      return true;
    } catch {
      return false;
    }
  }
  async getUserInfo() {
    return this.makeRequest("/api/v1/auth/me");
  }
};

// ../../../../node_modules/.bun/zod@3.25.76/node_modules/zod/v3/external.js
var external_exports2 = {};
__export(external_exports2, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER2,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType2,
  ZodAny: () => ZodAny2,
  ZodArray: () => ZodArray2,
  ZodBigInt: () => ZodBigInt2,
  ZodBoolean: () => ZodBoolean2,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch2,
  ZodDate: () => ZodDate2,
  ZodDefault: () => ZodDefault2,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion2,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum2,
  ZodError: () => ZodError2,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind2,
  ZodFunction: () => ZodFunction2,
  ZodIntersection: () => ZodIntersection2,
  ZodIssueCode: () => ZodIssueCode2,
  ZodLazy: () => ZodLazy2,
  ZodLiteral: () => ZodLiteral2,
  ZodMap: () => ZodMap2,
  ZodNaN: () => ZodNaN2,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever2,
  ZodNull: () => ZodNull2,
  ZodNullable: () => ZodNullable2,
  ZodNumber: () => ZodNumber2,
  ZodObject: () => ZodObject2,
  ZodOptional: () => ZodOptional2,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise2,
  ZodReadonly: () => ZodReadonly2,
  ZodRecord: () => ZodRecord2,
  ZodSchema: () => ZodType2,
  ZodSet: () => ZodSet2,
  ZodString: () => ZodString2,
  ZodSymbol: () => ZodSymbol2,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple2,
  ZodType: () => ZodType2,
  ZodUndefined: () => ZodUndefined2,
  ZodUnion: () => ZodUnion2,
  ZodUnknown: () => ZodUnknown2,
  ZodVoid: () => ZodVoid2,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom2,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default2,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap2,
  getParsedType: () => getParsedType2,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap2,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// ../../../../node_modules/.bun/zod@3.25.76/node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs2(_arg) {
  }
  util2.assertIs = assertIs2;
  function assertNever2(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever2;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object2) => {
    const keys = [];
    for (const key in object2) {
      if (Object.prototype.hasOwnProperty.call(object2, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues2(array2, separator = " | ") {
    return array2.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues2;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType2 = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// ../../../../node_modules/.bun/zod@3.25.76/node_modules/zod/v3/ZodError.js
var ZodIssueCode2 = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json2 = JSON.stringify(obj, null, 2);
  return json2.replace(/"([^"]+)":/g, "$1:");
};
var ZodError2 = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue2) {
      return issue2.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error46) => {
      for (const issue2 of error46.issues) {
        if (issue2.code === "invalid_union") {
          issue2.unionErrors.map(processError);
        } else if (issue2.code === "invalid_return_type") {
          processError(issue2.returnTypeError);
        } else if (issue2.code === "invalid_arguments") {
          processError(issue2.argumentsError);
        } else if (issue2.path.length === 0) {
          fieldErrors._errors.push(mapper(issue2));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue2.path.length) {
            const el = issue2.path[i];
            const terminal = i === issue2.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue2));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue2) => issue2.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError2.create = (issues) => {
  const error46 = new ZodError2(issues);
  return error46;
};

// ../../../../node_modules/.bun/zod@3.25.76/node_modules/zod/v3/locales/en.js
var errorMap = (issue2, _ctx) => {
  let message;
  switch (issue2.code) {
    case ZodIssueCode2.invalid_type:
      if (issue2.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue2.expected}, received ${issue2.received}`;
      }
      break;
    case ZodIssueCode2.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue2.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode2.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue2.keys, ", ")}`;
      break;
    case ZodIssueCode2.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode2.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue2.options)}`;
      break;
    case ZodIssueCode2.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue2.options)}, received '${issue2.received}'`;
      break;
    case ZodIssueCode2.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode2.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode2.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode2.invalid_string:
      if (typeof issue2.validation === "object") {
        if ("includes" in issue2.validation) {
          message = `Invalid input: must include "${issue2.validation.includes}"`;
          if (typeof issue2.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue2.validation.position}`;
          }
        } else if ("startsWith" in issue2.validation) {
          message = `Invalid input: must start with "${issue2.validation.startsWith}"`;
        } else if ("endsWith" in issue2.validation) {
          message = `Invalid input: must end with "${issue2.validation.endsWith}"`;
        } else {
          util.assertNever(issue2.validation);
        }
      } else if (issue2.validation !== "regex") {
        message = `Invalid ${issue2.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode2.too_small:
      if (issue2.type === "array")
        message = `Array must contain ${issue2.exact ? "exactly" : issue2.inclusive ? `at least` : `more than`} ${issue2.minimum} element(s)`;
      else if (issue2.type === "string")
        message = `String must contain ${issue2.exact ? "exactly" : issue2.inclusive ? `at least` : `over`} ${issue2.minimum} character(s)`;
      else if (issue2.type === "number")
        message = `Number must be ${issue2.exact ? `exactly equal to ` : issue2.inclusive ? `greater than or equal to ` : `greater than `}${issue2.minimum}`;
      else if (issue2.type === "bigint")
        message = `Number must be ${issue2.exact ? `exactly equal to ` : issue2.inclusive ? `greater than or equal to ` : `greater than `}${issue2.minimum}`;
      else if (issue2.type === "date")
        message = `Date must be ${issue2.exact ? `exactly equal to ` : issue2.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue2.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode2.too_big:
      if (issue2.type === "array")
        message = `Array must contain ${issue2.exact ? `exactly` : issue2.inclusive ? `at most` : `less than`} ${issue2.maximum} element(s)`;
      else if (issue2.type === "string")
        message = `String must contain ${issue2.exact ? `exactly` : issue2.inclusive ? `at most` : `under`} ${issue2.maximum} character(s)`;
      else if (issue2.type === "number")
        message = `Number must be ${issue2.exact ? `exactly` : issue2.inclusive ? `less than or equal to` : `less than`} ${issue2.maximum}`;
      else if (issue2.type === "bigint")
        message = `BigInt must be ${issue2.exact ? `exactly` : issue2.inclusive ? `less than or equal to` : `less than`} ${issue2.maximum}`;
      else if (issue2.type === "date")
        message = `Date must be ${issue2.exact ? `exactly` : issue2.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue2.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode2.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode2.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode2.not_multiple_of:
      message = `Number must be a multiple of ${issue2.multipleOf}`;
      break;
    case ZodIssueCode2.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue2);
  }
  return { message };
};
var en_default2 = errorMap;

// ../../../../node_modules/.bun/zod@3.25.76/node_modules/zod/v3/errors.js
var overrideErrorMap = en_default2;
function setErrorMap2(map2) {
  overrideErrorMap = map2;
}
function getErrorMap2() {
  return overrideErrorMap;
}

// ../../../../node_modules/.bun/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path: path2, errorMaps, issueData } = params;
  const fullPath = [...path2, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map2 of maps) {
    errorMessage = map2(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap2();
  const issue2 = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default2 ? void 0 : en_default2
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue2);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// ../../../../node_modules/.bun/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// ../../../../node_modules/.bun/zod@3.25.76/node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path2, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path2;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error46 = new ZodError2(ctx.common.issues);
        this._error = error46;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType2 = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType2(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType2(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType2(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType2(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType2(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType2(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check2, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check2(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode2.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check2, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check2(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind2.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional2.create(this, this._def);
  }
  nullable() {
    return ZodNullable2.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray2.create(this);
  }
  promise() {
    return ZodPromise2.create(this, this._def);
  }
  or(option) {
    return ZodUnion2.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection2.create(this, incoming, this._def);
  }
  transform(transform2) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind2.ZodEffects,
      effect: { type: "transform", transform: transform2 }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault2({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind2.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind2.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch2({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind2.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly2.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version4) {
  if ((version4 === "v4" || !version4) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version4 === "v6" || !version4) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT2(jwt2, alg) {
  if (!jwtRegex.test(jwt2))
    return false;
  try {
    const [header] = jwt2.split(".");
    if (!header)
      return false;
    const base643 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base643));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version4) {
  if ((version4 === "v4" || !version4) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version4 === "v6" || !version4) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString2 = class _ZodString2 extends ZodType2 {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType8 = this._getType(input);
    if (parsedType8 !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check2 of this._def.checks) {
      if (check2.kind === "min") {
        if (input.data.length < check2.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode2.too_small,
            minimum: check2.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "max") {
        if (input.data.length > check2.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode2.too_big,
            maximum: check2.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "length") {
        const tooBig = input.data.length > check2.value;
        const tooSmall = input.data.length < check2.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode2.too_big,
              maximum: check2.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check2.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode2.too_small,
              minimum: check2.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check2.message
            });
          }
          status.dirty();
        }
      } else if (check2.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode2.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode2.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode2.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode2.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode2.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode2.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode2.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode2.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "regex") {
        check2.regex.lastIndex = 0;
        const testResult = check2.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode2.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "trim") {
        input.data = input.data.trim();
      } else if (check2.kind === "includes") {
        if (!input.data.includes(check2.value, check2.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode2.invalid_string,
            validation: { includes: check2.value, position: check2.position },
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check2.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check2.kind === "startsWith") {
        if (!input.data.startsWith(check2.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode2.invalid_string,
            validation: { startsWith: check2.value },
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "endsWith") {
        if (!input.data.endsWith(check2.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode2.invalid_string,
            validation: { endsWith: check2.value },
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "datetime") {
        const regex = datetimeRegex(check2);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode2.invalid_string,
            validation: "datetime",
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode2.invalid_string,
            validation: "date",
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "time") {
        const regex = timeRegex(check2);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode2.invalid_string,
            validation: "time",
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode2.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "ip") {
        if (!isValidIP(input.data, check2.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode2.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "jwt") {
        if (!isValidJWT2(input.data, check2.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode2.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "cidr") {
        if (!isValidCidr(input.data, check2.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode2.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode2.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode2.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check2);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode2.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check2) {
    return new _ZodString2({
      ...this._def,
      checks: [...this._def.checks, check2]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString2({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString2({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString2({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString2.create = (params) => {
  return new ZodString2({
    checks: [],
    typeName: ZodFirstPartyTypeKind2.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder2(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber2 = class _ZodNumber extends ZodType2 {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType8 = this._getType(input);
    if (parsedType8 !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check2 of this._def.checks) {
      if (check2.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode2.invalid_type,
            expected: "integer",
            received: "float",
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "min") {
        const tooSmall = check2.inclusive ? input.data < check2.value : input.data <= check2.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode2.too_small,
            minimum: check2.value,
            type: "number",
            inclusive: check2.inclusive,
            exact: false,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "max") {
        const tooBig = check2.inclusive ? input.data > check2.value : input.data >= check2.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode2.too_big,
            maximum: check2.value,
            type: "number",
            inclusive: check2.inclusive,
            exact: false,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "multipleOf") {
        if (floatSafeRemainder2(input.data, check2.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode2.not_multiple_of,
            multipleOf: check2.value,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode2.not_finite,
            message: check2.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check2);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check2) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check2]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber2.create = (params) => {
  return new ZodNumber2({
    checks: [],
    typeName: ZodFirstPartyTypeKind2.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt2 = class _ZodBigInt extends ZodType2 {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType8 = this._getType(input);
    if (parsedType8 !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check2 of this._def.checks) {
      if (check2.kind === "min") {
        const tooSmall = check2.inclusive ? input.data < check2.value : input.data <= check2.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode2.too_small,
            type: "bigint",
            minimum: check2.value,
            inclusive: check2.inclusive,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "max") {
        const tooBig = check2.inclusive ? input.data > check2.value : input.data >= check2.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode2.too_big,
            type: "bigint",
            maximum: check2.value,
            inclusive: check2.inclusive,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "multipleOf") {
        if (input.data % check2.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode2.not_multiple_of,
            multipleOf: check2.value,
            message: check2.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check2);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode2.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check2) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check2]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt2.create = (params) => {
  return new ZodBigInt2({
    checks: [],
    typeName: ZodFirstPartyTypeKind2.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean2 = class extends ZodType2 {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType8 = this._getType(input);
    if (parsedType8 !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean2.create = (params) => {
  return new ZodBoolean2({
    typeName: ZodFirstPartyTypeKind2.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate2 = class _ZodDate extends ZodType2 {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType8 = this._getType(input);
    if (parsedType8 !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode2.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check2 of this._def.checks) {
      if (check2.kind === "min") {
        if (input.data.getTime() < check2.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode2.too_small,
            message: check2.message,
            inclusive: true,
            exact: false,
            minimum: check2.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check2.kind === "max") {
        if (input.data.getTime() > check2.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode2.too_big,
            message: check2.message,
            inclusive: true,
            exact: false,
            maximum: check2.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check2);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check2) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check2]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate2.create = (params) => {
  return new ZodDate2({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind2.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol2 = class extends ZodType2 {
  _parse(input) {
    const parsedType8 = this._getType(input);
    if (parsedType8 !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol2.create = (params) => {
  return new ZodSymbol2({
    typeName: ZodFirstPartyTypeKind2.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined2 = class extends ZodType2 {
  _parse(input) {
    const parsedType8 = this._getType(input);
    if (parsedType8 !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined2.create = (params) => {
  return new ZodUndefined2({
    typeName: ZodFirstPartyTypeKind2.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull2 = class extends ZodType2 {
  _parse(input) {
    const parsedType8 = this._getType(input);
    if (parsedType8 !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull2.create = (params) => {
  return new ZodNull2({
    typeName: ZodFirstPartyTypeKind2.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny2 = class extends ZodType2 {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny2.create = (params) => {
  return new ZodAny2({
    typeName: ZodFirstPartyTypeKind2.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown2 = class extends ZodType2 {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown2.create = (params) => {
  return new ZodUnknown2({
    typeName: ZodFirstPartyTypeKind2.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever2 = class extends ZodType2 {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode2.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever2.create = (params) => {
  return new ZodNever2({
    typeName: ZodFirstPartyTypeKind2.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid2 = class extends ZodType2 {
  _parse(input) {
    const parsedType8 = this._getType(input);
    if (parsedType8 !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid2.create = (params) => {
  return new ZodVoid2({
    typeName: ZodFirstPartyTypeKind2.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray2 = class _ZodArray extends ZodType2 {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode2.too_big : ZodIssueCode2.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode2.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode2.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray2.create = (schema, params) => {
  return new ZodArray2({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind2.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject2) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional2.create(deepPartialify(fieldSchema));
    }
    return new ZodObject2({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray2) {
    return new ZodArray2({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional2) {
    return ZodOptional2.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable2) {
    return ZodNullable2.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple2) {
    return ZodTuple2.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject2 = class _ZodObject extends ZodType2 {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType8 = this._getType(input);
    if (parsedType8 !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever2 && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever2) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode2.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue2, ctx) => {
          const defaultError = this._def.errorMap?.(issue2, ctx).message ?? ctx.defaultError;
          if (issue2.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind2.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional2) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject2.create = (shape, params) => {
  return new ZodObject2({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever2.create(),
    typeName: ZodFirstPartyTypeKind2.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject2.strictCreate = (shape, params) => {
  return new ZodObject2({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever2.create(),
    typeName: ZodFirstPartyTypeKind2.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject2.lazycreate = (shape, params) => {
  return new ZodObject2({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever2.create(),
    typeName: ZodFirstPartyTypeKind2.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion2 = class extends ZodType2 {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError2(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode2.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError2(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode2.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion2.create = (types, params) => {
  return new ZodUnion2({
    options: types,
    typeName: ZodFirstPartyTypeKind2.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy2) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral2) {
    return [type.value];
  } else if (type instanceof ZodEnum2) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault2) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined2) {
    return [void 0];
  } else if (type instanceof ZodNull2) {
    return [null];
  } else if (type instanceof ZodOptional2) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable2) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly2) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch2) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion2 = class _ZodDiscriminatedUnion extends ZodType2 {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode2.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind2.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues2(a, b) {
  const aType = getParsedType2(a);
  const bType = getParsedType2(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues2(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues2(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection2 = class extends ZodType2 {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues2(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode2.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection2.create = (left, right, params) => {
  return new ZodIntersection2({
    left,
    right,
    typeName: ZodFirstPartyTypeKind2.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple2 = class _ZodTuple extends ZodType2 {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode2.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode2.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple2.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple2({
    items: schemas,
    typeName: ZodFirstPartyTypeKind2.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord2 = class _ZodRecord extends ZodType2 {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType2) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind2.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString2.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind2.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap2 = class extends ZodType2 {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap2.create = (keyType, valueType, params) => {
  return new ZodMap2({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind2.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet2 = class _ZodSet extends ZodType2 {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode2.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode2.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet2.create = (valueType, params) => {
  return new ZodSet2({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind2.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction2 = class _ZodFunction extends ZodType2 {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error46) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap2(), en_default2].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode2.invalid_arguments,
          argumentsError: error46
        }
      });
    }
    function makeReturnsIssue(returns, error46) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap2(), en_default2].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode2.invalid_return_type,
          returnTypeError: error46
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise2) {
      const me = this;
      return OK(async function(...args) {
        const error46 = new ZodError2([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error46.addIssue(makeArgsIssue(args, e));
          throw error46;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error46.addIssue(makeReturnsIssue(result, e));
          throw error46;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError2([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError2([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple2.create(items).rest(ZodUnknown2.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple2.create([]).rest(ZodUnknown2.create()),
      returns: returns || ZodUnknown2.create(),
      typeName: ZodFirstPartyTypeKind2.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy2 = class extends ZodType2 {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy2.create = (getter, params) => {
  return new ZodLazy2({
    getter,
    typeName: ZodFirstPartyTypeKind2.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral2 = class extends ZodType2 {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode2.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral2.create = (value, params) => {
  return new ZodLiteral2({
    value,
    typeName: ZodFirstPartyTypeKind2.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum2({
    values,
    typeName: ZodFirstPartyTypeKind2.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum2 = class _ZodEnum extends ZodType2 {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode2.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode2.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum2.create = createZodEnum;
var ZodNativeEnum = class extends ZodType2 {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode2.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode2.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind2.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise2 = class extends ZodType2 {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise2.create = (schema, params) => {
  return new ZodPromise2({
    type: schema,
    typeName: ZodFirstPartyTypeKind2.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType2 {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind2.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind2.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess2, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess2 },
    typeName: ZodFirstPartyTypeKind2.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional2 = class extends ZodType2 {
  _parse(input) {
    const parsedType8 = this._getType(input);
    if (parsedType8 === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional2.create = (type, params) => {
  return new ZodOptional2({
    innerType: type,
    typeName: ZodFirstPartyTypeKind2.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable2 = class extends ZodType2 {
  _parse(input) {
    const parsedType8 = this._getType(input);
    if (parsedType8 === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable2.create = (type, params) => {
  return new ZodNullable2({
    innerType: type,
    typeName: ZodFirstPartyTypeKind2.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault2 = class extends ZodType2 {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault2.create = (type, params) => {
  return new ZodDefault2({
    innerType: type,
    typeName: ZodFirstPartyTypeKind2.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch2 = class extends ZodType2 {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError2(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError2(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch2.create = (type, params) => {
  return new ZodCatch2({
    innerType: type,
    typeName: ZodFirstPartyTypeKind2.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN2 = class extends ZodType2 {
  _parse(input) {
    const parsedType8 = this._getType(input);
    if (parsedType8 !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode2.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN2.create = (params) => {
  return new ZodNaN2({
    typeName: ZodFirstPartyTypeKind2.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType2 {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType2 {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind2.ZodPipeline
    });
  }
};
var ZodReadonly2 = class extends ZodType2 {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly2.create = (type, params) => {
  return new ZodReadonly2({
    innerType: type,
    typeName: ZodFirstPartyTypeKind2.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom2(check2, _params = {}, fatal) {
  if (check2)
    return ZodAny2.create().superRefine((data, ctx) => {
      const r = check2(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny2.create();
}
var late = {
  object: ZodObject2.lazycreate
};
var ZodFirstPartyTypeKind2;
(function(ZodFirstPartyTypeKind3) {
  ZodFirstPartyTypeKind3["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind3["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind3["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind3["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind3["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind3["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind3["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind3["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind3["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind3["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind3["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind3["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind3["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind3["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind3["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind3["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind3["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind3["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind3["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind3["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind3["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind3["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind3["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind3["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind3["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind3["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind3["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind3["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind3["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind3["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind3["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind3["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind3["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind3["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind3["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind3["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind2 || (ZodFirstPartyTypeKind2 = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom2((data) => data instanceof cls, params);
var stringType = ZodString2.create;
var numberType = ZodNumber2.create;
var nanType = ZodNaN2.create;
var bigIntType = ZodBigInt2.create;
var booleanType = ZodBoolean2.create;
var dateType = ZodDate2.create;
var symbolType = ZodSymbol2.create;
var undefinedType = ZodUndefined2.create;
var nullType = ZodNull2.create;
var anyType = ZodAny2.create;
var unknownType = ZodUnknown2.create;
var neverType = ZodNever2.create;
var voidType = ZodVoid2.create;
var arrayType = ZodArray2.create;
var objectType = ZodObject2.create;
var strictObjectType = ZodObject2.strictCreate;
var unionType = ZodUnion2.create;
var discriminatedUnionType = ZodDiscriminatedUnion2.create;
var intersectionType = ZodIntersection2.create;
var tupleType = ZodTuple2.create;
var recordType = ZodRecord2.create;
var mapType = ZodMap2.create;
var setType = ZodSet2.create;
var functionType = ZodFunction2.create;
var lazyType = ZodLazy2.create;
var literalType = ZodLiteral2.create;
var enumType = ZodEnum2.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise2.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional2.create;
var nullableType = ZodNullable2.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString2.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber2.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean2.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt2.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate2.create({ ...arg, coerce: true }))
};
var NEVER2 = INVALID;

// ../../packages/ide-extension-core/src/types/memory-aligned.ts
var MemoryType = external_exports2.enum([
  "context",
  "project",
  "knowledge",
  "reference",
  "personal",
  "workflow"
]);
var MemoryEntrySchema = external_exports2.object({
  id: external_exports2.string().uuid(),
  title: external_exports2.string().min(1).max(255),
  content: external_exports2.string().min(1),
  type: MemoryType,
  tags: external_exports2.array(external_exports2.string()).optional().default([]),
  metadata: external_exports2.record(external_exports2.unknown()).optional(),
  createdAt: external_exports2.string().datetime(),
  updatedAt: external_exports2.string().datetime(),
  userId: external_exports2.string().optional(),
  organizationId: external_exports2.string().optional(),
  embedding: external_exports2.array(external_exports2.number()).optional(),
  similarityScore: external_exports2.number().min(0).max(1).optional()
});
var CreateMemoryRequestSchema = external_exports2.object({
  title: external_exports2.string().min(1, "Title is required").max(255, "Title must be less than 255 characters"),
  content: external_exports2.string().min(1, "Content is required"),
  type: MemoryType.default("context"),
  tags: external_exports2.array(external_exports2.string()).optional().default([]),
  metadata: external_exports2.record(external_exports2.unknown()).optional()
});
var UpdateMemoryRequestSchema = external_exports2.object({
  title: external_exports2.string().min(1).max(255).optional(),
  content: external_exports2.string().min(1).optional(),
  type: MemoryType.optional(),
  tags: external_exports2.array(external_exports2.string()).optional(),
  metadata: external_exports2.record(external_exports2.unknown()).optional()
});
var SearchMemoryRequestSchema = external_exports2.object({
  query: external_exports2.string().min(1, "Search query is required"),
  type: MemoryType.optional(),
  tags: external_exports2.array(external_exports2.string()).optional(),
  limit: external_exports2.number().int().min(1).max(100).default(10),
  threshold: external_exports2.number().min(0).max(1).default(0.7),
  dateFrom: external_exports2.string().datetime().optional(),
  dateTo: external_exports2.string().datetime().optional()
});
var ListMemoriesRequestSchema = external_exports2.object({
  type: MemoryType.optional(),
  tags: external_exports2.array(external_exports2.string()).optional(),
  limit: external_exports2.number().int().min(1).max(100).default(50),
  offset: external_exports2.number().int().min(0).default(0),
  sortBy: external_exports2.enum(["createdAt", "updatedAt", "title"]).default("updatedAt"),
  sortOrder: external_exports2.enum(["asc", "desc"]).default("desc")
});

// ../../packages/ide-extension-core/src/types/config.ts
var ExtensionConfigSchema = external_exports2.object({
  // API Configuration
  apiUrl: external_exports2.string().url().default("https://api.lanonasis.com"),
  authUrl: external_exports2.string().url().default("https://auth.lanonasis.com"),
  // CLI Integration
  enableCliIntegration: external_exports2.boolean().default(true),
  cliDetectionTimeout: external_exports2.number().int().min(100).max(5e3).default(1e3),
  // Memory Settings
  defaultMemoryType: external_exports2.enum(["context", "project", "knowledge", "reference", "personal", "workflow"]).default("context"),
  searchLimit: external_exports2.number().int().min(1).max(100).default(10),
  searchThreshold: external_exports2.number().min(0).max(1).default(0.7),
  // Performance Settings
  cacheEnabled: external_exports2.boolean().default(true),
  cacheTtlMinutes: external_exports2.number().int().min(1).max(60).default(5),
  virtualScrollThreshold: external_exports2.number().int().min(10).max(1e3).default(50),
  // UI Settings
  enableAccessibilityFeatures: external_exports2.boolean().default(true),
  showRelevanceScores: external_exports2.boolean().default(true),
  highlightMatchingTerms: external_exports2.boolean().default(true),
  // Offline Settings
  enableOfflineMode: external_exports2.boolean().default(true),
  offlineQueueMaxSize: external_exports2.number().int().min(10).max(1e3).default(100),
  // Telemetry Settings
  enableTelemetry: external_exports2.boolean().default(false),
  // Advanced Settings
  logLevel: external_exports2.enum(["debug", "info", "warn", "error"]).default("info"),
  enableDiagnostics: external_exports2.boolean().default(false)
});

// ../../packages/ide-extension-core/src/adapters/VSCodeAdapter.ts
var VSCodeSecureStorage = class {
  constructor(context) {
    this.context = context;
  }
  async store(key, value) {
    await this.context.secrets.store(key, value);
  }
  async get(key) {
    return await this.context.secrets.get(key);
  }
  async delete(key) {
    await this.context.secrets.delete(key);
  }
};
var VSCodeOutputChannelAdapter = class {
  constructor(channel) {
    this.channel = channel;
  }
  appendLine(message) {
    this.channel.appendLine(message);
  }
  show(preserveFocus) {
    this.channel.show(preserveFocus);
  }
  clear() {
    this.channel.clear();
  }
  dispose() {
    this.channel.dispose();
  }
};
var VSCodeContext = class {
  constructor(context) {
    this.context = context;
  }
  get extensionPath() {
    return this.context.extensionPath;
  }
  get globalStoragePath() {
    return this.context.globalStorageUri.fsPath;
  }
  get workspaceStoragePath() {
    return void 0;
  }
  getGlobalState(key) {
    return this.context.globalState.get(key);
  }
  async setGlobalState(key, value) {
    await this.context.globalState.update(key, value);
  }
  getWorkspaceState(key) {
    return this.context.workspaceState.get(key);
  }
  async setWorkspaceState(key, value) {
    await this.context.workspaceState.update(key, value);
  }
  subscribeToDisposal(disposable) {
    this.context.subscriptions.push(disposable);
  }
};
var VSCodeNotification = class {
  constructor(vscode17) {
    this.vscode = vscode17;
  }
  async showInformation(message, ...actions) {
    return await this.vscode.window.showInformationMessage(message, ...actions);
  }
  async showWarning(message, ...actions) {
    return await this.vscode.window.showWarningMessage(message, ...actions);
  }
  async showError(message, ...actions) {
    return await this.vscode.window.showErrorMessage(message, ...actions);
  }
  async showProgress(title, task) {
    return await this.vscode.window.withProgress(
      {
        location: this.vscode.ProgressLocation.Notification,
        title,
        cancellable: false
      },
      async (progress) => {
        return await task(progress);
      }
    );
  }
};
var VSCodeInputBox = class {
  constructor(vscode17) {
    this.vscode = vscode17;
  }
  async showInputBox(options) {
    return await this.vscode.window.showInputBox({
      ...options,
      ignoreFocusOut: true
    });
  }
  async showQuickPick(items, options) {
    return await this.vscode.window.showQuickPick(items, options);
  }
};
var VSCodeBrowser = class {
  constructor(vscode17) {
    this.vscode = vscode17;
  }
  async openExternal(url2) {
    return await this.vscode.env.openExternal(this.vscode.Uri.parse(url2));
  }
};
var VSCodeConfiguration = class {
  constructor(vscode17) {
    this.vscode = vscode17;
  }
  get(section, defaultValue) {
    const config2 = this.vscode.workspace.getConfiguration();
    return config2.get(section, defaultValue);
  }
  async update(section, value, global = true) {
    const config2 = this.vscode.workspace.getConfiguration();
    await config2.update(
      section,
      value,
      global ? this.vscode.ConfigurationTarget.Global : void 0
    );
  }
  has(section) {
    const config2 = this.vscode.workspace.getConfiguration();
    return config2.has(section);
  }
};
var VSCodeAdapter = class {
  constructor(vscodeContext, outputChannel, vscode17, branding) {
    this.secureStorage = new VSCodeSecureStorage(vscodeContext);
    this.outputChannel = new VSCodeOutputChannelAdapter(outputChannel);
    this.context = new VSCodeContext(vscodeContext);
    this.notification = new VSCodeNotification(vscode17);
    this.input = new VSCodeInputBox(vscode17);
    this.browser = new VSCodeBrowser(vscode17);
    this.configuration = new VSCodeConfiguration(vscode17);
    this.branding = branding;
  }
  getConfig() {
    const apiUrl = this.configuration.get("lanonasis.apiUrl");
    const authUrl = this.configuration.get("lanonasis.authUrl");
    const enableCliIntegration = this.configuration.get("lanonasis.enableCliIntegration");
    const defaultMemoryType = this.configuration.get("lanonasis.defaultMemoryType");
    const searchLimit = this.configuration.get("lanonasis.searchLimit");
    const searchThreshold = this.configuration.get("lanonasis.searchThreshold");
    const logLevel = this.configuration.get("lanonasis.logLevel");
    const result = ExtensionConfigSchema.safeParse({
      apiUrl,
      authUrl,
      enableCliIntegration,
      defaultMemoryType,
      searchLimit,
      searchThreshold,
      logLevel
    });
    return result.success ? result.data : ExtensionConfigSchema.parse({});
  }
};
var createVSCodeAdapter = (nativeContext, branding) => {
  const context = nativeContext.context;
  const outputChannel = nativeContext.outputChannel;
  const vscode17 = nativeContext.vscode;
  return new VSCodeAdapter(context, outputChannel, vscode17, branding);
};

// ../../packages/ide-extension-core/src/services/SecureApiKeyService.ts
var http = __toESM(require("http"));
var import_url = require("url");

// ../../packages/ide-extension-core/src/utils/crypto.ts
var crypto = __toESM(require("crypto"));
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString("base64url");
}
function generateCodeChallenge(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}
function generateState() {
  return crypto.randomBytes(16).toString("hex");
}
function looksLikeJwt(value) {
  const parts = value.split(".");
  if (parts.length !== 3) {
    return false;
  }
  const jwtSegment = /^[A-Za-z0-9-_]+$/;
  return parts.every((segment) => jwtSegment.test(segment));
}
function isSha256Hash(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value.trim());
}
function hashApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== "string") {
    throw new Error("API key must be a non-empty string");
  }
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}
function ensureApiKeyHash(apiKey) {
  if (isSha256Hash(apiKey)) {
    return apiKey.toLowerCase();
  }
  return hashApiKey(apiKey);
}

// ../../packages/ide-extension-core/src/services/SecureApiKeyService.ts
var SecureApiKeyService = class _SecureApiKeyService {
  constructor(adapter) {
    this.migrationCompleted = false;
    this.adapter = adapter;
  }
  static {
    this.API_KEY_KEY = "lanonasis.apiKey";
  }
  static {
    this.API_KEY_RAW_KEY = "lanonasis.apiKey.raw";
  }
  static {
    this.AUTH_TOKEN_KEY = "lanonasis.authToken";
  }
  static {
    this.REFRESH_TOKEN_KEY = "lanonasis.refreshToken";
  }
  static {
    this.CREDENTIAL_TYPE_KEY = "lanonasis.credentialType";
  }
  static {
    this.CALLBACK_PORT = 8080;
  }
  static {
    this.OAUTH_TIMEOUT_MS = 5 * 60 * 1e3;
  }
  static {
    // 5 minutes
    this.API_KEY_DASHBOARD_URL = "https://dashboard.lanonasis.com";
  }
  /**
   * Initialize and migrate from legacy configuration if needed
   */
  async initialize() {
    await this.migrateFromLegacyStorage();
  }
  /**
   * Get API key or token, prompting if needed
   */
  async getApiKeyOrPrompt() {
    const apiKey = await this.getApiKey();
    if (apiKey) {
      return apiKey;
    }
    const credential = await this.getStoredCredentials();
    if (credential?.type === "oauth") {
      return credential.token;
    }
    return await this.promptForAuthentication();
  }
  /**
   * Get API key from secure storage
   * For API key auth, we return the raw key (what callers need to send over the wire)
   * and keep a hashed copy in storage for migration/validation.
   * OAuth tokens are returned as-is (never hashed).
   */
  async getApiKey() {
    try {
      const rawKey = await this.adapter.secureStorage.get(_SecureApiKeyService.API_KEY_RAW_KEY);
      if (rawKey) {
        return rawKey;
      }
      const apiKey = await this.adapter.secureStorage.get(_SecureApiKeyService.API_KEY_KEY);
      if (!apiKey) {
        return null;
      }
      const storedType = await this.adapter.secureStorage.get(
        _SecureApiKeyService.CREDENTIAL_TYPE_KEY
      );
      if (storedType === "oauth" || looksLikeJwt(apiKey)) {
        this.log("Retrieved OAuth token from secure storage (unhashed)");
        return apiKey;
      }
      if (isSha256Hash(apiKey)) {
        const choice = await this.adapter.notification.showWarning(
          "Your stored API key needs to be re-entered to finish authentication.",
          "Re-enter API Key",
          "Cancel"
        );
        if (choice === "Re-enter API Key") {
          const newKey = await this.promptForApiKeyEntry();
          if (newKey) {
            return newKey;
          }
        }
        return null;
      }
      await this.adapter.secureStorage.store(_SecureApiKeyService.API_KEY_RAW_KEY, apiKey);
      await this.adapter.secureStorage.store(
        _SecureApiKeyService.API_KEY_KEY,
        ensureApiKeyHash(apiKey)
      );
      this.log("Migrated plaintext API key to raw storage");
      return apiKey;
    } catch (error46) {
      this.logError("Failed to retrieve API key from secure storage", error46);
      return null;
    }
  }
  /**
   * Check if API key is configured
   */
  async hasApiKey() {
    const apiKey = await this.getApiKey();
    if (apiKey) return true;
    const credential = await this.getStoredCredentials();
    return credential !== null;
  }
  /**
   * Store API key in secure storage
   * Stores a raw copy for API calls and a hashed copy for migration/validation.
   * OAuth tokens are stored as-is (never hashed).
   */
  async storeApiKey(apiKey, type = "apiKey") {
    const tokenToStore = type === "oauth" ? apiKey : ensureApiKeyHash(apiKey);
    await this.adapter.secureStorage.store(_SecureApiKeyService.API_KEY_RAW_KEY, apiKey);
    await this.adapter.secureStorage.store(_SecureApiKeyService.API_KEY_KEY, tokenToStore);
    await this.adapter.secureStorage.store(_SecureApiKeyService.CREDENTIAL_TYPE_KEY, type);
    this.log(`Stored ${type} credential securely`);
  }
  /**
   * Import an existing credential into secure storage.
   *
   * This is used by IDE-specific bridges that can source credentials from
   * trusted locations such as companion CLIs. The shared core remains
   * transport-agnostic and only handles secure persistence.
   */
  async importCredential(credential) {
    const token = credential.token.trim();
    if (!token) {
      throw new Error("Cannot import an empty credential");
    }
    if (credential.type === "oauth") {
      const importedToken = {
        access_token: token,
        token_type: "Bearer",
        scope: "",
        expires_at: credential.expiresAt
      };
      if (credential.refreshToken) {
        importedToken.refresh_token = credential.refreshToken;
        await this.adapter.secureStorage.store(
          _SecureApiKeyService.REFRESH_TOKEN_KEY,
          credential.refreshToken
        );
      } else {
        await this.adapter.secureStorage.delete(_SecureApiKeyService.REFRESH_TOKEN_KEY);
      }
      await this.adapter.secureStorage.store(
        _SecureApiKeyService.AUTH_TOKEN_KEY,
        JSON.stringify(importedToken)
      );
      await this.storeApiKey(token, "oauth");
      this.log("Imported OAuth credential into secure storage");
      return;
    }
    await this.storeApiKey(token, "apiKey");
    await this.adapter.secureStorage.delete(_SecureApiKeyService.AUTH_TOKEN_KEY);
    await this.adapter.secureStorage.delete(_SecureApiKeyService.REFRESH_TOKEN_KEY);
    this.log("Imported API key credential into secure storage");
  }
  /**
   * Get stored credentials with type information
   */
  async getStoredCredentials() {
    const authToken = await this.adapter.secureStorage.get(_SecureApiKeyService.AUTH_TOKEN_KEY);
    if (authToken) {
      try {
        const token = JSON.parse(authToken);
        if (token?.access_token) {
          if (this.isTokenValid(token)) {
            const refreshToken = await this.adapter.secureStorage.get(
              _SecureApiKeyService.REFRESH_TOKEN_KEY
            );
            return {
              type: "oauth",
              token: token.access_token,
              refreshToken: refreshToken ?? token.refresh_token,
              expiresAt: token.expires_at
            };
          }
          this.log("Access token expired, attempting refresh...");
          const refreshedToken = await this.refreshAccessToken();
          if (refreshedToken) {
            const refreshedCredential = await this.getStoredCredentials();
            if (refreshedCredential) {
              return refreshedCredential;
            }
          }
          this.log("Token refresh failed, clearing expired credentials");
          await this.clearCredentials();
          return null;
        }
      } catch (error46) {
        this.logError("Failed to parse stored OAuth token", error46);
      }
    }
    const apiKey = await this.getApiKey();
    if (apiKey) {
      const storedType = await this.adapter.secureStorage.get(
        _SecureApiKeyService.CREDENTIAL_TYPE_KEY
      );
      const inferredType = storedType === "oauth" || storedType === "apiKey" ? storedType : looksLikeJwt(apiKey) ? "oauth" : "apiKey";
      return { type: inferredType, token: apiKey };
    }
    return null;
  }
  /**
   * Authenticate using OAuth flow
   */
  async authenticateWithOAuth() {
    return this.adapter.notification.showProgress(
      `Authenticating ${this.adapter.branding.extensionDisplayName}`,
      async (progress) => {
        progress.report({ message: "Preparing OAuth flow..." });
        return new Promise((resolve, reject) => {
          let timeoutId;
          try {
            const config2 = this.adapter.getConfig();
            const authUrl = config2.authUrl;
            const clientId = `${this.adapter.branding.ideName.toLowerCase()}-extension`;
            const redirectUri = `http://localhost:${_SecureApiKeyService.CALLBACK_PORT}/callback`;
            const codeVerifier = generateCodeVerifier();
            const codeChallenge = generateCodeChallenge(codeVerifier);
            const state = generateState();
            this.adapter.secureStorage.store("oauth_code_verifier", codeVerifier);
            this.adapter.secureStorage.store("oauth_state", state);
            const authUrlObj = new import_url.URL("/oauth/authorize", authUrl);
            authUrlObj.searchParams.set("client_id", clientId);
            authUrlObj.searchParams.set("response_type", "code");
            authUrlObj.searchParams.set("redirect_uri", redirectUri);
            authUrlObj.searchParams.set("scope", "memories:read memories:write memories:delete");
            authUrlObj.searchParams.set("code_challenge", codeChallenge);
            authUrlObj.searchParams.set("code_challenge_method", "S256");
            authUrlObj.searchParams.set("state", state);
            const server = http.createServer(async (req, res) => {
              try {
                if (!req.url) {
                  res.writeHead(400, { "Content-Type": "text/plain" });
                  res.end("Missing URL");
                  return;
                }
                const url2 = new import_url.URL(req.url, `http://localhost:${_SecureApiKeyService.CALLBACK_PORT}`);
                if (url2.pathname === "/callback") {
                  const code = url2.searchParams.get("code");
                  const returnedState = url2.searchParams.get("state");
                  const error46 = url2.searchParams.get("error");
                  const storedState = await this.adapter.secureStorage.get("oauth_state");
                  if (returnedState !== storedState) {
                    res.writeHead(400, { "Content-Type": "text/html" });
                    res.end("<h1>Invalid state parameter</h1>");
                    server.close();
                    if (timeoutId) clearTimeout(timeoutId);
                    reject(new Error("Invalid state parameter"));
                    return;
                  }
                  if (error46) {
                    res.writeHead(400, { "Content-Type": "text/html" });
                    res.end(`<h1>OAuth Error: ${error46}</h1>`);
                    server.close();
                    if (timeoutId) clearTimeout(timeoutId);
                    reject(new Error(`OAuth error: ${error46}`));
                    return;
                  }
                  if (code) {
                    progress.report({ message: "Exchanging authorization code..." });
                    const token = await this.exchangeCodeForToken(
                      code,
                      codeVerifier,
                      redirectUri,
                      authUrl
                    );
                    await this.storeApiKey(token.access_token, "oauth");
                    if (token.refresh_token) {
                      await this.adapter.secureStorage.store(
                        _SecureApiKeyService.REFRESH_TOKEN_KEY,
                        token.refresh_token
                      );
                    }
                    res.writeHead(200, { "Content-Type": "text/html" });
                    res.end(`
                      <html>
                        <head><title>Authentication Success</title></head>
                        <body>
                          <h1 style="color: green;">\u2713 Authentication Successful!</h1>
                          <p>You can close this window and return to ${this.adapter.branding.ideName}.</p>
                          <script>setTimeout(() => window.close(), 2000);</script>
                        </body>
                      </html>
                    `);
                    await this.adapter.secureStorage.delete("oauth_code_verifier");
                    await this.adapter.secureStorage.delete("oauth_state");
                    server.close();
                    if (timeoutId) clearTimeout(timeoutId);
                    await this.adapter.notification.showInformation(
                      "Authentication successful! You can now use LanOnasis Memory Assistant."
                    );
                    resolve(true);
                  }
                } else {
                  res.writeHead(404, { "Content-Type": "text/plain" });
                  res.end("Not found");
                }
              } catch (err) {
                res.writeHead(500, { "Content-Type": "text/html" });
                res.end(`<h1>Error: ${err instanceof Error ? err.message : "Unknown error"}</h1>`);
                server.close();
                if (timeoutId) clearTimeout(timeoutId);
                reject(err);
              }
            });
            server.on("error", (err) => {
              if (timeoutId) clearTimeout(timeoutId);
              if (err.code === "EADDRINUSE") {
                reject(
                  new Error(
                    `Port ${_SecureApiKeyService.CALLBACK_PORT} is already in use. Please close any applications using this port and try again.`
                  )
                );
              } else {
                reject(new Error(`Failed to start OAuth callback server: ${err.message}`));
              }
            });
            server.listen(_SecureApiKeyService.CALLBACK_PORT, "localhost", () => {
              this.log(`OAuth callback server listening on port ${_SecureApiKeyService.CALLBACK_PORT}`);
              progress.report({ message: "Opening browser for authentication..." });
              this.adapter.browser.openExternal(authUrlObj.toString());
              progress.report({ message: "Waiting for OAuth callback..." });
            });
            timeoutId = setTimeout(() => {
              server.close();
              reject(new Error("OAuth authentication timeout"));
            }, _SecureApiKeyService.OAUTH_TIMEOUT_MS);
          } catch (error46) {
            if (timeoutId) clearTimeout(timeoutId);
            reject(error46);
          }
        });
      }
    );
  }
  /**
   * Authenticate using API key
   */
  async authenticateWithApiKey(apiKey) {
    if (!apiKey || apiKey.trim().length === 0) {
      return false;
    }
    await this.storeApiKey(apiKey, "apiKey");
    await this.adapter.secureStorage.delete(_SecureApiKeyService.AUTH_TOKEN_KEY);
    await this.adapter.secureStorage.delete(_SecureApiKeyService.REFRESH_TOKEN_KEY);
    this.log("API key stored securely");
    return true;
  }
  /**
   * Refresh OAuth token
   */
  async refreshToken() {
    const token = await this.refreshAccessToken();
    return token !== null;
  }
  /**
   * Check if token needs refresh
   */
  async needsTokenRefresh() {
    const authToken = await this.adapter.secureStorage.get(_SecureApiKeyService.AUTH_TOKEN_KEY);
    if (!authToken) {
      return false;
    }
    try {
      const token = JSON.parse(authToken);
      if (!token.expires_at) {
        return false;
      }
      return Date.now() >= token.expires_at - 5 * 60 * 1e3;
    } catch {
      return false;
    }
  }
  /**
   * Clear all stored credentials
   */
  async clearCredentials() {
    await this.adapter.secureStorage.delete(_SecureApiKeyService.API_KEY_KEY);
    await this.adapter.secureStorage.delete(_SecureApiKeyService.API_KEY_RAW_KEY);
    await this.adapter.secureStorage.delete(_SecureApiKeyService.AUTH_TOKEN_KEY);
    await this.adapter.secureStorage.delete(_SecureApiKeyService.REFRESH_TOKEN_KEY);
    await this.adapter.secureStorage.delete(_SecureApiKeyService.CREDENTIAL_TYPE_KEY);
    this.log("All credentials cleared from secure storage");
  }
  /**
   * Get authentication status
   */
  async getAuthStatus() {
    const credential = await this.getStoredCredentials();
    if (!credential) {
      return { isAuthenticated: false };
    }
    const needsRefresh = await this.needsTokenRefresh();
    return {
      isAuthenticated: true,
      credentialType: credential.type,
      expiresAt: credential.expiresAt,
      needsRefresh
    };
  }
  /**
   * Migrate from legacy storage
   */
  async migrateFromLegacyStorage() {
    if (this.migrationCompleted) {
      return false;
    }
    const hasSecureKey = await this.hasApiKey();
    if (hasSecureKey) {
      this.migrationCompleted = true;
      return false;
    }
    const legacyKey = this.adapter.configuration.get("lanonasis.apiKey");
    if (legacyKey) {
      await this.storeApiKey(legacyKey, "apiKey");
      this.log("Migrated API key from configuration to secure storage");
      await this.adapter.notification.showInformation(
        "API key migrated to secure storage. Your credentials are now stored securely.",
        "OK"
      );
      this.migrationCompleted = true;
      return true;
    }
    this.migrationCompleted = true;
    return false;
  }
  /**
   * Prompt user for authentication
   * @private
   */
  async promptForAuthentication() {
    const choice = await this.adapter.input.showQuickPick(
      [
        {
          label: "$(key) OAuth (Browser)",
          description: "Authenticate using OAuth2 with browser (Recommended)"
        },
        {
          label: "$(key) API Key",
          description: "Enter API key directly"
        },
        {
          label: "$(link-external) Get API Key (Dashboard)",
          description: "Open the dashboard to create an API key"
        },
        {
          label: "$(circle-slash) Cancel",
          description: "Cancel authentication"
        }
      ],
      {
        placeHolder: "Choose authentication method"
      }
    );
    if (!choice) {
      return null;
    }
    let choiceLabel;
    if (typeof choice === "string") {
      choiceLabel = choice;
    } else if (Array.isArray(choice)) {
      if (choice.length === 0) return null;
      const first = choice[0];
      choiceLabel = typeof first === "string" ? first : first.label;
    } else {
      choiceLabel = choice.label;
    }
    if (choiceLabel.includes("Cancel")) {
      return null;
    }
    if (choiceLabel.includes("Get API Key")) {
      await this.adapter.browser.openExternal(_SecureApiKeyService.API_KEY_DASHBOARD_URL);
      return await this.promptForAuthentication();
    }
    if (choiceLabel.includes("OAuth")) {
      const success2 = await this.authenticateWithOAuth();
      if (success2) {
        return await this.getApiKey();
      }
    } else if (choiceLabel.includes("API Key")) {
      return await this.promptForApiKeyEntry();
    }
    return null;
  }
  /**
   * Prompt for API key entry
   * @private
   */
  async promptForApiKeyEntry() {
    const apiKey = await this.adapter.input.showInputBox({
      prompt: "Enter your Lanonasis API Key",
      placeHolder: "Get your API key from dashboard.lanonasis.com",
      password: true,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "API key is required";
        }
        if (value.length < 20) {
          return "API key seems too short";
        }
        return null;
      }
    });
    if (apiKey) {
      await this.authenticateWithApiKey(apiKey);
      return apiKey;
    }
    return null;
  }
  /**
   * Refresh access token using stored refresh token
   * @private
   */
  async refreshAccessToken() {
    try {
      const refreshToken = await this.adapter.secureStorage.get(
        _SecureApiKeyService.REFRESH_TOKEN_KEY
      );
      if (!refreshToken) {
        this.log("No refresh token available");
        return null;
      }
      const config2 = this.adapter.getConfig();
      const tokenUrl = new import_url.URL("/oauth/token", config2.authUrl);
      this.log(`Refreshing token via ${tokenUrl.toString()}`);
      const body = new import_url.URLSearchParams({
        grant_type: "refresh_token",
        client_id: `${this.adapter.branding.ideName.toLowerCase()}-extension`,
        refresh_token: refreshToken
      });
      const response = await fetch(tokenUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        body: body.toString()
      });
      if (!response.ok) {
        const errorText = await response.text();
        this.logError(`Token refresh failed: ${response.status}`, errorText);
        if (response.status === 400 || response.status === 401) {
          await this.adapter.secureStorage.delete(_SecureApiKeyService.REFRESH_TOKEN_KEY);
        }
        return null;
      }
      const tokenData = await response.json();
      const newToken = {
        access_token: tokenData.access_token,
        expires_at: Date.now() + (tokenData.expires_in ? tokenData.expires_in * 1e3 : 36e5)
      };
      await this.adapter.secureStorage.store(
        _SecureApiKeyService.AUTH_TOKEN_KEY,
        JSON.stringify(newToken)
      );
      await this.storeApiKey(tokenData.access_token, "oauth");
      if (tokenData.refresh_token) {
        await this.adapter.secureStorage.store(
          _SecureApiKeyService.REFRESH_TOKEN_KEY,
          tokenData.refresh_token
        );
        this.log("Refresh token rotated");
      }
      this.log("Access token refreshed successfully");
      return tokenData.access_token;
    } catch (error46) {
      this.logError("Token refresh error", error46);
      return null;
    }
  }
  /**
   * Exchange OAuth authorization code for token
   * @private
   */
  async exchangeCodeForToken(code, codeVerifier, redirectUri, authUrl) {
    const tokenUrl = new import_url.URL("/oauth/token", authUrl);
    const body = new import_url.URLSearchParams({
      grant_type: "authorization_code",
      client_id: `${this.adapter.branding.ideName.toLowerCase()}-extension`,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier
    });
    const response = await fetch(tokenUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: body.toString()
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }
    const tokenData = await response.json();
    const token = {
      access_token: tokenData.access_token,
      expires_at: Date.now() + (tokenData.expires_in ? tokenData.expires_in * 1e3 : 36e5)
    };
    await this.adapter.secureStorage.store(
      _SecureApiKeyService.AUTH_TOKEN_KEY,
      JSON.stringify(token)
    );
    return {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    };
  }
  /**
   * Check if OAuth token is valid
   * @private
   */
  isTokenValid(token) {
    if (!token.expires_at) return true;
    return Date.now() < token.expires_at - 6e4;
  }
  /**
   * Log message to output channel
   * @private
   */
  log(message) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    this.adapter.outputChannel.appendLine(
      `[${timestamp}] [SecureApiKeyService] ${message}`
    );
  }
  /**
   * Log error to output channel
   * @private
   */
  logError(message, error46) {
    const errorMessage = error46 instanceof Error ? error46.message : String(error46);
    this.log(`${message}: ${errorMessage}`);
    console.error(message, error46);
  }
};

// src/utils/diagnostics.ts
var vscode10 = __toESM(require("vscode"));

// src/services/CLIConfigBridge.ts
var fs = __toESM(require("fs/promises"));
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var vscode9 = __toESM(require("vscode"));
var CLI_CONFIG_DIR = path.join(os.homedir(), ".maas");
var CLI_CONFIG_PATH = path.join(CLI_CONFIG_DIR, "config.json");
var LEGACY_SECURE_VENDOR_KEY_MARKER = "stored_in_api_key_storage";
var CLI_CONFIG_IMPORT_STATE_KEY = "lanonasis.cliImportState";
var IMPORTABLE_SETTING_KEYS = [
  "apiUrl",
  "gatewayUrl",
  "authUrl",
  "organizationId"
];
function normalizeString(value) {
  if (typeof value !== "string") {
    return void 0;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : void 0;
}
function normalizeExpiry(value) {
  if (value === void 0) {
    return void 0;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return void 0;
  }
  return parsed > 1e12 ? parsed : parsed * 1e3;
}
function isLegacyHashedValue(value) {
  return /^[a-f0-9]{64}$/i.test(value);
}
function hasExplicitSetting(configuration, key) {
  const inspected = configuration.inspect(key);
  return inspected?.workspaceFolderValue !== void 0 || inspected?.workspaceValue !== void 0 || inspected?.globalValue !== void 0;
}
function buildSettingCandidates(cliConfig) {
  const memoryBase = normalizeString(cliConfig.discoveredServices?.memory_base) ?? normalizeString(cliConfig.apiUrl);
  const authBase = normalizeString(cliConfig.discoveredServices?.auth_base);
  const organizationId = normalizeString(cliConfig.user?.organization_id);
  return {
    apiUrl: memoryBase,
    gatewayUrl: memoryBase,
    authUrl: authBase,
    organizationId
  };
}
function extractImportableCredential(cliConfig) {
  const authMethod = normalizeString(cliConfig.authMethod)?.toLowerCase();
  const token = normalizeString(cliConfig.token);
  const vendorKey = normalizeString(cliConfig.vendorKey);
  if (token && authMethod !== "vendor_key") {
    const expiresAt = normalizeExpiry(cliConfig.token_expires_at ?? cliConfig.tokenExpiry);
    const refreshToken = normalizeString(cliConfig.refresh_token);
    if (expiresAt && expiresAt <= Date.now() && !refreshToken) {
      return null;
    }
    return {
      type: "oauth",
      token,
      refreshToken,
      expiresAt
    };
  }
  if (!vendorKey) {
    return null;
  }
  if (vendorKey === LEGACY_SECURE_VENDOR_KEY_MARKER || isLegacyHashedValue(vendorKey)) {
    return null;
  }
  return {
    type: "apiKey",
    token: vendorKey
  };
}
async function loadCLIConfig(outputChannel) {
  try {
    const contents = await fs.readFile(CLI_CONFIG_PATH, "utf8");
    return JSON.parse(contents);
  } catch (error46) {
    if (error46.code !== "ENOENT") {
      outputChannel.appendLine(
        `[CLI Import] Failed to read ${CLI_CONFIG_PATH}: ${error46 instanceof Error ? error46.message : String(error46)}`
      );
    }
    return null;
  }
}
function resolveSettingSource(configuration, key, candidateValue, importedSettings, previousState) {
  if (importedSettings.includes(key)) {
    return "cli-import";
  }
  if (!hasExplicitSetting(configuration, key)) {
    return "default";
  }
  const currentValue = normalizeString(configuration.get(key));
  if (previousState?.settingSources[key] === "cli-import" && candidateValue && currentValue === candidateValue) {
    return "cli-import";
  }
  return "explicit";
}
async function syncCLIConfigToExtension(context, secureApiKeyService, outputChannel) {
  const configuration = vscode9.workspace.getConfiguration("lanonasis");
  const previousState = context.globalState.get(CLI_CONFIG_IMPORT_STATE_KEY);
  const importEnabled = configuration.get("importCLIConfig", true);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const baseState = {
    configPath: CLI_CONFIG_PATH,
    available: false,
    lastCheckedAt: now,
    lastImportedAt: previousState?.lastImportedAt,
    importedCredential: false,
    importedSettings: [],
    credentialSource: previousState?.credentialSource ?? "none",
    settingSources: previousState?.settingSources ?? {
      apiUrl: "default",
      gatewayUrl: "default",
      authUrl: "default",
      organizationId: "default"
    }
  };
  if (!importEnabled) {
    const disabledState = {
      ...baseState,
      skippedReason: "CLI config import disabled"
    };
    await context.globalState.update(CLI_CONFIG_IMPORT_STATE_KEY, disabledState);
    return disabledState;
  }
  const cliConfig = await loadCLIConfig(outputChannel);
  if (!cliConfig) {
    const missingState = {
      ...baseState,
      skippedReason: `No CLI config found at ${CLI_CONFIG_PATH}`
    };
    await context.globalState.update(CLI_CONFIG_IMPORT_STATE_KEY, missingState);
    return missingState;
  }
  const settingCandidates = buildSettingCandidates(cliConfig);
  const importedSettings = [];
  for (const key of IMPORTABLE_SETTING_KEYS) {
    const candidateValue = settingCandidates[key];
    if (!candidateValue || hasExplicitSetting(configuration, key)) {
      continue;
    }
    await configuration.update(key, candidateValue, vscode9.ConfigurationTarget.Global);
    importedSettings.push(key);
    outputChannel.appendLine(`[CLI Import] Applied ${key} from ${CLI_CONFIG_PATH}`);
  }
  const existingCredential = await secureApiKeyService.getStoredCredentials();
  let importedCredential = false;
  let credentialSource = existingCredential ? previousState?.credentialSource === "cli-config" ? "cli-config" : "secure-storage" : "none";
  let skippedReason;
  if (!existingCredential) {
    const imported = extractImportableCredential(cliConfig);
    if (imported) {
      await secureApiKeyService.importCredential(imported);
      importedCredential = true;
      credentialSource = "cli-config";
      outputChannel.appendLine(
        `[CLI Import] Imported ${imported.type === "oauth" ? "OAuth session" : "API key"} from ${CLI_CONFIG_PATH}`
      );
    } else {
      skippedReason = "CLI config does not contain an importable credential";
    }
  } else if (importedSettings.length === 0 && previousState?.credentialSource !== "cli-config") {
    skippedReason = "Extension already has secure credentials and explicit settings";
  }
  const nextState = {
    configPath: CLI_CONFIG_PATH,
    available: true,
    lastCheckedAt: now,
    lastImportedAt: importedCredential || importedSettings.length > 0 ? now : previousState?.lastImportedAt,
    importedCredential,
    importedSettings,
    credentialSource,
    authMethod: normalizeString(cliConfig.authMethod),
    skippedReason,
    settingSources: {
      apiUrl: resolveSettingSource(configuration, "apiUrl", settingCandidates.apiUrl, importedSettings, previousState),
      gatewayUrl: resolveSettingSource(configuration, "gatewayUrl", settingCandidates.gatewayUrl, importedSettings, previousState),
      authUrl: resolveSettingSource(configuration, "authUrl", settingCandidates.authUrl, importedSettings, previousState),
      organizationId: resolveSettingSource(configuration, "organizationId", settingCandidates.organizationId, importedSettings, previousState)
    }
  };
  await context.globalState.update(CLI_CONFIG_IMPORT_STATE_KEY, nextState);
  return nextState;
}

// src/utils/diagnostics.ts
async function runDiagnostics(context, secureApiKeyService, memoryService, outputChannel) {
  const results = [];
  outputChannel.appendLine("==================================================");
  outputChannel.appendLine("Starting Lanonasis Extension Diagnostics");
  outputChannel.appendLine(`Timestamp: ${(/* @__PURE__ */ new Date()).toISOString()}`);
  outputChannel.appendLine("==================================================\n");
  results.push(await checkExtensionContext(context, outputChannel));
  results.push(await checkVSCodeVersion(outputChannel));
  results.push(await checkConfiguration(context, outputChannel));
  results.push(await checkAuthentication(context, secureApiKeyService, outputChannel));
  results.push(await checkNetworkConnectivity(memoryService, outputChannel));
  results.push(await checkConnectionMode(memoryService, outputChannel));
  results.push(await checkStorage(context, outputChannel));
  const overall = determineOverallHealth(results);
  outputChannel.appendLine("\n==================================================");
  outputChannel.appendLine(`Overall Health: ${overall.toUpperCase()}`);
  outputChannel.appendLine("==================================================");
  return {
    overall,
    results,
    timestamp: /* @__PURE__ */ new Date()
  };
}
async function checkExtensionContext(context, outputChannel) {
  outputChannel.appendLine("[1/7] Checking Extension Context...");
  try {
    if (!context) {
      return {
        category: "Extension Context",
        status: "error",
        message: "Extension context is not available",
        action: "Reload VSCode"
      };
    }
    const globalStoragePath = context.globalStorageUri?.fsPath;
    const workspaceStoragePath = context.storageUri?.fsPath;
    outputChannel.appendLine(`  \u2713 Extension ID: ${context.extension.id}`);
    outputChannel.appendLine(`  \u2713 Extension Path: ${context.extensionPath}`);
    outputChannel.appendLine(`  \u2713 Global Storage: ${globalStoragePath || "N/A"}`);
    outputChannel.appendLine(`  \u2713 Workspace Storage: ${workspaceStoragePath || "N/A"}`);
    return {
      category: "Extension Context",
      status: "success",
      message: "Extension context is properly initialized"
    };
  } catch (error46) {
    outputChannel.appendLine(`  \u2717 Error: ${error46 instanceof Error ? error46.message : String(error46)}`);
    return {
      category: "Extension Context",
      status: "error",
      message: "Failed to check extension context",
      details: error46 instanceof Error ? error46.message : String(error46)
    };
  }
}
async function checkVSCodeVersion(outputChannel) {
  outputChannel.appendLine("\n[2/7] Checking VSCode Version...");
  try {
    const version4 = vscode10.version;
    const requiredVersion = "1.74.0";
    outputChannel.appendLine(`  \u2713 Current Version: ${version4}`);
    outputChannel.appendLine(`  \u2713 Required Version: ${requiredVersion}+`);
    const [major, minor] = version4.split(".").map(Number);
    const [reqMajor, reqMinor] = requiredVersion.split(".").map(Number);
    if (major > reqMajor || major === reqMajor && minor >= reqMinor) {
      return {
        category: "VSCode Version",
        status: "success",
        message: `VSCode ${version4} meets minimum requirements`
      };
    } else {
      return {
        category: "VSCode Version",
        status: "warning",
        message: `VSCode ${version4} is below recommended version ${requiredVersion}`,
        action: "Update VSCode"
      };
    }
  } catch (error46) {
    outputChannel.appendLine(`  \u2717 Error: ${error46 instanceof Error ? error46.message : String(error46)}`);
    return {
      category: "VSCode Version",
      status: "error",
      message: "Failed to check VSCode version",
      details: error46 instanceof Error ? error46.message : String(error46)
    };
  }
}
async function checkConfiguration(context, outputChannel) {
  outputChannel.appendLine("\n[3/7] Checking Configuration...");
  try {
    const config2 = vscode10.workspace.getConfiguration("lanonasis");
    const apiUrl = config2.get("apiUrl");
    const gatewayUrl = config2.get("gatewayUrl");
    const useGateway = config2.get("useGateway");
    const enableMCP = config2.get("enableMCP");
    const preferCLI = config2.get("preferCLI");
    const importCLIConfig = config2.get("importCLIConfig", true);
    const cliImportState = context.globalState.get(CLI_CONFIG_IMPORT_STATE_KEY);
    const deprecatedTransportSettings = [
      {
        key: "transportPreference",
        inspection: config2.inspect("transportPreference")
      },
      {
        key: "websocketUrl",
        inspection: config2.inspect("websocketUrl")
      },
      {
        key: "enableRealtime",
        inspection: config2.inspect("enableRealtime")
      }
    ].filter(
      ({ inspection }) => inspection?.globalValue !== void 0 || inspection?.workspaceValue !== void 0 || inspection?.workspaceFolderValue !== void 0
    );
    outputChannel.appendLine(`  \u2713 API URL: ${apiUrl}`);
    outputChannel.appendLine(`  \u2713 Gateway URL: ${gatewayUrl}`);
    outputChannel.appendLine(`  \u2713 Use Gateway: ${useGateway}`);
    outputChannel.appendLine(`  \u2713 Enable MCP: ${enableMCP}`);
    outputChannel.appendLine(`  \u2713 Prefer CLI: ${preferCLI}`);
    outputChannel.appendLine(`  \u2713 Import CLI Config: ${importCLIConfig}`);
    if (deprecatedTransportSettings.length > 0) {
      outputChannel.appendLine(
        `  ! Deprecated transport settings configured: ${deprecatedTransportSettings.map(({ key }) => key).join(", ")}`
      );
    }
    if (cliImportState) {
      outputChannel.appendLine(`  \u2713 API URL Source: ${cliImportState.settingSources.apiUrl}`);
      outputChannel.appendLine(`  \u2713 Gateway URL Source: ${cliImportState.settingSources.gatewayUrl}`);
      outputChannel.appendLine(`  \u2713 Auth URL Source: ${cliImportState.settingSources.authUrl}`);
      outputChannel.appendLine(`  \u2713 Organization ID Source: ${cliImportState.settingSources.organizationId}`);
      if (cliImportState.lastImportedAt) {
        outputChannel.appendLine(`  \u2713 Last CLI Import: ${cliImportState.lastImportedAt}`);
      }
    }
    const issues = [];
    if (!apiUrl) {
      issues.push("API URL not configured");
    }
    if (useGateway && !gatewayUrl) {
      issues.push("Gateway mode enabled but Gateway URL not configured");
    }
    if (deprecatedTransportSettings.length > 0) {
      issues.push(
        `Deprecated transport settings are configured but ignored by the active runtime: ${deprecatedTransportSettings.map(({ key }) => key).join(", ")}`
      );
    }
    if (issues.length > 0) {
      return {
        category: "Configuration",
        status: "warning",
        message: "Configuration issues detected",
        details: issues.join("; "),
        action: deprecatedTransportSettings.length > 0 ? "Review deprecated settings" : "Check Settings"
      };
    }
    return {
      category: "Configuration",
      status: "success",
      message: "Configuration is valid"
    };
  } catch (error46) {
    outputChannel.appendLine(`  \u2717 Error: ${error46 instanceof Error ? error46.message : String(error46)}`);
    return {
      category: "Configuration",
      status: "error",
      message: "Failed to check configuration",
      details: error46 instanceof Error ? error46.message : String(error46)
    };
  }
}
async function checkAuthentication(context, secureApiKeyService, outputChannel) {
  outputChannel.appendLine("\n[4/7] Checking Authentication...");
  try {
    const cliImportState = context.globalState.get(CLI_CONFIG_IMPORT_STATE_KEY);
    const credentials = await secureApiKeyService.getStoredCredentials();
    if (credentials) {
      outputChannel.appendLine(`  \u2713 Credential type: ${credentials.type.toUpperCase()}`);
      outputChannel.appendLine(`  \u2713 Token length: ${credentials.token.length} characters`);
      outputChannel.appendLine(`  \u2713 Token prefix: ${credentials.token.substring(0, 12)}...`);
      outputChannel.appendLine(`  \u2713 Credential source: ${cliImportState?.credentialSource ?? "secure-storage"}`);
      const isJwt = credentials.token.split(".").length === 3;
      outputChannel.appendLine(`  \u2713 Token format: ${isJwt ? "JWT (OAuth)" : "API Key"}`);
      if (credentials.type === "oauth") {
        outputChannel.appendLine("  \u2713 OAuth authentication detected");
      } else {
        outputChannel.appendLine("  \u2713 API Key authentication detected");
      }
      return {
        category: "Authentication",
        status: "success",
        message: `Authenticated with ${credentials.type === "oauth" ? "OAuth token" : "API key"} (${cliImportState?.credentialSource ?? "secure-storage"})`
      };
    }
    const hasApiKey = await secureApiKeyService.hasApiKey();
    if (hasApiKey) {
      outputChannel.appendLine("  \u26A0 API key exists but getStoredCredentials returned null");
      try {
        const apiKey = await secureApiKeyService.getApiKey();
        if (apiKey && apiKey.length > 0) {
          outputChannel.appendLine(`  \u2713 API key length: ${apiKey.length} characters`);
          outputChannel.appendLine(`  \u2713 API key prefix: ${apiKey.substring(0, 8)}...`);
          return {
            category: "Authentication",
            status: "warning",
            message: "API key exists but credential type unknown",
            action: "Re-authenticate for best results"
          };
        }
      } catch (error46) {
        outputChannel.appendLine(`  \u2717 Error retrieving API key: ${error46 instanceof Error ? error46.message : String(error46)}`);
      }
    }
    outputChannel.appendLine("  \u2139 No credentials found");
    return {
      category: "Authentication",
      status: "info",
      message: "Not authenticated",
      action: "Authenticate"
    };
  } catch (error46) {
    outputChannel.appendLine(`  \u2717 Error: ${error46 instanceof Error ? error46.message : String(error46)}`);
    return {
      category: "Authentication",
      status: "error",
      message: "Failed to check authentication status",
      details: error46 instanceof Error ? error46.message : String(error46)
    };
  }
}
async function checkNetworkConnectivity(memoryService, outputChannel) {
  outputChannel.appendLine("\n[5/7] Checking Network Connectivity...");
  try {
    if (!memoryService.isAuthenticated()) {
      outputChannel.appendLine("  \u2139 Skipping (not authenticated)");
      return {
        category: "Network Connectivity",
        status: "info",
        message: "Skipped - not authenticated"
      };
    }
    outputChannel.appendLine("  \u23F3 Testing connection...");
    const startTime = Date.now();
    await memoryService.testConnection();
    const duration3 = Date.now() - startTime;
    outputChannel.appendLine(`  \u2713 Connection successful (${duration3}ms)`);
    return {
      category: "Network Connectivity",
      status: "success",
      message: `Connected successfully in ${duration3}ms`
    };
  } catch (error46) {
    outputChannel.appendLine(`  \u2717 Connection failed: ${error46 instanceof Error ? error46.message : String(error46)}`);
    return {
      category: "Network Connectivity",
      status: "error",
      message: "Unable to connect to Lanonasis servers",
      details: error46 instanceof Error ? error46.message : String(error46),
      action: "Check internet connection"
    };
  }
}
async function checkConnectionMode(memoryService, outputChannel) {
  outputChannel.appendLine("\n[6/7] Checking Connection Mode...");
  try {
    if (isEnhancedMemoryService(memoryService)) {
      const capabilities = memoryService.getCapabilities();
      if (capabilities) {
        outputChannel.appendLine(`  \u2713 Enhanced Memory Service detected`);
        outputChannel.appendLine(`  \u2713 Connection Mode: HTTP API`);
        outputChannel.appendLine(`  \u2713 Authenticated: ${capabilities.authenticated}`);
        if (capabilities.authenticated) {
          return {
            category: "Connection Mode",
            status: "success",
            message: "Connected via HTTP API"
          };
        } else {
          return {
            category: "Connection Mode",
            status: "warning",
            message: "HTTP API available but not authenticated",
            action: "Configure API key"
          };
        }
      }
    }
    outputChannel.appendLine("  \u2139 Using basic memory service");
    return {
      category: "Connection Mode",
      status: "info",
      message: "Using basic memory service with HTTP API"
    };
  } catch (error46) {
    outputChannel.appendLine(`  \u2717 Error: ${error46 instanceof Error ? error46.message : String(error46)}`);
    return {
      category: "Connection Mode",
      status: "warning",
      message: "Unable to check connection mode",
      details: error46 instanceof Error ? error46.message : String(error46)
    };
  }
}
async function checkStorage(context, outputChannel) {
  outputChannel.appendLine("\n[7/7] Checking Storage...");
  try {
    await context.globalState.update("lanonasis.diagnosticTest", Date.now());
    const testValue = context.globalState.get("lanonasis.diagnosticTest");
    if (!testValue) {
      outputChannel.appendLine("  \u2717 Global state write/read failed");
      return {
        category: "Storage",
        status: "error",
        message: "Storage system is not working properly",
        action: "Reload VSCode"
      };
    }
    outputChannel.appendLine("  \u2713 Global state is accessible");
    const keys = context.globalState.keys();
    outputChannel.appendLine(`  \u2713 Stored keys: ${keys.length}`);
    const firstTime = context.globalState.get("lanonasis.firstTime");
    outputChannel.appendLine(`  \u2713 First time flag: ${firstTime}`);
    return {
      category: "Storage",
      status: "success",
      message: "Storage system is working properly"
    };
  } catch (error46) {
    outputChannel.appendLine(`  \u2717 Error: ${error46 instanceof Error ? error46.message : String(error46)}`);
    return {
      category: "Storage",
      status: "error",
      message: "Storage system check failed",
      details: error46 instanceof Error ? error46.message : String(error46)
    };
  }
}
function determineOverallHealth(results) {
  const hasError2 = results.some((r) => r.status === "error");
  const hasWarning = results.some((r) => r.status === "warning");
  if (hasError2) {
    return "critical";
  } else if (hasWarning) {
    return "degraded";
  } else {
    return "healthy";
  }
}
function formatDiagnosticResults(health) {
  const statusEmoji = {
    healthy: "\u2705",
    degraded: "\u26A0\uFE0F",
    critical: "\u274C"
  };
  const resultEmoji = {
    success: "\u2705",
    warning: "\u26A0\uFE0F",
    error: "\u274C",
    info: "\u2139\uFE0F"
  };
  let output = `# Lanonasis Extension Diagnostics

`;
  output += `**Overall Health:** ${statusEmoji[health.overall]} ${health.overall.toUpperCase()}
`;
  output += `**Timestamp:** ${health.timestamp.toLocaleString()}

`;
  output += `---

`;
  for (const result of health.results) {
    output += `## ${resultEmoji[result.status]} ${result.category}

`;
    output += `**Status:** ${result.status.toUpperCase()}

`;
    output += `**Message:** ${result.message}

`;
    if (result.details) {
      output += `**Details:** ${result.details}

`;
    }
    if (result.action) {
      output += `**Recommended Action:** ${result.action}

`;
    }
    output += `---

`;
  }
  return output;
}

// src/services/MCPDiscoveryService.ts
var vscode11 = __toESM(require("vscode"));
var DEFAULT_MCP_PORTS = [3001, 3002, 3e3];
var DEFAULT_MCP_HOST = "localhost";
var DISCOVERY_TIMEOUT_MS = 2e3;
var MCPDiscoveryService = class {
  constructor(outputChannel) {
    this.discoveredServer = null;
    this.lastDiscoveryAt = null;
    this.discoveryCacheTtlMs = 60 * 1e3;
    this.config = vscode11.workspace.getConfiguration("lanonasis");
    this.outputChannel = outputChannel || vscode11.window.createOutputChannel("Lanonasis MCP");
    this.statusBarItem = vscode11.window.createStatusBarItem(
      vscode11.StatusBarAlignment.Right,
      99
    );
    this.statusBarItem.command = "lanonasis.showMCPStatus";
  }
  /**
   * Auto-discover MCP server using multiple strategies
   */
  async discover() {
    this.config = vscode11.workspace.getConfiguration("lanonasis");
    const enableAutoDiscover = this.config.get("mcpAutoDiscover", true);
    const enableMCP = this.config.get("enableMCP", true);
    if (!enableMCP) {
      this.log("MCP disabled in configuration");
      this.updateStatusBar(null);
      return null;
    }
    if (this.lastDiscoveryAt && Date.now() - this.lastDiscoveryAt < this.discoveryCacheTtlMs) {
      this.log("Using cached MCP discovery result");
      this.updateStatusBar(this.discoveredServer);
      return this.discoveredServer;
    }
    const configuredUrl = this.config.get("mcpServerUrl", "");
    if (configuredUrl) {
      this.log(`Checking configured MCP server: ${configuredUrl}`);
      const server = await this.checkServer(configuredUrl, "configured");
      if (server) {
        this.discoveredServer = server;
        this.updateStatusBar(server);
        this.lastDiscoveryAt = Date.now();
        return server;
      }
    }
    const envUrl = process.env.LANONASIS_MCP_URL || process.env.MCP_SERVER_URL;
    if (envUrl) {
      this.log(`Checking environment MCP server: ${envUrl}`);
      const server = await this.checkServer(envUrl, "environment");
      if (server) {
        this.discoveredServer = server;
        this.updateStatusBar(server);
        this.lastDiscoveryAt = Date.now();
        return server;
      }
    }
    if (enableAutoDiscover) {
      this.log("Starting MCP auto-discovery...");
      for (const port of DEFAULT_MCP_PORTS) {
        const url2 = `http://${DEFAULT_MCP_HOST}:${port}`;
        this.log(`Probing ${url2}...`);
        const server = await this.checkServer(url2, "auto-discovered");
        if (server) {
          this.discoveredServer = server;
          this.updateStatusBar(server);
          vscode11.window.showInformationMessage(
            `MCP server discovered at ${url2}`,
            "Show Details"
          ).then((selection) => {
            if (selection === "Show Details") {
              this.showServerDetails();
            }
          });
          this.lastDiscoveryAt = Date.now();
          return server;
        }
      }
    }
    this.log("No MCP server found");
    this.updateStatusBar(null);
    this.lastDiscoveryAt = Date.now();
    return null;
  }
  /**
   * Check if a specific URL has a valid MCP server
   */
  async checkServer(url2, source) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS);
      const healthUrl = `${url2.replace(/\/$/, "")}/health`;
      const response = await fetch(healthUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "X-Client-Type": "vscode-extension"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        this.log(`Health check failed for ${url2}: ${response.status}`);
        return null;
      }
      const health = await response.json();
      if (health.status !== "healthy" && health.status !== "degraded") {
        this.log(`Server at ${url2} is unhealthy: ${health.status}`);
        return null;
      }
      const capabilities = await this.detectCapabilities(url2);
      const serverInfo = {
        url: url2,
        version: health.version || "unknown",
        capabilities,
        isHealthy: health.status === "healthy",
        source
      };
      this.log(`MCP server found at ${url2}: v${serverInfo.version}`);
      return serverInfo;
    } catch (error46) {
      if (error46 instanceof Error) {
        if (error46.name === "AbortError") {
          this.log(`Timeout checking ${url2}`);
        } else {
          this.log(`Error checking ${url2}: ${error46.message}`);
        }
      }
      return null;
    }
  }
  /**
   * Detect server capabilities by probing endpoints
   */
  async detectCapabilities(baseUrl) {
    const capabilities = {
      memories: false,
      search: false,
      apiKeys: false,
      projects: false,
      streaming: false
    };
    const endpoints = [
      { path: "/api/v1/memories", capability: "memories" },
      { path: "/api/v1/memories/search", capability: "search" },
      { path: "/api/v1/api-keys", capability: "apiKeys" },
      { path: "/api/v1/projects", capability: "projects" }
    ];
    const probePromises = endpoints.map(async ({ path: path2, capability }) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1e3);
        const response = await fetch(`${baseUrl}${path2}`, {
          method: "OPTIONS",
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.status < 500) {
          capabilities[capability] = true;
        }
      } catch {
      }
    });
    await Promise.all(probePromises);
    return capabilities;
  }
  /**
   * Get the currently discovered server
   */
  getDiscoveredServer() {
    return this.discoveredServer;
  }
  /**
   * Get the MCP server URL (discovered or configured)
   */
  getServerUrl() {
    if (this.discoveredServer) {
      return this.discoveredServer.url;
    }
    const configuredUrl = this.config.get("mcpServerUrl", "");
    if (configuredUrl) {
      return configuredUrl;
    }
    return null;
  }
  /**
   * Check if MCP is available
   */
  isAvailable() {
    return this.discoveredServer !== null && this.discoveredServer.isHealthy;
  }
  /**
   * Re-check the currently discovered server
   */
  async refresh() {
    if (!this.discoveredServer) {
      const server2 = await this.discover();
      return server2 !== null;
    }
    const server = await this.checkServer(
      this.discoveredServer.url,
      this.discoveredServer.source
    );
    if (server) {
      this.discoveredServer = server;
      this.updateStatusBar(server);
      return true;
    } else {
      this.discoveredServer = null;
      this.updateStatusBar(null);
      return false;
    }
  }
  /**
   * Show server details in a quick pick
   */
  async showServerDetails() {
    const server = this.discoveredServer;
    if (!server) {
      vscode11.window.showWarningMessage("No MCP server currently connected");
      return;
    }
    const capabilities = Object.entries(server.capabilities).filter(([, enabled]) => enabled).map(([name]) => name).join(", ");
    const items = [
      {
        label: "$(globe) Server URL",
        description: server.url,
        detail: `Source: ${server.source}`
      },
      {
        label: "$(versions) Version",
        description: server.version
      },
      {
        label: server.isHealthy ? "$(check) Status" : "$(warning) Status",
        description: server.isHealthy ? "Healthy" : "Degraded"
      },
      {
        label: "$(list-unordered) Capabilities",
        description: capabilities || "None detected"
      },
      {
        label: "$(refresh) Refresh",
        description: "Re-check server status"
      },
      {
        label: "$(debug-disconnect) Disconnect",
        description: "Clear discovered server"
      }
    ];
    const selected = await vscode11.window.showQuickPick(items, {
      title: "MCP Server Details",
      placeHolder: "Select an action"
    });
    if (selected?.label.includes("Refresh")) {
      await this.refresh();
      vscode11.window.showInformationMessage(
        this.discoveredServer ? "MCP server refreshed" : "MCP server disconnected"
      );
    } else if (selected?.label.includes("Disconnect")) {
      this.discoveredServer = null;
      this.updateStatusBar(null);
      vscode11.window.showInformationMessage("MCP server disconnected");
    }
  }
  updateStatusBar(server) {
    if (server) {
      const icon = server.isHealthy ? "$(plug)" : "$(warning)";
      this.statusBarItem.text = `${icon} MCP`;
      this.statusBarItem.tooltip = `MCP Server: ${server.url}
Version: ${server.version}
Status: ${server.isHealthy ? "Healthy" : "Degraded"}`;
      this.statusBarItem.backgroundColor = server.isHealthy ? void 0 : new vscode11.ThemeColor("statusBarItem.warningBackground");
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
    }
  }
  log(message) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    this.outputChannel.appendLine(`[${timestamp}] [MCPDiscovery] ${message}`);
  }
  dispose() {
    this.statusBarItem.dispose();
  }
};
async function createMCPDiscoveryService(outputChannel) {
  const service = new MCPDiscoveryService(outputChannel);
  await service.discover();
  return service;
}

// src/bridges/MemoryCacheBridge.ts
var vscode12 = __toESM(require("vscode"));
var MemoryCacheBridge = class {
  constructor(cache, memoryService, output) {
    this.cache = cache;
    this.memoryService = memoryService;
    this.output = output;
    this.cacheTtlMs = 5 * 60 * 1e3;
  }
  getStatus() {
    return this.cache.getStatus();
  }
  async getMemories(options = {}) {
    const { force = false, limit = 50 } = options;
    const cached2 = this.cache.getMemories(limit);
    const status = this.cache.getStatus();
    const isFresh = status.lastSyncAt ? Date.now() - status.lastSyncAt < this.cacheTtlMs : false;
    if (!force && cached2.length > 0 && isFresh) {
      return cached2;
    }
    return this.refreshFromService(limit, cached2);
  }
  async searchMemories(query) {
    const start = Date.now();
    try {
      const results = await this.memoryService.searchMemories(query);
      await this.cache.updateFromApi(this.stripSearchScores(results));
      this.logPerformance("search", start, `results=${results.length}`);
      return results;
    } catch (error46) {
      const fallback = this.cache.searchLocal(query).map((memory) => ({
        ...memory,
        similarity_score: 0.1
      }));
      this.output.appendLine(`[MemoryCacheBridge] Search failed, using local cache: ${error46}`);
      this.logPerformance("search", start, "fallback=cache");
      return fallback;
    }
  }
  async upsert(memory) {
    await this.cache.upsert(memory);
  }
  async remove(id) {
    await this.cache.remove(id);
  }
  async refreshFromService(limit = 50, fallback = []) {
    const start = Date.now();
    this.cache.setRefreshing(true);
    try {
      const memories = await this.memoryService.listMemories(limit);
      await this.cache.updateFromApi(memories);
      this.logPerformance("list", start, `count=${memories.length}`);
      return memories;
    } catch (error46) {
      const errorMessage = error46 instanceof Error ? error46.message : String(error46);
      if (this.isAuthError(errorMessage)) {
        this.output.appendLine("[MemoryCacheBridge] Auth error detected. Refreshing client and retrying...");
        try {
          await this.memoryService.refreshClient();
          const memories = await this.memoryService.listMemories(limit);
          await this.cache.updateFromApi(memories);
          this.logPerformance("list", start, `count=${memories.length},retry=1`);
          return memories;
        } catch (retryError) {
          this.output.appendLine(`[MemoryCacheBridge] Retry after auth refresh failed: ${retryError}`);
        }
      }
      this.output.appendLine(`[MemoryCacheBridge] Refresh failed, using cache: ${error46}`);
      this.logPerformance("list", start, "fallback=cache");
      return fallback.length > 0 ? fallback : this.cache.getMemories(limit);
    } finally {
      this.cache.setRefreshing(false);
    }
  }
  isAuthError(message) {
    const normalized = message.toLowerCase();
    return normalized.includes("authentication required") || normalized.includes("unauthorized") || normalized.includes("401") || normalized.includes("auth token") || normalized.includes("bearer");
  }
  stripSearchScores(results) {
    return results.map(({ similarity_score: _similarityScore, ...rest }) => rest);
  }
  shouldLogPerformance() {
    const config2 = vscode12.workspace.getConfiguration("lanonasis");
    return config2.get("showPerformanceFeedback", false) || config2.get("verboseLogging", false);
  }
  logPerformance(label, start, detail) {
    if (!this.shouldLogPerformance()) return;
    const duration3 = Date.now() - start;
    const suffix = detail ? ` (${detail})` : "";
    this.output.appendLine(`[Performance] ${label} ${duration3}ms${suffix}`);
  }
};

// src/services/OnboardingService.ts
var STORAGE_KEY = "lanonasis.onboardingState";
var ONBOARDING_VERSION = 1;
var REQUIRED_STEPS = [
  "authenticate",
  "create_memory",
  "search",
  "tour"
];
var OnboardingService = class {
  constructor(globalState) {
    this.globalState = globalState;
    this.cachedState = null;
  }
  async getStatus() {
    const state = await this.loadState();
    const completedCount = REQUIRED_STEPS.filter((step) => state.completedSteps.includes(step)).length;
    const totalCount = REQUIRED_STEPS.length;
    const isComplete = completedCount === totalCount;
    const shouldShow = !state.skipped && !isComplete;
    return {
      state,
      completedCount,
      totalCount,
      isComplete,
      shouldShow
    };
  }
  async markStepComplete(step) {
    const state = await this.loadState();
    if (!REQUIRED_STEPS.includes(step)) {
      return this.getStatus();
    }
    if (!state.completedSteps.includes(step)) {
      const updatedState = {
        ...state,
        completedSteps: [...state.completedSteps, step],
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await this.saveState(updatedState);
    }
    return this.getStatus();
  }
  async skip() {
    const state = await this.loadState();
    const updatedState = {
      ...state,
      skipped: true,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await this.saveState(updatedState);
    return this.getStatus();
  }
  async reset() {
    const resetState = this.createDefaultState();
    await this.saveState(resetState);
    return this.getStatus();
  }
  async loadState() {
    if (this.cachedState) {
      return this.cachedState;
    }
    const stored = this.globalState.get(STORAGE_KEY);
    const normalized = this.normalizeState(stored);
    if (!stored || stored.version !== ONBOARDING_VERSION) {
      await this.saveState(normalized);
    } else {
      this.cachedState = normalized;
    }
    return normalized;
  }
  async saveState(state) {
    this.cachedState = state;
    await this.globalState.update(STORAGE_KEY, state);
  }
  normalizeState(stored) {
    if (!stored || stored.version !== ONBOARDING_VERSION) {
      return this.createDefaultState();
    }
    const completedSteps = Array.isArray(stored.completedSteps) ? stored.completedSteps.filter((step) => REQUIRED_STEPS.includes(step)) : [];
    return {
      version: ONBOARDING_VERSION,
      startedAt: stored.startedAt || (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: stored.updatedAt || stored.startedAt || (/* @__PURE__ */ new Date()).toISOString(),
      completedSteps,
      skipped: Boolean(stored.skipped)
    };
  }
  createDefaultState() {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    return {
      version: ONBOARDING_VERSION,
      startedAt: now,
      updatedAt: now,
      completedSteps: [],
      skipped: false
    };
  }
};

// src/services/OfflineService.ts
var vscode13 = __toESM(require("vscode"));
var OfflineService = class {
  constructor(output, options) {
    this.output = output;
    this.options = options;
    this.status = { online: true, lastChecked: null };
    this.emitter = new vscode13.EventEmitter();
    this.onDidChangeStatus = this.emitter.event;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 3e4;
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? 4e3;
    this.statusBarItem = vscode13.window.createStatusBarItem(
      vscode13.StatusBarAlignment.Right,
      98
    );
    this.updateStatusBar();
  }
  start() {
    void this.checkNow();
    this.intervalId = setInterval(() => {
      void this.checkNow();
    }, this.heartbeatIntervalMs);
  }
  isOnline() {
    return this.status.online;
  }
  getStatus() {
    return { ...this.status };
  }
  async checkNow() {
    const healthUrl = this.options.getHealthUrl();
    if (!healthUrl) {
      this.updateStatus(true);
      return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.heartbeatTimeoutMs);
    try {
      const response = await fetch(healthUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "X-Client-Type": "vscode-extension"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        this.updateStatus(true);
      } else {
        this.updateStatus(false, `Health check ${response.status}`);
      }
    } catch (error46) {
      clearTimeout(timeoutId);
      const message = error46 instanceof Error ? error46.message : String(error46);
      this.updateStatus(false, message);
    }
  }
  updateStatus(online, error46) {
    const changed = this.status.online !== online;
    this.status = {
      online,
      lastChecked: Date.now(),
      lastError: online ? void 0 : error46
    };
    if (changed) {
      const detail = error46 ? ` (${error46})` : "";
      this.output.appendLine(`[OfflineService] ${online ? "Online" : "Offline"}${detail}`);
      this.emitter.fire(this.getStatus());
    }
    this.updateStatusBar();
  }
  updateStatusBar() {
    if (this.status.online) {
      this.statusBarItem.hide();
      return;
    }
    this.statusBarItem.text = "$(cloud-off) Offline";
    this.statusBarItem.tooltip = this.status.lastError ? `Lanonasis Memory: Offline (${this.status.lastError})` : "Lanonasis Memory: Offline";
    this.statusBarItem.backgroundColor = new vscode13.ThemeColor("statusBarItem.warningBackground");
    this.statusBarItem.show();
  }
  dispose() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.statusBarItem.dispose();
    this.emitter.dispose();
  }
};

// src/services/OfflineQueueService.ts
var vscode14 = __toESM(require("vscode"));
var import_crypto2 = require("crypto");

// src/utils/extensionErrors.ts
function getErrorMessage2(error46) {
  if (!error46) return "Unknown error";
  if (typeof error46 === "string") return error46;
  if (error46 instanceof Error) return error46.message;
  return String(error46);
}
function getErrorCode(error46) {
  if (!error46 || typeof error46 !== "object") return void 0;
  const maybeCode = error46.code ?? error46.statusCode;
  if (maybeCode === void 0 || maybeCode === null) return void 0;
  return String(maybeCode);
}
function classifyError(error46) {
  const message = getErrorMessage2(error46);
  const normalized = message.toLowerCase();
  const code = getErrorCode(error46);
  if (/conflict|409/.test(normalized)) {
    return {
      category: "conflict",
      severity: "warning",
      message: "Sync conflict detected. Review the conflicting changes in the sync logs, then manually merge your local and remote edits or discard the pending offline operation.",
      details: message,
      actions: ["View Logs"],
      retryable: false,
      code
    };
  }
  if (/validation|invalid|bad request|400/.test(normalized)) {
    return {
      category: "validation",
      severity: "warning",
      message: `Invalid input: ${message}`,
      details: message,
      actions: ["Review Input"],
      retryable: false,
      code
    };
  }
  if (/auth|401|403|unauthorized|forbidden/.test(normalized)) {
    return {
      category: "auth",
      severity: "error",
      message: "Authentication failed. Please re-authenticate or update your API key.",
      details: message,
      actions: ["Re-authenticate", "Clear API Key"],
      retryable: true,
      code
    };
  }
  if (/rate limit|429/.test(normalized)) {
    return {
      category: "rate_limit",
      severity: "warning",
      message: "Rate limit exceeded. Please wait before retrying.",
      details: message,
      actions: ["Wait and Retry"],
      retryable: true,
      code
    };
  }
  if (/timeout|etimedout/.test(normalized)) {
    return {
      category: "network",
      severity: "warning",
      message: "Request timed out. Please check your connection and retry.",
      details: message,
      actions: ["Retry", "Check Connection"],
      retryable: true,
      code
    };
  }
  if (/network|econnrefused|enotfound|fetch/.test(normalized)) {
    return {
      category: "network",
      severity: "warning",
      message: "Unable to reach Lanonasis servers. Check your internet connection, firewall settings, or proxy configuration.",
      details: message,
      actions: ["Retry", "Check Network Settings"],
      retryable: true,
      code
    };
  }
  if (/not found|404/.test(normalized)) {
    return {
      category: "not_found",
      severity: "warning",
      message: "Requested resource was not found.",
      details: message,
      actions: ["Check Settings"],
      retryable: false,
      code
    };
  }
  if (/500|502|503|504|server error/.test(normalized)) {
    return {
      category: "server",
      severity: "error",
      message: "Lanonasis servers are experiencing issues. Please retry later.",
      details: message,
      actions: ["Retry", "View Status"],
      retryable: true,
      code
    };
  }
  return {
    category: "unknown",
    severity: "error",
    message: `Operation failed: ${message}`,
    details: message,
    actions: ["View Logs"],
    retryable: false,
    code
  };
}
function isNetworkError(error46) {
  return classifyError(error46).category === "network";
}
function isAuthError(error46) {
  return classifyError(error46).category === "auth";
}

// src/utils/errorLogger.ts
var LOG_STORAGE_KEY = "lanonasis.errorLogs";
var MAX_LOG_ENTRIES = 200;
async function logExtensionError(context, output, error46, contextLabel) {
  const classified = classifyError(error46);
  const details = classified.details ? redactSensitive(classified.details) : void 0;
  const stack = error46 instanceof Error && error46.stack ? redactSensitive(error46.stack) : void 0;
  const entry = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    severity: classified.severity,
    category: classified.category,
    message: redactSensitive(classified.message),
    details,
    context: contextLabel,
    stack,
    code: classified.code
  };
  output.appendLine(`[${entry.severity.toUpperCase()}] [${entry.category}] ${entry.message}${contextLabel ? ` (${contextLabel})` : ""}`);
  if (details) {
    output.appendLine(`[Details] ${details}`);
  }
  if (stack) {
    output.appendLine(`[Stack] ${stack}`);
  }
  try {
    const existing = context.globalState.get(LOG_STORAGE_KEY, []);
    const next = [...existing, entry].slice(-MAX_LOG_ENTRIES);
    await context.globalState.update(LOG_STORAGE_KEY, next);
  } catch {
  }
  return classified;
}
function getErrorLogs(context) {
  return context.globalState.get(LOG_STORAGE_KEY, []);
}
function formatErrorLogs(logs, limit = 25) {
  const entries = logs.slice(-limit);
  if (entries.length === 0) return "No recent error logs.";
  return entries.map((entry) => {
    const parts = [
      `[${entry.timestamp}] ${entry.severity.toUpperCase()} ${entry.category}: ${entry.message}`,
      entry.context ? `Context: ${entry.context}` : void 0,
      entry.details ? `Details: ${entry.details}` : void 0
    ].filter(Boolean);
    return parts.join("\n");
  }).join("\n\n");
}
function redactSensitive(value) {
  let redacted = value;
  redacted = redacted.replace(/Bearer\s+[A-Za-z0-9._+/=-]+/gi, "Bearer [REDACTED]");
  redacted = redacted.replace(/(api[_-]?key|token)=([A-Za-z0-9._-]+)/gi, "$1=[REDACTED]");
  redacted = redacted.replace(/(X-API-Key:\s*)([A-Za-z0-9._-]+)/gi, "$1[REDACTED]");
  return redacted;
}

// src/services/OfflineQueueService.ts
var QUEUE_STORAGE_KEY = "lanonasis.offline.queue";
var OfflineQueueService = class {
  constructor(context, output, memoryService, memoryCache) {
    this.context = context;
    this.output = output;
    this.memoryService = memoryService;
    this.memoryCache = memoryCache;
    this.queue = [];
    this.syncing = false;
    this.emitter = new vscode14.EventEmitter();
    this.onDidChangeStatus = this.emitter.event;
    this.loadQueue();
  }
  getStatus() {
    return {
      pending: this.queue.length,
      syncing: this.syncing,
      lastError: this.lastError,
      lastSyncAt: this.lastSyncAt
    };
  }
  enqueueCreate(payload) {
    const tempId = this.generateTempId();
    this.queue.push({
      id: this.generateOperationId(),
      type: "create",
      tempId,
      payload,
      createdAt: Date.now(),
      attempts: 0
    });
    this.saveQueue();
    return tempId;
  }
  enqueueUpdate(id, updates) {
    this.queue.push({
      id: this.generateOperationId(),
      type: "update",
      payload: { id, updates },
      createdAt: Date.now(),
      attempts: 0
    });
    this.saveQueue();
  }
  enqueueDelete(id) {
    this.queue.push({
      id: this.generateOperationId(),
      type: "delete",
      payload: { id },
      createdAt: Date.now(),
      attempts: 0
    });
    this.saveQueue();
  }
  async sync() {
    if (this.syncing || this.queue.length === 0) {
      return;
    }
    this.syncing = true;
    this.emitStatus();
    this.clearRetry();
    try {
      while (this.queue.length > 0) {
        const current = this.queue[0];
        if (!current) break;
        if (current.type === "create") {
          const created = await this.memoryService.createMemory(current.payload);
          await this.handleCreateResult(current, created);
          this.queue.shift();
        } else if (current.type === "update") {
          const targetId = current.payload.id;
          const updated = await this.memoryService.updateMemory(targetId, current.payload.updates);
          await this.memoryCache.upsert(updated);
          this.queue.shift();
        } else {
          const targetId = current.payload.id;
          await this.memoryService.deleteMemory(targetId);
          await this.memoryCache.remove(targetId);
          this.queue.shift();
        }
        this.lastError = void 0;
        this.lastSyncAt = Date.now();
        await this.saveQueue();
      }
    } catch (error46) {
      const message = error46 instanceof Error ? error46.message : String(error46);
      const current = this.queue[0];
      if (current) {
        current.attempts += 1;
        current.lastError = message;
      }
      this.lastError = message;
      await this.saveQueue();
      const classified = await logExtensionError(this.context, this.output, error46, "offline-queue-sync");
      if (classified.category === "conflict") {
        this.output.appendLine(`[OfflineQueue] ${classified.message} Details: ${message}`);
        vscode14.window.showWarningMessage(classified.message);
      } else {
        this.scheduleRetry(current?.attempts ?? 1);
      }
    } finally {
      this.syncing = false;
      this.emitStatus();
    }
  }
  async clear() {
    this.queue = [];
    this.lastError = void 0;
    this.lastSyncAt = void 0;
    await this.saveQueue();
  }
  async handleCreateResult(operation, created) {
    await this.memoryCache.replace(operation.tempId, created);
    for (const op of this.queue) {
      if (op.type === "update" && op.payload.id === operation.tempId) {
        op.payload.id = created.id;
      }
      if (op.type === "delete" && op.payload.id === operation.tempId) {
        op.payload.id = created.id;
      }
    }
  }
  scheduleRetry(attempts) {
    const delay = Math.min(3e4, 1e3 * Math.pow(2, Math.max(attempts - 1, 0)));
    this.retryTimer = setTimeout(() => {
      void this.sync();
    }, delay);
    this.output.appendLine(`[OfflineQueue] Sync failed. Retrying in ${delay}ms`);
  }
  clearRetry() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = void 0;
    }
  }
  loadQueue() {
    try {
      const stored = this.context.globalState.get(QUEUE_STORAGE_KEY, []);
      this.queue = Array.isArray(stored) ? stored : [];
    } catch (error46) {
      this.output.appendLine(`[OfflineQueue] Failed to load queue: ${error46 instanceof Error ? error46.message : String(error46)}`);
      this.queue = [];
    } finally {
      this.emitStatus();
    }
  }
  async saveQueue() {
    try {
      await this.context.globalState.update(QUEUE_STORAGE_KEY, this.queue);
    } catch (error46) {
      this.output.appendLine(`[OfflineQueue] Failed to save queue: ${error46 instanceof Error ? error46.message : String(error46)}`);
    } finally {
      this.emitStatus();
    }
  }
  emitStatus() {
    this.emitter.fire(this.getStatus());
  }
  generateTempId() {
    return this.generateId("offline");
  }
  generateOperationId() {
    return this.generateId("op");
  }
  generateId(prefix) {
    const unique = typeof import_crypto2.randomUUID === "function" ? (0, import_crypto2.randomUUID)() : (0, import_crypto2.randomBytes)(16).toString("hex");
    return `${prefix}-${unique}`;
  }
  dispose() {
    this.clearRetry();
    this.emitter.dispose();
  }
};

// src/services/OfflineMemoryService.ts
var OfflineMemoryService = class {
  constructor(base, offline, queue, cache) {
    this.base = base;
    this.offline = offline;
    this.queue = queue;
    this.cache = cache;
  }
  isAuthenticated() {
    return this.base.isAuthenticated();
  }
  async testConnection(apiKey) {
    return this.base.testConnection(apiKey);
  }
  async createMemory(memory) {
    if (!this.offline.isOnline()) {
      const tempId = this.queue.enqueueCreate(memory);
      return this.buildOfflineEntry(memory, tempId);
    }
    try {
      return await this.withAuthRetry(() => this.base.createMemory(memory));
    } catch (error46) {
      if (isNetworkError(error46)) {
        const tempId = this.queue.enqueueCreate(memory);
        return this.buildOfflineEntry(memory, tempId);
      }
      throw error46;
    }
  }
  async updateMemory(id, memory) {
    if (!this.offline.isOnline()) {
      this.queue.enqueueUpdate(id, memory);
      return this.buildOfflineUpdate(id, memory);
    }
    try {
      return await this.withAuthRetry(() => this.base.updateMemory(id, memory));
    } catch (error46) {
      if (isNetworkError(error46)) {
        this.queue.enqueueUpdate(id, memory);
        return this.buildOfflineUpdate(id, memory);
      }
      throw error46;
    }
  }
  async searchMemories(query, options = {}) {
    return this.base.searchMemories(query, options);
  }
  async getMemory(id) {
    return this.base.getMemory(id);
  }
  async listMemories(limit = 50) {
    return this.base.listMemories(limit);
  }
  async deleteMemory(id) {
    if (!this.offline.isOnline()) {
      this.queue.enqueueDelete(id);
      return;
    }
    try {
      await this.withAuthRetry(() => this.base.deleteMemory(id));
    } catch (error46) {
      if (isNetworkError(error46)) {
        this.queue.enqueueDelete(id);
        return;
      }
      throw error46;
    }
  }
  async getMemoryStats() {
    return this.base.getMemoryStats();
  }
  async refreshClient() {
    return this.base.refreshClient();
  }
  getCapabilities() {
    return isEnhancedMemoryService(this.base) ? this.base.getCapabilities() : null;
  }
  async showConnectionInfo() {
    if (isEnhancedMemoryService(this.base)) {
      await this.base.showConnectionInfo();
    }
  }
  dispose() {
    if (isEnhancedMemoryService(this.base)) {
      this.base.dispose();
    }
    this.offline.dispose();
    this.queue.dispose();
  }
  buildOfflineEntry(request, tempId) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const memoryType = request.memory_type || "context";
    return {
      id: tempId,
      title: request.title,
      content: request.content,
      summary: request.summary,
      memory_type: memoryType,
      status: "draft",
      access_count: 0,
      user_id: "offline",
      tags: request.tags ?? [],
      metadata: { ...request.metadata, offline_pending: true },
      created_at: timestamp,
      updated_at: timestamp
    };
  }
  buildOfflineUpdate(id, updates) {
    const existing = this.cache.getMemory(id);
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const memoryType = updates.memory_type || existing?.memory_type || "context";
    return {
      id,
      title: updates.title ?? existing?.title ?? "Untitled Memory",
      content: updates.content ?? existing?.content ?? "",
      summary: updates.summary ?? existing?.summary,
      memory_type: memoryType,
      status: existing?.status ?? "draft",
      access_count: existing?.access_count ?? 0,
      user_id: existing?.user_id ?? "offline",
      tags: updates.tags ?? existing?.tags ?? [],
      metadata: {
        ...existing?.metadata ?? {},
        ...updates.metadata ?? {},
        offline_pending: true
      },
      created_at: existing?.created_at ?? timestamp,
      updated_at: timestamp
    };
  }
  async withAuthRetry(operation) {
    try {
      return await operation();
    } catch (error46) {
      if (isAuthError(error46)) {
        await this.base.refreshClient();
        return operation();
      }
      throw error46;
    }
  }
};

// src/extension.ts
var MAX_GITHUB_ISSUE_BODY_LENGTH = 6e3;
var ALLOWED_PROTOCOLS = /* @__PURE__ */ new Set(["http:", "https:", "wss:", "ws:"]);
var EXTENSION_VERSION2 = "2.1.1";
async function activate(context) {
  console.log("Lanonasis Memory Extension is now active");
  const activationStart = Date.now();
  const outputChannel = vscode16.window.createOutputChannel("Lanonasis");
  const onboardingService = new OnboardingService(context.globalState);
  let mcpDiscoveryService = null;
  const config2 = vscode16.workspace.getConfiguration("lanonasis");
  const enableMCP = config2.get("enableMCP", true);
  const mcpAutoDiscover = config2.get("mcpAutoDiscover", true);
  if (enableMCP && mcpAutoDiscover) {
    try {
      mcpDiscoveryService = await createMCPDiscoveryService(outputChannel);
      const mcpServer = mcpDiscoveryService.getDiscoveredServer();
      if (mcpServer) {
        outputChannel.appendLine(`[MCP] Server discovered: ${mcpServer.url} (v${mcpServer.version})`);
      }
    } catch (error46) {
      outputChannel.appendLine(`[MCP] Auto-discovery failed: ${error46 instanceof Error ? error46.message : String(error46)}`);
    }
  }
  const adapter = createVSCodeAdapter(
    { context, outputChannel, vscode: vscode16 },
    {
      ideName: "VSCode",
      extensionName: "lanonasis-memory",
      extensionDisplayName: "LanOnasis Memory Assistant",
      commandPrefix: "lanonasis",
      userAgent: `VSCode/${vscode16.version} LanOnasis-Memory/${EXTENSION_VERSION2}`
    }
  );
  const secureApiKeyService = new SecureApiKeyService(adapter);
  await secureApiKeyService.initialize();
  let cliImportState = await syncCLIConfigToExtension(context, secureApiKeyService, outputChannel);
  const updateCLIImportState = async (updates) => {
    const currentState = context.globalState.get(CLI_CONFIG_IMPORT_STATE_KEY) ?? cliImportState;
    const nextState = {
      ...currentState,
      ...updates,
      settingSources: {
        ...currentState.settingSources,
        ...updates.settingSources ?? {}
      }
    };
    await context.globalState.update(CLI_CONFIG_IMPORT_STATE_KEY, nextState);
    cliImportState = nextState;
    return nextState;
  };
  if (cliImportState.importedCredential || cliImportState.importedSettings.length > 0) {
    const importedParts = [];
    if (cliImportState.importedCredential) {
      importedParts.push("authenticated CLI session");
    }
    if (cliImportState.importedSettings.length > 0) {
      importedParts.push(`${cliImportState.importedSettings.length} configuration setting${cliImportState.importedSettings.length === 1 ? "" : "s"}`);
    }
    vscode16.window.showInformationMessage(
      `Lanonasis imported your ${importedParts.join(" and ")} from ${cliImportState.configPath}.`,
      "Show Diagnostics",
      "Open Settings"
    ).then((selection) => {
      if (selection === "Show Diagnostics") {
        void vscode16.commands.executeCommand("lanonasis.runDiagnostics");
      } else if (selection === "Open Settings") {
        void vscode16.commands.executeCommand("workbench.action.openSettings", "lanonasis");
      }
    });
  }
  const resolveHealthUrl = () => {
    const config3 = vscode16.workspace.getConfiguration("lanonasis");
    const apiUrl = config3.get("apiUrl", "https://api.lanonasis.com");
    const gatewayUrl = config3.get("gatewayUrl", "https://api.lanonasis.com");
    const useGateway = config3.get("useGateway", false);
    let baseUrl = (useGateway ? gatewayUrl : apiUrl).trim();
    baseUrl = baseUrl.replace(/\/+$/, "").replace(/\/api\/v1$/i, "").replace(/\/api$/i, "");
    return baseUrl ? `${baseUrl}/health` : "";
  };
  let baseMemoryService;
  try {
    baseMemoryService = new EnhancedMemoryService(secureApiKeyService);
    console.log("Using Enhanced Memory Service with CLI integration");
  } catch (error46) {
    console.warn("Enhanced Memory Service not available, using basic service:", error46);
    baseMemoryService = new MemoryService(secureApiKeyService);
  }
  const apiKeyService = new ApiKeyService(secureApiKeyService);
  const memoryCache = new MemoryCache(context, outputChannel);
  const offlineService = new OfflineService(outputChannel, { getHealthUrl: resolveHealthUrl });
  const offlineQueue = new OfflineQueueService(context, outputChannel, baseMemoryService, memoryCache);
  const memoryService = new OfflineMemoryService(baseMemoryService, offlineService, offlineQueue, memoryCache);
  const memoryCacheBridge = new MemoryCacheBridge(memoryCache, memoryService, outputChannel);
  offlineService.start();
  if (offlineService.isOnline()) {
    void offlineQueue.sync();
  }
  const configuration = vscode16.workspace.getConfiguration("lanonasis");
  const useEnhancedUI = configuration.get("useEnhancedUI", false);
  let sidebarProvider;
  if (useEnhancedUI) {
    sidebarProvider = new EnhancedSidebarProvider(
      context.extensionUri,
      memoryService,
      apiKeyService,
      memoryCacheBridge,
      onboardingService,
      offlineService,
      offlineQueue
    );
    context.subscriptions.push(
      vscode16.window.registerWebviewViewProvider(
        EnhancedSidebarProvider.viewType,
        sidebarProvider
      )
    );
    console.log("[Lanonasis] Using Enhanced UI with React components");
  } else {
    sidebarProvider = new MemorySidebarProvider(context.extensionUri, memoryService);
    context.subscriptions.push(
      vscode16.window.registerWebviewViewProvider(
        MemorySidebarProvider.viewType,
        sidebarProvider
      )
    );
    console.log("[Lanonasis] Using original UI");
  }
  const memoryTreeProvider = new MemoryTreeProvider(memoryService);
  const apiKeyTreeProvider = new ApiKeyTreeProvider(apiKeyService);
  const handleOfflineStatus = (status) => {
    if (status.online) {
      void offlineQueue.sync();
    }
  };
  context.subscriptions.push(offlineService.onDidChangeStatus(handleOfflineStatus));
  if (sidebarProvider instanceof EnhancedSidebarProvider) {
    const sendStatusUpdate = () => {
      void sidebarProvider.sendConnectionStatus();
    };
    context.subscriptions.push(
      offlineService.onDidChangeStatus(sendStatusUpdate),
      offlineQueue.onDidChangeStatus(sendStatusUpdate)
    );
  }
  const notifyOnboardingStep = async (step) => {
    try {
      await onboardingService.markStepComplete(step);
      if (sidebarProvider instanceof EnhancedSidebarProvider) {
        await sidebarProvider.sendOnboardingState();
      }
    } catch (error46) {
      outputChannel.appendLine(`[Onboarding] Failed to update step ${step}: ${error46 instanceof Error ? error46.message : String(error46)}`);
    }
  };
  context.subscriptions.push(
    vscode16.window.registerTreeDataProvider("lanonasisMemories", memoryTreeProvider),
    vscode16.window.registerTreeDataProvider("lanonasisApiKeys", apiKeyTreeProvider)
  );
  try {
    const { registerMemoryChatParticipant: registerMemoryChatParticipant2 } = await Promise.resolve().then(() => (init_MemoryChatParticipant(), MemoryChatParticipant_exports));
    registerMemoryChatParticipant2(context, memoryService);
    console.log("[Lanonasis] Chat Participant @lanonasis registered for Copilot Chat");
  } catch (error46) {
    console.log("[Lanonasis] Chat Participant not available (requires GitHub Copilot)", error46);
  }
  const completionProvider = new MemoryCompletionProvider(memoryService);
  context.subscriptions.push(
    vscode16.languages.registerCompletionItemProvider(
      { scheme: "file" },
      completionProvider,
      "@",
      "#",
      "//"
    )
  );
  await vscode16.commands.executeCommand("setContext", "lanonasis.enabled", true);
  await vscode16.commands.executeCommand(
    "setContext",
    "lanonasis.enableApiKeyManagement",
    configuration.get("enableApiKeyManagement", true)
  );
  await vscode16.commands.executeCommand("setContext", "lanonasis.authenticated", false);
  memoryTreeProvider.setAuthenticated(false);
  apiKeyTreeProvider.setAuthenticated(false);
  const refreshServices = async () => {
    try {
      await memoryService.refreshClient();
    } catch (error46) {
      outputChannel.appendLine(`[Auth] Failed to refresh memory service: ${error46 instanceof Error ? error46.message : String(error46)}`);
    }
    try {
      apiKeyService.refreshConfig();
    } catch (error46) {
      outputChannel.appendLine(`[Auth] Failed to refresh API key service: ${error46 instanceof Error ? error46.message : String(error46)}`);
    }
  };
  const applyAuthenticationState = async (authenticated) => {
    await vscode16.commands.executeCommand("setContext", "lanonasis.authenticated", authenticated);
    memoryTreeProvider.setAuthenticated(authenticated);
    apiKeyTreeProvider.setAuthenticated(authenticated);
    await sidebarProvider.refresh();
  };
  const announceEnhancedCapabilities = () => {
    if (!isEnhancedMemoryService(memoryService)) {
      return;
    }
    const capabilities = memoryService.getCapabilities();
    if (capabilities?.cliAvailable && capabilities.goldenContract) {
      vscode16.window.showInformationMessage(
        "\u{1F680} Lanonasis Memory: Compatible CLI detected. Enhanced performance active.",
        "Show Details"
      ).then((selection) => {
        if (selection === "Show Details") {
          vscode16.commands.executeCommand("lanonasis.showConnectionInfo");
        }
      });
    }
  };
  const handleAuthenticationSuccess = async (credentialSource = "secure-storage") => {
    await refreshServices();
    await updateCLIImportState({
      credentialSource,
      importedCredential: credentialSource === "cli-config",
      skippedReason: void 0
    });
    await applyAuthenticationState(true);
    await notifyOnboardingStep("authenticate");
    announceEnhancedCapabilities();
  };
  const handleAuthenticationCleared = async () => {
    try {
      await memoryService.refreshClient();
    } catch (error46) {
      outputChannel.appendLine(`[ClearAuth] Failed to refresh memory service: ${error46 instanceof Error ? error46.message : String(error46)}`);
    }
    await memoryCache.clear();
    await updateCLIImportState({
      credentialSource: "none",
      importedCredential: false
    });
    await applyAuthenticationState(false);
  };
  const authenticateCommand = vscode16.commands.registerCommand("lanonasis.authenticate", async (mode) => {
    try {
      let apiKey = null;
      const promptForApiKeyAuthentication = async () => {
        const enteredApiKey = await vscode16.window.showInputBox({
          prompt: "Enter your Lanonasis API Key",
          placeHolder: "Get your API key from dashboard.lanonasis.com",
          password: true,
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return "API key is required";
            }
            if (value.trim().length < 20) {
              return "API key seems too short";
            }
            return null;
          }
        });
        if (!enteredApiKey) {
          return null;
        }
        const authenticated = await secureApiKeyService.authenticateWithApiKey(enteredApiKey.trim());
        return authenticated ? enteredApiKey.trim() : null;
      };
      if (mode === "oauth") {
        const authenticated = await secureApiKeyService.authenticateWithOAuth();
        apiKey = authenticated ? await secureApiKeyService.getApiKey() : null;
      } else if (mode === "apikey") {
        apiKey = await promptForApiKeyAuthentication();
      } else {
        apiKey = await secureApiKeyService.getApiKeyOrPrompt();
      }
      if (apiKey) {
        await handleAuthenticationSuccess();
        vscode16.window.showInformationMessage("\u2705 Successfully authenticated with Lanonasis Memory");
      }
    } catch (error46) {
      const message = error46 instanceof Error ? error46.message : String(error46);
      vscode16.window.showErrorMessage(`Authentication failed: ${message}`);
      outputChannel.appendLine(`[Auth] Error: ${message}`);
    }
  });
  const promptForAuthenticationIfMissing = async () => {
    const selection = await vscode16.window.showInformationMessage(
      "Lanonasis Memory: No authentication configured. Choose how you would like to connect.",
      "Connect in Browser",
      "Enter API Key",
      "Maybe Later"
    );
    if (selection === "Connect in Browser") {
      vscode16.commands.executeCommand("lanonasis.authenticate", "oauth");
    } else if (selection === "Enter API Key") {
      vscode16.commands.executeCommand("lanonasis.authenticate", "apikey");
    }
  };
  const commands4 = [
    authenticateCommand,
    vscode16.commands.registerCommand("lanonasis.searchMemory", async () => {
      await searchMemories(memoryService, notifyOnboardingStep);
    }),
    vscode16.commands.registerCommand("lanonasis.createMemory", async () => {
      await createMemoryFromSelection(memoryService, notifyOnboardingStep);
    }),
    vscode16.commands.registerCommand("lanonasis.createMemoryFromFile", async () => {
      await createMemoryFromFile(memoryService, notifyOnboardingStep);
    }),
    vscode16.commands.registerCommand("lanonasis.createSampleMemory", async () => {
      await createSampleMemory(memoryService, notifyOnboardingStep);
    }),
    // Universal capture commands
    vscode16.commands.registerCommand("lanonasis.captureContext", async () => {
      await captureContextToMemory(memoryService, notifyOnboardingStep);
    }),
    vscode16.commands.registerCommand("lanonasis.captureClipboard", async () => {
      await captureClipboardToMemory(memoryService, notifyOnboardingStep);
    }),
    // Note: lanonasis.authenticate is registered earlier (line 125) to prevent timing issues
    vscode16.commands.registerCommand("lanonasis.refreshMemories", async () => {
      memoryTreeProvider.refresh();
      await sidebarProvider.refresh();
    }),
    vscode16.commands.registerCommand("lanonasis.syncOfflineQueue", async () => {
      const status = offlineQueue.getStatus();
      if (status.pending === 0) {
        vscode16.window.showInformationMessage("No pending offline operations to sync.");
        return;
      }
      await offlineQueue.sync();
      await sidebarProvider.refresh();
    }),
    vscode16.commands.registerCommand("lanonasis.openMemory", (memory) => {
      openMemoryInEditor(memory);
    }),
    vscode16.commands.registerCommand("lanonasis.switchMode", async () => {
      await switchConnectionMode(memoryService, apiKeyService);
      memoryTreeProvider.refresh();
      await sidebarProvider.refresh();
    }),
    vscode16.commands.registerCommand("lanonasis.manageApiKeys", async () => {
      await manageApiKeys(apiKeyService);
    }),
    vscode16.commands.registerCommand("lanonasis.createProject", async () => {
      await createProject(apiKeyService, apiKeyTreeProvider);
    }),
    vscode16.commands.registerCommand("lanonasis.viewProjects", async () => {
      await viewProjects(apiKeyService);
    }),
    vscode16.commands.registerCommand("lanonasis.refreshApiKeys", async () => {
      apiKeyTreeProvider.refresh(true);
    }),
    // Context menu commands for API Keys tree
    vscode16.commands.registerCommand("lanonasis.viewProjectDetails", async (item) => {
      if (item && item.project) {
        await showProjectDetails(item.project, apiKeyService);
      }
    }),
    vscode16.commands.registerCommand("lanonasis.viewApiKeyDetails", async (item) => {
      if (item && item.apiKey) {
        await showApiKeyDetails(item.apiKey);
      }
    }),
    vscode16.commands.registerCommand("lanonasis.createApiKey", async (item) => {
      if (item && item.project) {
        await createApiKeyForProject(item.project, apiKeyService, apiKeyTreeProvider);
      } else {
        await createApiKey(apiKeyService, apiKeyTreeProvider);
      }
    }),
    vscode16.commands.registerCommand("lanonasis.rotateApiKey", async (item) => {
      if (item && item.apiKey) {
        await rotateApiKey(item.apiKey, apiKeyService, apiKeyTreeProvider);
      }
    }),
    vscode16.commands.registerCommand("lanonasis.deleteApiKey", async (item) => {
      if (item && item.apiKey) {
        await deleteApiKey(item.apiKey, apiKeyService, apiKeyTreeProvider);
      }
    }),
    vscode16.commands.registerCommand("lanonasis.deleteProject", async (item) => {
      if (item && item.project) {
        await deleteProject(item.project, apiKeyService, apiKeyTreeProvider);
      }
    }),
    vscode16.commands.registerCommand("lanonasis.showConnectionInfo", async () => {
      if (isEnhancedMemoryService(memoryService)) {
        await memoryService.showConnectionInfo();
      } else {
        vscode16.window.showInformationMessage("Connection info available in Enhanced Memory Service. Upgrade to CLI integration for more details.");
      }
    }),
    vscode16.commands.registerCommand("lanonasis.showMCPStatus", async () => {
      if (mcpDiscoveryService) {
        await mcpDiscoveryService.showServerDetails();
      } else {
        const action = await vscode16.window.showInformationMessage(
          "MCP auto-discovery is disabled or no server found.",
          "Run Discovery",
          "Configure"
        );
        if (action === "Run Discovery") {
          const newService = await createMCPDiscoveryService(outputChannel);
          if (newService.isAvailable()) {
            mcpDiscoveryService = newService;
            await newService.showServerDetails();
          } else {
            vscode16.window.showWarningMessage("No MCP server found. Start the CLI MCP server or configure a custom URL.");
          }
        } else if (action === "Configure") {
          vscode16.commands.executeCommand("workbench.action.openSettings", "lanonasis.mcp");
        }
      }
    }),
    vscode16.commands.registerCommand("lanonasis.configureApiKey", async (mode) => {
      await vscode16.commands.executeCommand("lanonasis.authenticate", mode);
    }),
    vscode16.commands.registerCommand("lanonasis.clearApiKey", async () => {
      try {
        const hasApiKey = await secureApiKeyService.hasApiKey();
        if (!hasApiKey) {
          vscode16.window.showInformationMessage("No API key is currently configured.");
          return;
        }
        const confirmed = await vscode16.window.showWarningMessage(
          "Are you sure you want to clear your API key? This will require re-authentication.",
          { modal: true },
          "Clear API Key"
        );
        if (confirmed === "Clear API Key") {
          await secureApiKeyService.clearCredentials();
          vscode16.window.showInformationMessage("API key cleared successfully.");
          outputChannel.appendLine("[ClearApiKey] API key removed from secure storage");
          await handleAuthenticationCleared();
          await promptForAuthenticationIfMissing();
        }
      } catch (error46) {
        const message = error46 instanceof Error ? error46.message : String(error46);
        vscode16.window.showErrorMessage(`Failed to clear API key: ${message}`);
        outputChannel.appendLine(`[ClearApiKey] Error: ${message}`);
      }
    }),
    vscode16.commands.registerCommand("lanonasis.checkApiKeyStatus", async () => {
      try {
        const hasApiKey = await secureApiKeyService.hasApiKey();
        const status = hasApiKey ? "\u2705 Configured and stored securely" : "\u274C Not configured";
        if (hasApiKey) {
          vscode16.window.showInformationMessage(
            `API Key Status: ${status}`,
            "Test Connection",
            "View Security Info"
          ).then(async (selection) => {
            if (selection === "Test Connection") {
              vscode16.commands.executeCommand("lanonasis.testConnection");
            } else if (selection === "View Security Info") {
              vscode16.env.openExternal(vscode16.Uri.parse("https://docs.lanonasis.com/security/api-keys"));
            }
          });
        } else {
          vscode16.window.showInformationMessage(
            `API Key Status: ${status}`,
            "Connect in Browser",
            "Enter API Key"
          ).then((selection) => {
            if (selection === "Connect in Browser") {
              vscode16.commands.executeCommand("lanonasis.authenticate", "oauth");
            } else if (selection === "Enter API Key") {
              vscode16.commands.executeCommand("lanonasis.authenticate", "apikey");
            }
          });
        }
      } catch (error46) {
        const message = error46 instanceof Error ? error46.message : String(error46);
        vscode16.window.showErrorMessage(`Failed to check API key status: ${message}`);
        outputChannel.appendLine(`[CheckApiKeyStatus] Error: ${message}`);
      }
    }),
    vscode16.commands.registerCommand("lanonasis.testConnection", async () => {
      try {
        const hasApiKey = await secureApiKeyService.hasApiKey();
        if (!hasApiKey) {
          vscode16.window.showWarningMessage("\u274C No API key configured.");
          return;
        }
        await memoryService.testConnection();
        vscode16.window.showInformationMessage("\u2705 Connection test successful!");
      } catch (error46) {
        const message = error46 instanceof Error ? error46.message : String(error46);
        vscode16.window.showErrorMessage(`Connection test failed: ${message}`);
        outputChannel.appendLine(`[TestConnection] Error: ${message}`);
      }
    }),
    vscode16.commands.registerCommand("lanonasis.runDiagnostics", async () => {
      try {
        outputChannel.show();
        outputChannel.appendLine("Running comprehensive diagnostics...\n");
        const health = await runDiagnostics(
          context,
          secureApiKeyService,
          memoryService,
          outputChannel
        );
        const report = formatDiagnosticResults(health);
        const doc = await vscode16.workspace.openTextDocument({
          content: report,
          language: "markdown"
        });
        await vscode16.window.showTextDocument(doc);
        const statusEmoji = {
          healthy: "\u2705",
          degraded: "\u26A0\uFE0F",
          critical: "\u274C"
        };
        const message = `${statusEmoji[health.overall]} System Health: ${health.overall.toUpperCase()}`;
        if (health.overall === "healthy") {
          vscode16.window.showInformationMessage(message, "View Report").then((action) => {
            if (action === "View Report") {
              outputChannel.show();
            }
          });
        } else if (health.overall === "degraded") {
          vscode16.window.showWarningMessage(message, "View Report", "Fix Issues").then((action) => {
            if (action === "View Report") {
              outputChannel.show();
            }
          });
        } else {
          vscode16.window.showErrorMessage(message, "View Report", "Get Help").then((action) => {
            if (action === "View Report") {
              outputChannel.show();
            } else if (action === "Get Help") {
              vscode16.env.openExternal(vscode16.Uri.parse("https://docs.lanonasis.com/troubleshooting"));
            }
          });
        }
      } catch (error46) {
        const message = error46 instanceof Error ? error46.message : String(error46);
        vscode16.window.showErrorMessage(`Diagnostics failed: ${message}`);
        outputChannel.appendLine(`[Diagnostics] Fatal error: ${message}`);
      }
    }),
    vscode16.commands.registerCommand("lanonasis.autoFixIssues", async () => {
      await runAutoFix(
        context,
        outputChannel,
        secureApiKeyService,
        memoryService,
        memoryCache,
        offlineQueue
      );
    }),
    vscode16.commands.registerCommand("lanonasis.reportIssue", async () => {
      await reportIssue(
        context,
        secureApiKeyService,
        memoryService,
        outputChannel
      );
    }),
    vscode16.commands.registerCommand("lanonasis.showLogs", () => {
      outputChannel.show();
    }),
    vscode16.commands.registerCommand("lanonasis.logout", async () => {
      try {
        await secureApiKeyService.clearCredentials();
      } catch (error46) {
        outputChannel.appendLine(`[Logout] Failed to clear stored credentials: ${error46 instanceof Error ? error46.message : String(error46)}`);
      } finally {
        await handleAuthenticationCleared();
        vscode16.window.showInformationMessage("Signed out of Lanonasis Memory.");
      }
    }),
    vscode16.commands.registerCommand("lanonasis.quickCapture", async () => {
      const editor = vscode16.window.activeTextEditor;
      if (editor && !editor.selection.isEmpty) {
        await captureContextToMemory(memoryService, notifyOnboardingStep);
      } else {
        await captureClipboardToMemory(memoryService, notifyOnboardingStep);
      }
    })
  ];
  context.subscriptions.push(...commands4);
  if ("dispose" in memoryService && typeof memoryService.dispose === "function") {
    context.subscriptions.push(memoryService);
  }
  if (mcpDiscoveryService) {
    context.subscriptions.push(mcpDiscoveryService);
  }
  const hasStoredKey = await secureApiKeyService.hasApiKey();
  if (hasStoredKey) {
    await handleAuthenticationSuccess(
      cliImportState.credentialSource === "cli-config" ? "cli-config" : "secure-storage"
    );
  } else {
    await applyAuthenticationState(false);
  }
  const onboardingStatus = await onboardingService.getStatus();
  const isFirstTime = onboardingStatus.state.completedSteps.length === 0 && !onboardingStatus.state.skipped;
  const legacyFirstTime = context.globalState.get("lanonasis.firstTime", true);
  if (!useEnhancedUI && legacyFirstTime) {
    showWelcomeMessage();
    await context.globalState.update("lanonasis.firstTime", false);
  }
  if (!useEnhancedUI && !hasStoredKey && !isFirstTime && !legacyFirstTime) {
    await promptForAuthenticationIfMissing();
  }
  const perfConfig = vscode16.workspace.getConfiguration("lanonasis");
  if (perfConfig.get("showPerformanceFeedback", false) || perfConfig.get("verboseLogging", false)) {
    outputChannel.appendLine(`[Performance] Activation ${Date.now() - activationStart}ms`);
  }
}
async function runAutoFix(context, outputChannel, secureApiKeyService, memoryService, memoryCache, offlineQueue) {
  const options = [
    {
      id: "refresh-auth",
      label: "Refresh authentication tokens",
      detail: "Revalidate credentials and refresh access tokens."
    },
    {
      id: "clear-cache",
      label: "Clear local cache",
      detail: "Clear cached memories and queued offline operations."
    },
    {
      id: "reset-settings",
      label: "Reset invalid settings",
      detail: "Revert invalid URLs to defaults."
    },
    {
      id: "suggest-cli",
      label: "Suggest CLI installation",
      detail: "Open CLI setup guidance."
    }
  ];
  const selection = await vscode16.window.showQuickPick(options, {
    title: "Lanonasis Auto-Fix",
    canPickMany: true,
    placeHolder: "Choose fixes to apply"
  });
  if (!selection || selection.length === 0) {
    return;
  }
  const results = [];
  await vscode16.window.withProgress(
    {
      location: vscode16.ProgressLocation.Notification,
      title: "Running auto-fix...",
      cancellable: false
    },
    async () => {
      for (const item of selection) {
        try {
          if (item.id === "refresh-auth") {
            await secureApiKeyService.getStoredCredentials();
            await memoryService.refreshClient();
            results.push("Refreshed authentication.");
          } else if (item.id === "clear-cache") {
            await memoryCache.clear();
            await offlineQueue.clear();
            results.push("Cleared local cache.");
          } else if (item.id === "reset-settings") {
            const resetCount = await resetInvalidSettings();
            results.push(resetCount > 0 ? `Reset ${resetCount} invalid setting(s).` : "Settings already valid.");
          } else if (item.id === "suggest-cli") {
            const action = await vscode16.window.showInformationMessage(
              "Install the Lanonasis CLI to enable richer IDE integration.",
              "Open Docs"
            );
            if (action === "Open Docs") {
              await vscode16.env.openExternal(vscode16.Uri.parse("https://docs.lanonasis.com"));
            }
            results.push("CLI guidance shown.");
          }
        } catch (error46) {
          const summary = error46 instanceof Error ? error46.message : String(error46);
          results.push(`${item.label} failed: ${summary}`);
          await logExtensionError(context, outputChannel, error46, `auto-fix:${item.id}`);
        }
      }
    }
  );
  if (results.length > 0) {
    vscode16.window.showInformationMessage(results.join(" "));
  }
}
async function resetInvalidSettings() {
  const config2 = vscode16.workspace.getConfiguration("lanonasis");
  const defaults = [
    { key: "apiUrl", fallback: "https://api.lanonasis.com" },
    { key: "gatewayUrl", fallback: "https://api.lanonasis.com" },
    { key: "authUrl", fallback: "https://auth.lanonasis.com" },
    { key: "websocketUrl", fallback: "wss://mcp.lanonasis.com/ws" }
  ];
  let resetCount = 0;
  for (const { key, fallback } of defaults) {
    const value = config2.get(key, fallback);
    if (!isValidUrl(value)) {
      await config2.update(key, fallback, vscode16.ConfigurationTarget.Global);
      resetCount += 1;
    }
  }
  return resetCount;
}
function isValidUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
    const candidate = hasScheme ? trimmed : `http://${trimmed}`;
    const parsed = new URL(candidate);
    return ALLOWED_PROTOCOLS.has(parsed.protocol) && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}
async function reportIssue(context, secureApiKeyService, memoryService, outputChannel) {
  try {
    const includeDiagnostics = await vscode16.window.showQuickPick(
      ["Include diagnostics (recommended)", "Skip diagnostics"],
      { title: "Report Issue" }
    );
    let diagnosticReport = "Diagnostics skipped by user.";
    if (includeDiagnostics === "Include diagnostics (recommended)") {
      const health = await runDiagnostics(
        context,
        secureApiKeyService,
        memoryService,
        outputChannel
      );
      diagnosticReport = formatDiagnosticResults(health);
    }
    const logs = formatErrorLogs(getErrorLogs(context), 20);
    const extensionVersion = context.extension.packageJSON.version;
    const environmentInfo = `Version: ${extensionVersion ?? "unknown"}
OS: ${process.platform}
VSCode: ${vscode16.version}`;
    const body = [
      "## Summary",
      "Describe the issue here.",
      "",
      "## Environment",
      "```",
      environmentInfo,
      "```",
      "",
      "## Diagnostics",
      "```",
      diagnosticReport,
      "```",
      "",
      "## Recent Errors",
      "```",
      logs,
      "```"
    ].join("\n");
    const doc = await vscode16.workspace.openTextDocument({
      content: body,
      language: "markdown"
    });
    await vscode16.window.showTextDocument(doc, { preview: true });
    const action = await vscode16.window.showInformationMessage(
      "Review the issue report. Open GitHub issue?",
      "Open Issue",
      "Cancel"
    );
    if (action !== "Open Issue") {
      return;
    }
    const truncatedBody = doc.getText().slice(0, MAX_GITHUB_ISSUE_BODY_LENGTH);
    const issueUrl = `https://github.com/lanonasis/lanonasis-maas/issues/new?title=${encodeURIComponent("[vscode] ")}&body=${encodeURIComponent(truncatedBody)}`;
    await vscode16.env.openExternal(vscode16.Uri.parse(issueUrl));
  } catch (error46) {
    const message = error46 instanceof Error ? error46.message : String(error46);
    outputChannel.appendLine(`[ReportIssue] Failed to open issue: ${message}`);
    vscode16.window.showErrorMessage(`Failed to open issue report: ${message}`);
    await logExtensionError(context, outputChannel, error46, "report-issue");
  }
}
async function searchMemories(memoryService, notifyOnboardingStep) {
  const query = await vscode16.window.showInputBox({
    prompt: "Search memories",
    placeHolder: "Enter search query..."
  });
  if (!query) return;
  try {
    vscode16.window.withProgress({
      location: vscode16.ProgressLocation.Notification,
      title: "Searching memories...",
      cancellable: false
    }, async () => {
      const results = await memoryService.searchMemories(query);
      await showSearchResults(results, query);
    });
    if (notifyOnboardingStep) {
      await notifyOnboardingStep("search");
    }
  } catch (error46) {
    vscode16.window.showErrorMessage(`Search failed: ${error46 instanceof Error ? error46.message : "Unknown error"}`);
  }
}
async function showSearchResults(results, query) {
  if (results.length === 0) {
    vscode16.window.showInformationMessage(`No memories found for "${query}"`);
    return;
  }
  const items = results.map((memory) => ({
    label: memory.title,
    description: memory.memory_type,
    detail: `${memory.content.substring(0, 100)}${memory.content.length > 100 ? "..." : ""}`,
    memory
  }));
  const selected = await vscode16.window.showQuickPick(items, {
    placeHolder: `Found ${results.length} memories for "${query}"`
  });
  if (selected) {
    openMemoryInEditor(selected.memory);
  }
}
async function createMemoryFromSelection(memoryService, notifyOnboardingStep) {
  const editor = vscode16.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    vscode16.window.showWarningMessage("Please select some text to create a memory");
    return;
  }
  const selectedText = editor.document.getText(editor.selection);
  const fileName = editor.document.fileName;
  const lineNumber = editor.selection.start.line + 1;
  const title = await vscode16.window.showInputBox({
    prompt: "Memory title",
    value: `Code from ${fileName}:${lineNumber}`
  });
  if (!title) return;
  const config2 = vscode16.workspace.getConfiguration("lanonasis");
  const defaultType = config2.get("defaultMemoryType", "context");
  try {
    await vscode16.window.withProgress({
      location: vscode16.ProgressLocation.Notification,
      title: "Creating memory...",
      cancellable: false
    }, async () => {
      await memoryService.createMemory({
        title,
        content: selectedText,
        memory_type: defaultType,
        tags: ["vscode", "selection"],
        metadata: {
          source: "vscode",
          fileName,
          lineNumber: lineNumber.toString()
        }
      });
    });
    vscode16.window.showInformationMessage(`Memory "${title}" created successfully`);
    vscode16.commands.executeCommand("lanonasis.refreshMemories");
    if (notifyOnboardingStep) {
      await notifyOnboardingStep("create_memory");
    }
  } catch (error46) {
    vscode16.window.showErrorMessage(`Failed to create memory: ${error46 instanceof Error ? error46.message : "Unknown error"}`);
  }
}
async function createMemoryFromFile(memoryService, notifyOnboardingStep) {
  const editor = vscode16.window.activeTextEditor;
  if (!editor) {
    vscode16.window.showWarningMessage("No active editor");
    return;
  }
  const content = editor.document.getText();
  const fileName = editor.document.fileName;
  const title = await vscode16.window.showInputBox({
    prompt: "Memory title",
    value: `File: ${fileName.split("/").pop()}`
  });
  if (!title) return;
  const config2 = vscode16.workspace.getConfiguration("lanonasis");
  const defaultType = config2.get("defaultMemoryType", "context");
  try {
    await vscode16.window.withProgress({
      location: vscode16.ProgressLocation.Notification,
      title: "Creating memory from file...",
      cancellable: false
    }, async () => {
      await memoryService.createMemory({
        title,
        content,
        memory_type: defaultType,
        tags: ["vscode", "file"],
        metadata: {
          source: "vscode-file",
          fileName,
          fullPath: fileName
        }
      });
    });
    vscode16.window.showInformationMessage(`Memory "${title}" created from file`);
    vscode16.commands.executeCommand("lanonasis.refreshMemories");
    if (notifyOnboardingStep) {
      await notifyOnboardingStep("create_memory");
    }
  } catch (error46) {
    vscode16.window.showErrorMessage(`Failed to create memory: ${error46 instanceof Error ? error46.message : "Unknown error"}`);
  }
}
async function createSampleMemory(memoryService, notifyOnboardingStep) {
  const sampleTitle = "Getting Started with LanOnasis Memory";
  const sampleContent = [
    "Welcome to your first memory!",
    "",
    "Use this space to store context, decisions, snippets, and reminders.",
    "",
    "Quick tips:",
    '- Select text and run "Create Memory from Selection"',
    '- Use "Search Memories" to retrieve relevant context',
    "- Tag memories to keep related ideas together"
  ].join("\n");
  try {
    await vscode16.window.withProgress({
      location: vscode16.ProgressLocation.Notification,
      title: "Creating sample memory...",
      cancellable: false
    }, async () => {
      await memoryService.createMemory({
        title: sampleTitle,
        content: sampleContent,
        memory_type: "context",
        tags: ["onboarding", "sample"],
        metadata: {
          source: "onboarding",
          createdBy: "sample-generator"
        }
      });
    });
    vscode16.window.showInformationMessage("Sample memory created. Try searching for it next.");
    vscode16.commands.executeCommand("lanonasis.refreshMemories");
    if (notifyOnboardingStep) {
      await notifyOnboardingStep("create_memory");
    }
  } catch (error46) {
    vscode16.window.showErrorMessage(`Failed to create sample memory: ${error46 instanceof Error ? error46.message : "Unknown error"}`);
  }
}
function openMemoryInEditor(memory) {
  const content = `# ${memory.title}

**Type:** ${memory.memory_type}
**Created:** ${new Date(memory.created_at).toLocaleString()}

---

${memory.content}`;
  vscode16.workspace.openTextDocument({
    content,
    language: "markdown"
  }).then((doc) => {
    vscode16.window.showTextDocument(doc);
  });
}
function showWelcomeMessage() {
  const message = `\u{1F389} Welcome to Lanonasis Memory Assistant!

Your AI-powered memory management system is ready. Let's get you started!`;
  vscode16.window.showInformationMessage(
    message,
    "Connect in Browser",
    "Enter API Key",
    "Get API Key",
    "Learn More"
  ).then((selection) => {
    if (selection === "Connect in Browser") {
      vscode16.commands.executeCommand("lanonasis.authenticate", "oauth");
    } else if (selection === "Enter API Key") {
      vscode16.commands.executeCommand("lanonasis.authenticate", "apikey");
    } else if (selection === "Get API Key") {
      vscode16.env.openExternal(vscode16.Uri.parse("https://docs.lanonasis.com/api-keys"));
    } else if (selection === "Learn More") {
      showOnboardingGuide();
    }
  });
}
function showOnboardingGuide() {
  const guide = `# \u{1F9E0} Lanonasis Memory Assistant - Quick Start Guide

Welcome to your AI-powered memory management system! This guide will help you get started in just a few minutes.

## \u{1F680} Getting Started

### Step 1: Authenticate
Choose one of two authentication methods:

**Option A: Browser Authentication (Recommended)**
1. Click the Lanonasis icon in the sidebar
2. Click "Continue in Browser"
3. Sign in with your Lanonasis account
4. Authorize the extension

**Option B: API Key Authentication**
1. Visit https://api.lanonasis.com to get your API key
2. Click the Lanonasis icon in the sidebar
3. Click "Enter API Key"
4. Paste your API key when prompted

### Step 2: Create Your First Memory
There are multiple ways to create memories:

**From Selected Text:**
1. Select any text in your editor
2. Press \`Ctrl+Shift+Alt+M\` (or \`Cmd+Shift+Alt+M\` on Mac)
3. Give your memory a title
4. Done! Your memory is saved

**From Current File:**
1. Open any file
2. Run command: \`Lanonasis: Create Memory from Current File\`
3. Give your memory a title
4. The entire file content is saved as a memory

**From Sidebar:**
1. Click the Lanonasis icon in the sidebar
2. Click the "Create" button
3. Select text first, then click to save

### Step 3: Search Your Memories
**Quick Search:**
- Press \`Ctrl+Shift+M\` (or \`Cmd+Shift+M\` on Mac)
- Type your search query
- Select a memory to open it

**Sidebar Search:**
- Open the Lanonasis sidebar
- Use the search box at the top
- Results appear instantly

## \u{1F3AF} Key Features

### Memory Types
Memories are automatically organized by type:
- **Context**: Code snippets and contextual information
- **Project**: Project-specific notes and documentation
- **Knowledge**: General knowledge and learnings
- **Reference**: Reference materials and guides
- **Conversation**: Discussion notes and meeting summaries

### CLI Integration
If you have a compatible \`@lanonasis/cli\` installed, you'll get:
- \u26A1 Faster performance
- \u{1F504} Enhanced caching
- \u{1F680} Advanced features

Install with: \`npm install -g @lanonasis/cli\`

### API Key Management
Manage multiple API keys for different projects:
- Press \`Ctrl+Shift+K\` (or \`Cmd+Shift+K\` on Mac)
- Create, view, and organize API keys
- Support for different environments (dev, staging, prod)

## \u{1F6E0}\uFE0F Useful Commands

Open the Command Palette (\`Ctrl+Shift+P\` or \`Cmd+Shift+P\`) and try:

- \`Lanonasis: Search Memories\` - Search your memories
- \`Lanonasis: Create Memory from Selection\` - Save selected text
- \`Lanonasis: Manage API Keys\` - Manage your API keys
- \`Lanonasis: Run System Diagnostics\` - Check system health
- \`Lanonasis: Show Extension Logs\` - View detailed logs
- \`Lanonasis: Test Connection\` - Test your connection
- \`Lanonasis: Switch Gateway/Direct API Mode\` - Change connection mode

## \u{1F527} Troubleshooting

### Connection Issues?
1. Run: \`Lanonasis: Run System Diagnostics\`
2. Check the diagnostics report for issues
3. Follow recommended actions

### Authentication Problems?
1. Run: \`Lanonasis: Check API Key Status\`
2. Clear and re-enter your API key if needed
3. Try OAuth authentication as an alternative

### Need Help?
- \u{1F4DA} Documentation: https://docs.lanonasis.com
- \u{1F41B} Report Issues: https://github.com/lanonasis/lanonasis-maas/issues
- \u{1F4AC} Community: https://discord.gg/lanonasis

## \u2699\uFE0F Settings

Configure the extension to your liking:
1. Go to: \`File > Preferences > Settings\`
2. Search for: \`Lanonasis\`
3. Customize:
   - API URLs
   - Default memory types
   - Search limits
   - Performance options
   - And more!

## \u{1F393} Tips & Tricks

1. **Use Keyboard Shortcuts**: Master the shortcuts for faster workflow
2. **Tag Your Memories**: Add tags during creation for better organization
3. **Regular Backups**: Export important memories regularly
4. **CLI Integration**: Install the CLI for best performance
5. **Organize by Project**: Use project-specific memories for better context

## \u{1F389} You're All Set!

You're now ready to use Lanonasis Memory Assistant. Start by:
1. Authenticating (if you haven't already)
2. Creating your first memory
3. Searching and exploring

Happy memory management! \u{1F9E0}\u2728

---

**Quick Reference:**
- Search: \`Ctrl+Shift+M\` / \`Cmd+Shift+M\`
- Create from Selection: \`Ctrl+Shift+Alt+M\` / \`Cmd+Shift+Alt+M\`
- Manage API Keys: \`Ctrl+Shift+K\` / \`Cmd+Shift+K\`
`;
  vscode16.workspace.openTextDocument({
    content: guide,
    language: "markdown"
  }).then((doc) => {
    vscode16.window.showTextDocument(doc);
  });
}
async function switchConnectionMode(memoryService, apiKeyService) {
  const config2 = vscode16.workspace.getConfiguration("lanonasis");
  const currentUseGateway = config2.get("useGateway", true);
  const options = [
    {
      label: "\u{1F310} Gateway Mode (Recommended)",
      description: "Use Onasis Gateway for optimized routing and caching",
      picked: currentUseGateway,
      value: true
    },
    {
      label: "\u{1F517} Direct API Mode",
      description: "Connect directly to memory service",
      picked: !currentUseGateway,
      value: false
    }
  ];
  const selected = await vscode16.window.showQuickPick(options, {
    placeHolder: "Choose connection mode",
    ignoreFocusOut: true
  });
  if (!selected) return;
  try {
    await config2.update("useGateway", selected.value, vscode16.ConfigurationTarget.Global);
    await memoryService.refreshClient();
    apiKeyService.refreshConfig();
    const modeName = selected.value ? "Gateway" : "Direct API";
    vscode16.window.showInformationMessage(`Switched to ${modeName} mode. Testing connection...`);
    await memoryService.testConnection();
    vscode16.window.showInformationMessage(`\u2705 ${modeName} mode active and connected`);
    vscode16.commands.executeCommand("lanonasis.refreshMemories");
  } catch (error46) {
    vscode16.window.showErrorMessage(`Failed to switch mode: ${error46 instanceof Error ? error46.message : "Unknown error"}`);
    await config2.update("useGateway", currentUseGateway, vscode16.ConfigurationTarget.Global);
    await memoryService.refreshClient();
    apiKeyService.refreshConfig();
  }
}
async function manageApiKeys(apiKeyService) {
  const quickPickItems = [
    {
      label: "$(key) View API Keys",
      description: "View all API keys across projects",
      command: "view"
    },
    {
      label: "$(add) Create API Key",
      description: "Create a new API key",
      command: "create"
    },
    {
      label: "$(folder) Manage Projects",
      description: "Create and manage API key projects",
      command: "projects"
    },
    {
      label: "$(refresh) Refresh",
      description: "Refresh API key data",
      command: "refresh"
    }
  ];
  const selected = await vscode16.window.showQuickPick(quickPickItems, {
    placeHolder: "Choose an API key management action"
  });
  if (!selected) return;
  switch (selected.command) {
    case "view":
      await viewApiKeys(apiKeyService);
      break;
    case "create":
      await createApiKey(apiKeyService);
      break;
    case "projects":
      await viewProjects(apiKeyService);
      break;
    case "refresh":
      vscode16.commands.executeCommand("lanonasis.refreshApiKeys");
      break;
  }
}
async function viewApiKeys(apiKeyService) {
  try {
    vscode16.window.withProgress({
      location: vscode16.ProgressLocation.Notification,
      title: "Loading API keys...",
      cancellable: false
    }, async () => {
      const apiKeys = await apiKeyService.getApiKeys();
      if (apiKeys.length === 0) {
        vscode16.window.showInformationMessage("No API keys found. Create your first API key to get started.");
        return;
      }
      const items = apiKeys.map((key) => ({
        label: key.name,
        description: `${key.environment} \u2022 ${key.keyType} \u2022 ${key.accessLevel}`,
        detail: `Project: ${key.projectId} | Created: ${new Date(key.createdAt).toLocaleDateString()}`,
        apiKey: key
      }));
      const selected = await vscode16.window.showQuickPick(items, {
        placeHolder: `Select an API key (${apiKeys.length} found)`
      });
      if (selected) {
        await showApiKeyDetails(selected.apiKey);
      }
    });
  } catch (error46) {
    vscode16.window.showErrorMessage(`Failed to load API keys: ${error46 instanceof Error ? error46.message : "Unknown error"}`);
  }
}
async function createApiKey(apiKeyService, _apiKeyTreeProvider) {
  try {
    const projects = await apiKeyService.getProjects();
    if (projects.length === 0) {
      const createProjectResponse = await vscode16.window.showInformationMessage(
        "No projects found. You need to create a project first.",
        "Create Project",
        "Cancel"
      );
      if (createProjectResponse === "Create Project") {
        await createProject(apiKeyService, void 0);
      }
      return;
    }
    const projectItems = projects.map((p) => ({
      label: p.name,
      description: p.description || "No description",
      project: p
    }));
    const selectedProject = await vscode16.window.showQuickPick(projectItems, {
      placeHolder: "Select a project for the API key"
    });
    if (!selectedProject) return;
    const name = await vscode16.window.showInputBox({
      prompt: "API Key Name",
      placeHolder: "Enter a name for your API key"
    });
    if (!name) return;
    const value = await vscode16.window.showInputBox({
      prompt: "API Key Value",
      placeHolder: "Enter the API key value",
      password: true
    });
    if (!value) return;
    const keyTypes = [
      { label: "API Key", value: "api_key" },
      { label: "Database URL", value: "database_url" },
      { label: "OAuth Token", value: "oauth_token" },
      { label: "Certificate", value: "certificate" },
      { label: "SSH Key", value: "ssh_key" },
      { label: "Webhook Secret", value: "webhook_secret" },
      { label: "Encryption Key", value: "encryption_key" }
    ];
    const selectedKeyType = await vscode16.window.showQuickPick(keyTypes, {
      placeHolder: "Select key type"
    });
    if (!selectedKeyType) return;
    const config2 = vscode16.workspace.getConfiguration("lanonasis");
    const defaultEnv = config2.get("defaultEnvironment", "development");
    const environments = [
      { label: "Development", value: "development", picked: defaultEnv === "development" },
      { label: "Staging", value: "staging", picked: defaultEnv === "staging" },
      { label: "Production", value: "production", picked: defaultEnv === "production" }
    ];
    const selectedEnvironment = await vscode16.window.showQuickPick(environments, {
      placeHolder: "Select environment"
    });
    if (!selectedEnvironment) return;
    await vscode16.window.withProgress({
      location: vscode16.ProgressLocation.Notification,
      title: "Creating API key...",
      cancellable: false
    }, async () => {
      await apiKeyService.createApiKey({
        name,
        value,
        keyType: selectedKeyType.value,
        environment: selectedEnvironment.value,
        accessLevel: "team",
        projectId: selectedProject.project.id
      });
    });
    vscode16.window.showInformationMessage(`API key "${name}" created successfully`);
    vscode16.commands.executeCommand("lanonasis.refreshApiKeys");
  } catch (error46) {
    vscode16.window.showErrorMessage(`Failed to create API key: ${error46 instanceof Error ? error46.message : "Unknown error"}`);
  }
}
async function createProject(apiKeyService, apiKeyTreeProvider) {
  try {
    const name = await vscode16.window.showInputBox({
      prompt: "Project Name",
      placeHolder: "Enter a name for your project"
    });
    if (!name) return;
    const description = await vscode16.window.showInputBox({
      prompt: "Project Description (optional)",
      placeHolder: "Enter a description for your project"
    });
    const config2 = vscode16.workspace.getConfiguration("lanonasis");
    let organizationId = config2.get("organizationId");
    if (!organizationId) {
      const orgId = await vscode16.window.showInputBox({
        prompt: "Organization ID",
        placeHolder: "Enter your organization ID"
      });
      if (!orgId) return;
      await config2.update("organizationId", orgId, vscode16.ConfigurationTarget.Global);
      organizationId = orgId;
    }
    await vscode16.window.withProgress({
      location: vscode16.ProgressLocation.Notification,
      title: "Creating project...",
      cancellable: false
    }, async () => {
      const project = await apiKeyService.createProject({
        name,
        description,
        organizationId
      });
      if (apiKeyTreeProvider) {
        await apiKeyTreeProvider.addProject(project);
      }
    });
    vscode16.window.showInformationMessage(`Project "${name}" created successfully`);
    vscode16.commands.executeCommand("lanonasis.refreshApiKeys");
  } catch (error46) {
    vscode16.window.showErrorMessage(`Failed to create project: ${error46 instanceof Error ? error46.message : "Unknown error"}`);
  }
}
async function viewProjects(apiKeyService) {
  try {
    vscode16.window.withProgress({
      location: vscode16.ProgressLocation.Notification,
      title: "Loading projects...",
      cancellable: false
    }, async () => {
      const projects = await apiKeyService.getProjects();
      if (projects.length === 0) {
        const createProjectResponse = await vscode16.window.showInformationMessage(
          "No projects found. Create your first project to get started.",
          "Create Project",
          "Cancel"
        );
        if (createProjectResponse === "Create Project") {
          await createProject(apiKeyService, void 0);
        }
        return;
      }
      const items = projects.map((project) => ({
        label: project.name,
        description: project.description || "No description",
        detail: `Organization: ${project.organizationId} | Created: ${new Date(project.createdAt).toLocaleDateString()}`,
        project
      }));
      const selected = await vscode16.window.showQuickPick(items, {
        placeHolder: `Select a project (${projects.length} found)`
      });
      if (selected) {
        await showProjectDetails(selected.project, apiKeyService);
      }
    });
  } catch (error46) {
    vscode16.window.showErrorMessage(`Failed to load projects: ${error46 instanceof Error ? error46.message : "Unknown error"}`);
  }
}
async function showApiKeyDetails(apiKey) {
  const content = `# API Key: ${apiKey.name}

**Type:** ${apiKey.keyType}
**Environment:** ${apiKey.environment}
**Access Level:** ${apiKey.accessLevel}
**Project ID:** ${apiKey.projectId}
**Created:** ${new Date(apiKey.createdAt).toLocaleString()}
${apiKey.expiresAt ? `**Expires:** ${new Date(apiKey.expiresAt).toLocaleString()}` : "**Expires:** Never"}

## Tags
${apiKey.tags.length > 0 ? apiKey.tags.map((tag) => `- ${tag}`).join("\n") : "No tags"}

## Metadata
\`\`\`json
${JSON.stringify(apiKey.metadata, null, 2)}
\`\`\``;
  vscode16.workspace.openTextDocument({
    content,
    language: "markdown"
  }).then((doc) => {
    vscode16.window.showTextDocument(doc);
  });
}
async function showProjectDetails(project, apiKeyService) {
  try {
    const apiKeys = await apiKeyService.getApiKeys(project.id);
    const content = `# Project: ${project.name}

**Description:** ${project.description || "No description"}
**Organization ID:** ${project.organizationId}
**Created:** ${new Date(project.createdAt).toLocaleString()}
**Team Members:** ${project.teamMembers.length}

## API Keys (${apiKeys.length})
${apiKeys.length > 0 ? apiKeys.map((key) => `- **${key.name}** (${key.keyType}, ${key.environment})`).join("\n") : "No API keys found in this project"}

## Settings
\`\`\`json
${JSON.stringify(project.settings, null, 2)}
\`\`\``;
    vscode16.workspace.openTextDocument({
      content,
      language: "markdown"
    }).then((doc) => {
      vscode16.window.showTextDocument(doc);
    });
  } catch (error46) {
    vscode16.window.showErrorMessage(`Failed to load project details: ${error46 instanceof Error ? error46.message : "Unknown error"}`);
  }
}
async function createApiKeyForProject(project, apiKeyService, apiKeyTreeProvider) {
  try {
    const name = await vscode16.window.showInputBox({
      prompt: "API Key Name",
      placeHolder: "Enter a name for your API key"
    });
    if (!name) return;
    const value = await vscode16.window.showInputBox({
      prompt: "API Key Value",
      placeHolder: "Enter the API key value",
      password: true
    });
    if (!value) return;
    const keyTypes = [
      { label: "API Key", value: "api_key" },
      { label: "Database URL", value: "database_url" },
      { label: "OAuth Token", value: "oauth_token" },
      { label: "Certificate", value: "certificate" },
      { label: "SSH Key", value: "ssh_key" },
      { label: "Webhook Secret", value: "webhook_secret" },
      { label: "Encryption Key", value: "encryption_key" }
    ];
    const selectedKeyType = await vscode16.window.showQuickPick(keyTypes, {
      placeHolder: "Select key type"
    });
    if (!selectedKeyType) return;
    const environments = [
      { label: "Development", description: "For development use" },
      { label: "Staging", description: "For staging/testing" },
      { label: "Production", description: "For production use" }
    ];
    const selectedEnv = await vscode16.window.showQuickPick(environments, {
      placeHolder: "Select environment"
    });
    if (!selectedEnv) return;
    const accessLevels = [
      { label: "Public", description: "Publicly accessible" },
      { label: "Authenticated", description: "Requires authentication" },
      { label: "Team", description: "Team members only" },
      { label: "Admin", description: "Administrators only" },
      { label: "Enterprise", description: "Enterprise level access" }
    ];
    const selectedAccess = await vscode16.window.showQuickPick(accessLevels, {
      placeHolder: "Select access level"
    });
    if (!selectedAccess) return;
    const request = {
      name,
      value,
      keyType: selectedKeyType.value,
      environment: selectedEnv.label.toLowerCase(),
      accessLevel: selectedAccess.label.toLowerCase(),
      projectId: project.id
    };
    await vscode16.window.withProgress({
      location: vscode16.ProgressLocation.Notification,
      title: "Creating API key...",
      cancellable: false
    }, async () => {
      const apiKey = await apiKeyService.createApiKey(request);
      vscode16.window.showInformationMessage(`API key "${apiKey.name}" created successfully!`);
      if (apiKeyTreeProvider) {
        await apiKeyTreeProvider.addApiKey(project.id, apiKey);
      }
    });
  } catch (error46) {
    vscode16.window.showErrorMessage(`Failed to create API key: ${error46 instanceof Error ? error46.message : "Unknown error"}`);
  }
}
async function rotateApiKey(apiKey, apiKeyService, apiKeyTreeProvider) {
  try {
    const confirmed = await vscode16.window.showWarningMessage(
      `Are you sure you want to rotate API key "${apiKey.name}"? The old key will be invalidated.`,
      { modal: true },
      "Rotate Key"
    );
    if (confirmed !== "Rotate Key") return;
    await vscode16.window.withProgress({
      location: vscode16.ProgressLocation.Notification,
      title: "Rotating API key...",
      cancellable: false
    }, async () => {
      const rotated = await apiKeyService.rotateApiKey(apiKey.id);
      vscode16.window.showInformationMessage(`API key "${rotated.name}" rotated successfully!`);
      if (apiKeyTreeProvider) {
        await apiKeyTreeProvider.updateApiKey(apiKey.projectId, rotated);
      }
    });
  } catch (error46) {
    vscode16.window.showErrorMessage(`Failed to rotate API key: ${error46 instanceof Error ? error46.message : "Unknown error"}`);
  }
}
async function deleteApiKey(apiKey, apiKeyService, apiKeyTreeProvider) {
  try {
    const confirmed = await vscode16.window.showWarningMessage(
      `Are you sure you want to delete API key "${apiKey.name}"? This action cannot be undone.`,
      { modal: true },
      "Delete"
    );
    if (confirmed !== "Delete") return;
    await vscode16.window.withProgress({
      location: vscode16.ProgressLocation.Notification,
      title: "Deleting API key...",
      cancellable: false
    }, async () => {
      await apiKeyService.deleteApiKey(apiKey.id);
      vscode16.window.showInformationMessage(`API key "${apiKey.name}" deleted successfully.`);
      if (apiKeyTreeProvider) {
        await apiKeyTreeProvider.removeApiKey(apiKey.projectId, apiKey.id);
      }
    });
  } catch (error46) {
    vscode16.window.showErrorMessage(`Failed to delete API key: ${error46 instanceof Error ? error46.message : "Unknown error"}`);
  }
}
async function deleteProject(project, apiKeyService, apiKeyTreeProvider) {
  try {
    const confirmed = await vscode16.window.showWarningMessage(
      `Are you sure you want to delete project "${project.name}"? All API keys in this project will also be deleted. This action cannot be undone.`,
      { modal: true },
      "Delete"
    );
    if (confirmed !== "Delete") return;
    await vscode16.window.withProgress({
      location: vscode16.ProgressLocation.Notification,
      title: "Deleting project...",
      cancellable: false
    }, async () => {
      await apiKeyService.deleteProject(project.id);
      vscode16.window.showInformationMessage(`Project "${project.name}" deleted successfully.`);
      if (apiKeyTreeProvider) {
        await apiKeyTreeProvider.removeProject(project.id);
      }
    });
  } catch (error46) {
    vscode16.window.showErrorMessage(`Failed to delete project: ${error46 instanceof Error ? error46.message : "Unknown error"}`);
  }
}
async function captureContextToMemory(memoryService, notifyOnboardingStep) {
  try {
    let content;
    let source = "selection";
    const editor = vscode16.window.activeTextEditor;
    if (editor && !editor.selection.isEmpty) {
      content = editor.document.getText(editor.selection);
      source = "editor";
    } else {
      content = await vscode16.env.clipboard.readText();
      source = "clipboard";
    }
    if (!content || !content.trim()) {
      vscode16.window.showWarningMessage("No content to capture. Select text or copy something to clipboard first.");
      return;
    }
    const defaultTitle = content.substring(0, 50).replace(/\n/g, " ").trim();
    const title = await vscode16.window.showInputBox({
      prompt: "Title for this memory",
      placeHolder: "Enter a title...",
      value: defaultTitle
    });
    if (!title) return;
    const memoryType = await vscode16.window.showQuickPick(
      ["context", "knowledge", "reference", "project", "personal", "workflow"],
      {
        placeHolder: "Select memory type",
        title: "Memory Type"
      }
    );
    if (!memoryType) return;
    await vscode16.window.withProgress({
      location: vscode16.ProgressLocation.Notification,
      title: "Creating memory...",
      cancellable: false
    }, async () => {
      await memoryService.createMemory({
        title,
        content,
        memory_type: memoryType,
        tags: ["captured", source, "vscode"],
        metadata: {
          source,
          capturedAt: (/* @__PURE__ */ new Date()).toISOString(),
          editor: editor?.document.fileName
        }
      });
    });
    vscode16.window.showInformationMessage(`\u{1F4DD} Memory captured: "${title}"`);
    vscode16.commands.executeCommand("lanonasis.refreshMemories");
    if (notifyOnboardingStep) {
      await notifyOnboardingStep("create_memory");
    }
  } catch (error46) {
    vscode16.window.showErrorMessage(`Failed to capture context: ${error46 instanceof Error ? error46.message : "Unknown error"}`);
  }
}
async function captureClipboardToMemory(memoryService, notifyOnboardingStep) {
  try {
    const clipboardContent = await vscode16.env.clipboard.readText();
    if (!clipboardContent || !clipboardContent.trim()) {
      vscode16.window.showWarningMessage("Clipboard is empty. Copy some content first.");
      return;
    }
    const defaultTitle = clipboardContent.substring(0, 50).replace(/\n/g, " ").trim();
    const title = await vscode16.window.showInputBox({
      prompt: "Title for this memory",
      placeHolder: "Enter a title...",
      value: defaultTitle
    });
    if (!title) return;
    const typeItems = [
      { label: "\u{1F4DD} Context", description: "General contextual information", value: "context" },
      { label: "\u{1F4DA} Knowledge", description: "Learning or reference material", value: "knowledge" },
      { label: "\u{1F517} Reference", description: "Quick reference snippet", value: "reference" },
      { label: "\u{1F4C1} Project", description: "Project-specific note", value: "project" }
    ];
    const selectedType = await vscode16.window.showQuickPick(typeItems, {
      placeHolder: "Select memory type"
    });
    if (!selectedType) return;
    await vscode16.window.withProgress({
      location: vscode16.ProgressLocation.Notification,
      title: "Capturing from clipboard...",
      cancellable: false
    }, async () => {
      await memoryService.createMemory({
        title,
        content: clipboardContent,
        memory_type: selectedType.value,
        tags: ["clipboard", "captured", "vscode"],
        metadata: {
          source: "clipboard",
          capturedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    });
    vscode16.window.showInformationMessage(`\u{1F4CB} Clipboard captured: "${title}"`);
    vscode16.commands.executeCommand("lanonasis.refreshMemories");
    if (notifyOnboardingStep) {
      await notifyOnboardingStep("create_memory");
    }
  } catch (error46) {
    vscode16.window.showErrorMessage(`Failed to capture clipboard: ${error46 instanceof Error ? error46.message : "Unknown error"}`);
  }
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
