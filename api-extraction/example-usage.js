"use strict";
// EdTech API Gateway Demo Script
// Run from parent directory: npx tsx api-extraction/example-usage.ts
// Or run from api-extraction directory: npx tsx example-usage.ts
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
var readline = require("node:readline/promises");
var node_process_1 = require("node:process");
var perf_hooks_1 = require("perf_hooks");
var universal_api_env_1 = require("./universal-api-env");
// Function to ask user for input
function askForInput(query) {
    return __awaiter(this, void 0, void 0, function () {
        var rl, answer;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    rl = readline.createInterface({ input: node_process_1.stdin, output: node_process_1.stdout });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 3, 4]);
                    return [4 /*yield*/, rl.question(query)];
                case 2:
                    answer = _a.sent();
                    return [2 /*return*/, answer.trim()];
                case 3:
                    rl.close();
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Function to validate and format term input
function formatTerm(termInput) {
    var parts = termInput.trim().toLowerCase().split(/\s+/);
    if (parts.length !== 2) {
        throw new Error('Please enter term in format "season year" (e.g., "spring 2025")');
    }
    var season = parts[0], yearStr = parts[1];
    // Validate season
    var validSeasons = ['spring', 'summer', 'fall', 'winter'];
    if (!validSeasons.includes(season)) {
        throw new Error("Invalid season \"".concat(season, "\". Valid seasons: ").concat(validSeasons.join(', ')));
    }
    // Validate year
    var yearNum = parseInt(yearStr);
    if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2030) {
        throw new Error("Invalid year \"".concat(yearStr, "\". Please enter a year between 2020-2030."));
    }
    // Return formatted term (e.g., "spring 2025")
    return "".concat(season, " ").concat(yearStr);
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var envValidation, termInput, demoType, fetchAssignments, termFilter, startTime, courseFetchStart, courseFetchEnd, canvasAssignmentTime, gradescopeAssignmentTime, displayStartTime, displayTime, allCoursesResponse, _a, canvas_1, gradescope, canvasAssignments_1, gradescopeAssignments_1, assignmentStartTime, assignmentPromises, canvasStart_1, canvasPromise, allGradescopeCourseIds, gradescopeStart_1, gradescopePromise, assignmentEndTime, totalGradescopeCourses, displayEndTime, totalCanvasAssignments, totalGradescopeAssignments, error_1, endTime, totalTime, courseTime, assignmentTime, networkTime, processingTime, actualNetworkPercentage;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('🎓 EdTech API Gateway Demo');
                    console.log('===========================');
                    console.log('');
                    // Check environment variables
                    console.log('📋 Checking environment variables...');
                    envValidation = (0, universal_api_env_1.validateEnvironmentVariables)();
                    if (envValidation.missingVars.length > 0) {
                        console.log('');
                        (0, universal_api_env_1.printEnvSetupInstructions)();
                        console.log('');
                        console.log('❌ Please set up your .env file first, then run this script again.');
                        process.exit(1);
                    }
                    console.log('✅ Environment variables configured correctly!');
                    console.log('');
                    // Get user input for term
                    console.log('📅 Enter the academic term to search for:');
                    return [4 /*yield*/, askForInput('Term (e.g., "spring 2025"): ')];
                case 1:
                    termInput = _b.sent();
                    // Get user input for demo type
                    console.log('');
                    console.log('🔧 Choose demo type:');
                    console.log('1. Courses only (faster)');
                    console.log('2. Courses + Assignments (slower, shows full functionality)');
                    return [4 /*yield*/, askForInput('Enter your choice (1 or 2): ')];
                case 2:
                    demoType = _b.sent();
                    // Validate demo type
                    if (demoType !== '1' && demoType !== '2') {
                        console.error('❌ Invalid choice. Please enter 1 or 2.');
                        process.exit(1);
                    }
                    fetchAssignments = demoType === '2';
                    try {
                        termFilter = formatTerm(termInput);
                        console.log("\uD83D\uDD0D Searching for courses in: \"".concat(termFilter, "\""));
                        if (fetchAssignments) {
                            console.log('📋 Will also fetch assignments for found courses');
                        }
                    }
                    catch (error) {
                        console.error("\u274C ".concat(error instanceof Error ? error.message : 'Invalid input'));
                        process.exit(1);
                    }
                    console.log('');
                    startTime = perf_hooks_1.performance.now();
                    canvasAssignmentTime = 0;
                    gradescopeAssignmentTime = 0;
                    displayTime = 0;
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 7, , 8]);
                    console.log('🚀 Fetching courses from both Canvas and Gradescope...');
                    console.log('');
                    // Fetch from both APIs with detailed timing
                    courseFetchStart = perf_hooks_1.performance.now();
                    return [4 /*yield*/, (0, universal_api_env_1.fetchAllCoursesFromEnv)(termFilter)];
                case 4:
                    allCoursesResponse = _b.sent();
                    courseFetchEnd = perf_hooks_1.performance.now();
                    console.log("\uD83D\uDCCA Course fetching completed in ".concat(((courseFetchEnd - courseFetchStart) / 1000).toFixed(2), "s"));
                    if (!allCoursesResponse.success) {
                        console.error("\u274C Error fetching courses: ".concat(allCoursesResponse.error));
                        process.exit(1);
                    }
                    _a = allCoursesResponse.data, canvas_1 = _a.canvas, gradescope = _a.gradescope;
                    canvasAssignments_1 = {};
                    gradescopeAssignments_1 = {};
                    if (!fetchAssignments) return [3 /*break*/, 6];
                    assignmentStartTime = perf_hooks_1.performance.now();
                    console.log('📋 Fetching assignments in parallel...');
                    assignmentPromises = [];
                    // Fetch Canvas assignments in parallel
                    if (canvas_1.length > 0) {
                        canvasStart_1 = perf_hooks_1.performance.now();
                        console.log("   \uD83D\uDD0D Starting Canvas requests for ".concat(canvas_1.length, " courses..."));
                        canvasPromise = (0, universal_api_env_1.fetchMultipleCanvasAssignmentsFromEnv)(canvas_1.map(function (c) { return c.id; }))
                            .then(function (response) {
                            canvasAssignmentTime = perf_hooks_1.performance.now() - canvasStart_1;
                            console.log("   \u2705 Canvas requests completed in ".concat((canvasAssignmentTime / 1000).toFixed(2), "s"));
                            if (response.success) {
                                canvasAssignments_1 = response.data;
                                var totalAssignments = Object.values(response.data).reduce(function (sum, assignments) { return sum + assignments.length; }, 0);
                                console.log("   \uD83D\uDCCA Canvas fetched ".concat(totalAssignments, " assignments across ").concat(canvas_1.length, " courses"));
                            }
                        });
                        assignmentPromises.push(canvasPromise);
                    }
                    allGradescopeCourseIds = __spreadArray(__spreadArray([], gradescope.student.map(function (c) { return c.id; }), true), gradescope.instructor.map(function (c) { return c.id; }), true);
                    if (allGradescopeCourseIds.length > 0) {
                        gradescopeStart_1 = perf_hooks_1.performance.now();
                        gradescopePromise = (0, universal_api_env_1.fetchMultipleGradescopeAssignmentsFromEnv)(allGradescopeCourseIds)
                            .then(function (response) {
                            gradescopeAssignmentTime = perf_hooks_1.performance.now() - gradescopeStart_1;
                            if (response.success) {
                                gradescopeAssignments_1 = response.data;
                            }
                        });
                        assignmentPromises.push(gradescopePromise);
                    }
                    return [4 /*yield*/, Promise.all(assignmentPromises)];
                case 5:
                    _b.sent();
                    assignmentEndTime = perf_hooks_1.performance.now();
                    console.log("\u2705 Assignment fetching completed in ".concat(((assignmentEndTime - assignmentStartTime) / 1000).toFixed(2), "s"));
                    console.log("   \uD83D\uDCCA Canvas assignments: ".concat((canvasAssignmentTime / 1000).toFixed(2), "s"));
                    console.log("   \uD83D\uDCCA Gradescope assignments: ".concat((gradescopeAssignmentTime / 1000).toFixed(2), "s"));
                    console.log('');
                    _b.label = 6;
                case 6:
                    // Display Canvas results
                    displayStartTime = perf_hooks_1.performance.now();
                    console.log('📚 CANVAS COURSES');
                    console.log('==================');
                    if (canvas_1.length === 0) {
                        console.log("No Canvas courses found for \"".concat(termFilter, "\""));
                    }
                    else {
                        console.log("Found ".concat(canvas_1.length, " Canvas course(s):"));
                        canvas_1.forEach(function (course, index) {
                            console.log("  ".concat(index + 1, ". ").concat(course.name));
                            console.log("     ID: ".concat(course.id));
                            console.log("     Term: ".concat(course.term));
                            if (course.course_code) {
                                console.log("     Code: ".concat(course.course_code));
                            }
                            // Show assignments if they were fetched
                            if (fetchAssignments && canvasAssignments_1[course.id]) {
                                var assignments = canvasAssignments_1[course.id];
                                console.log("     \uD83D\uDCCB Assignments (".concat(assignments.length, "):"));
                                // Show top 3 most recent assignments
                                var recentAssignments = assignments
                                    .sort(function (a, b) {
                                    var dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
                                    var dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
                                    return dateB - dateA;
                                })
                                    .slice(0, 3);
                                recentAssignments.forEach(function (assignment, aIndex) {
                                    console.log("       ".concat(aIndex + 1, ". ").concat(assignment.title, " (").concat(assignment.status, ")"));
                                    if (assignment.due_date) {
                                        console.log("          Due: ".concat(assignment.due_date));
                                    }
                                    if (assignment.score !== null && assignment.max_points !== null) {
                                        console.log("          Score: ".concat(assignment.score, "/").concat(assignment.max_points));
                                    }
                                });
                                if (assignments.length > 3) {
                                    console.log("       ... and ".concat(assignments.length - 3, " more"));
                                }
                            }
                            console.log('');
                        });
                    }
                    // Display Gradescope results
                    console.log('📝 GRADESCOPE COURSES');
                    console.log('=====================');
                    totalGradescopeCourses = gradescope.student.length + gradescope.instructor.length;
                    if (totalGradescopeCourses === 0) {
                        console.log("No Gradescope courses found for \"".concat(termFilter, "\""));
                    }
                    else {
                        if (gradescope.student.length > 0) {
                            console.log("Student courses (".concat(gradescope.student.length, "):"));
                            gradescope.student.forEach(function (course, index) {
                                console.log("  ".concat(index + 1, ". ").concat(course.name));
                                console.log("     ID: ".concat(course.id));
                                console.log("     Term: ".concat(course.term));
                                // Show assignments if they were fetched
                                if (fetchAssignments && gradescopeAssignments_1[course.id]) {
                                    var assignments = gradescopeAssignments_1[course.id];
                                    console.log("     \uD83D\uDCCB Assignments (".concat(assignments.length, "):"));
                                    // Show top 3 most recent assignments
                                    var recentAssignments = assignments
                                        .sort(function (a, b) {
                                        var dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
                                        var dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
                                        return dateB - dateA;
                                    })
                                        .slice(0, 3);
                                    recentAssignments.forEach(function (assignment, aIndex) {
                                        console.log("       ".concat(aIndex + 1, ". ").concat(assignment.title, " (").concat(assignment.status, ")"));
                                        if (assignment.due_date) {
                                            console.log("          Due: ".concat(assignment.due_date));
                                        }
                                        if (assignment.score !== null && assignment.max_points !== null) {
                                            console.log("          Score: ".concat(assignment.score, "/").concat(assignment.max_points));
                                        }
                                    });
                                    if (assignments.length > 3) {
                                        console.log("       ... and ".concat(assignments.length - 3, " more"));
                                    }
                                }
                                console.log('');
                            });
                        }
                        if (gradescope.instructor.length > 0) {
                            console.log("Instructor courses (".concat(gradescope.instructor.length, "):"));
                            gradescope.instructor.forEach(function (course, index) {
                                console.log("  ".concat(index + 1, ". ").concat(course.name));
                                console.log("     ID: ".concat(course.id));
                                console.log("     Term: ".concat(course.term));
                                // Show assignments if they were fetched
                                if (fetchAssignments && gradescopeAssignments_1[course.id]) {
                                    var assignments = gradescopeAssignments_1[course.id];
                                    console.log("     \uD83D\uDCCB Assignments (".concat(assignments.length, "):"));
                                    // Show top 3 most recent assignments
                                    var recentAssignments = assignments
                                        .sort(function (a, b) {
                                        var dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
                                        var dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
                                        return dateB - dateA;
                                    })
                                        .slice(0, 3);
                                    recentAssignments.forEach(function (assignment, aIndex) {
                                        console.log("       ".concat(aIndex + 1, ". ").concat(assignment.title, " (").concat(assignment.status, ")"));
                                        if (assignment.due_date) {
                                            console.log("          Due: ".concat(assignment.due_date));
                                        }
                                        if (assignment.score !== null && assignment.max_points !== null) {
                                            console.log("          Score: ".concat(assignment.score, "/").concat(assignment.max_points));
                                        }
                                    });
                                    if (assignments.length > 3) {
                                        console.log("       ... and ".concat(assignments.length - 3, " more"));
                                    }
                                }
                                console.log('');
                            });
                        }
                    }
                    displayEndTime = perf_hooks_1.performance.now();
                    displayTime = (displayEndTime - displayStartTime) / 1000;
                    console.log('📊 SUMMARY');
                    console.log('===========');
                    console.log("Canvas courses: ".concat(canvas_1.length));
                    console.log("Gradescope courses: ".concat(totalGradescopeCourses));
                    console.log("Total courses: ".concat(canvas_1.length + totalGradescopeCourses));
                    // Assignment count summary
                    if (fetchAssignments) {
                        totalCanvasAssignments = Object.values(canvasAssignments_1).reduce(function (sum, assignments) { return sum + assignments.length; }, 0);
                        totalGradescopeAssignments = Object.values(gradescopeAssignments_1).reduce(function (sum, assignments) { return sum + assignments.length; }, 0);
                        console.log("Canvas assignments: ".concat(totalCanvasAssignments));
                        console.log("Gradescope assignments: ".concat(totalGradescopeAssignments));
                        console.log("Total assignments: ".concat(totalCanvasAssignments + totalGradescopeAssignments));
                    }
                    return [3 /*break*/, 8];
                case 7:
                    error_1 = _b.sent();
                    console.error('❌ Error occurred:');
                    console.error(error_1 instanceof Error ? error_1.message : 'Unknown error');
                    console.log('');
                    console.log('💡 Common issues:');
                    console.log('  - Check your Canvas API token is valid');
                    console.log('  - Check your Gradescope credentials are correct');
                    console.log('  - Make sure you have internet connection');
                    console.log('  - Try a different term format (e.g., "spring 2025" in one line)');
                    console.log('  - If assignments are failing, try courses-only mode (option 1)');
                    return [3 /*break*/, 8];
                case 8:
                    endTime = perf_hooks_1.performance.now();
                    totalTime = (endTime - startTime) / 1000;
                    console.log('');
                    console.log('📊 DETAILED PERFORMANCE BREAKDOWN');
                    console.log('==================================');
                    courseTime = (courseFetchEnd - courseFetchStart) / 1000;
                    console.log("\uD83D\uDD0D Course fetching: ".concat(courseTime.toFixed(2), "s (").concat(((courseTime / totalTime) * 100).toFixed(1), "%)"));
                    if (fetchAssignments) {
                        assignmentTime = (canvasAssignmentTime + gradescopeAssignmentTime) / 1000;
                        console.log("\uD83D\uDCCB Assignment fetching: ".concat(assignmentTime.toFixed(2), "s (").concat(((assignmentTime / totalTime) * 100).toFixed(1), "%)"));
                        console.log("   \uD83D\uDCDA Canvas: ".concat((canvasAssignmentTime / 1000).toFixed(2), "s"));
                        console.log("   \uD83D\uDCDD Gradescope: ".concat((gradescopeAssignmentTime / 1000).toFixed(2), "s"));
                    }
                    console.log("\uD83D\uDCBB Display processing: ".concat(displayTime.toFixed(2), "s (").concat(((displayTime / totalTime) * 100).toFixed(1), "%)"));
                    networkTime = courseTime + (fetchAssignments ? (canvasAssignmentTime + gradescopeAssignmentTime) / 1000 : 0);
                    processingTime = Math.max(0, totalTime - networkTime);
                    actualNetworkPercentage = Math.min(100, (networkTime / totalTime) * 100);
                    console.log("\uD83C\uDF10 Network I/O: ".concat(networkTime.toFixed(2), "s (").concat(actualNetworkPercentage.toFixed(1), "%)"));
                    console.log("\u2699\uFE0F  Processing: ".concat(processingTime.toFixed(2), "s (").concat(((processingTime / totalTime) * 100).toFixed(1), "%)"));
                    console.log('');
                    console.log("\u23F1\uFE0F  Total execution time: ".concat(totalTime.toFixed(2), " seconds"));
                    console.log('');
                    console.log('✨ Demo completed!');
                    return [2 /*return*/];
            }
        });
    });
}
// Handle graceful shutdown
process.on('SIGINT', function () {
    console.log('');
    console.log('👋 Demo cancelled by user');
    process.exit(0);
});
// Run the demo
main().catch(function (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
});
