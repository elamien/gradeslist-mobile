"use strict";
// Canvas API - Core Data Structures and Functions
// Extracted from: canvas-fetch/canvas-fetch.ts
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
exports.fetchCanvasCourses = fetchCanvasCourses;
exports.fetchCanvasAssignments = fetchCanvasAssignments;
exports.fetchCanvasUserProfile = fetchCanvasUserProfile;
// Configuration
var CANVAS_BASE_URL = 'https://canvas.its.virginia.edu';
// Request cache to avoid duplicate API calls
var requestCache = new Map();
var CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
// Request deduplication - prevent duplicate requests in flight
var pendingRequests = new Map();
// Core API helper function with caching
function makeCanvasRequest(endpoint, apiToken) {
    return __awaiter(this, void 0, void 0, function () {
        var cacheKey, cached, pendingRequest, url, headers, requestPromise;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cacheKey = "".concat(endpoint, ":").concat(apiToken.slice(-10));
                    cached = requestCache.get(cacheKey);
                    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
                        return [2 /*return*/, cached.data];
                    }
                    pendingRequest = pendingRequests.get(cacheKey);
                    if (!pendingRequest) return [3 /*break*/, 2];
                    return [4 /*yield*/, pendingRequest];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    url = "".concat(CANVAS_BASE_URL).concat(endpoint);
                    headers = {
                        'Authorization': "Bearer ".concat(apiToken),
                        'Accept': 'application/json+canvas-string-ids',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'User-Agent': 'GradesList/1.0',
                        'Cache-Control': 'no-cache'
                    };
                    requestPromise = (function () { return __awaiter(_this, void 0, void 0, function () {
                        var controller, timeoutId, response, data, error_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    controller = new AbortController();
                                    timeoutId = setTimeout(function () { return controller.abort(); }, 3000);
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 4, 5, 6]);
                                    return [4 /*yield*/, fetch(url, {
                                            method: 'GET',
                                            headers: headers,
                                            signal: controller.signal
                                        })];
                                case 2:
                                    response = _a.sent();
                                    clearTimeout(timeoutId);
                                    if (!response.ok) {
                                        throw new Error("Canvas API error: ".concat(response.status, " ").concat(response.statusText));
                                    }
                                    return [4 /*yield*/, response.json()];
                                case 3:
                                    data = _a.sent();
                                    // Cache the result
                                    requestCache.set(cacheKey, { data: data, timestamp: Date.now() });
                                    return [2 /*return*/, data];
                                case 4:
                                    error_1 = _a.sent();
                                    clearTimeout(timeoutId);
                                    if (error_1 instanceof Error && error_1.name === 'AbortError') {
                                        throw new Error('Canvas API request timed out');
                                    }
                                    throw error_1;
                                case 5:
                                    // Clean up pending request
                                    pendingRequests.delete(cacheKey);
                                    return [7 /*endfinally*/];
                                case 6: return [2 /*return*/];
                            }
                        });
                    }); })();
                    // Store the request promise
                    pendingRequests.set(cacheKey, requestPromise);
                    return [4 /*yield*/, requestPromise];
                case 3: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
// Core function to fetch courses
function fetchCanvasCourses(filterTerm, apiToken) {
    return __awaiter(this, void 0, void 0, function () {
        var courses, filterWords, filteredCourses;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, makeCanvasRequest('/api/v1/courses?enrollment_state=active&include[]=term&per_page=100&only[]=id,name,course_code,term', apiToken)];
                case 1:
                    courses = _a.sent();
                    filterWords = filterTerm.toLowerCase().split(/\s+/).filter(function (word) { return word.length > 0; });
                    filteredCourses = courses.filter(function (course) {
                        var _a;
                        if (!((_a = course.term) === null || _a === void 0 ? void 0 : _a.name))
                            return false;
                        var termNameLower = course.term.name.toLowerCase();
                        return filterWords.every(function (word) { return termNameLower.includes(word); });
                    });
                    return [2 /*return*/, filteredCourses.filter(function (course) { return course.name; })];
            }
        });
    });
}
// Core function to fetch assignments
function fetchCanvasAssignments(courseId, apiToken) {
    return __awaiter(this, void 0, void 0, function () {
        var assignmentsEndpoint, assignments;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    assignmentsEndpoint = "/api/v1/courses/".concat(courseId, "/assignments?include[]=submission&per_page=200&order_by=due_at&only[]=id,name,due_at,points_possible,submission");
                    return [4 /*yield*/, makeCanvasRequest(assignmentsEndpoint, apiToken)];
                case 1:
                    assignments = _a.sent();
                    return [2 /*return*/, assignments];
            }
        });
    });
}
// Core function to validate token
function fetchCanvasUserProfile(apiToken) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, makeCanvasRequest('/api/v1/users/self', apiToken)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
