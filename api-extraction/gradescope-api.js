"use strict";
// Gradescope API - Core Data Structures and Functions
// Extracted from: scrape-gradescope/src/types.ts, gradescope-fetch.ts, gradescope-fetch-courses.ts
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
exports.GradescopeDataParser = void 0;
exports.fetchGradescopeCourses = fetchGradescopeCourses;
exports.fetchGradescopeAssignments = fetchGradescopeAssignments;
exports.authenticateGradescope = authenticateGradescope;
var luxon_1 = require("luxon");
var axios_1 = require("axios");
var cheerio = require("cheerio");
// Core function to fetch courses - supports both email/password and session cookies
function fetchGradescopeCourses(filterTerm, authOptions) {
    return __awaiter(this, void 0, void 0, function () {
        var sessionCookies, connection, allCourses, filteredCourses_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Handle authentication
                    if (!authOptions) {
                        throw new Error('Authentication required: provide either { email, password } or { sessionCookies }');
                    }
                    if (!('email' in authOptions && 'password' in authOptions)) return [3 /*break*/, 2];
                    return [4 /*yield*/, authenticateGradescope(authOptions.email, authOptions.password)];
                case 1:
                    // Login with email/password to get session cookies
                    sessionCookies = _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    if ('sessionCookies' in authOptions) {
                        // Use provided session cookies
                        sessionCookies = authOptions.sessionCookies;
                    }
                    else {
                        throw new Error('Invalid authentication options: provide either { email, password } or { sessionCookies }');
                    }
                    _a.label = 3;
                case 3:
                    connection = new GSConnection();
                    connection.setSessionCookies(sessionCookies);
                    // Initialize account
                    return [4 /*yield*/, connection.initializeAccount()];
                case 4:
                    // Initialize account
                    _a.sent();
                    if (!connection.account) {
                        throw new Error('Failed to initialize Gradescope account');
                    }
                    return [4 /*yield*/, connection.account.get_courses()];
                case 5:
                    allCourses = _a.sent();
                    // Filter courses by term if specified
                    if (filterTerm) {
                        filteredCourses_1 = {
                            student: {},
                            instructor: {}
                        };
                        // Filter student courses
                        Object.entries(allCourses.student).forEach(function (_a) {
                            var id = _a[0], course = _a[1];
                            if (course.term.toLowerCase().includes(filterTerm.toLowerCase())) {
                                filteredCourses_1.student[id] = course;
                            }
                        });
                        // Filter instructor courses
                        Object.entries(allCourses.instructor).forEach(function (_a) {
                            var id = _a[0], course = _a[1];
                            if (course.term.toLowerCase().includes(filterTerm.toLowerCase())) {
                                filteredCourses_1.instructor[id] = course;
                            }
                        });
                        return [2 /*return*/, filteredCourses_1];
                    }
                    return [2 /*return*/, allCourses];
            }
        });
    });
}
// Core function to fetch assignments - supports both email/password and session cookies
function fetchGradescopeAssignments(courseId, authOptions) {
    return __awaiter(this, void 0, void 0, function () {
        var sessionCookies, connection, assignments;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Handle authentication
                    if (!authOptions) {
                        throw new Error('Authentication required: provide either { email, password } or { sessionCookies }');
                    }
                    if (!('email' in authOptions && 'password' in authOptions)) return [3 /*break*/, 2];
                    return [4 /*yield*/, authenticateGradescope(authOptions.email, authOptions.password)];
                case 1:
                    // Login with email/password to get session cookies
                    sessionCookies = _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    if ('sessionCookies' in authOptions) {
                        // Use provided session cookies
                        sessionCookies = authOptions.sessionCookies;
                    }
                    else {
                        throw new Error('Invalid authentication options: provide either { email, password } or { sessionCookies }');
                    }
                    _a.label = 3;
                case 3:
                    connection = new GSConnection();
                    connection.setSessionCookies(sessionCookies);
                    // Initialize account
                    return [4 /*yield*/, connection.initializeAccount()];
                case 4:
                    // Initialize account
                    _a.sent();
                    if (!connection.account) {
                        throw new Error('Failed to initialize Gradescope account');
                    }
                    return [4 /*yield*/, connection.account.get_assignments(courseId)];
                case 5:
                    assignments = _a.sent();
                    return [2 /*return*/, assignments];
            }
        });
    });
}
// =============================================
// GRADESCOPE CONNECTION CLASS
// =============================================
var GSConnection = /** @class */ (function () {
    function GSConnection(gradescope_base_url) {
        if (gradescope_base_url === void 0) { gradescope_base_url = 'https://www.gradescope.com'; }
        var _this = this;
        this.gradescope_base_url = gradescope_base_url;
        this.logged_in = false;
        this.cookies = '';
        this.account = null;
        this.session = axios_1.default.create({
            baseURL: this.gradescope_base_url,
            timeout: 15000, // 15 second timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive'
            },
            maxRedirects: 5
        });
        // Add response interceptor to capture cookies
        this.session.interceptors.response.use(function (response) {
            var cookies = response.headers['set-cookie'];
            if (cookies) {
                // Parse existing cookies into a map
                var cookieMap_1 = new Map();
                if (_this.cookies) {
                    _this.cookies.split('; ').forEach(function (cookie) {
                        var name = cookie.split('=')[0];
                        cookieMap_1.set(name, cookie);
                    });
                }
                // Add new cookies to the map
                cookies.forEach(function (cookie) {
                    var cookieStr = cookie.split(';')[0];
                    var name = cookieStr.split('=')[0];
                    cookieMap_1.set(name, cookieStr);
                });
                // Convert map back to cookie string
                _this.cookies = Array.from(cookieMap_1.values()).join('; ');
                // Update session headers with new cookies
                _this.session.defaults.headers.Cookie = _this.cookies;
            }
            return response;
        });
    }
    GSConnection.prototype.setSessionCookies = function (cookies) {
        if (cookies) {
            this.cookies = cookies;
            this.session.defaults.headers.Cookie = this.cookies;
        }
    };
    GSConnection.prototype.initializeAccount = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.cookies && !this.account) {
                    try {
                        this.account = new Account(this);
                    }
                    catch (error) {
                        this.account = null;
                        this.cookies = '';
                        delete this.session.defaults.headers.Cookie;
                        throw error;
                    }
                }
                else if (!this.account) {
                    throw new Error('Cannot initialize account without session cookies.');
                }
                return [2 /*return*/];
            });
        });
    };
    GSConnection.prototype.getHtml = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.account) {
                            throw new Error('Not logged in. Call login() first.');
                        }
                        return [4 /*yield*/, this.session.get(url)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data];
                }
            });
        });
    };
    GSConnection.prototype.getCookies = function () {
        return this.cookies;
    };
    GSConnection.prototype.getAuthToken = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, html, match;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.session.get('/login')];
                    case 1:
                        response = _a.sent();
                        html = response.data;
                        match = html.match(/<meta name="csrf-token" content="([^"]+)"/);
                        if (!match) {
                            throw new Error('Could not find CSRF token');
                        }
                        return [2 /*return*/, match[1]];
                }
            });
        });
    };
    GSConnection.prototype.login = function (email, password) {
        return __awaiter(this, void 0, void 0, function () {
            var auth_token, formData, response, redirectUrl, fullRedirectUrl, accountResponse;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getAuthToken()];
                    case 1:
                        auth_token = _a.sent();
                        formData = new URLSearchParams();
                        formData.append('utf8', '✓');
                        formData.append('authenticity_token', auth_token);
                        formData.append('session[email]', email);
                        formData.append('session[password]', password);
                        formData.append('session[remember_me]', '0');
                        formData.append('commit', 'Log In');
                        formData.append('session[remember_me_sso]', '0');
                        return [4 /*yield*/, this.session.post("".concat(this.gradescope_base_url, "/login"), formData, {
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                                    'Accept-Language': 'en-US,en;q=0.5',
                                    'Origin': this.gradescope_base_url,
                                    'Referer': "".concat(this.gradescope_base_url, "/login")
                                },
                                maxRedirects: 0,
                                validateStatus: function (status) { return status === 302; }
                            })];
                    case 2:
                        response = _a.sent();
                        if (!(response.status === 302)) return [3 /*break*/, 4];
                        redirectUrl = response.headers.location;
                        fullRedirectUrl = redirectUrl.startsWith('http') ? redirectUrl : "".concat(this.gradescope_base_url).concat(redirectUrl);
                        return [4 /*yield*/, this.session.get(fullRedirectUrl)];
                    case 3:
                        accountResponse = _a.sent();
                        if (accountResponse.status === 200) {
                            // Check if we're still on the login page
                            if (accountResponse.data.includes('Log in with your Gradescope account')) {
                                return [2 /*return*/, false];
                            }
                            // Initialize account after successful login
                            this.account = new Account(this);
                            return [2 /*return*/, true];
                        }
                        _a.label = 4;
                    case 4: return [2 /*return*/, false];
                }
            });
        });
    };
    return GSConnection;
}());
// =============================================
// GRADESCOPE ACCOUNT CLASS
// =============================================
var Account = /** @class */ (function () {
    function Account(connection) {
        this.connection = connection;
    }
    // Parse date from Gradescope HTML elements
    Account.prototype.parseDate = function ($, element) {
        var _a;
        if (!element) {
            return null;
        }
        var $element = $(element);
        // Try parsing the datetime attribute
        var datetimeAttr = $element.attr('datetime');
        if (datetimeAttr) {
            try {
                var isoString = datetimeAttr.replace(/ ([-+])/, 'T$1');
                var parsed = luxon_1.DateTime.fromISO(isoString);
                if (parsed.isValid) {
                    return parsed;
                }
            }
            catch (e) { /* Ignore parsing errors, try next method */ }
        }
        // Fallback to parsing the human-readable text
        var dateText = (_a = $element.text()) === null || _a === void 0 ? void 0 : _a.trim();
        if (dateText) {
            try {
                if (dateText.startsWith('Late Due Date: ')) {
                    dateText = dateText.substring('Late Due Date: '.length);
                }
                var formatStrings = ["MMM dd 'at' h:mma", "MMM dd 'at'  h:mma"];
                for (var _i = 0, formatStrings_1 = formatStrings; _i < formatStrings_1.length; _i++) {
                    var fmt = formatStrings_1[_i];
                    var parsed = luxon_1.DateTime.fromFormat(dateText, fmt, { zone: 'America/New_York' });
                    if (parsed.isValid) {
                        return parsed;
                    }
                }
            }
            catch (e) { /* Ignore parsing errors */ }
        }
        return null;
    };
    // Parse course info from HTML elements
    Account.prototype.parseCourseInfo = function ($, courseBox) {
        var _a, _b, _c;
        try {
            var $courseBox = $(courseBox);
            var shortNameElement = $courseBox.find('.courseBox--shortname');
            var nameElement = $courseBox.find('.courseBox--name');
            var term = ((_a = $courseBox.closest('.courseList--coursesForTerm')
                .prev()
                .text()) === null || _a === void 0 ? void 0 : _a.trim()) || '';
            var name_1 = ((_b = nameElement.text()) === null || _b === void 0 ? void 0 : _b.trim()) || ((_c = shortNameElement.text()) === null || _c === void 0 ? void 0 : _c.trim());
            var href = $courseBox.attr('href');
            var courseId = href === null || href === void 0 ? void 0 : href.split('/').pop();
            if (!name_1 || !courseId) {
                return null;
            }
            return {
                id: courseId,
                name: name_1,
                term: term
            };
        }
        catch (error) {
            return null;
        }
    };
    Account.prototype.get_courses = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, $, courses;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, axios_1.default.get('https://www.gradescope.com/account', {
                            headers: {
                                Cookie: this.connection.getCookies()
                            }
                        })];
                    case 1:
                        response = _a.sent();
                        $ = cheerio.load(response.data);
                        courses = {
                            student: {},
                            instructor: {}
                        };
                        // Parse student courses
                        $('.courseList--coursesForTerm .courseBox:not(.courseBox-new)').each(function (index, element) {
                            var course = _this.parseCourseInfo($, element);
                            if (course) {
                                courses.student[course.id] = course;
                            }
                        });
                        return [2 /*return*/, courses];
                }
            });
        });
    };
    Account.prototype.get_assignments = function (courseId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, $, assignments;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, axios_1.default.get("https://www.gradescope.com/courses/".concat(courseId), {
                            headers: {
                                Cookie: this.connection.getCookies()
                            }
                        })];
                    case 1:
                        response = _a.sent();
                        $ = cheerio.load(response.data);
                        assignments = [];
                        $('#assignments-student-table tbody tr').each(function (index, rowElement) {
                            var _a, _b, _c, _d, _e, _f, _g;
                            try {
                                var $row = $(rowElement);
                                var $nameCell = $row.find('th.table--primaryLink');
                                var $anchor = $nameCell.find('a');
                                var name_2 = undefined;
                                var assignment_id = undefined;
                                var submission_id = undefined;
                                if ($anchor.length > 0) {
                                    name_2 = (_a = $anchor.text()) === null || _a === void 0 ? void 0 : _a.trim();
                                    var href = $anchor.attr('href');
                                    if (href) {
                                        var parts = href.split('/').filter(function (part) { return part !== ''; });
                                        var submissionsIndex = parts.indexOf('submissions');
                                        if (submissionsIndex !== -1 && submissionsIndex + 1 < parts.length) {
                                            submission_id = parts[submissionsIndex + 1];
                                            assignment_id = parts[submissionsIndex - 1];
                                        }
                                        else if (parts.indexOf('assignments') !== -1 && parts.indexOf('assignments') + 1 < parts.length) {
                                            assignment_id = parts[parts.indexOf('assignments') + 1];
                                        }
                                        else {
                                            assignment_id = parts.pop();
                                        }
                                    }
                                }
                                else {
                                    name_2 = (_b = $nameCell.text()) === null || _b === void 0 ? void 0 : _b.trim();
                                }
                                if (!assignment_id) {
                                    if (name_2) {
                                        var slugifiedName = name_2.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
                                        assignment_id = "".concat(courseId, "-placeholder-").concat(slugifiedName);
                                    }
                                    else {
                                        return;
                                    }
                                }
                                if (!name_2 || !assignment_id) {
                                    return;
                                }
                                var $statusCell = $row.find('td.submissionStatus');
                                var $dateCell = $row.find('td:nth-of-type(2)');
                                var dueDateElements = $dateCell.find('time.submissionTimeChart--dueDate').get();
                                var gradeText = ((_c = $statusCell.find('.submissionStatus--score').text()) === null || _c === void 0 ? void 0 : _c.trim()) || '';
                                var gradeMatch = gradeText.match(/(\d+\.?\d*)\s*\/\s*(\d+\.?\d*)/);
                                var grade = gradeMatch ? parseFloat(gradeMatch[1]) : null;
                                var max_grade = gradeMatch ? parseFloat(gradeMatch[2]) : null;
                                var submissions_status = 'Not submitted';
                                var statusText = (_d = $statusCell.find('.submissionStatus--text').text()) === null || _d === void 0 ? void 0 : _d.trim();
                                if (statusText) {
                                    submissions_status = statusText;
                                }
                                else if (grade !== null) {
                                    submissions_status = 'Graded';
                                }
                                else if ((_e = $statusCell.text()) === null || _e === void 0 ? void 0 : _e.includes('Submitted')) {
                                    submissions_status = 'Submitted';
                                }
                                if ((_f = $statusCell.text()) === null || _f === void 0 ? void 0 : _f.includes('Late')) {
                                    submissions_status += ' (Late)';
                                }
                                var dueDate = dueDateElements.length > 0 ? _this.parseDate($, dueDateElements[0]) : null;
                                var assignment = {
                                    id: assignment_id,
                                    title: name_2,
                                    due_date: dueDate,
                                    submissions_status: submissions_status,
                                    grade: grade,
                                    points: (_g = max_grade === null || max_grade === void 0 ? void 0 : max_grade.toString()) !== null && _g !== void 0 ? _g : null,
                                    submission_id: submission_id
                                };
                                assignments.push(assignment);
                            }
                            catch (error) {
                                // Continue to next row
                            }
                        });
                        return [2 /*return*/, assignments];
                }
            });
        });
    };
    return Account;
}());
// Session cache to avoid repeated authentication
var sessionCache = new Map();
var SESSION_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
// Core authentication function - handles Gradescope's native login method
function authenticateGradescope(email, password) {
    return __awaiter(this, void 0, void 0, function () {
        var cacheKey, cached, GRADESCOPE_BASE_URL, session, cookies, loginPageResponse, html, match, authToken, formData, loginResponse, redirectUrl, fullRedirectUrl, accountResponse, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cacheKey = "".concat(email, ":").concat(password);
                    cached = sessionCache.get(cacheKey);
                    if (cached && (Date.now() - cached.timestamp) < SESSION_CACHE_DURATION) {
                        return [2 /*return*/, cached.cookies];
                    }
                    GRADESCOPE_BASE_URL = 'https://www.gradescope.com';
                    session = axios_1.default.create({
                        baseURL: GRADESCOPE_BASE_URL,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        }
                    });
                    cookies = '';
                    // Add response interceptor to capture cookies
                    session.interceptors.response.use(function (response) {
                        var responseCookies = response.headers['set-cookie'];
                        if (responseCookies) {
                            // Parse existing cookies into a map
                            var cookieMap_2 = new Map();
                            if (cookies) {
                                cookies.split('; ').forEach(function (cookie) {
                                    var name = cookie.split('=')[0];
                                    cookieMap_2.set(name, cookie);
                                });
                            }
                            // Add new cookies to the map
                            responseCookies.forEach(function (cookie) {
                                var cookieStr = cookie.split(';')[0];
                                var name = cookieStr.split('=')[0];
                                cookieMap_2.set(name, cookieStr);
                            });
                            // Convert map back to cookie string
                            cookies = Array.from(cookieMap_2.values()).join('; ');
                            // Update session headers with new cookies
                            if (cookies) {
                                session.defaults.headers.Cookie = cookies;
                            }
                        }
                        return response;
                    });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    return [4 /*yield*/, session.get('/login')];
                case 2:
                    loginPageResponse = _a.sent();
                    html = loginPageResponse.data;
                    match = html.match(/<meta name="csrf-token" content="([^"]+)"/);
                    if (!match) {
                        throw new Error('Could not find CSRF token on login page');
                    }
                    authToken = match[1];
                    formData = new URLSearchParams();
                    formData.append('utf8', '✓');
                    formData.append('authenticity_token', authToken);
                    formData.append('session[email]', email);
                    formData.append('session[password]', password);
                    formData.append('session[remember_me]', '0');
                    formData.append('commit', 'Log In');
                    formData.append('session[remember_me_sso]', '0');
                    return [4 /*yield*/, session.post('/login', formData, {
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                                'Accept-Language': 'en-US,en;q=0.5',
                                'Origin': GRADESCOPE_BASE_URL,
                                'Referer': "".concat(GRADESCOPE_BASE_URL, "/login")
                            },
                            maxRedirects: 0,
                            validateStatus: function (status) { return status === 302; }
                        })];
                case 3:
                    loginResponse = _a.sent();
                    if (!(loginResponse.status === 302)) return [3 /*break*/, 5];
                    redirectUrl = loginResponse.headers.location;
                    fullRedirectUrl = redirectUrl.startsWith('http') ? redirectUrl : "".concat(GRADESCOPE_BASE_URL).concat(redirectUrl);
                    return [4 /*yield*/, session.get(fullRedirectUrl)];
                case 4:
                    accountResponse = _a.sent();
                    if (accountResponse.status === 200) {
                        // Check if we're still on the login page (login failed)
                        if (accountResponse.data.includes('Log In')) {
                            throw new Error('Gradescope login failed - invalid credentials');
                        }
                        // Login successful, cache and return session cookies
                        sessionCache.set(cacheKey, { cookies: cookies, timestamp: Date.now() });
                        return [2 /*return*/, cookies];
                    }
                    _a.label = 5;
                case 5: throw new Error('Gradescope login failed - unexpected response');
                case 6:
                    error_1 = _a.sent();
                    if (error_1 instanceof Error) {
                        throw new Error("Gradescope authentication failed: ".concat(error_1.message));
                    }
                    throw new Error('Gradescope authentication failed: Unknown error');
                case 7: return [2 /*return*/];
            }
        });
    });
}
// Core data parsing utilities
var GradescopeDataParser = /** @class */ (function () {
    function GradescopeDataParser() {
    }
    // Parse date from Gradescope HTML elements
    GradescopeDataParser.parseDate = function (dateText) {
        if (!dateText)
            return null;
        try {
            // Handle "Late Due Date: " prefix
            if (dateText.startsWith('Late Due Date: ')) {
                dateText = dateText.substring('Late Due Date: '.length);
            }
            // Try different format strings
            var formatStrings = ["MMM dd 'at' h:mma", "MMM dd 'at'  h:mma"];
            for (var _i = 0, formatStrings_2 = formatStrings; _i < formatStrings_2.length; _i++) {
                var fmt = formatStrings_2[_i];
                var parsed_1 = luxon_1.DateTime.fromFormat(dateText, fmt, { zone: 'America/New_York' });
                if (parsed_1.isValid) {
                    return parsed_1;
                }
            }
            // Fallback to ISO parsing
            var parsed = luxon_1.DateTime.fromISO(dateText);
            if (parsed.isValid) {
                return parsed;
            }
        }
        catch (e) {
            // Ignore parsing errors
        }
        return null;
    };
    // Parse submission status
    GradescopeDataParser.isSubmitted = function (status) {
        return status === 'Submitted' ||
            status === 'Graded' ||
            status.startsWith('Submitted (') ||
            status.startsWith('Graded (');
    };
    return GradescopeDataParser;
}());
exports.GradescopeDataParser = GradescopeDataParser;
