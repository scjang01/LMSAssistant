// Selectors
export interface DOMSelectors {
  courses: {
    link: string
    label: string
  }
  activities: {
    sections: {
      first: string
      all: string
      title: string
    }
    assignment: {
      container: string
      link: string
      title: string
      period: string
    }
    video: {
      container: string
      link: string
      title: string
      period: string
    }
    quiz: {
      container: string
      link: string
      title: string
      period: string
    }
  }
  submissions: {
    assignment: {
      container: string
      divider: string
      title: string
      period: string
      status: string
      grade?: string
    }
    quiz: {
      container: string
      title: string
      period: string
      status: string
      grade?: string
    }
    video: {
      container: string
      title: string
      sectionTitle: string
      requiredTime: string
      period: string
    }
  }
}

export const DOM_SELECTORS: DOMSelectors = {
  courses: {
    link: 'a[href*="course/view.php?id="]',
    label: '.label-course, .course_label_re, .badge-course, .badge, .label',
  },
  activities: {
    sections: {
      first: '#section-0',
      all: '.total_sections .content',
      title: '.sectionname',
    },
    assignment: {
      container: '.modtype_assign .activityinstance',
      link: 'a',
      title: '.instancename',
      period: '.displayoptions',
    },
    video: {
      container: '.modtype_vod .activityinstance',
      link: 'a',
      title: '.instancename',
      period: '.displayoptions .text-ubstrap',
    },
    quiz: {
      container: '.modtype_quiz .activityinstance, .modtype_ubquiz .activityinstance',
      link: 'a',
      title: '.instancename',
      period: '.displayoptions',
    },
  },
  submissions: {
    assignment: {
      container: 'tbody tr',
      divider: '.tabledivider',
      title: '.c1 a',
      period: '.c2',
      status: '.c3',
      grade: '.c4',
    },
    quiz: {
      container: 'tbody tr',
      title: '.c1 a',
      period: '.c2',
      status: '.c3',
      grade: '.c4',
    },
    video: {
      container: '.user_progress tbody tr, .user_progress_table tbody tr',
      title: '.text-left',
      sectionTitle: '.sectiontitle',
      requiredTime: '.text-center.hidden-xs.hidden-sm',
      period: 'td:nth-child(2)', // 가천대 기준 두 번째 열이 주차/기간 정보임
    },
  },
}

// Universities
export const UNIVERSITY_REGEX = {
  가천대학교: {
    titleRegex: /\s*\[\d+\]|\s*\([\w\d]+_[\w\d]+\)/g,
  },
  인천대학교: {
    titleRegex: /\s*\([\w\d]+\)/g,
  },
} as const

// Strict matching strings based on actual site findings (supports both Korean and English)
export const SUBMISSION_STRINGS = {
  COURSE_LABELS: ['교과', 'Course'],
  ASSIGNMENT: {
    DONE: ['제출 완료', 'Submitted for grading', '제출됨', 'Submitted', 'Graded', '점수'],
    NOT_SUBMITTED: ['미제출', 'No submission', 'No attempt', '미완료'],
  },
  QUIZ: {
    DONE: ['제출됨', 'Submitted', 'Graded', '점수', '최고 점수', '성적'],
    FINISHED: ['종료됨', 'Finished', 'Already submitted', '종료'],
    PROGRESS: ['진행 중', 'In progress'],
    ICON_DONE: '.csms-chips-status-icon-done', // CSS class for completed status
  },
  VIDEO: {
    DONE: ['O'],
    PARTIAL: ['▲'],
    ABSENT: ['X'],
    COLLECTIVE: ['일괄출석인정', 'Collective attendance'],
  },
} as const

// URLs
export const URL_PATTERNS = {
  courses: '/local/ubion/user/index.php',
  coursesWithYearSemester: (year: number, semester: number) =>
    `/local/ubion/user/index.php?year=${year}&semester=${semester}`,
  activities: (courseId: string) => `/course/view.php?id=${courseId}`,
  assignmentSubmitted: (courseId: string) => `/mod/assign/index.php?id=${courseId}`,
  videoSubmitted: (courseId: string) =>
    import.meta.env.VITE_UNIV_ID === 'incheon'
      ? `/report/ubcompletion/user_progress_a.php?id=${courseId}`
      : `/report/ubcompletion/user_progress.php?id=${courseId}`,
  quizSubmitted: (courseId: string) => `/mod/quiz/index.php?id=${courseId}`,
  videoIndex: (courseId: string) => `/mod/vod/index.php?id=${courseId}`,
} as const
