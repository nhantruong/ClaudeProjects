import { useLanguageStore } from './stores/language';

export type TranslationKey =
  | 'nav.dashboard'
  | 'nav.projects'
  | 'nav.kanban'
  | 'nav.gantt'
  | 'nav.lean'
  | 'nav.lookahead'
  | 'nav.team'
  | 'nav.timesheets'
  | 'nav.rfis'
  | 'topbar.theme'
  | 'topbar.language'
  | 'topbar.settings'
  | 'topbar.logout'
  | 'dashboard.title'
  | 'dashboard.dueToday'
  | 'dashboard.overdue'
  | 'dashboard.completedThisWeek'
  | 'dashboard.activeProjects'
  | 'dashboard.teamWorkload'
  | 'dashboard.ppcTrend'
  | 'dashboard.raphaelBriefing'
  | 'timesheet.title'
  | 'timesheet.date'
  | 'timesheet.project'
  | 'timesheet.workType'
  | 'timesheet.hours'
  | 'timesheet.description'
  | 'timesheet.save'
  | 'timesheet.noEntries'
  | 'common.loading'
  | 'common.error'
  | 'common.save'
  | 'common.cancel'
  | 'common.delete'
  | 'common.edit'
  | 'common.add'
  | 'common.search'
  | 'common.filter'
  | 'common.all'
  | 'common.noData';

type Translations = Record<TranslationKey, string>;

const en: Translations = {
  'nav.dashboard': 'Dashboard',
  'nav.projects': 'Projects',
  'nav.kanban': 'Kanban',
  'nav.gantt': 'Gantt',
  'nav.lean': 'Lean',
  'nav.lookahead': 'Lookahead',
  'nav.team': 'Team',
  'nav.timesheets': 'Timesheets',
  'nav.rfis': 'RFIs',
  'topbar.theme': 'Theme',
  'topbar.language': 'Language',
  'topbar.settings': 'Settings',
  'topbar.logout': 'Logout',
  'dashboard.title': 'Dashboard',
  'dashboard.dueToday': 'Due Today',
  'dashboard.overdue': 'Overdue',
  'dashboard.completedThisWeek': 'Completed This Week',
  'dashboard.activeProjects': 'Active Projects',
  'dashboard.teamWorkload': 'Team Workload',
  'dashboard.ppcTrend': 'PPC Trend',
  'dashboard.raphaelBriefing': "Raphael's Briefing",
  'timesheet.title': 'Timesheets',
  'timesheet.date': 'Date',
  'timesheet.project': 'Project',
  'timesheet.workType': 'Work Type',
  'timesheet.hours': 'Hours',
  'timesheet.description': 'Description',
  'timesheet.save': 'Save Entry',
  'timesheet.noEntries': 'No entries for this week',
  'common.loading': 'Loading...',
  'common.error': 'Something went wrong',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.add': 'Add',
  'common.search': 'Search',
  'common.filter': 'Filter',
  'common.all': 'All',
  'common.noData': 'No data',
};

const vi: Translations = {
  'nav.dashboard': 'Tổng quan',
  'nav.projects': 'Dự án',
  'nav.kanban': 'Kanban',
  'nav.gantt': 'Gantt',
  'nav.lean': 'Lean',
  'nav.lookahead': 'Lịch nhìn trước',
  'nav.team': 'Nhóm',
  'nav.timesheets': 'Chấm công',
  'nav.rfis': 'RFIs',
  'topbar.theme': 'Giao diện',
  'topbar.language': 'Ngôn ngữ',
  'topbar.settings': 'Cài đặt',
  'topbar.logout': 'Đăng xuất',
  'dashboard.title': 'Tổng quan',
  'dashboard.dueToday': 'Hôm nay hết hạn',
  'dashboard.overdue': 'Quá hạn',
  'dashboard.completedThisWeek': 'Hoàn thành tuần này',
  'dashboard.activeProjects': 'Dự án đang chạy',
  'dashboard.teamWorkload': 'Khối lượng nhóm',
  'dashboard.ppcTrend': 'Xu hướng PPC',
  'dashboard.raphaelBriefing': 'Báo cáo của Raphael',
  'timesheet.title': 'Chấm công',
  'timesheet.date': 'Ngày',
  'timesheet.project': 'Dự án',
  'timesheet.workType': 'Loại công việc',
  'timesheet.hours': 'Số giờ',
  'timesheet.description': 'Mô tả',
  'timesheet.save': 'Lưu',
  'timesheet.noEntries': 'Không có dữ liệu tuần này',
  'common.loading': 'Đang tải...',
  'common.error': 'Có lỗi xảy ra',
  'common.save': 'Lưu',
  'common.cancel': 'Hủy',
  'common.delete': 'Xóa',
  'common.edit': 'Sửa',
  'common.add': 'Thêm',
  'common.search': 'Tìm kiếm',
  'common.filter': 'Lọc',
  'common.all': 'Tất cả',
  'common.noData': 'Không có dữ liệu',
};

const translations: Record<string, Translations> = { en, vi };

export function useT(): (key: TranslationKey) => string {
  const lang = useLanguageStore((s) => s.lang);
  return (key: TranslationKey) => translations[lang]?.[key] ?? translations['en'][key] ?? key;
}
