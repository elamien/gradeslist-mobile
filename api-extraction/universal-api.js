"use strict";
// Universal API Wrapper - "Plug and Chug" Functions
// These functions provide a consistent interface regardless of the underlying API
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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchUniversalCanvasCourses = fetchUniversalCanvasCourses;
exports.fetchUniversalGradescopeCourses = fetchUniversalGradescopeCourses;
exports.fetchUniversalAllCourses = fetchUniversalAllCourses;
exports.fetchUniversalCanvasAssignments = fetchUniversalCanvasAssignments;
exports.fetchUniversalGradescopeAssignments = fetchUniversalGradescopeAssignments;
exports.fetchUniversalAllAssignments = fetchUniversalAllAssignments;
exports.validateCanvasToken = validateCanvasToken;
exports.mergeUniversalAssignments = mergeUniversalAssignments;
exports.filterAssignmentsByStatus = filterAssignmentsByStatus;
exports.filterAssignmentsByDueDate = filterAssignmentsByDueDate;
var canvas_api_1 = require("./canvas-api");
var gradescope_api_1 = require("./gradescope-api");
var field_mapping_1 = require("./field-mapping");
// =============================================
// UNIVERSAL COURSE FUNCTIONS
// =============================================
/**
 * Fetch courses from Canvas API and return in universal format
 */
function fetchUniversalCanvasCourses(filterTerm, apiToken) {
    return __awaiter(this, void 0, void 0, function () {
        var canvasCourses, universalCourses, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, canvas_api_1.fetchCanvasCourses)(filterTerm, apiToken)];
                case 1:
                    canvasCourses = _a.sent();
                    universalCourses = (0, field_mapping_1.mapCanvasCoursesToUniversal)(canvasCourses);
                    return [2 /*return*/, (0, field_mapping_1.createUniversalResponse)(universalCourses, 'canvas')];
                case 2:
                    error_1 = _a.sent();
                    return [2 /*return*/, (0, field_mapping_1.createUniversalResponse)([], 'canvas', false, error_1 instanceof Error ? error_1.message : 'Unknown error')];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Fetch courses from Gradescope API and return in universal format
 * Supports both email/password and session cookies authentication
 */
function fetchUniversalGradescopeCourses(filterTerm, authOptions) {
    return __awaiter(this, void 0, void 0, function () {
        var gradescopeCourseList, universalCourseList, error_2, emptyList;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, gradescope_api_1.fetchGradescopeCourses)(filterTerm, authOptions)];
                case 1:
                    gradescopeCourseList = _a.sent();
                    universalCourseList = (0, field_mapping_1.mapGradescopeCourseListToUniversal)(gradescopeCourseList);
                    return [2 /*return*/, (0, field_mapping_1.createUniversalResponse)(universalCourseList, 'gradescope')];
                case 2:
                    error_2 = _a.sent();
                    emptyList = { student: [], instructor: [] };
                    return [2 /*return*/, (0, field_mapping_1.createUniversalResponse)(emptyList, 'gradescope', false, error_2 instanceof Error ? error_2.message : 'Unknown error')];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Fetch courses from both APIs and combine them
 */
function fetchUniversalAllCourses(filterTerm, canvasApiToken, gradescopeAuthOptions) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, canvasResponse, gradescopeResponse, combinedData, hasErrors, errorMessage, error_3, emptyData;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, Promise.all([
                            fetchUniversalCanvasCourses(filterTerm, canvasApiToken),
                            fetchUniversalGradescopeCourses(filterTerm, gradescopeAuthOptions)
                        ])];
                case 1:
                    _a = _b.sent(), canvasResponse = _a[0], gradescopeResponse = _a[1];
                    combinedData = {
                        canvas: canvasResponse.data,
                        gradescope: gradescopeResponse.data
                    };
                    hasErrors = !canvasResponse.success || !gradescopeResponse.success;
                    errorMessage = [
                        !canvasResponse.success ? "Canvas: ".concat(canvasResponse.error) : '',
                        !gradescopeResponse.success ? "Gradescope: ".concat(gradescopeResponse.error) : ''
                    ].filter(Boolean).join('; ');
                    return [2 /*return*/, (0, field_mapping_1.createUniversalResponse)(combinedData, 'canvas', !hasErrors, errorMessage || undefined)];
                case 2:
                    error_3 = _b.sent();
                    emptyData = {
                        canvas: [],
                        gradescope: { student: [], instructor: [] }
                    };
                    return [2 /*return*/, (0, field_mapping_1.createUniversalResponse)(emptyData, 'canvas', false, error_3 instanceof Error ? error_3.message : 'Unknown error')];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// =============================================
// UNIVERSAL ASSIGNMENT FUNCTIONS
// =============================================
/**
 * Fetch assignments from Canvas API and return in universal format
 */
function fetchUniversalCanvasAssignments(courseId, apiToken) {
    return __awaiter(this, void 0, void 0, function () {
        var canvasAssignments, universalAssignments, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, canvas_api_1.fetchCanvasAssignments)(courseId, apiToken)];
                case 1:
                    canvasAssignments = _a.sent();
                    universalAssignments = (0, field_mapping_1.mapCanvasAssignmentsToUniversal)(canvasAssignments);
                    return [2 /*return*/, (0, field_mapping_1.createUniversalResponse)(universalAssignments, 'canvas')];
                case 2:
                    error_4 = _a.sent();
                    return [2 /*return*/, (0, field_mapping_1.createUniversalResponse)([], 'canvas', false, error_4 instanceof Error ? error_4.message : 'Unknown error')];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Fetch assignments from Gradescope API and return in universal format
 * Supports both email/password and session cookies authentication
 */
function fetchUniversalGradescopeAssignments(courseId, authOptions) {
    return __awaiter(this, void 0, void 0, function () {
        var gradescopeAssignments, universalAssignments, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, gradescope_api_1.fetchGradescopeAssignments)(courseId, authOptions)];
                case 1:
                    gradescopeAssignments = _a.sent();
                    universalAssignments = (0, field_mapping_1.mapGradescopeAssignmentsToUniversal)(gradescopeAssignments);
                    return [2 /*return*/, (0, field_mapping_1.createUniversalResponse)(universalAssignments, 'gradescope')];
                case 2:
                    error_5 = _a.sent();
                    return [2 /*return*/, (0, field_mapping_1.createUniversalResponse)([], 'gradescope', false, error_5 instanceof Error ? error_5.message : 'Unknown error')];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Fetch assignments from both APIs for a given course
 */
function fetchUniversalAllAssignments(canvasCourseId, gradescopeCourseId, canvasApiToken, gradescopeAuthOptions) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, canvasResponse, gradescopeResponse, combinedData, hasErrors, errorMessage, error_6, emptyData;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, Promise.all([
                            fetchUniversalCanvasAssignments(canvasCourseId, canvasApiToken),
                            fetchUniversalGradescopeAssignments(gradescopeCourseId, gradescopeAuthOptions)
                        ])];
                case 1:
                    _a = _b.sent(), canvasResponse = _a[0], gradescopeResponse = _a[1];
                    combinedData = {
                        canvas: canvasResponse.data,
                        gradescope: gradescopeResponse.data
                    };
                    hasErrors = !canvasResponse.success || !gradescopeResponse.success;
                    errorMessage = [
                        !canvasResponse.success ? "Canvas: ".concat(canvasResponse.error) : '',
                        !gradescopeResponse.success ? "Gradescope: ".concat(gradescopeResponse.error) : ''
                    ].filter(Boolean).join('; ');
                    return [2 /*return*/, (0, field_mapping_1.createUniversalResponse)(combinedData, 'canvas', !hasErrors, errorMessage || undefined)];
                case 2:
                    error_6 = _b.sent();
                    emptyData = {
                        canvas: [],
                        gradescope: []
                    };
                    return [2 /*return*/, (0, field_mapping_1.createUniversalResponse)(emptyData, 'canvas', false, error_6 instanceof Error ? error_6.message : 'Unknown error')];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// =============================================
// UTILITY FUNCTIONS
// =============================================
/**
 * Validate Canvas API token
 */
function validateCanvasToken(apiToken) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, canvas_api_1.fetchCanvasUserProfile)(apiToken)];
                case 1:
                    _b.sent();
                    return [2 /*return*/, true];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Simple function to merge assignments from both APIs into a single array
 */
function mergeUniversalAssignments(canvasAssignments, gradescopeAssignments) {
    return __spreadArray(__spreadArray([], canvasAssignments, true), gradescopeAssignments, true);
}
/**
 * Filter assignments by status
 */
function filterAssignmentsByStatus(assignments, status) {
    return assignments.filter(function (assignment) { return assignment.status === status; });
}
/**
 * Filter assignments by due date range
 */
function filterAssignmentsByDueDate(assignments, startDate, endDate) {
    return assignments.filter(function (assignment) {
        if (!assignment.due_date)
            return false;
        var dueDate = new Date(assignment.due_date);
        var start = startDate ? new Date(startDate) : null;
        var end = endDate ? new Date(endDate) : null;
        if (start && dueDate < start)
            return false;
        if (end && dueDate > end)
            return false;
        return true;
    });
}
