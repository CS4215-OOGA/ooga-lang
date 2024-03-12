"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircularImportError = exports.CannotFindModuleError = exports.ConsecutiveSlashesInFilePathError = exports.IllegalCharInFilePathError = exports.InvalidFilePathError = void 0;
var constants_1 = require("../constants");
var filePaths_1 = require("../localImports/filePaths");
var types_1 = require("../types");
var InvalidFilePathError = /** @class */ (function () {
    function InvalidFilePathError(filePath) {
        this.filePath = filePath;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.ERROR;
        this.location = constants_1.UNKNOWN_LOCATION;
    }
    return InvalidFilePathError;
}());
exports.InvalidFilePathError = InvalidFilePathError;
var IllegalCharInFilePathError = /** @class */ (function (_super) {
    __extends(IllegalCharInFilePathError, _super);
    function IllegalCharInFilePathError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    IllegalCharInFilePathError.prototype.explain = function () {
        var validNonAlphanumericChars = Object.keys(filePaths_1.nonAlphanumericCharEncoding)
            .map(function (char) { return "'".concat(char, "'"); })
            .join(', ');
        return "File path '".concat(this.filePath, "' must only contain alphanumeric chars and/or ").concat(validNonAlphanumericChars, ".");
    };
    IllegalCharInFilePathError.prototype.elaborate = function () {
        return 'Rename the offending file path to only use valid chars.';
    };
    return IllegalCharInFilePathError;
}(InvalidFilePathError));
exports.IllegalCharInFilePathError = IllegalCharInFilePathError;
var ConsecutiveSlashesInFilePathError = /** @class */ (function (_super) {
    __extends(ConsecutiveSlashesInFilePathError, _super);
    function ConsecutiveSlashesInFilePathError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ConsecutiveSlashesInFilePathError.prototype.explain = function () {
        return "File path '".concat(this.filePath, "' cannot contain consecutive slashes '//'.");
    };
    ConsecutiveSlashesInFilePathError.prototype.elaborate = function () {
        return 'Remove consecutive slashes from the offending file path.';
    };
    return ConsecutiveSlashesInFilePathError;
}(InvalidFilePathError));
exports.ConsecutiveSlashesInFilePathError = ConsecutiveSlashesInFilePathError;
var CannotFindModuleError = /** @class */ (function () {
    function CannotFindModuleError(moduleFilePath) {
        this.moduleFilePath = moduleFilePath;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.ERROR;
        this.location = constants_1.UNKNOWN_LOCATION;
    }
    CannotFindModuleError.prototype.explain = function () {
        return "Cannot find module '".concat(this.moduleFilePath, "'.");
    };
    CannotFindModuleError.prototype.elaborate = function () {
        return 'Check that the module file path resolves to an existing file.';
    };
    return CannotFindModuleError;
}());
exports.CannotFindModuleError = CannotFindModuleError;
var CircularImportError = /** @class */ (function () {
    function CircularImportError(filePathsInCycle) {
        this.filePathsInCycle = filePathsInCycle;
        this.type = types_1.ErrorType.TYPE;
        this.severity = types_1.ErrorSeverity.ERROR;
        this.location = constants_1.UNKNOWN_LOCATION;
    }
    CircularImportError.prototype.explain = function () {
        // We need to reverse the file paths in the cycle so that the
        // semantics of "'/a.js' -> '/b.js'" is "'/a.js' imports '/b.js'".
        var formattedCycle = this.filePathsInCycle
            .map(function (filePath) { return "'".concat(filePath, "'"); })
            .reverse()
            .join(' -> ');
        return "Circular import detected: ".concat(formattedCycle, ".");
    };
    CircularImportError.prototype.elaborate = function () {
        return 'Break the circular import cycle by removing imports from any of the offending files.';
    };
    return CircularImportError;
}());
exports.CircularImportError = CircularImportError;
