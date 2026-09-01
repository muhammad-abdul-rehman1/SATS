# SATS FYP-2 Functional Requirements Implementation Matrix

> Source of requirements: `SP26SE58 - SATS – A Smart Asset Tracking System` and `SAT_frs_updated.docx`.
> Status is based on the current implementation reviewed in the repository. `README`/summary claims are not treated as proof of implementation.

## Status legend

- 🟢 **Implemented** — requirement is demonstrably present in the current code.
- 🟡 **Partial** — some/all core behavior exists, but one or more stated sub-requirements are missing or incomplete.
- 🔴 **Missing** — no adequate implementation was found.
- ⚪ **Unverified** — cannot be confirmed from the currently accessible repository (especially the mobile submodule).

## Development rule

For every requirement marked 🟡/🔴, implement it only after checking its exact sub-requirements in the FYP report. After implementation:

1. add/update backend model/API if needed;
2. add the required web/mobile UI;
3. test the complete user flow;
4. capture evidence (screen/API/test result);
5. update the status here;
6. commit to `fyp2-fr-completion`;
7. only merge to `main` after the feature is tested.

---

## Admin requirements

| FR | Requirement | Current status | Main evidence / gap | FYP-2 action |
|---|---|---|---|---|
| FR01 | Admin Registration | 🟡 Partial | Basic registration, duplicate-email check and bcrypt password hashing exist. Confirmation email and strong password policy are missing. | Add password-strength validation and email confirmation/verification flow. |
| FR02 | Admin Login | 🟡 Partial | Email/password authentication and JWT exist. No failed-attempt lockout, login IP/time audit, or 2FA found. | Add login security controls required by the FRS. |
| FR03 | Asset Registration | 🟡 Partial | Asset creation, core details, unique asset tag and QR linkage exist. NFC, image, purchase date/value and automatic categorization are missing. | Extend Asset model/API/UI and implement the missing registration fields/workflows. |
| FR04 | Asset Management | 🟡 Partial | Update/delete, status, owner assignment and filtering exist. Department transfer, modification audit and bulk update are missing. | Add department/transfer model behavior, audit entries and bulk operations. |
| FR05 | Dashboard & Reports | 🟡 Partial | Dashboard statistics/charts/recent scan activity and CSV exports exist. Full usage/movement/monthly reporting and PDF/Excel export are incomplete. | Complete required reports and export formats. |
| FR06 | Admin Logout | 🟡 Partial | Client-side logout exists, but JWT has no server-side session termination/inactivity mechanism. | Implement inactivity timeout and verify logout behavior/confirmation against the FRS. |
| FR07 | Forget Password (Admin) | 🔴 Missing | No password-recovery/reset API flow found. | Implement secure reset-token flow, email link, expiry and password policy. |
| FR08 | Asset Search | 🟡 Partial | Search/filter by name/tag/type/status/room exists. Department and QR/NFC-code search are incomplete. | Add remaining search/filter criteria. |
| FR09 | Asset Status Monitoring | 🟡 Partial | Asset status values and UI monitoring exist. Automatic unexpected-change handling/alerts are missing. | Implement status-change rules and required admin alerts. |
| FR10 | User Management | 🟡 Partial | List/create/update/delete/change-role functionality exists. Dedicated password reset/deactivation workflow is incomplete. | Add proper deactivation and password-reset workflow. |
| FR11 | Asset Maintenance Scheduling | 🔴 Missing | No maintenance scheduling model/API was found. | Add maintenance model, CRUD, schedule/reschedule, history and reminders. |
| FR12 | System Notification Management | 🔴 Missing | No notification model/API/management workflow was found. | Build notification system and admin management UI. |
| FR13 | Room & Location Management | 🟢 Implemented | Room CRUD, coordinates, room assets and QR functionality exist. | Test thoroughly and polish; do not rewrite unnecessarily. |
| FR14 | QR Code & Custom Fields Management | 🟡 Partial | QR generation and `customFields` exist. Saved QR styling is not consistently applied and dynamic-field management UI is incomplete. | Finish configurable QR styling and admin custom-field management. |
| FR15 | Audit & Scan Logs | 🟡 Partial | Centralized ScanLog captures timestamp/user/location/device/action/metadata. Admin-wide filtering/export is incomplete; device details are request-provided. | Build admin audit-log view/filter/export and strengthen scan metadata handling. |

## Authorized-user requirements

| FR | Requirement | Current status | Main evidence / gap | FYP-2 action |
|---|---|---|---|---|
| FR16 | User Registration | 🟡 Partial | Basic registration, validation, duplicate-email protection and secure password storage exist. Verification email is missing. | Add verification-email flow. |
| FR17 | User Login | 🟡 Partial | Credential authentication and JWT exist. Unsuccessful-login notification is missing. | Add required failed-login handling/notification and verify secure session behavior. |
| FR18 | Asset Tracking (User) | 🟡 Partial | Asset rooms/coordinates, scan GPS and room map exist. Real-time asset GPS tracking and automatic location updates are not implemented. | Decide and implement the intended tracking mechanism; connect scans/location updates to the user tracking UI. |
| FR19 | Asset Movement History (User) | 🟡 Partial | Scan history exists. Full previous-location movement history, date filtering and export are incomplete. | Build complete movement-history view/filter/export. |
| FR20 | Alerts & Notifications (User) | 🔴 Missing | No unauthorized-movement/geofence/severity/acknowledgement notification system found. | Implement alert rules, persistence, delivery, severity and acknowledgement. |
| FR21 | User Logout | 🟡 Partial / Unverified | Client logout behavior is present in the accessible web code; server-side JWT termination/inactivity timeout is not implemented. Mobile behavior cannot be verified from the submodule. | Implement/verify inactivity timeout and logout confirmation across clients. |
| FR22 | Forget Password (User) | 🔴 Missing | No user password-recovery/reset API flow found. | Reuse a secure reset architecture for user accounts. |
| FR23 | Asset Scanning | 🟡 Partial | QR resolution, asset retrieval and scan logging exist. NFC scanning and automatic location update are missing. | Complete mobile QR flow, then implement NFC if retained in the final scope, plus location update. |
| FR24 | View Assigned Assets | 🟡 Partial / Unverified | Backend filters normal users to assets assigned to them and returns asset details. Mobile implementation is not accessible for verification. | Complete/verify mobile assigned-assets UI, category filtering and maintenance status. |
| FR25 | Asset Issue Reporting | 🔴 Missing | No issue-reporting model/API/workflow found. | Implement issue reports, image attachment, admin notification and status tracking. |
| FR26 | Location Update | 🔴 Missing | Scan logs can store GPS, but no dedicated manual location-update workflow with validation/admin notification was found. | Implement validated manual location update and audit/notification flow. |
| FR27 | Notification Viewing | 🔴 Missing | No notification persistence/view/read/delete workflow found. | Implement user notification inbox with read/delete behavior. |
| FR28 | Room/Location Tracking (User) | 🟡 Partial / Unverified | Web room list/map and room-assets endpoint exist. Mobile user implementation cannot be verified because `SATS-frontend-main` is a Git submodule pointer in the accessible repository. | Verify/complete mobile room list, map and room-assets workflow. |

---

## Recommended implementation order

### Phase 1 — Finish the existing core

- [ ] FR03 Asset Registration
- [ ] FR04 Asset Management
- [ ] FR08 Asset Search
- [ ] FR14 QR & Custom Fields
- [ ] FR15 Audit & Scan Logs
- [ ] FR23 Asset Scanning
- [ ] FR24 View Assigned Assets
- [ ] FR28 Room/Location Tracking

### Phase 2 — Build missing operational modules

- [ ] FR11 Maintenance Scheduling
- [ ] FR12 System Notifications Management
- [ ] FR20 Alerts & Notifications
- [ ] FR25 Asset Issue Reporting
- [ ] FR26 Location Update
- [ ] FR27 Notification Viewing
- [ ] FR19 Movement History
- [ ] FR18 User Asset Tracking

### Phase 3 — Security/completeness

- [ ] FR01 Registration security/email verification
- [ ] FR02 Login security
- [ ] FR06 Logout/inactivity
- [ ] FR07 Admin password recovery
- [ ] FR10 User deactivation/password reset
- [ ] FR16 User verification
- [ ] FR17 User login security
- [ ] FR21 User logout/inactivity
- [ ] FR22 User password recovery

### Phase 4 — Reports and final quality

- [ ] FR05 Complete reports/export
- [ ] Test all FRs end-to-end
- [ ] Add/update unit, integration and acceptance tests
- [ ] Capture screenshots/API evidence for every completed FR
- [ ] Update RTM and test-case mapping
- [ ] Fix the FR-numbering inconsistency in the FYP report before final submission

## Important documentation issue

The final FYP-1 report's requirements list uses FR01 = Admin Registration through FR28 = Room/Location Tracking, but its later Requirements Traceability Matrix uses a different numbering/description scheme (for example, FR01 = Dashboard & Analytics). This must be reconciled before FYP-2 final documentation/defense.

## Source notes

The FYP-1 report explicitly lists FR01–FR28 and their requirement tables. The FRS contains the detailed sub-requirements, including security, maintenance, notification, tracking, scanning, issue-reporting and room-tracking requirements. The repository currently provides the strongest evidence for backend/web implementation; the mobile app is not directly inspectable here because `SATS-frontend-main` is represented as a Git submodule pointer.
