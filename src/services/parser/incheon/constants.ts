export const SELECTORS = {
  courseGroups: '.ongoing-courses .csms-box',
  courseLinks: 'a.course-list-item-link, a.course-card',
  activities:
    '#region-main li.activity.modtype_assign, #region-main li.activity.modtype_vod, #region-main li.activity.modtype_quiz',
  status: '.activity-extend-info .csms-chips-dot .text',
}

export const MODULE_PATHS = {
  assignment: 'assign',
  video: 'vod',
  quiz: 'quiz',
} as const
