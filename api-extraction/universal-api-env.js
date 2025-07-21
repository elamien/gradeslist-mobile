"use strict";
// Universal API Environment Variable Convenience Wrappers
// Optional layer that reads credentials from .env files
// Use these functions if you want automatic .env support, otherwise use the main universal-api.ts functions
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchCanvasCoursesFromEnv = fetchCanvasCoursesFromEnv;
exports.fetchCanvasAssignmentsFromEnv = fetchCanvasAssignmentsFromEnv;
exports.validateCanvasTokenFromEnv = validateCanvasTokenFromEnv;
exports.fetchGradescopeCoursesFromEnv = fetchGradescopeCoursesFromEnv;
exports.fetchGradescopeAssignmentsFromEnv = fetchGradescopeAssignmentsFromEnv;
exports.fetchMultipleCanvasAssignmentsFromEnv = fetchMultipleCanvasAssignmentsFromEnv;
exports.fetchMultipleGradescopeAssignmentsFromEnv = fetchMultipleGradescopeAssignmentsFromEnv;
exports.fetchAllCoursesFromEnv = fetchAllCoursesFromEnv;
exports.fetchAllAssignmentsFromEnv = fetchAllAssignmentsFromEnv;
exports.validateEnvironmentVariables = validateEnvironmentVariables;
exports.printEnvSetupInstructions = printEnvSetupInstructions;
var dotenv_1 = require("dotenv");
var universal_api_1 = require("./universal-api");
var gradescope_api_1 = require("./gradescope-api");
// Load environment variables
dotenv_1.default.config();
// =============================================
// CANVAS CONVENIENCE FUNCTIONS (.env)
// =============================================
/**
 * Fetch Canvas courses using CANVAS_API_TOKEN from .env
 */
function fetchCanvasCoursesFromEnv(filterTerm) {
    return __awaiter(this, void 0, void 0, function () {
        var apiToken;
        return __generator(this, function (_a) {
            apiToken = process.env.CANVAS_API_TOKEN;
            if (!apiToken) {
                throw new Error('CANVAS_API_TOKEN not found in .env file. Please add it to your .env file.');
            }
            return [2 /*return*/, (0, universal_api_1.fetchUniversalCanvasCourses)(filterTerm, apiToken)];
        });
    });
}
/**
 * Fetch Canvas assignments using CANVAS_API_TOKEN from .env
 */
function fetchCanvasAssignmentsFromEnv(courseId) {
    return __awaiter(this, void 0, void 0, function () {
        var apiToken;
        return __generator(this, function (_a) {
            apiToken = process.env.CANVAS_API_TOKEN;
            if (!apiToken) {
                throw new Error('CANVAS_API_TOKEN not found in .env file. Please add it to your .env file.');
            }
            return [2 /*return*/, (0, universal_api_1.fetchUniversalCanvasAssignments)(courseId, apiToken)];
        });
    });
}
/**
 * Validate Canvas token from .env
 */
function validateCanvasTokenFromEnv() {
    return __awaiter(this, void 0, void 0, function () {
        var apiToken;
        return __generator(this, function (_a) {
            apiToken = process.env.CANVAS_API_TOKEN;
            if (!apiToken) {
                throw new Error('CANVAS_API_TOKEN not found in .env file. Please add it to your .env file.');
            }
            return [2 /*return*/, (0, universal_api_1.validateCanvasToken)(apiToken)];
        });
    });
}
// =============================================
// GRADESCOPE CONVENIENCE FUNCTIONS (.env)
// =============================================
/**
 * Fetch Gradescope courses using GRADESCOPE_EMAIL and GRADESCOPE_PASSWORD from .env
 */
function fetchGradescopeCoursesFromEnv(filterTerm) {
    return __awaiter(this, void 0, void 0, function () {
        var email, password;
        return __generator(this, function (_a) {
            email = process.env.GRADESCOPE_EMAIL;
            password = process.env.GRADESCOPE_PASSWORD;
            if (!email || !password) {
                throw new Error('GRADESCOPE_EMAIL and GRADESCOPE_PASSWORD not found in .env file. Please add them to your .env file.');
            }
            return [2 /*return*/, (0, universal_api_1.fetchUniversalGradescopeCourses)(filterTerm, { email: email, password: password })];
        });
    });
}
/**
 * Fetch Gradescope assignments using GRADESCOPE_EMAIL and GRADESCOPE_PASSWORD from .env
 */
function fetchGradescopeAssignmentsFromEnv(courseId) {
    return __awaiter(this, void 0, void 0, function () {
        var email, password;
        return __generator(this, function (_a) {
            email = process.env.GRADESCOPE_EMAIL;
            password = process.env.GRADESCOPE_PASSWORD;
            if (!email || !password) {
                throw new Error('GRADESCOPE_EMAIL and GRADESCOPE_PASSWORD not found in .env file. Please add them to your .env file.');
            }
            return [2 /*return*/, (0, universal_api_1.fetchUniversalGradescopeAssignments)(courseId, { email: email, password: password })];
        });
    });
}
// =============================================
// COMBINED CONVENIENCE FUNCTIONS (.env)
// =============================================
/**
 * Fetch courses from both APIs using credentials from .env
 */
/**
 * Fetch assignments from multiple Canvas courses in parallel
 */
function fetchMultipleCanvasAssignmentsFromEnv(courseIds) {
    return __awaiter(this, void 0, void 0, function () {
        var apiToken, assignmentPromises, results, assignments, hasErrors, firstError, _i, results_1, _a, courseId, response, error_1;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    apiToken = process.env.CANVAS_API_TOKEN;
                    if (!apiToken) {
                        return [2 /*return*/, {
                                success: false,
                                error: 'CANVAS_API_TOKEN not found in .env file. Please add it to your .env file.'
                            }];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    assignmentPromises = courseIds.map(function (courseId) { return __awaiter(_this, void 0, void 0, function () {
                        var start, response, time;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    start = performance.now();
                                    return [4 /*yield*/, (0, universal_api_1.fetchUniversalCanvasAssignments)(courseId, apiToken)];
                                case 1:
                                    response = _a.sent();
                                    time = performance.now() - start;
                                    console.log("   \uD83D\uDCDA Canvas course ".concat(courseId, ": ").concat((time / 1000).toFixed(2), "s"));
                                    return [2 /*return*/, { courseId: courseId, response: response }];
                            }
                        });
                    }); });
                    return [4 /*yield*/, Promise.all(assignmentPromises)];
                case 2:
                    results = _b.sent();
                    assignments = {};
                    hasErrors = false;
                    firstError = '';
                    for (_i = 0, results_1 = results; _i < results_1.length; _i++) {
                        _a = results_1[_i], courseId = _a.courseId, response = _a.response;
                        if (response.success) {
                            assignments[courseId] = response.data;
                        }
                        else {
                            hasErrors = true;
                            if (!firstError) {
                                firstError = response.error;
                            }
                            assignments[courseId] = [];
                        }
                    }
                    if (hasErrors && Object.keys(assignments).length === 0) {
                        return [2 /*return*/, {
                                success: false,
                                error: firstError
                            }];
                    }
                    return [2 /*return*/, {
                            success: true,
                            data: assignments
                        }];
                case 3:
                    error_1 = _b.sent();
                    return [2 /*return*/, {
                            success: false,
                            error: error_1 instanceof Error ? error_1.message : 'Unknown error occurred'
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Fetch assignments from multiple Gradescope courses using a single session
 */
function fetchMultipleGradescopeAssignmentsFromEnv(courseIds) {
    return __awaiter(this, void 0, void 0, function () {
        var email, password, sessionCookies_1, BATCH_SIZE, results, i, batch, batchPromises, batchResults, assignments, hasErrors, firstError, _i, results_2, _a, courseId, response, error_2;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    email = process.env.GRADESCOPE_EMAIL;
                    password = process.env.GRADESCOPE_PASSWORD;
                    if (!email || !password) {
                        return [2 /*return*/, {
                                success: false,
                                error: 'GRADESCOPE_EMAIL and GRADESCOPE_PASSWORD not found in .env file. Please add them to your .env file.'
                            }];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 7, , 8]);
                    return [4 /*yield*/, (0, gradescope_api_1.authenticateGradescope)(email, password)];
                case 2:
                    sessionCookies_1 = _b.sent();
                    BATCH_SIZE = 8;
                    results = [];
                    i = 0;
                    _b.label = 3;
                case 3:
                    if (!(i < courseIds.length)) return [3 /*break*/, 6];
                    batch = courseIds.slice(i, i + BATCH_SIZE);
                    batchPromises = batch.map(function (courseId) { return __awaiter(_this, void 0, void 0, function () {
                        var response;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, (0, universal_api_1.fetchUniversalGradescopeAssignments)(courseId, { sessionCookies: sessionCookies_1 })];
                                case 1:
                                    response = _a.sent();
                                    return [2 /*return*/, { courseId: courseId, response: response }];
                            }
                        });
                    }); });
                    return [4 /*yield*/, Promise.all(batchPromises)];
                case 4:
                    batchResults = _b.sent();
                    results.push.apply(results, batchResults);
                    _b.label = 5;
                case 5:
                    i += BATCH_SIZE;
                    return [3 /*break*/, 3];
                case 6:
                    assignments = {};
                    hasErrors = false;
                    firstError = '';
                    for (_i = 0, results_2 = results; _i < results_2.length; _i++) {
                        _a = results_2[_i], courseId = _a.courseId, response = _a.response;
                        if (response.success) {
                            assignments[courseId] = response.data;
                        }
                        else {
                            hasErrors = true;
                            if (!firstError) {
                                firstError = response.error;
                            }
                            assignments[courseId] = [];
                        }
                    }
                    if (hasErrors && Object.keys(assignments).length === 0) {
                        return [2 /*return*/, {
                                success: false,
                                error: firstError
                            }];
                    }
                    return [2 /*return*/, {
                            success: true,
                            data: assignments
                        }];
                case 7:
                    error_2 = _b.sent();
                    return [2 /*return*/, {
                            success: false,
                            error: error_2 instanceof Error ? error_2.message : 'Unknown error occurred'
                        }];
                case 8: return [2 /*return*/];
            }
        });
    });
}
function fetchAllCoursesFromEnv(filterTerm) {
    return __awaiter(this, void 0, void 0, function () {
        var canvasToken, gradescopeEmail, gradescopePassword;
        return __generator(this, function (_a) {
            canvasToken = process.env.CANVAS_API_TOKEN;
            gradescopeEmail = process.env.GRADESCOPE_EMAIL;
            gradescopePassword = process.env.GRADESCOPE_PASSWORD;
            if (!canvasToken) {
                throw new Error('CANVAS_API_TOKEN not found in .env file. Please add it to your .env file.');
            }
            if (!gradescopeEmail || !gradescopePassword) {
                throw new Error('GRADESCOPE_EMAIL and GRADESCOPE_PASSWORD not found in .env file. Please add them to your .env file.');
            }
            return [2 /*return*/, (0, universal_api_1.fetchUniversalAllCourses)(filterTerm, canvasToken, { email: gradescopeEmail, password: gradescopePassword })];
        });
    });
}
/**
 * Fetch assignments from both APIs using credentials from .env
 */
function fetchAllAssignmentsFromEnv(canvasCourseId, gradescopeCourseId) {
    return __awaiter(this, void 0, void 0, function () {
        var canvasToken, gradescopeEmail, gradescopePassword;
        return __generator(this, function (_a) {
            canvasToken = process.env.CANVAS_API_TOKEN;
            gradescopeEmail = process.env.GRADESCOPE_EMAIL;
            gradescopePassword = process.env.GRADESCOPE_PASSWORD;
            if (!canvasToken) {
                throw new Error('CANVAS_API_TOKEN not found in .env file. Please add it to your .env file.');
            }
            if (!gradescopeEmail || !gradescopePassword) {
                throw new Error('GRADESCOPE_EMAIL and GRADESCOPE_PASSWORD not found in .env file. Please add them to your .env file.');
            }
            return [2 /*return*/, (0, universal_api_1.fetchUniversalAllAssignments)(canvasCourseId, gradescopeCourseId, canvasToken, { email: gradescopeEmail, password: gradescopePassword })];
        });
    });
}
// =============================================
// ENVIRONMENT VARIABLE VALIDATION
// =============================================
/**
 * Check if all required environment variables are set
 */
function validateEnvironmentVariables() {
    var canvasToken = process.env.CANVAS_API_TOKEN;
    var gradescopeEmail = process.env.GRADESCOPE_EMAIL;
    var gradescopePassword = process.env.GRADESCOPE_PASSWORD;
    var missingVars = [];
    if (!canvasToken)
        missingVars.push('CANVAS_API_TOKEN');
    if (!gradescopeEmail)
        missingVars.push('GRADESCOPE_EMAIL');
    if (!gradescopePassword)
        missingVars.push('GRADESCOPE_PASSWORD');
    return {
        canvas: !!canvasToken,
        gradescope: !!(gradescopeEmail && gradescopePassword),
        missingVars: missingVars
    };
}
/**
 * Print helpful setup instructions for missing environment variables
 */
function printEnvSetupInstructions() {
    var validation = validateEnvironmentVariables();
    if (validation.missingVars.length === 0) {
        console.log('✅ All environment variables are set correctly!');
        return;
    }
    console.log('❌ Missing environment variables in your .env file:');
    console.log('');
    validation.missingVars.forEach(function (varName) {
        console.log("\u274C ".concat(varName));
    });
    console.log('');
    console.log('📋 Add these to your .env file:');
    console.log('');
    if (!validation.canvas) {
        console.log('# Canvas API Token (get from Canvas Settings → Account → New Access Token)');
        console.log('CANVAS_API_TOKEN=your_canvas_api_token_here');
        console.log('');
    }
    if (!validation.gradescope) {
        console.log('# Gradescope Login Credentials');
        console.log('GRADESCOPE_EMAIL=your_email@university.edu');
        console.log('GRADESCOPE_PASSWORD=your_gradescope_password');
        console.log('');
    }
    console.log('💡 Then restart your application to load the new environment variables.');
}
