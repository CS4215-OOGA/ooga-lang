"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initModuleContextAsync = exports.loadModuleBundleAsync = exports.loadModuleTabsAsync = exports.memoizedGetModuleDocsAsync = exports.memoizedGetModuleTabAsync = exports.memoizedGetModuleBundleAsync = exports.memoizedGetModuleManifestAsync = exports.httpGetAsync = void 0;
var lodash_1 = require("lodash");
var misc_1 = require("../utils/misc");
var operators_1 = require("../utils/operators");
var errors_1 = require("./errors");
var moduleLoader_1 = require("./moduleLoader");
var requireProvider_1 = require("./requireProvider");
var utils_1 = require("./utils");
function httpGetAsync(path, type) {
    return __awaiter(this, void 0, void 0, function () {
        var resp, promise, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, misc_1.timeoutPromise)(fetch(path, {
                            method: 'GET'
                        }), 10000)];
                case 1:
                    resp = _a.sent();
                    if (resp.status !== 200 && resp.status !== 304) {
                        throw new errors_1.ModuleConnectionError();
                    }
                    promise = type === 'text' ? resp.text() : resp.json();
                    return [2 /*return*/, (0, misc_1.timeoutPromise)(promise, 10000)];
                case 2:
                    error_1 = _a.sent();
                    if (error_1 instanceof TypeError || error_1 instanceof misc_1.PromiseTimeoutError) {
                        throw new errors_1.ModuleConnectionError();
                    }
                    if (!(error_1 instanceof errors_1.ModuleConnectionError))
                        throw new errors_1.ModuleInternalError(path, error_1);
                    throw error_1;
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.httpGetAsync = httpGetAsync;
/**
 * Send a HTTP GET request to the modules endpoint to retrieve the manifest
 * @return Modules
 */
exports.memoizedGetModuleManifestAsync = (0, lodash_1.memoize)(getModuleManifestAsync);
function getModuleManifestAsync() {
    return httpGetAsync("".concat(moduleLoader_1.MODULES_STATIC_URL, "/modules.json"), 'json');
}
function checkModuleExists(moduleName, node) {
    return __awaiter(this, void 0, void 0, function () {
        var modules;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, exports.memoizedGetModuleManifestAsync)()
                    // Check if the module exists
                ];
                case 1:
                    modules = _a.sent();
                    // Check if the module exists
                    if (!(moduleName in modules))
                        throw new errors_1.ModuleNotFoundError(moduleName, node);
                    return [2 /*return*/, modules[moduleName]];
            }
        });
    });
}
exports.memoizedGetModuleBundleAsync = (0, lodash_1.memoize)(getModuleBundleAsync);
function getModuleBundleAsync(moduleName) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, httpGetAsync("".concat(moduleLoader_1.MODULES_STATIC_URL, "/bundles/").concat(moduleName, ".js"), 'text')];
        });
    });
}
exports.memoizedGetModuleTabAsync = (0, lodash_1.memoize)(getModuleTabAsync);
function getModuleTabAsync(tabName) {
    return httpGetAsync("".concat(moduleLoader_1.MODULES_STATIC_URL, "/tabs/").concat(tabName, ".js"), 'text');
}
exports.memoizedGetModuleDocsAsync = (0, lodash_1.memoize)(getModuleDocsAsync);
function getModuleDocsAsync(moduleName) {
    return __awaiter(this, void 0, void 0, function () {
        var result, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, httpGetAsync("".concat(moduleLoader_1.MODULES_STATIC_URL, "/jsons/").concat(moduleName, ".json"), 'json')];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result];
                case 2:
                    error_2 = _a.sent();
                    console.warn("Failed to load documentation for ".concat(moduleName, ":"), error_2);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function loadModuleTabsAsync(moduleName, node) {
    return __awaiter(this, void 0, void 0, function () {
        var moduleInfo;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, checkModuleExists(moduleName, node)
                    // Load the tabs for the current module
                ];
                case 1:
                    moduleInfo = _a.sent();
                    // Load the tabs for the current module
                    return [2 /*return*/, Promise.all(moduleInfo.tabs.map(function (path) { return __awaiter(_this, void 0, void 0, function () {
                            var rawTabFile;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, (0, exports.memoizedGetModuleTabAsync)(path)];
                                    case 1:
                                        rawTabFile = _a.sent();
                                        try {
                                            return [2 /*return*/, (0, utils_1.evalRawTab)(rawTabFile)];
                                        }
                                        catch (error) {
                                            // console.error('tab error:', error);
                                            throw new errors_1.ModuleInternalError(path, error, node);
                                        }
                                        return [2 /*return*/];
                                }
                            });
                        }); }))];
            }
        });
    });
}
exports.loadModuleTabsAsync = loadModuleTabsAsync;
function loadModuleBundleAsync(moduleName, context, wrapModule, node) {
    return __awaiter(this, void 0, void 0, function () {
        var moduleText, moduleBundle;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, exports.memoizedGetModuleBundleAsync)(moduleName)];
                case 1:
                    moduleText = _a.sent();
                    try {
                        moduleBundle = eval(moduleText);
                        if (wrapModule)
                            return [2 /*return*/, (0, operators_1.wrapSourceModule)(moduleName, moduleBundle, (0, requireProvider_1.getRequireProvider)(context))];
                        return [2 /*return*/, moduleBundle((0, requireProvider_1.getRequireProvider)(context))];
                    }
                    catch (error) {
                        // console.error("bundle error: ", error)
                        throw new errors_1.ModuleInternalError(moduleName, error, node);
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.loadModuleBundleAsync = loadModuleBundleAsync;
/**
 * Initialize module contexts and add UI tabs needed for modules to program context
 */
function initModuleContextAsync(moduleName, context, loadTabs) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, _b, _c, _d;
        var _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    if (!!(moduleName in context.moduleContexts)) return [3 /*break*/, 4];
                    _a = context.moduleContexts;
                    _b = moduleName;
                    _e = {
                        state: null
                    };
                    if (!loadTabs) return [3 /*break*/, 2];
                    return [4 /*yield*/, loadModuleTabsAsync(moduleName)];
                case 1:
                    _c = _f.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _c = null;
                    _f.label = 3;
                case 3:
                    _a[_b] = (_e.tabs = _c,
                        _e);
                    return [3 /*break*/, 6];
                case 4:
                    if (!(context.moduleContexts[moduleName].tabs === null && loadTabs)) return [3 /*break*/, 6];
                    _d = context.moduleContexts[moduleName];
                    return [4 /*yield*/, loadModuleTabsAsync(moduleName)];
                case 5:
                    _d.tabs = _f.sent();
                    _f.label = 6;
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.initModuleContextAsync = initModuleContextAsync;
