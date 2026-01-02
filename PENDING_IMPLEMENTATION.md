# 📝 Pending Implementations: Student Attendance & Notifications

This file tracks the features planned for the next phase of development, once the student batch data is provided.

## 1. Bulk Student Import Tool
- **Objective**: Allow admins to upload a CSV/Excel file to populate the `students` collection in Firestore.
- **Required Columns**:
    - `name`: Full name of the student.
    - `email`: The email used to join Microsoft Teams meetings.
    - `phoneNumber`: Parent's WhatsApp number (with country code).
    - `batchId`: Identifier for the student's batch (e.g., "Level_3_Math").
    - `gender`: (Optional) For analytics.

## 2. Batch-to-Meeting Mapping
- **Objective**: Create a link between a scheduled Teams Meeting and a specifically defined "Batch" in the system.
- **Workflow**:
    1. When viewing a meeting in the Attendance Dashboard, the tutor selects a "Batch" from a dropdown.
    2. The app stores this link in Firestore.

## 3. Absentee Detection Logic
- **Objective**: Automatically identify students who were supposed to attend but did not join.
- **Logic**:
    - `Expected List` = All students in the selected `batchId`.
    - `Attended List` = Participants retrieved from the Microsoft Graph API.
    - `Absent List` = `Expected List` minus `Attended List` (matching by email).

## 4. Multi-Tiered WhatsApp Notifications
- **Status Alert (Present)**: Already implemented. Notifies parents of attendance duration.
- **Absence Alert (New)**: A specialized template to notify parents that their child missed a session.
- **Late Alert (New)**: Automated notification if a student joins more than 15 minutes after the session start.

## 5. Automated Batch Sync
- **Objective**: A one-click button "Notify Batch" that sends:
    - `Present` alerts to those who attended.
    - `Absent` alerts to those who missed.

---
**Status**: Awaiting Student Data Report (CSV/Excel) to define exact mapping logic.
