-- =============================================================================
-- Migration: 002_seed_lookups.sql
-- Description: Seed data for reference/lookup tables
-- Date: 2026-03-28
-- Deployment risk: None — INSERT only, no structural changes
-- Reversible: Yes — see ROLLBACK section at the bottom of this file
--
-- Source data extracted from:
--   cbimtech_dmc.sql         → 13_ProjectType, 16_Status, 17_Position, 18_Descipline
--   cbimtech_TimeSheetWeb.sql → 14_Descipline, 16_WorkType, 16a_WorkTypeGroup
--
-- Translation notes:
--   16_Status (Vietnamese) → English project statuses
--     "Đang hoạt động" = active
--     "Tạm dừng"       = on_hold
--     "Đã hoàn tất"    = completed
--
--   17_Position (Vietnamese) → English staff positions
--     "Giám đốc trung tâm"     = Center Director
--     "Phó Giám đốc trung tâm" = Deputy Center Director
--     "Trưởng bộ phận"         = Department Head
--     "Chuyên viên"            = Senior Specialist
--     "Nhân viên"              = Staff
--
--   Disciplines merged from 18_Descipline (dmc) and 14_Descipline (TimeSheetWeb).
--   The TimeSheetWeb list is more granular and supersedes. MEP sub-disciplines
--   are kept separately to allow per-discipline assignment on tasks.
--
--   Work types and groups: taken directly from 16_WorkType and 16a_WorkTypeGroup
--   (already in English). Group name prefixes (G1-, G2-, etc.) are stripped for
--   cleaner display; sort_order preserves original ordering.
--
-- WARNING: This file seeds REFERENCE data only — no user passwords are
--   included. Do NOT seed the admin user here — admin credentials must be
--   set via the application setup script using a securely generated password.
-- =============================================================================

USE [raphael];
GO

-- =============================================================================
-- ref_disciplines
-- Merged discipline list (engineering + BIM disciplines)
-- Source: 18_Descipline (cbimtech_dmc) + 14_Descipline (cbimtech_TimeSheetWeb)
-- =============================================================================

-- This table is used on tasks and project_members to indicate discipline.
-- It is a reference table: application code reads it, but does not write to it
-- in normal operation. Add rows via a future migration if disciplines expand.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'ref_disciplines')
BEGIN
    CREATE TABLE [dbo].[ref_disciplines] (
        [id]         INT           NOT NULL    IDENTITY(1,1),
        [name]       NVARCHAR(100) NOT NULL,
        [is_active]  BIT           NOT NULL    CONSTRAINT [DF_ref_disc_active] DEFAULT (1),
        [sort_order] INT           NOT NULL    CONSTRAINT [DF_ref_disc_sort]   DEFAULT (0),

        CONSTRAINT [PK_ref_disciplines] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [UQ_ref_disciplines_name] UNIQUE ([name])
    );
END;
GO

SET IDENTITY_INSERT [dbo].[ref_disciplines] ON;
GO

INSERT INTO [dbo].[ref_disciplines] ([id], [name], [is_active], [sort_order]) VALUES
(1,  N'Architecture',     1,  10),
(2,  N'Structure',        1,  20),
(3,  N'MEP',              1,  30),
(4,  N'MEP - Electrical', 1,  31),
(5,  N'MEP - Plumbing',   1,  32),
(6,  N'MEP - HVAC',       1,  33),
(7,  N'MEP - Fire Protection', 1, 34),
(8,  N'BIM Coordinator',  1,  40),
(9,  N'QA/QC',            1,  50),
(10, N'Software / IT',    1,  60),
(11, N'Admin',            1,  70),
(12, N'All Disciplines',  1,  99);
GO

SET IDENTITY_INSERT [dbo].[ref_disciplines] OFF;
GO

-- =============================================================================
-- ref_positions
-- Staff positions / job titles
-- Source: 17_Position (cbimtech_dmc) — translated from Vietnamese
-- =============================================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'ref_positions')
BEGIN
    CREATE TABLE [dbo].[ref_positions] (
        [id]         INT           NOT NULL    IDENTITY(1,1),
        [name]       NVARCHAR(100) NOT NULL,
        [is_leader]  BIT           NOT NULL    CONSTRAINT [DF_ref_pos_leader] DEFAULT (0),
        [is_active]  BIT           NOT NULL    CONSTRAINT [DF_ref_pos_active] DEFAULT (1),
        [sort_order] INT           NOT NULL    CONSTRAINT [DF_ref_pos_sort]   DEFAULT (0),

        CONSTRAINT [PK_ref_positions] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [UQ_ref_positions_name] UNIQUE ([name])
    );
END;
GO

SET IDENTITY_INSERT [dbo].[ref_positions] ON;
GO

INSERT INTO [dbo].[ref_positions] ([id], [name], [is_leader], [is_active], [sort_order]) VALUES
(1, N'Center Director',          1, 1, 10),
(2, N'Deputy Center Director',   1, 1, 20),
(3, N'Department Head',          1, 1, 30),
(4, N'Senior Specialist',        0, 1, 40),
(5, N'Staff',                    0, 1, 50);
GO

SET IDENTITY_INSERT [dbo].[ref_positions] OFF;
GO

-- =============================================================================
-- ref_project_types
-- Building / project type taxonomy for projects
-- Source: 13_ProjectType (cbimtech_dmc) — already in English
-- =============================================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'ref_project_types')
BEGIN
    CREATE TABLE [dbo].[ref_project_types] (
        [id]          INT            NOT NULL    IDENTITY(1,1),
        [name]        NVARCHAR(100)  NOT NULL,
        [description] NVARCHAR(500)  NULL,
        [is_active]   BIT            NOT NULL    CONSTRAINT [DF_ref_pt_active] DEFAULT (1),

        CONSTRAINT [PK_ref_project_types] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [UQ_ref_project_types_name] UNIQUE ([name])
    );
END;
GO

SET IDENTITY_INSERT [dbo].[ref_project_types] ON;
GO

INSERT INTO [dbo].[ref_project_types] ([id], [name], [description], [is_active]) VALUES
(1,  N'Civil & Infrastructure',
     N'Transportation systems: highways, bridges, tunnels, railways, airports; utilities (water, sewage, power distribution)', 1),
(2,  N'Commercial',
     N'Offices, retail stores, shopping centers', 1),
(3,  N'Hospitality & Tourism',
     N'Hotels, resorts, and restaurants', 1),
(4,  N'Industrial',
     N'Manufacturing plants, warehouses, and power plants', 1),
(5,  N'Mixed-Use',
     N'Mix of residential and commercial units', 1),
(6,  N'Residential',
     N'Single-family homes, apartments, and condominiums', 1),
(7,  N'Educational',
     N'Schools, colleges, and training centers', 1),
(8,  N'Healthcare',
     N'Hospitals, clinics, and medical offices', 1),
(9,  N'Recreational & Sports',
     N'Gyms, stadiums, and community centers', 1),
(10, N'Software / Internal Tool',
     N'Internal systems, applications, and tools', 1);
GO

SET IDENTITY_INSERT [dbo].[ref_project_types] OFF;
GO

-- =============================================================================
-- ref_work_type_groups
-- Groups of work types for timesheet / task categorisation
-- Source: 16a_WorkTypeGroup (cbimtech_TimeSheetWeb)
-- Prefix (G1-, G2-, etc.) stripped from group names for clean display.
-- =============================================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'ref_work_type_groups')
BEGIN
    CREATE TABLE [dbo].[ref_work_type_groups] (
        [id]         INT           NOT NULL,   -- natural key preserved from source
        [name]       NVARCHAR(100) NOT NULL,
        [sort_order] INT           NOT NULL    CONSTRAINT [DF_ref_wtg_sort] DEFAULT (0),

        CONSTRAINT [PK_ref_work_type_groups] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [UQ_ref_work_type_groups_name] UNIQUE ([name])
    );
END;
GO

INSERT INTO [dbo].[ref_work_type_groups] ([id], [name], [sort_order]) VALUES
(1, N'Meeting & Preparation', 10),
(2, N'Modelling',             20),
(3, N'QA Checking',           30),
(4, N'R&D',                   40),
(5, N'Other',                 50);
GO

-- =============================================================================
-- ref_work_types
-- Individual work type codes for task/timesheet categorisation
-- Source: 16_WorkType (cbimtech_TimeSheetWeb)
-- Minor typo fixes applied (e.g., "Kichoff" → "Kickoff", "Comercial" → n/a here)
-- =============================================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'ref_work_types')
BEGIN
    CREATE TABLE [dbo].[ref_work_types] (
        [id]        INT           NOT NULL    IDENTITY(1,1),
        [name]      NVARCHAR(100) NOT NULL,
        [group_id]  INT           NOT NULL,
        [is_active] BIT           NOT NULL    CONSTRAINT [DF_ref_wt_active] DEFAULT (1),

        CONSTRAINT [PK_ref_work_types] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [UQ_ref_work_types_name] UNIQUE ([name]),
        CONSTRAINT [FK_ref_work_types_group] FOREIGN KEY ([group_id])
            REFERENCES [dbo].[ref_work_type_groups] ([id])
    );
END;
GO

SET IDENTITY_INSERT [dbo].[ref_work_types] ON;
GO

INSERT INTO [dbo].[ref_work_types] ([id], [name], [group_id], [is_active]) VALUES
(1,  N'Project Kickoff Meeting',          1, 1),
(2,  N'Project Meeting',                  1, 1),
(3,  N'Modelling - Structure',            2, 1),
(4,  N'Modelling - Architecture',         2, 1),
(5,  N'Modelling - MEP',                  2, 1),
(6,  N'Self Checking',                    3, 1),
(7,  N'Read Drawing',                     2, 1),
(8,  N'Scheduling & Planning',            1, 1),
(9,  N'Revit Family Creation',            2, 1),
(10, N'Review Sub-model',                 3, 1),
(11, N'Software Testing',                 4, 1),
(12, N'Clash Detection & Report',         3, 1),
(13, N'Shop Drawing - Architecture',      2, 1),
(14, N'Quantity Take-Off (QTO)',           5, 1),
(15, N'4D Simulation',                    5, 1),
(16, N'Coordination',                     2, 1),
(17, N'Update Model',                     2, 1),
(18, N'Presentation',                     1, 1),
(19, N'Training',                         5, 1),
(20, N'Rendering & Visualisation',        5, 1),
(21, N'Shop Drawing - Structure',         2, 1),
(22, N'Shop Drawing - MEP',               2, 1),
(23, N'AR / VR Experience',               5, 1),
(24, N'Research & Development',           4, 1),
(25, N'Documentation',                    1, 1),
(26, N'Infrastructure Modelling',         2, 1),
(27, N'As-Built Modelling',               5, 1),
(28, N'BIM Proposal',                     5, 1),
(29, N'BIM Execution Plan',               5, 1),
-- Additional work types for software/internal tasks
(30, N'Software Development',             2, 1),
(31, N'Code Review',                      3, 1),
(32, N'Bug Fix',                          2, 1),
(33, N'Deployment',                       5, 1);
GO

SET IDENTITY_INSERT [dbo].[ref_work_types] OFF;
GO

-- =============================================================================
-- ROLLBACK MIGRATION
-- WARNING: All seed data will be deleted. These tables will remain (structural
-- rollback is handled by 001_initial_schema.sql rollback).
-- =============================================================================
--
-- DELETE FROM [dbo].[ref_work_types];
-- DELETE FROM [dbo].[ref_work_type_groups];
-- DELETE FROM [dbo].[ref_project_types];
-- DELETE FROM [dbo].[ref_positions];
-- DELETE FROM [dbo].[ref_disciplines];
--
-- To also drop the reference tables (if rolling back 002 entirely):
-- DROP TABLE IF EXISTS [dbo].[ref_work_types];
-- DROP TABLE IF EXISTS [dbo].[ref_work_type_groups];
-- DROP TABLE IF EXISTS [dbo].[ref_project_types];
-- DROP TABLE IF EXISTS [dbo].[ref_positions];
-- DROP TABLE IF EXISTS [dbo].[ref_disciplines];
