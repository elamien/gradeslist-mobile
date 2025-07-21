"use strict";
// Field Mapping Functions - Convert API-specific data to Universal format
// This is the "adapter pattern" that normalizes data from different sources
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapCanvasAssignmentToUniversal = mapCanvasAssignmentToUniversal;
exports.mapCanvasCourseToUniversal = mapCanvasCourseToUniversal;
exports.mapGradescopeAssignmentToUniversal = mapGradescopeAssignmentToUniversal;
exports.mapGradescopeCourseToUniversal = mapGradescopeCourseToUniversal;
exports.mapGradescopeCourseListToUniversal = mapGradescopeCourseListToUniversal;
exports.createUniversalResponse = createUniversalResponse;
exports.mapCanvasAssignmentsToUniversal = mapCanvasAssignmentsToUniversal;
exports.mapCanvasCoursesToUniversal = mapCanvasCoursesToUniversal;
exports.mapGradescopeAssignmentsToUniversal = mapGradescopeAssignmentsToUniversal;
var universal_interfaces_1 = require("./universal-interfaces");
// =============================================
// CANVAS TO UNIVERSAL MAPPING
// =============================================
function mapCanvasAssignmentToUniversal(canvasAssignment) {
    var _a, _b;
    return {
        id: canvasAssignment.id.toString(), // number -> string
        title: canvasAssignment.name || 'Untitled Assignment', // name -> title
        due_date: canvasAssignment.due_at, // due_at -> due_date (already string)
        max_points: canvasAssignment.points_possible, // points_possible -> max_points
        score: ((_a = canvasAssignment.submission) === null || _a === void 0 ? void 0 : _a.score) || null, // submission.score -> score
        status: mapCanvasStatusToUniversal((_b = canvasAssignment.submission) === null || _b === void 0 ? void 0 : _b.workflow_state)
    };
}
function mapCanvasCourseToUniversal(canvasCourse) {
    var _a;
    return {
        id: canvasCourse.id.toString(), // number -> string
        name: canvasCourse.name, // name -> name (same)
        term: ((_a = canvasCourse.term) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Term', // term.name -> term
        course_code: canvasCourse.course_code // course_code -> course_code (same)
    };
}
function mapCanvasStatusToUniversal(canvasStatus) {
    if (!canvasStatus)
        return universal_interfaces_1.UniversalAssignmentStatus.MISSING;
    switch (canvasStatus.toLowerCase()) {
        case 'submitted':
            return universal_interfaces_1.UniversalAssignmentStatus.SUBMITTED;
        case 'pending_review':
            return universal_interfaces_1.UniversalAssignmentStatus.SUBMITTED;
        case 'graded':
            return universal_interfaces_1.UniversalAssignmentStatus.GRADED;
        case 'unsubmitted':
            return universal_interfaces_1.UniversalAssignmentStatus.MISSING;
        default:
            return universal_interfaces_1.UniversalAssignmentStatus.MISSING;
    }
}
// =============================================
// GRADESCOPE TO UNIVERSAL MAPPING
// =============================================
function mapGradescopeAssignmentToUniversal(gradescopeAssignment) {
    var _a;
    return {
        id: gradescopeAssignment.id, // string -> string (same)
        title: gradescopeAssignment.title, // title -> title (same)
        due_date: ((_a = gradescopeAssignment.due_date) === null || _a === void 0 ? void 0 : _a.toISO()) || null, // DateTime -> string
        max_points: parseFloat(gradescopeAssignment.points || '0') || null, // string -> number
        score: gradescopeAssignment.grade, // grade -> score (same)
        status: mapGradescopeStatusToUniversal(gradescopeAssignment.submissions_status)
    };
}
function mapGradescopeCourseToUniversal(gradescopeCourse) {
    return {
        id: gradescopeCourse.id, // string -> string (same)
        name: gradescopeCourse.name, // name -> name (same)
        term: gradescopeCourse.term, // term -> term (same)
        course_code: undefined // Gradescope doesn't have course codes
    };
}
function mapGradescopeCourseListToUniversal(gradescopeCourseList) {
    return {
        student: Object.values(gradescopeCourseList.student).map(mapGradescopeCourseToUniversal),
        instructor: Object.values(gradescopeCourseList.instructor).map(mapGradescopeCourseToUniversal)
    };
}
function mapGradescopeStatusToUniversal(gradescopeStatus) {
    switch (gradescopeStatus.toLowerCase()) {
        case 'submitted':
            return universal_interfaces_1.UniversalAssignmentStatus.SUBMITTED;
        case 'graded':
            return universal_interfaces_1.UniversalAssignmentStatus.GRADED;
        case 'not submitted':
            return universal_interfaces_1.UniversalAssignmentStatus.MISSING;
        case 'missing':
            return universal_interfaces_1.UniversalAssignmentStatus.MISSING;
        default:
            if (gradescopeStatus.startsWith('Submitted (') || gradescopeStatus.startsWith('Graded (')) {
                return gradescopeStatus.startsWith('Graded (') ? universal_interfaces_1.UniversalAssignmentStatus.GRADED : universal_interfaces_1.UniversalAssignmentStatus.SUBMITTED;
            }
            return universal_interfaces_1.UniversalAssignmentStatus.MISSING;
    }
}
// =============================================
// UTILITY FUNCTIONS
// =============================================
// Create a standardized API response wrapper
function createUniversalResponse(data, source, success, error) {
    if (success === void 0) { success = true; }
    return {
        data: data,
        source: source,
        timestamp: new Date().toISOString(),
        success: success,
        error: error
    };
}
// Batch mapping functions
function mapCanvasAssignmentsToUniversal(canvasAssignments) {
    return canvasAssignments.map(mapCanvasAssignmentToUniversal);
}
function mapCanvasCoursesToUniversal(canvasCourses) {
    return canvasCourses.map(mapCanvasCourseToUniversal);
}
function mapGradescopeAssignmentsToUniversal(gradescopeAssignments) {
    return gradescopeAssignments.map(mapGradescopeAssignmentToUniversal);
}
