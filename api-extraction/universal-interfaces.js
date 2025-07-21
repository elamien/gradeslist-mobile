"use strict";
// Universal/Standardized Data Interfaces
// These interfaces provide a consistent format for data from both Canvas and Gradescope APIs
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniversalAssignmentStatus = void 0;
// Status mapping for standardized assignment statuses (MVP: 3 states only)
var UniversalAssignmentStatus;
(function (UniversalAssignmentStatus) {
    UniversalAssignmentStatus["MISSING"] = "missing";
    UniversalAssignmentStatus["SUBMITTED"] = "submitted";
    UniversalAssignmentStatus["GRADED"] = "graded"; // Graded (Canvas: graded, Gradescope: "Graded")
})(UniversalAssignmentStatus || (exports.UniversalAssignmentStatus = UniversalAssignmentStatus = {}));
