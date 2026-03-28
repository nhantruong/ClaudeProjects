# AI-BIM Timesheet System

**Hệ thống quản lý Timesheet & Nhân sự thông minh cho C&BIM Technology**

Ứng dụng đa nền tảng (Web PWA + Mobile) tích hợp AI Claude để phân tích dữ liệu và đưa ra khuyến nghị tối ưu hóa nhân lực, dự báo rủi ro dự án.

---

## Kiến trúc tổng thể

```
ai-bim-timesheet/
├── apps/
│   ├── web/          # React 19 + Vite (PWA) — giao diện web chính
│   └── api/          # Node.js + Express — REST API backend
├── packages/
│   └── shared-types/ # TypeScript interfaces dùng chung
├── infra/
│   ├── docker/       # Docker Compose + Dockerfiles
│   └── nginx/        # Nginx reverse proxy config
├── BIMdb_schema.sql  # Schema: cbimtech_TimeSheetWeb
└── dmcDb_Schema.sql  # Schema: cbimtech_dmc
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Monorepo** | Turborepo + pnpm workspaces |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS |
| **State** | TanStack Query + Zustand |
| **Charts** | Recharts |
| **PWA** | Vite Plugin PWA (Workbox) |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | SQL Server 2022 (2 pools: BIMdb + DMCdb) |
| **AI** | Anthropic Claude (claude-sonnet-4-6) |
| **Auth** | JWT (access 15m + refresh 7d) + bcrypt |
| **Jobs** | node-cron (4 scheduled jobs) |
| **Container** | Docker + Docker Compose |

---

## Database

### `cbimtech_TimeSheetWeb` (BIMdb_Schema)
- Employees, Roles, Departments
- TimesheetEntries, TaskLogs, TaskCategories
- LeaveRequests, LeaveBalances, LeaveTypes
- AIInsights, Notifications, AuditLog
- DailyMetricsSnapshot (nightly aggregation)

### `cbimtech_dmc` (dmcDb_Schema)
- Projects, ProjectPhases, ProjectAssignments
- Clients, Milestones, BudgetSnapshots
- ProjectIssues (risk register)

---

## Tính năng chính

### Timesheet
- Clock-in/out với GPS (Web + Mobile)
- Task logging theo dự án + danh mục BIM
- Workflow duyệt: Draft → Submitted → Approved
- Tính OT tự động theo ngưỡng cấu hình

### HR Management
- Quản lý nhân viên, phòng ban, vai trò
- Nghỉ phép: yêu cầu, duyệt, theo dõi số dư
- Lịch nghỉ phép cộng đồng (team calendar)

### Project Management
- Dự án BIM với LOD stages (LOD100–LOD500)
- Budget hours vs. actual tracking
- Phân công nhân viên theo phase
- Milestone tracking

### Analytics & AI Insights

#### 6 AI Integration Points:
1. **Overtime Risk Detection** — phát hiện nhân viên OT nhiều tuần liên tục
2. **Budget Burn Forecast** — dự báo vượt ngân sách giờ dự án
3. **Productivity Pattern** — phân tích xu hướng danh mục công việc
4. **Attendance Anomaly** — phát hiện mẫu chuyên cần bất thường
5. **Weekly Admin Digest** — báo cáo tóm tắt tuần cho Ban Giám đốc (mỗi Thứ Hai)
6. **AI Chat Assistant** — hỏi đáp tự do với dữ liệu thực tế

#### Charts:
- Overtime Heatmap (6 tuần × nhân viên)
- Budget Burn Bar Chart với threshold warnings
- Attendance Rate by Department
- Task Category Donut breakdown

---

## Vai trò & Phân quyền

| Role | Level | Quyền |
|------|-------|-------|
| EMPLOYEE | 1 | Timesheet cá nhân, nghỉ phép |
| TEAM_LEAD | 2 | + Duyệt timesheet nhóm, xem analytics nhóm |
| PM | 3 | + Quản lý dự án, budget, phân công |
| ADMIN | 4 | + Quản lý nhân sự, AI Insights, toàn bộ analytics |
| SUPER_ADMIN | 5 | + Cấu hình hệ thống, xóa nhân viên |

---

## Cài đặt & Chạy (Development)

### Yêu cầu
- Node.js ≥ 20
- pnpm ≥ 9
- SQL Server 2019+ (hoặc Docker)

### Bước 1: Cài dependencies
```bash
cd Timesheet
pnpm install
```

### Bước 2: Cấu hình môi trường
```bash
cp apps/api/.env.example apps/api/.env
# Chỉnh sửa .env: DB credentials, JWT secrets, Anthropic API key
```

### Bước 3: Khởi tạo database
```sql
-- Chạy BIMdb_schema.sql trên cbimtech_TimeSheetWeb
-- Chạy dmcDb_Schema.sql trên cbimtech_dmc
```

### Bước 4: Chạy development
```bash
pnpm dev
# API:  http://localhost:3001
# Web:  http://localhost:5173
```

---

## Chạy với Docker

```bash
cd infra/docker
cp .env.example .env   # Thêm JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ANTHROPIC_API_KEY
docker-compose up -d
# Web:  http://localhost
# API:  http://localhost:3001
```

---

## Scheduled Jobs

| Job | Lịch | Mô tả |
|-----|------|-------|
| Nightly Metrics | 00:30 hàng ngày | Snapshot giờ làm vào DailyMetricsSnapshot |
| Overtime Alert | 17:30 T2-T6 | Nhắc nhân viên chấm công ra khi > 9h |
| Weekly AI Digest | 08:00 Thứ Hai | Tạo báo cáo AI + thông báo Admin |
| Timesheet Reminder | 16:00 Thứ Sáu | Nhắc nộp timesheet chưa submit |

---

## API Endpoints (v1)

```
/auth/login, /auth/refresh, /auth/logout, /auth/me
/timesheet/me/today, /timesheet/me, /timesheet/clock-in, /timesheet/clock-out
/timesheet/submit-week, /timesheet/pending, /timesheet/:id/approve|reject
/analytics/dashboard, /analytics/overtime, /analytics/budget-burn
/analytics/attendance, /analytics/productivity
/ai/insights, /ai/insights/generate, /ai/insights/:id/read, /ai/chat
```

---

## Phát triển tiếp theo (Roadmap)

- [ ] Mobile app (React Native + Expo)
- [ ] Trang Timesheet chi tiết với calendar view
- [ ] Quản lý nhân viên (CRUD full)
- [ ] Leave management pages
- [ ] Project detail với Gantt chart
- [ ] Export CSV/Excel
- [ ] Push notifications (Web Push API)
- [ ] MFA (TOTP)
- [ ] Kiosk mode (QR code clock-in)

---

*Powered by Claude AI (claude-sonnet-4-6) · C&BIM Technology 2026*
