import * as SQLite from 'expo-sqlite';

// Database interface for assignments
export interface StoredAssignment {
  id: string;
  title: string;
  courseName: string;
  courseId: string;
  dueDate: string | null;
  platform: 'canvas' | 'gradescope';
  status: string;
  score: number | null;
  maxPoints: number | null;
  isGraded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoredCourse {
  id: string;
  name: string;
  platform: 'canvas' | 'gradescope';
  term: string;
  courseCode?: string;
  createdAt: string;
  updatedAt: string;
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  /**
   * Initialize database and create tables
   */
  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('gradeslist.db');
      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Assignments table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS assignments (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        courseName TEXT NOT NULL,
        courseId TEXT NOT NULL,
        dueDate TEXT,
        platform TEXT NOT NULL CHECK (platform IN ('canvas', 'gradescope')),
        status TEXT NOT NULL,
        score REAL,
        maxPoints REAL,
        isGraded INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);

    // Courses table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        platform TEXT NOT NULL CHECK (platform IN ('canvas', 'gradescope')),
        term TEXT NOT NULL,
        courseCode TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);

    // Create indexes for better performance
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(courseId);
      CREATE INDEX IF NOT EXISTS idx_assignments_platform ON assignments(platform);
      CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(dueDate);
      CREATE INDEX IF NOT EXISTS idx_assignments_graded ON assignments(isGraded);
      CREATE INDEX IF NOT EXISTS idx_courses_platform ON courses(platform);
      CREATE INDEX IF NOT EXISTS idx_courses_term ON courses(term);
    `);
  }

  /**
   * Store assignments in database
   */
  async saveAssignments(assignments: StoredAssignment[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();

    for (const assignment of assignments) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO assignments 
         (id, title, courseName, courseId, dueDate, platform, status, score, maxPoints, isGraded, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT createdAt FROM assignments WHERE id = ?), ?), ?)`,
        [
          assignment.id,
          assignment.title,
          assignment.courseName,
          assignment.courseId,
          assignment.dueDate,
          assignment.platform,
          assignment.status,
          assignment.score,
          assignment.maxPoints,
          assignment.isGraded ? 1 : 0,
          assignment.id, // For COALESCE check
          now, // createdAt if new
          now, // updatedAt always current
        ]
      );
    }
  }

  /**
   * Get all assignments from database
   */
  async getAssignments(): Promise<StoredAssignment[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      'SELECT * FROM assignments ORDER BY dueDate ASC, title ASC'
    );

    return result.map((row: any) => ({
      ...row,
      isGraded: Boolean(row.isGraded),
    }));
  }

  /**
   * Get assignments by criteria
   */
  async getAssignmentsByFilter(filter: {
    isGraded?: boolean;
    platform?: 'canvas' | 'gradescope';
    courseId?: string;
  }): Promise<StoredAssignment[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = 'SELECT * FROM assignments WHERE 1=1';
    const params: any[] = [];

    if (filter.isGraded !== undefined) {
      query += ' AND isGraded = ?';
      params.push(filter.isGraded ? 1 : 0);
    }

    if (filter.platform) {
      query += ' AND platform = ?';
      params.push(filter.platform);
    }

    if (filter.courseId) {
      query += ' AND courseId = ?';
      params.push(filter.courseId);
    }

    query += ' ORDER BY dueDate ASC, title ASC';

    const result = await this.db.getAllAsync(query, params);

    return result.map((row: any) => ({
      ...row,
      isGraded: Boolean(row.isGraded),
    }));
  }

  /**
   * Store courses in database
   */
  async saveCourses(courses: StoredCourse[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();

    for (const course of courses) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO courses 
         (id, name, platform, term, courseCode, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, COALESCE((SELECT createdAt FROM courses WHERE id = ?), ?), ?)`,
        [
          course.id,
          course.name,
          course.platform,
          course.term,
          course.courseCode,
          course.id, // For COALESCE check
          now, // createdAt if new
          now, // updatedAt always current
        ]
      );
    }
  }

  /**
   * Get all courses from database
   */
  async getCourses(): Promise<StoredCourse[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      'SELECT * FROM courses ORDER BY platform ASC, name ASC'
    );

    return result as StoredCourse[];
  }

  /**
   * Clear all data (for testing/reset)
   */
  async clearData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync('DELETE FROM assignments');
    await this.db.execAsync('DELETE FROM courses');
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{ assignmentCount: number; courseCount: number }> {
    if (!this.db) throw new Error('Database not initialized');

    const assignmentCount = await this.db.getFirstAsync(
      'SELECT COUNT(*) as count FROM assignments'
    ) as { count: number };

    const courseCount = await this.db.getFirstAsync(
      'SELECT COUNT(*) as count FROM courses'
    ) as { count: number };

    return {
      assignmentCount: assignmentCount.count,
      courseCount: courseCount.count,
    };
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();