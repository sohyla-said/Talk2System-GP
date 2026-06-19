"""
Seed script — clears all data and inserts realistic demo data.
Run from talk2system-backend/:  python seed.py
All accounts use password: Demo@1234
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timezone, timedelta
from sqlalchemy import text

from app.db.session import SessionLocal
from app.services.auth_service import hash_password

from app.models.user import User
from app.models.project import Project
from app.models.project_membership import ProjectMembership
from app.models.invitation import Invitation
from app.models.session import Session
from app.models.session_membership import SessionMembership
from app.models.transcript import TranscriptSegment
from app.models.requirement_runs import RequirementRun
from app.models.requirement_raw import RequirementRaw
from app.models.session_requirement import SessionRequirement
from app.models.project_requirments import ProjectRequirement
from app.models.artifact_type import ArtifactType
from app.models.artifact import Artifact
from app.models.approval import Approval
from app.models.project_approval import ProjectApproval
from app.models.notification import Notification
from app.models.background_task import BackgroundTask  # noqa: F401 — registers relationship
from app.models.audit_log import AuditLog              # noqa: F401
from app.models.summaries import Summary               # noqa: F401
from app.models.project_leave_request import ProjectLeaveRequest  # noqa: F401


def dt(delta_days: float = 0) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=delta_days)


# ---------------------------------------------------------------------------
# Realistic transcript texts
# ---------------------------------------------------------------------------

ECOM_TRANSCRIPT_S1 = """\
Ahmed Hassan: Good morning everyone. Welcome to our project kickoff for the E-Commerce Platform. I'm excited to work with you all.
Omar Nabil: Thanks Ahmed. I've gone through the client brief — they want three core pillars: user authentication, a rich product catalog, and a seamless payment flow.
Lina Mostafa: Agreed. They also stressed a mobile-first approach. The majority of their customers shop on phones.
Ahmed Hassan: Great point. Let's make the system fully responsive. Omar, can you walk us through the authentication requirements?
Omar Nabil: Sure. Standard email and password, plus OAuth via Google and Facebook. Role-based access for admins, sellers, and buyers is a must.
Lina Mostafa: For the catalog we need hierarchical categories, product variants — size, colour, material — and a powerful search engine with filters and facets.
Ahmed Hassan: Payment gateway?
Omar Nabil: Stripe and PayPal to start. Refunds, partial payments for split orders, and subscription billing for premium sellers.
Lina Mostafa: Order tracking is critical too. Real-time status updates with email and SMS notifications at each milestone.
Ahmed Hassan: Let's add a reviews and ratings system — verified purchasers only. That builds trust with new buyers.
Omar Nabil: Agreed. And non-functionally: the system must handle ten thousand concurrent users with product pages loading in under two seconds.
Lina Mostafa: Security matters: PCI DSS for payments and GDPR for user data.
Ahmed Hassan: Perfect. We have a solid foundation. Let's start drafting the requirements document this week.\
"""

ECOM_TRANSCRIPT_S2 = """\
Ahmed Hassan: Good to see everyone again. Today we focus on technical architecture and the admin experience.
Lina Mostafa: I've prepared wireframes — hero banner on the homepage, featured products, and quick-access category navigation.
Omar Nabil: For the backend I recommend microservices: separate services for catalog, orders, payments, and notifications. Each scales independently.
Ahmed Hassan: Database design?
Omar Nabil: PostgreSQL for primary storage, Redis for caching hot product data, and Elasticsearch for full-text search.
Lina Mostafa: The admin dashboard needs real-time analytics: revenue, inventory levels, user activity, and funnel conversion rates.
Ahmed Hassan: Inventory management — how do we prevent overselling?
Omar Nabil: Stock reservation at checkout with a fifteen-minute hold. If payment doesn't complete, stock is released automatically.
Lina Mostafa: Checkout must be a single page. Research shows each extra step costs about twenty percent conversion.
Ahmed Hassan: Shipping integration?
Omar Nabil: Multi-carrier support — we auto-calculate rates from product weight and destination. The seller can offer free shipping above a threshold.
Lina Mostafa: One more thing: wishlists with share links and back-in-stock alerts via email or push notification.
Ahmed Hassan: Excellent session. Let's get the SRS drafted and reviewed by next Friday.\
"""

HOSPITAL_TRANSCRIPT_S1 = """\
Ahmed Hassan: Welcome. Today we gather requirements for the Hospital Management System. Let's begin with patient management.
Youssef Adel: The most critical piece is patient registration. We need full demographics, insurance details, emergency contacts, allergy history, and chronic conditions — all linked to a unique patient ID that follows them across departments.
Nadia Fahmy: No more re-registering at every department. That single ID must be the spine of every module.
Ahmed Hassan: Appointment scheduling?
Youssef Adel: Online patient portal for self-booking, smart scheduling to minimise wait times, and automated SMS and email reminders forty-eight hours before the appointment.
Nadia Fahmy: The ED needs a triage module. Severity scoring, real-time bed availability, and queue management for nurses.
Ahmed Hassan: Medical records?
Youssef Adel: HL7 FHIR-compliant EHR. Doctors see the full patient timeline — labs, prescriptions, imaging, surgical history — on one screen.
Nadia Fahmy: Prescription management must include drug-interaction checking and allergy alerts that fire before the doctor can save the order.
Ahmed Hassan: And compliance?
Youssef Adel: HIPAA is non-negotiable. Complete audit trails on every data access, role-based permissions down to field level, and AES-256 encryption at rest and in transit.
Nadia Fahmy: The billing module needs automated insurance claim generation with support for at least the top ten providers in the region.
Ahmed Hassan: Good. Let's prioritise and start designing the data model next week.\
"""

HOSPITAL_TRANSCRIPT_S2 = """\
Ahmed Hassan: Today we cover clinical workflows and system integrations.
Youssef Adel: Medication administration — nurses need to scan a barcode on the patient's wristband and the medication before recording it. Five-rights validation should happen automatically.
Nadia Fahmy: Lab orders must flow electronically. No phone calls, no faxes. Results land directly in the requesting doctor's queue with abnormal values highlighted.
Ahmed Hassan: Pharmacy integration?
Youssef Adel: Electronic prescriptions go straight to pharmacy. Pharmacist marks dispensed and the EHR updates the medication record.
Nadia Fahmy: Radiology: doctors order imaging from the EHR, technicians receive the request, upload DICOM images, and the radiologist's report feeds back in — all without leaving the system.
Ahmed Hassan: Telemedicine?
Youssef Adel: Secure video consultations with end-to-end encryption, in-app messaging, and automatic session notes that attach to the patient's record.
Nadia Fahmy: Staff scheduling: monthly rotation planner for doctors and nurses, on-call tracking, and a leave approval workflow that prevents understaffing.
Ahmed Hassan: Performance expectations?
Youssef Adel: Ninety-nine point nine percent uptime. Patient lookup must respond in under one second. Support five hundred concurrent clinical users.
Nadia Fahmy: Redundant infrastructure with automatic failover — in a hospital, downtime can cost lives.
Ahmed Hassan: Great. Let's draft the architecture proposal and present to the hospital's IT steering committee.\
"""

LMS_TRANSCRIPT_S1 = """\
Sara Khalid: Good morning team. Let's define requirements for the University Learning Portal.
Omar Nabil: Core is course management. Faculty upload syllabi, reading materials in PDF and video, and organise content into modules with release dates.
Lina Mostafa: Enrollment should be self-service. Students browse the catalogue, enrol, and access materials instantly.
Sara Khalid: Assignments and grading?
Omar Nabil: Instructors build custom rubrics with weighted criteria. Late submissions are accepted up to a configurable penalty window. Grades aggregate automatically.
Lina Mostafa: Plagiarism detection before the instructor sees the paper. Integration with Turnitin or an equivalent engine.
Sara Khalid: Progress tracking?
Omar Nabil: Student dashboard showing completion per module, upcoming deadlines, and grade trajectory. A separate parent portal for undergraduate students under eighteen.
Lina Mostafa: Discussion forums per course — threaded replies, file attachments, and an instructor announcement channel that triggers push notifications.
Sara Khalid: Live classes?
Omar Nabil: Zoom integration. Recordings are auto-ingested into the course materials within an hour of the session ending.
Lina Mostafa: Assessments: timed quizzes, randomised question pools, multiple question types — MCQ, short answer, essay — and automatic grading for objective types.
Sara Khalid: Mobile?
Omar Nabil: Native iOS and Android apps with offline download for materials and push notifications for deadlines and grade releases.
Sara Khalid: Excellent. FERPA compliance for student data and WCAG 2.1 AA accessibility are baseline requirements.\
"""

INVENTORY_TRANSCRIPT_S1 = """\
Youssef Adel: Good afternoon. Let's plan the Smart Inventory Tracker for our warehouse client.
Nadia Fahmy: The core need is real-time tracking. Every item movement — receipt, put-away, pick, pack, ship, return — must be logged immediately via barcode or QR scan.
Sara Khalid: Location granularity matters. The client wants shelf-level tracking: warehouse, aisle, rack, shelf, bin.
Youssef Adel: Stock alerts?
Nadia Fahmy: Configurable minimum stock per SKU per location. When the level drops below the threshold, an alert fires and a draft purchase order is created automatically.
Sara Khalid: Supplier management: PO creation, expected delivery tracking, goods-receipt confirmation, and a supplier scorecard for on-time delivery and quality.
Youssef Adel: Analytics?
Nadia Fahmy: Management dashboard with inventory turnover by SKU, dead stock older than ninety days, and a twelve-month demand forecast. Data must be retained for five years.
Sara Khalid: ERP integration is non-negotiable. The client runs SAP — bi-directional sync via REST API, with conflict resolution rules clearly defined.
Youssef Adel: Scanning hardware?
Nadia Fahmy: Support handheld Zebra scanners, iOS and Android mobile devices, and fixed tunnel scanners at dock doors.
Sara Khalid: Returns processing: scan the item, assess condition — good, damaged, expired — update inventory accordingly, and flag damaged goods for disposal workflow.
Youssef Adel: Performance: one thousand scan operations per minute at peak. All reports exportable to Excel and PDF. Role-based access with a full audit trail for every transaction.
Nadia Fahmy: Let's start with the data model and the SAP API specification in parallel.\
"""


# ---------------------------------------------------------------------------
# Requirement JSON payloads
# ---------------------------------------------------------------------------

ECOM_REQS = {
    "functional": [
        {"id": "FR1",  "title": "User Registration & Authentication",    "description": "Email/password registration plus OAuth2 via Google and Facebook. Role-based access: admin, seller, buyer.", "priority": "high"},
        {"id": "FR2",  "title": "Product Catalog Management",            "description": "Hierarchical categories, product variants (size, colour, material), bulk CSV upload, and faceted search powered by Elasticsearch.", "priority": "high"},
        {"id": "FR3",  "title": "Shopping Cart & Checkout",              "description": "Single-page checkout, persistent cart across devices, guest checkout, promo codes, and fifteen-minute stock reservation.", "priority": "high"},
        {"id": "FR4",  "title": "Payment Processing",                    "description": "Stripe and PayPal integration with refunds, partial payments for split orders, and subscription billing for premium sellers.", "priority": "high"},
        {"id": "FR5",  "title": "Order Management & Tracking",           "description": "Real-time order status with automated email and SMS notifications at each milestone.", "priority": "high"},
        {"id": "FR6",  "title": "Reviews & Ratings",                     "description": "Verified-purchase reviews with star rating, photo upload, and helpful-vote system.", "priority": "medium"},
        {"id": "FR7",  "title": "Vendor Portal",                         "description": "Seller dashboard for product management, order fulfilment, and sales analytics.", "priority": "medium"},
        {"id": "FR8",  "title": "Inventory Management",                  "description": "Real-time stock tracking, low-stock alerts, automatic stock reservation at checkout, configurable reorder points.", "priority": "high"},
        {"id": "FR9",  "title": "Wishlist",                              "description": "Save products with share links, back-in-stock alerts via email or push notification.", "priority": "low"},
        {"id": "FR10", "title": "Shipping Integration",                  "description": "Multi-carrier rate calculation based on weight and destination; free-shipping threshold per seller.", "priority": "medium"},
        {"id": "FR11", "title": "Admin Analytics Dashboard",             "description": "Real-time dashboard: revenue trends, user acquisition funnel, inventory levels, and conversion rates.", "priority": "medium"},
    ],
    "non_functional": [
        {"id": "NFR1", "title": "Performance",     "description": "Product pages load in under 2 seconds; system handles 10,000 concurrent users.", "category": "performance"},
        {"id": "NFR2", "title": "Security",        "description": "PCI DSS compliance for payment data; GDPR compliance for user data; HTTPS enforced throughout.", "category": "security"},
        {"id": "NFR3", "title": "Scalability",     "description": "Microservices architecture enabling independent scaling of catalog, orders, and payment services.", "category": "scalability"},
        {"id": "NFR4", "title": "Availability",    "description": "99.9% uptime SLA with automated failover and disaster-recovery runbooks.", "category": "availability"},
        {"id": "NFR5", "title": "Mobile",          "description": "Mobile-first responsive design; native iOS and Android apps.", "category": "usability"},
    ],
}

HOSPITAL_REQS = {
    "functional": [
        {"id": "FR1",  "title": "Patient Registration",          "description": "Capture demographics, insurance, emergency contacts, and medical history linked to a unique patient ID shared across all departments.", "priority": "high"},
        {"id": "FR2",  "title": "Appointment Scheduling",        "description": "Online self-booking portal with smart scheduling, 48-hour reminders via SMS and email, and cancellation management.", "priority": "high"},
        {"id": "FR3",  "title": "Electronic Health Records",     "description": "HL7 FHIR-compliant EHR with unified view of history, labs, prescriptions, and imaging reports on one screen.", "priority": "high"},
        {"id": "FR4",  "title": "Emergency Triage",              "description": "Severity-based patient prioritisation with real-time bed availability and ED queue management.", "priority": "high"},
        {"id": "FR5",  "title": "Medication Administration",     "description": "Barcode wristband and medication scanning with five-rights validation before recording administration.", "priority": "high"},
        {"id": "FR6",  "title": "Prescription Management",       "description": "Electronic prescriptions with drug-interaction checking and allergy alerts; direct pharmacy integration.", "priority": "high"},
        {"id": "FR7",  "title": "Lab Integration",               "description": "Electronic lab orders with automatic result delivery to doctor's queue; abnormal values highlighted.", "priority": "high"},
        {"id": "FR8",  "title": "Billing & Insurance Claims",    "description": "Automated claim generation for top-ten regional providers with real-time claim-status tracking.", "priority": "high"},
        {"id": "FR9",  "title": "Telemedicine",                  "description": "Secure video consultations with end-to-end encryption, in-app messaging, and automatic session notes.", "priority": "medium"},
        {"id": "FR10", "title": "Staff Management",              "description": "Monthly rotation planner for doctors and nurses, on-call tracking, and leave approval workflow.", "priority": "medium"},
        {"id": "FR11", "title": "Radiology Module",              "description": "Electronic imaging orders, PACS integration for DICOM uploads, and radiologist report delivery back to EHR.", "priority": "medium"},
    ],
    "non_functional": [
        {"id": "NFR1", "title": "Compliance",     "description": "Full HIPAA compliance with field-level audit trails, role-based access, and AES-256 encryption at rest and in transit.", "category": "compliance"},
        {"id": "NFR2", "title": "Availability",   "description": "99.9% uptime with redundant infrastructure and automatic failover — clinical downtime can be life-threatening.", "category": "availability"},
        {"id": "NFR3", "title": "Performance",    "description": "Patient lookup completes in under 1 second; supports 500 concurrent clinical users.", "category": "performance"},
        {"id": "NFR4", "title": "Security",       "description": "Multi-factor authentication for clinical staff; encrypted data channels throughout.", "category": "security"},
    ],
}

LMS_REQS = {
    "functional": [
        {"id": "FR1", "title": "Course Management",           "description": "Faculty create courses with syllabi, upload multi-format materials, and organise into modules with scheduled release dates.", "priority": "high"},
        {"id": "FR2", "title": "Student Enrollment",          "description": "Self-service enrollment from the course catalogue with immediate material access.", "priority": "high"},
        {"id": "FR3", "title": "Assignment & Grading",        "description": "Custom rubrics, configurable late-penalty windows, and automatic weighted grade calculation.", "priority": "high"},
        {"id": "FR4", "title": "Quiz & Assessment Engine",    "description": "Timed quizzes with randomised question pools, MCQ/short-answer/essay types, and automatic grading for objective items.", "priority": "high"},
        {"id": "FR5", "title": "Discussion Forums",           "description": "Course-level threaded forums with file attachments and instructor announcement channel triggering push notifications.", "priority": "medium"},
        {"id": "FR6", "title": "Progress Tracking",           "description": "Student dashboard showing module completion, upcoming deadlines, and grade trajectory; separate parent portal.", "priority": "medium"},
        {"id": "FR7", "title": "Plagiarism Detection",        "description": "Automatic submission comparison against academic databases before instructor review.", "priority": "medium"},
        {"id": "FR8", "title": "Video Conferencing",          "description": "Zoom integration for live lectures; recordings auto-ingested into course materials within one hour.", "priority": "high"},
        {"id": "FR9", "title": "Mobile App",                  "description": "Native iOS and Android apps with offline material download and push notifications for deadlines and grades.", "priority": "medium"},
    ],
    "non_functional": [
        {"id": "NFR1", "title": "Scalability",    "description": "Support 50,000 concurrent students during exam periods.", "category": "scalability"},
        {"id": "NFR2", "title": "Accessibility",  "description": "WCAG 2.1 AA compliance for students with disabilities.", "category": "accessibility"},
        {"id": "NFR3", "title": "Data Privacy",   "description": "FERPA compliance for student data protection.", "category": "compliance"},
    ],
}

INVENTORY_REQS = {
    "functional": [
        {"id": "FR1", "title": "Real-time Inventory Tracking",  "description": "Log every item movement via barcode/QR scan with shelf-level location granularity (warehouse → aisle → rack → shelf → bin).", "priority": "high"},
        {"id": "FR2", "title": "Multi-warehouse Support",       "description": "Manage inventory across multiple sites with transfer tracking and consolidated reporting.", "priority": "high"},
        {"id": "FR3", "title": "Low-stock Alerts & Reorder",   "description": "Configurable minimum stock per SKU per location; automatic draft PO creation when threshold is breached.", "priority": "high"},
        {"id": "FR4", "title": "Supplier Management",          "description": "PO creation, expected delivery tracking, goods-receipt confirmation, and supplier scorecard for KPIs.", "priority": "high"},
        {"id": "FR5", "title": "Returns Processing",           "description": "Scan-based returns with condition assessment, inventory update, and damaged-goods disposal workflow.", "priority": "medium"},
        {"id": "FR6", "title": "Analytics & Reporting",        "description": "Turnover by SKU, dead-stock identification, 12-month demand forecast; 5-year data retention.", "priority": "high"},
        {"id": "FR7", "title": "SAP ERP Integration",          "description": "Bi-directional REST API sync with conflict-resolution rules clearly defined.", "priority": "high"},
        {"id": "FR8", "title": "Scanning Hardware Support",    "description": "Zebra handheld scanners, iOS/Android devices, and fixed tunnel scanners at dock doors.", "priority": "medium"},
    ],
    "non_functional": [
        {"id": "NFR1", "title": "Performance",      "description": "Process ≥ 1,000 scan operations per minute at peak; all reports exportable to Excel and PDF.", "category": "performance"},
        {"id": "NFR2", "title": "Security",         "description": "Role-based access control with a complete, immutable audit trail for every transaction.", "category": "security"},
        {"id": "NFR3", "title": "Data Retention",   "description": "Minimum five years of historical inventory data for trend analysis and regulatory audits.", "category": "compliance"},
    ],
}


# ---------------------------------------------------------------------------
# Transcript segments helper
# ---------------------------------------------------------------------------

ECOM_TRANSCRIPT_S3 = """\
Ahmed Hassan: Welcome back. Today we finalise the security and performance architecture for the E-Commerce Platform.
Rania Ibrahim: I've been reviewing the OWASP Top 10 and want to make sure we address each point explicitly in the design.
Omar Nabil: For authentication security we should enforce HTTPS everywhere, use HTTP-only and secure flags on session cookies, and implement CSRF tokens on all state-changing endpoints.
Ahmed Hassan: What about brute-force protection?
Rania Ibrahim: Rate limiting on the login endpoint — lock the account after five failed attempts with CAPTCHA on the sixth. Login anomaly detection to flag logins from new countries.
Omar Nabil: For the CDN strategy I recommend CloudFront with edge caching for static assets. Product images and JS bundles should be cached at the edge with aggressive TTLs.
Ahmed Hassan: Database performance?
Omar Nabil: Read replicas for all product catalog queries. Write path goes to the primary. Redis for session storage and the shopping cart — sub-millisecond reads.
Rania Ibrahim: We should also plan for the load test. I'd suggest simulating fifteen thousand concurrent users in the staging environment before go-live.
Ahmed Hassan: Agreed. What about the API rate limiting for the vendor portal?
Omar Nabil: One thousand requests per minute per vendor API key, with burst allowance up to two thousand. Returned with standard rate-limit headers so clients can back off gracefully.
Rania Ibrahim: For logging and monitoring — Datadog for APM, structured JSON logs shipped to Elasticsearch, and PagerDuty alerts for p95 latency above 500ms.
Ahmed Hassan: Perfect. Let's also make sure we have a WAF in front of the load balancer. Let's wrap up and document these decisions in the SRS update.\
"""

HOSPITAL_TRANSCRIPT_S3 = """\
Ahmed Hassan: Let's cover the billing and financial reporting requirements today.
Youssef Adel: The billing module needs to handle multiple charge types: consultation fees, procedure codes, medication charges, and room and board. Each must map to the correct ICD-10 billing code.
Nadia Fahmy: Insurance pre-authorisation is a pain point in many hospitals. The system should submit pre-auth requests electronically and track their status automatically.
Ahmed Hassan: What about patients who have multiple insurers — primary and secondary coverage?
Youssef Adel: The system must support coordination of benefits. Primary insurer is billed first, and the remaining balance goes to the secondary. Any outstanding amount is then billed to the patient.
Nadia Fahmy: For patient statements we need clear itemised bills. Studies show patients dispute bills more when they don't understand the charges.
Ahmed Hassan: What about financial reporting for hospital management?
Youssef Adel: Monthly P&L by department, revenue by physician, claim denial rate by insurer, and average days in accounts receivable. All must be exportable to Excel.
Nadia Fahmy: We also need a real-time revenue dashboard on the CFO's screen showing daily collections versus targets.
Ahmed Hassan: Debt collection workflow?
Youssef Adel: Automated dunning — three reminder emails at thirty, sixty, and ninety days past due. At ninety days escalate to the collections team with a full audit trail.
Nadia Fahmy: Tax compliance too. The system must generate VAT reports for the local tax authority and support e-invoicing in the national format.
Ahmed Hassan: Excellent. This completes the billing requirements. Let's draft the billing module specification this week.\
"""

LMS_TRANSCRIPT_S2 = """\
Sara Khalid: Today we go deep on the assessment engine and grading system for the University Learning Portal.
Lina Mostafa: For quiz configuration instructors need to set the number of questions, time limit, number of attempts allowed, and whether answers are shown after submission.
Omar Nabil: Question pools are important. An instructor adds fifty questions to a pool and the quiz engine draws twenty randomly for each student — ensures fairness and reduces cheating.
Sara Khalid: How do we handle essay questions?
Lina Mostafa: Essay and long-answer questions go to the instructor grading queue. The system displays the rubric alongside the submission so grading is consistent. Instructors can leave inline comments.
Omar Nabil: For grading schemas we need weighted categories — participation, quizzes, assignments, midterm, final — with the weights summing to one hundred percent. The final grade auto-calculates.
Sara Khalid: Grade appeals?
Lina Mostafa: Students submit an appeal through the portal with a written justification. The instructor has seven days to respond. If unresolved, it escalates to the department head.
Omar Nabil: For academic integrity beyond plagiarism detection, we should log time-on-page for quiz submissions. Unusually fast completions get flagged for review.
Sara Khalid: What about grade release workflows?
Lina Mostafa: Instructors publish grades when ready. Students get a push notification. Published grades are immutable unless an appeal is accepted and the admin unlocks the record.
Omar Nabil: Transcript generation — at the end of each semester the system should auto-generate an official transcript PDF with the university letterhead and a tamper-evident QR code.
Sara Khalid: GPA calculation?
Omar Nabil: Standard four-point scale with configurable grade boundaries per institution. The system tracks cumulative GPA and flags students who fall below the academic probation threshold.
Sara Khalid: Good. This gives us everything we need to finalise the assessment module design.\
"""

INV_TRANSCRIPT_S2 = """\
Youssef Adel: Welcome back. Today we cover the analytics module and the SAP ERP integration in detail.
Nadia Fahmy: For analytics the client wants a turnover dashboard: inventory turnover ratio per SKU, category, and warehouse, with period comparison — this month versus last month versus same period last year.
Sara Khalid: Dead stock identification is also high priority. Any item with zero movement in ninety days should appear in a dead stock report with the cost of holding it.
Youssef Adel: Demand forecasting — what algorithm are we using?
Nadia Fahmy: We'll start with exponential smoothing for stable items and switch to an ARIMA model for seasonal SKUs. The client's data scientist will help tune the parameters.
Sara Khalid: The SAP integration is the most complex piece. We need to sync item master data, stock quantities, purchase orders, goods receipts, and invoices.
Youssef Adel: What's the sync frequency?
Nadia Fahmy: Item master and vendor data sync nightly in batch. Stock quantities and POs sync every fifteen minutes. Goods receipts trigger an immediate event-driven push to SAP.
Sara Khalid: Error handling is critical. If the SAP API is down, events must be queued and replayed once the connection is restored, with no data loss.
Youssef Adel: For the reporting module we need scheduled reports — daily stock summary emailed to warehouse managers at 7am, weekly turnover report to the supply chain director on Mondays.
Nadia Fahmy: Custom report builder too — drag-and-drop columns, date range filters, grouping, and export to Excel and PDF. No-code so warehouse managers can build their own views.
Sara Khalid: What about mobile analytics?
Youssef Adel: The mobile app should show a manager dashboard with key KPIs — total SKUs, total value on hand, low stock alerts, and pending POs — all updating in real time.
Nadia Fahmy: Let's spec the data warehouse design next. We'll need a star schema to support all these reporting requirements efficiently.\
"""

FINTECH_TRANSCRIPT_S1 = """\
Sara Khalid: Good morning. Let's kick off the FinTech Mobile Banking App. This is a greenfield project for a challenger bank targeting young professionals.
Tarek Mansour: I've been analysing competitor apps. The differentiators are instant account opening — under five minutes — zero-fee international transfers, and AI-driven spending insights.
Dina Selim: The core account features: current account, savings pots with custom goals, and a joint account option for couples.
Sara Khalid: Account opening flow?
Tarek Mansour: Fully digital. Customer takes a photo of their national ID, a selfie for liveness check, and the app verifies identity in under sixty seconds via our KYC provider.
Dina Selim: For fund transfers — domestic instant transfers via the national payment rail, and international SWIFT transfers with transparent fees shown upfront before confirmation.
Sara Khalid: What about card management?
Tarek Mansour: Virtual card issued instantly on account opening, physical card delivered in three to five days. In-app controls: freeze and unfreeze, set spending limits per merchant category, and enable or disable contactless, online, and ATM transactions independently.
Dina Selim: Bill payments — direct debit setup, scheduled standing orders, and a payee management screen. QR-code payments for in-person transactions.
Sara Khalid: Spending insights?
Tarek Mansour: Automatic transaction categorisation using machine learning — groceries, dining, transport, utilities, entertainment. Monthly spending reports with budget alerts when a category approaches its limit.
Dina Selim: Savings pots are a big feature — create a pot, name it, set a target amount and date, and the app auto-saves a configurable amount each pay cycle.
Sara Khalid: Loan products?
Tarek Mansour: In-app personal loan applications with instant soft-credit-check eligibility. If approved, funds are in the current account within seconds. Repayments are automated via direct debit.
Dina Selim: We also need push notifications for every transaction, balance alerts, and promotional offers personalised to spending behaviour.
Sara Khalid: Great start. Let's move to the security requirements next session.\
"""

FINTECH_TRANSCRIPT_S2 = """\
Sara Khalid: Today we focus entirely on security and regulatory compliance for the Mobile Banking App.
Tarek Mansour: Authentication must be multi-layered: biometric — Face ID and fingerprint — as the primary, PIN as the fallback, and a one-time passcode for high-value actions like new payee addition.
Dina Selim: Device binding is important. The app should be bound to a single registered device. If the user gets a new phone they go through a re-verification flow before the old binding is revoked.
Sara Khalid: Fraud detection?
Tarek Mansour: Real-time transaction scoring using a rule engine plus a machine learning model. Transactions above the risk threshold are challenged with a push notification — the customer approves or declines in the app.
Dina Selim: Velocity checks too — five failed PIN attempts locks the card. Three suspicious transactions in twenty-four hours freezes the account and alerts the fraud team.
Sara Khalid: Regulatory compliance — what are we targeting?
Tarek Mansour: PCI DSS Level 1 for card data. ISO 27001 for information security management. The local central bank's open-banking API standard for third-party integrations. AML transaction monitoring with automatic suspicious activity report generation.
Dina Selim: GDPR and local data-protection law compliance. Customer data must stay in-country. The right to be forgotten must be automated — when a customer closes their account, PII is purged within thirty days except where legally required to retain for seven years.
Sara Khalid: Penetration testing?
Tarek Mansour: Quarterly external pen tests by a certified firm. Continuous automated vulnerability scanning in CI/CD. Bug bounty programme to be launched at go-live.
Dina Selim: Session management — automatic logout after five minutes of inactivity. Session tokens rotated on each login. Refresh tokens valid for thirty days with sliding expiry.
Sara Khalid: Performance targets?
Tarek Mansour: Balance enquiry and transaction history must respond in under 500ms at the 99th percentile. Transfer confirmation under one second. System must handle 200,000 concurrent users at peak — salary day.
Dina Selim: Disaster recovery: RPO of fifteen minutes, RTO of thirty minutes. Active-active deployment across two data centres.
Sara Khalid: This is comprehensive. Let's get the security architecture diagram done by end of week.\
"""

FINTECH_REQS = {
    "functional": [
        {"id": "FR1",  "title": "Digital Account Opening",          "description": "Fully digital KYC with national-ID photo, selfie liveness check, and identity verification in under 60 seconds.", "priority": "high"},
        {"id": "FR2",  "title": "Current & Savings Accounts",       "description": "Current account plus savings pots with custom goals, target amounts, and automated round-up saving.", "priority": "high"},
        {"id": "FR3",  "title": "Joint Account",                    "description": "Joint account for two customers with configurable spending limits per holder.", "priority": "medium"},
        {"id": "FR4",  "title": "Card Management",                  "description": "Instant virtual card on account opening; physical card in 3–5 days. In-app freeze/unfreeze, per-category limits, and channel-level controls.", "priority": "high"},
        {"id": "FR5",  "title": "Domestic Fund Transfers",          "description": "Instant transfers via national payment rail with real-time confirmation and push notification.", "priority": "high"},
        {"id": "FR6",  "title": "International Transfers",          "description": "SWIFT international transfers with transparent fee breakdown shown before confirmation.", "priority": "high"},
        {"id": "FR7",  "title": "Bill Payments & Standing Orders",  "description": "Direct debit setup, scheduled standing orders, payee management, and QR-code in-person payments.", "priority": "high"},
        {"id": "FR8",  "title": "Spending Insights & Budgeting",    "description": "ML-powered transaction categorisation with monthly reports and budget alerts per category.", "priority": "medium"},
        {"id": "FR9",  "title": "Personal Loan Applications",       "description": "In-app loan application with instant soft-credit-check. Approved funds disbursed in seconds; repayments via auto direct debit.", "priority": "medium"},
        {"id": "FR10", "title": "Push Notifications",               "description": "Real-time push for every transaction, balance alerts, budget warnings, and fraud challenges.", "priority": "high"},
        {"id": "FR11", "title": "Multi-layer Authentication",       "description": "Biometric (Face ID/fingerprint) primary, PIN fallback, OTP for high-value actions. Device binding with re-verification flow for new devices.", "priority": "high"},
        {"id": "FR12", "title": "Real-time Fraud Detection",        "description": "Rule engine + ML transaction scoring with push-notification challenge for high-risk transactions and automated velocity-based blocking.", "priority": "high"},
    ],
    "non_functional": [
        {"id": "NFR1", "title": "Performance",    "description": "Balance/history < 500ms p99; transfer confirmation < 1s. Handles 200,000 concurrent users on salary day.", "category": "performance"},
        {"id": "NFR2", "title": "Compliance",     "description": "PCI DSS Level 1, ISO 27001, central-bank open-banking standard, AML monitoring with automated SAR generation. GDPR/local data-protection law with in-country data residency.", "category": "compliance"},
        {"id": "NFR3", "title": "Security",       "description": "Quarterly external pen tests, continuous CI/CD vulnerability scanning, bug-bounty programme. Session auto-logout at 5 min inactivity; tokens rotated on login.", "category": "security"},
        {"id": "NFR4", "title": "Availability",   "description": "99.99% uptime. Active-active multi-DC deployment. RPO 15 min, RTO 30 min.", "category": "availability"},
        {"id": "NFR5", "title": "Data Retention", "description": "PII purged within 30 days of account closure except where 7-year legal retention applies. Right-to-erasure automated.", "category": "compliance"},
    ],
}

ECOM_S3_SEGS = [
    {"speaker": "Ahmed Hassan",  "start": 0,   "end": 20,  "text": "Welcome back. Today we finalise the security and performance architecture for the E-Commerce Platform."},
    {"speaker": "Rania Ibrahim", "start": 20,  "end": 55,  "text": "I've been reviewing the OWASP Top 10 and want to make sure we address each point explicitly in the design."},
    {"speaker": "Omar Nabil",    "start": 55,  "end": 110, "text": "For authentication security we should enforce HTTPS everywhere, use HTTP-only and secure flags on session cookies, and implement CSRF tokens on all state-changing endpoints."},
    {"speaker": "Ahmed Hassan",  "start": 110, "end": 128, "text": "What about brute-force protection?"},
    {"speaker": "Rania Ibrahim", "start": 128, "end": 185, "text": "Rate limiting on the login endpoint — lock after five failed attempts with CAPTCHA. Login anomaly detection to flag logins from new countries."},
    {"speaker": "Omar Nabil",    "start": 185, "end": 240, "text": "For the CDN strategy I recommend CloudFront with edge caching for static assets. Product images and JS bundles cached at the edge with aggressive TTLs."},
    {"speaker": "Ahmed Hassan",  "start": 240, "end": 255, "text": "Database performance?"},
    {"speaker": "Omar Nabil",    "start": 255, "end": 300, "text": "Read replicas for all product catalog queries. Write path goes to the primary. Redis for sessions and the shopping cart — sub-millisecond reads."},
    {"speaker": "Rania Ibrahim", "start": 300, "end": 345, "text": "We should load-test with fifteen thousand concurrent users in staging before go-live."},
    {"speaker": "Ahmed Hassan",  "start": 345, "end": 395, "text": "Agreed. We also need a WAF in front of the load balancer. Let's wrap up and document these decisions in the SRS update."},
]

FINTECH_S1_SEGS = [
    {"speaker": "Sara Khalid",   "start": 0,   "end": 30,  "text": "Good morning. Let's kick off the FinTech Mobile Banking App targeting young professionals."},
    {"speaker": "Tarek Mansour", "start": 30,  "end": 80,  "text": "Competitor analysis shows three differentiators: instant account opening under five minutes, zero-fee international transfers, and AI-driven spending insights."},
    {"speaker": "Dina Selim",    "start": 80,  "end": 115, "text": "Core accounts: current account, savings pots with custom goals, and a joint account option for couples."},
    {"speaker": "Sara Khalid",   "start": 115, "end": 128, "text": "Account opening flow?"},
    {"speaker": "Tarek Mansour", "start": 128, "end": 185, "text": "Fully digital. Customer photos their national ID, a selfie for liveness check — identity verified in under sixty seconds via our KYC provider."},
    {"speaker": "Dina Selim",    "start": 185, "end": 240, "text": "Fund transfers: domestic instant via the national payment rail, and international SWIFT with transparent fees shown upfront before confirmation."},
    {"speaker": "Sara Khalid",   "start": 240, "end": 253, "text": "Card management?"},
    {"speaker": "Tarek Mansour", "start": 253, "end": 330, "text": "Virtual card issued instantly, physical in three to five days. In-app controls: freeze, spending limits per merchant category, and toggle contactless, online, ATM independently."},
    {"speaker": "Dina Selim",    "start": 330, "end": 390, "text": "Bill payments: direct debit, standing orders, payee management, QR-code in-person payments."},
    {"speaker": "Sara Khalid",   "start": 390, "end": 405, "text": "Spending insights?"},
    {"speaker": "Tarek Mansour", "start": 405, "end": 470, "text": "ML categorisation — groceries, dining, transport, utilities, entertainment. Monthly reports with budget alerts when a category approaches its limit."},
    {"speaker": "Dina Selim",    "start": 470, "end": 530, "text": "Savings pots: create a pot, set a target amount and date, the app auto-saves each pay cycle. Great engagement driver."},
    {"speaker": "Tarek Mansour", "start": 530, "end": 585, "text": "Loan applications: instant soft-credit-check, funds in the account within seconds if approved, repayments automated via direct debit."},
    {"speaker": "Sara Khalid",   "start": 585, "end": 605, "text": "Great start. Security requirements next session."},
]

FINTECH_S2_SEGS = [
    {"speaker": "Sara Khalid",   "start": 0,   "end": 22,  "text": "Today we focus entirely on security and regulatory compliance."},
    {"speaker": "Tarek Mansour", "start": 22,  "end": 85,  "text": "Authentication: biometric as primary — Face ID and fingerprint — PIN as fallback, OTP for high-value actions like new payee addition."},
    {"speaker": "Dina Selim",    "start": 85,  "end": 140, "text": "Device binding — app bound to one registered device. New phone triggers re-verification before the old binding is revoked."},
    {"speaker": "Sara Khalid",   "start": 140, "end": 153, "text": "Fraud detection?"},
    {"speaker": "Tarek Mansour", "start": 153, "end": 215, "text": "Real-time transaction scoring: rule engine plus ML model. High-risk transactions challenged with a push notification — customer approves or declines in-app."},
    {"speaker": "Dina Selim",    "start": 215, "end": 268, "text": "Velocity checks: five failed PINs locks the card; three suspicious transactions in twenty-four hours freezes the account and alerts fraud team."},
    {"speaker": "Sara Khalid",   "start": 268, "end": 285, "text": "Regulatory compliance targets?"},
    {"speaker": "Tarek Mansour", "start": 285, "end": 355, "text": "PCI DSS Level 1, ISO 27001, central bank open-banking standard, AML monitoring with automatic suspicious activity report generation."},
    {"speaker": "Dina Selim",    "start": 355, "end": 430, "text": "GDPR and local data-protection law. Data stays in-country. Right to be forgotten automated — PII purged within thirty days of account closure, except seven-year legal retention."},
    {"speaker": "Tarek Mansour", "start": 430, "end": 490, "text": "Quarterly external pen tests, continuous automated scanning in CI/CD, bug bounty programme at go-live."},
    {"speaker": "Sara Khalid",   "start": 490, "end": 510, "text": "Performance targets?"},
    {"speaker": "Tarek Mansour", "start": 510, "end": 575, "text": "Balance and history under 500ms at p99, transfer confirmation under one second. Two hundred thousand concurrent users at peak — salary day."},
    {"speaker": "Dina Selim",    "start": 575, "end": 625, "text": "Disaster recovery: RPO fifteen minutes, RTO thirty minutes. Active-active across two data centres."},
    {"speaker": "Sara Khalid",   "start": 625, "end": 648, "text": "Comprehensive. Security architecture diagram by end of week."},
]


def add_segments(db, session_id: int, segments: list[dict]):
    for seg in segments:
        db.add(TranscriptSegment(
            session_id=session_id,
            speaker=seg["speaker"],
            start_time=seg["start"],
            end_time=seg["end"],
            text=seg["text"],
        ))


ECOM_S1_SEGS = [
    {"speaker": "Ahmed Hassan",  "start": 0,   "end": 18,  "text": "Good morning everyone. Welcome to our project kickoff for the E-Commerce Platform."},
    {"speaker": "Omar Nabil",    "start": 18,  "end": 52,  "text": "Thanks Ahmed. I've gone through the client brief — they want three core pillars: user authentication, a rich product catalog, and a seamless payment flow."},
    {"speaker": "Lina Mostafa",  "start": 52,  "end": 68,  "text": "Agreed. They also stressed a mobile-first approach. The majority of their customers shop on phones."},
    {"speaker": "Ahmed Hassan",  "start": 68,  "end": 95,  "text": "Great point. Let's make the system fully responsive. Omar, can you walk us through the authentication requirements?"},
    {"speaker": "Omar Nabil",    "start": 95,  "end": 138, "text": "Sure. Standard email and password, plus OAuth via Google and Facebook. Role-based access for admins, sellers, and buyers is a must."},
    {"speaker": "Lina Mostafa",  "start": 138, "end": 172, "text": "For the catalog we need hierarchical categories, product variants — size, colour, material — and a powerful search engine with filters and facets."},
    {"speaker": "Ahmed Hassan",  "start": 172, "end": 183, "text": "Payment gateway?"},
    {"speaker": "Omar Nabil",    "start": 183, "end": 225, "text": "Stripe and PayPal to start. Refunds, partial payments for split orders, and subscription billing for premium sellers."},
    {"speaker": "Lina Mostafa",  "start": 225, "end": 270, "text": "Order tracking is critical too. Real-time status updates with email and SMS notifications at each milestone."},
    {"speaker": "Ahmed Hassan",  "start": 270, "end": 298, "text": "Let's add a reviews and ratings system — verified purchasers only. That builds trust with new buyers."},
    {"speaker": "Omar Nabil",    "start": 298, "end": 335, "text": "Agreed. Non-functionally: ten thousand concurrent users, product pages loading in under two seconds."},
    {"speaker": "Lina Mostafa",  "start": 335, "end": 355, "text": "And PCI DSS for payments, GDPR for user data."},
    {"speaker": "Ahmed Hassan",  "start": 355, "end": 375, "text": "Perfect. Let's start drafting the requirements document this week."},
]

HOSPITAL_S1_SEGS = [
    {"speaker": "Ahmed Hassan",  "start": 0,   "end": 22,  "text": "Welcome. Today we gather requirements for the Hospital Management System. Let's start with patient management."},
    {"speaker": "Youssef Adel",  "start": 22,  "end": 78,  "text": "The most critical piece is patient registration — full demographics, insurance, emergency contacts, allergy history, and chronic conditions, all linked to a unique patient ID."},
    {"speaker": "Nadia Fahmy",   "start": 78,  "end": 110, "text": "That single ID must follow the patient across every department. No re-registering."},
    {"speaker": "Ahmed Hassan",  "start": 110, "end": 124, "text": "Appointment scheduling?"},
    {"speaker": "Youssef Adel",  "start": 124, "end": 175, "text": "Online patient portal for self-booking, smart scheduling to minimise wait times, automated SMS and email reminders forty-eight hours before the appointment."},
    {"speaker": "Nadia Fahmy",   "start": 175, "end": 225, "text": "ED needs a triage module — severity scoring, real-time bed availability, and queue management for nurses."},
    {"speaker": "Ahmed Hassan",  "start": 225, "end": 240, "text": "Medical records?"},
    {"speaker": "Youssef Adel",  "start": 240, "end": 300, "text": "HL7 FHIR-compliant EHR. Doctors see the full patient timeline — labs, prescriptions, imaging, surgical history — on one screen."},
    {"speaker": "Nadia Fahmy",   "start": 300, "end": 352, "text": "Prescription management must include drug-interaction checking and allergy alerts that fire before the doctor can save the order."},
    {"speaker": "Ahmed Hassan",  "start": 352, "end": 368, "text": "And compliance?"},
    {"speaker": "Youssef Adel",  "start": 368, "end": 430, "text": "HIPAA non-negotiable. Complete audit trails on every data access, role-based permissions down to field level, AES-256 encryption at rest and in transit."},
    {"speaker": "Nadia Fahmy",   "start": 430, "end": 475, "text": "Billing needs automated insurance claim generation supporting at least the top ten providers in the region."},
    {"speaker": "Ahmed Hassan",  "start": 475, "end": 495, "text": "Let's prioritise and start designing the data model next week."},
]


def main():
    db = SessionLocal()
    try:
        # ── 1. Clear all tables ─────────────────────────────────────────────
        print("Clearing all tables...")
        db.execute(text("""
            TRUNCATE TABLE
                project_approvals,
                approvals,
                requirement_raw,
                session_requirements,
                project_requirements,
                requirement_runs,
                artifacts,
                artifact_types,
                summaries,
                transcript_segments,
                session_memberships,
                background_tasks,
                notifications,
                invitations,
                project_leave_requests,
                audit_logs,
                sessions,
                project_memberships,
                projects,
                users
            RESTART IDENTITY CASCADE
        """))
        db.commit()
        print("All tables cleared.\n")

        # ── 2. Artifact types ───────────────────────────────────────────────
        at_srs      = ArtifactType(name="SRS")
        at_usecase  = ArtifactType(name="UML_USECASE")
        at_class    = ArtifactType(name="UML_CLASS")
        at_seq      = ArtifactType(name="UML_SEQUENCE")
        db.add_all([at_srs, at_usecase, at_class, at_seq])
        db.flush()

        # ── 3. Users ────────────────────────────────────────────────────────
        PASS = hash_password("Demo@1234")

        admin   = User(email="admin@talk2system.com",      hashed_password=PASS, full_name="System Administrator",  role="admin", status="active",    created_at=dt(-60))
        ahmed   = User(email="ahmed.hassan@gmail.com",     hashed_password=PASS, full_name="Ahmed Hassan",          role="user",  status="active",    created_at=dt(-55), avatar_url="https://api.dicebear.com/7.x/initials/svg?seed=AhmedHassan")
        sara    = User(email="sara.khalid@outlook.com",    hashed_password=PASS, full_name="Sara Khalid",           role="user",  status="active",    created_at=dt(-50), avatar_url="https://api.dicebear.com/7.x/initials/svg?seed=SaraKhalid")
        omar    = User(email="omar.nabil@gmail.com",       hashed_password=PASS, full_name="Omar Nabil",            role="user",  status="active",    created_at=dt(-48), avatar_url="https://api.dicebear.com/7.x/initials/svg?seed=OmarNabil")
        lina    = User(email="lina.mostafa@outlook.com",   hashed_password=PASS, full_name="Lina Mostafa",          role="user",  status="active",    created_at=dt(-45), avatar_url="https://api.dicebear.com/7.x/initials/svg?seed=LinaMostafa")
        youssef = User(email="youssef.adel@gmail.com",     hashed_password=PASS, full_name="Youssef Adel",          role="user",  status="active",    created_at=dt(-42), avatar_url="https://api.dicebear.com/7.x/initials/svg?seed=YoussefAdel")
        nadia   = User(email="nadia.fahmy@gmail.com",      hashed_password=PASS, full_name="Nadia Fahmy",           role="user",  status="active",    created_at=dt(-40), avatar_url="https://api.dicebear.com/7.x/initials/svg?seed=NadiaFahmy")
        kareem  = User(email="kareem.samy@outlook.com",    hashed_password=PASS, full_name="Kareem Samy",           role="user",  status="pending",   created_at=dt(-5))
        mona    = User(email="mona.taha@gmail.com",        hashed_password=PASS, full_name="Mona Taha",             role="user",  status="suspended", created_at=dt(-20), status_reason="Violated community guidelines")
        rania   = User(email="rania.ibrahim@gmail.com",    hashed_password=PASS, full_name="Rania Ibrahim",         role="user",  status="active",    created_at=dt(-35), avatar_url="https://api.dicebear.com/7.x/initials/svg?seed=RaniaIbrahim")

        db.add_all([admin, ahmed, sara, omar, lina, youssef, nadia, kareem, mona, rania])
        db.flush()

        # ── 4. Projects ─────────────────────────────────────────────────────
        p1 = Project(name="E-Commerce Platform",       description="Full-featured online shopping platform with product catalog, cart, checkout, and order management.", domain="E-Commerce",   project_status="in_progress", created_at=dt(-54))
        p2 = Project(name="Hospital Management System",description="Comprehensive system for managing patients, appointments, medical records, billing, and clinical staff.", domain="Healthcare",   project_status="in_progress", created_at=dt(-44))
        p3 = Project(name="University Learning Portal",description="Online learning platform for students and faculty with course management, assignments, and grading.", domain="Education",    project_status="in_progress", created_at=dt(-38))
        p4 = Project(name="Smart Inventory Tracker",   description="Real-time warehouse inventory tracking with barcode scanning, low-stock alerts, and SAP integration.", domain="Manufacturing", project_status="in_progress", created_at=dt(-28))

        db.add_all([p1, p2, p3, p4])
        db.flush()

        # ── 5. Project memberships ──────────────────────────────────────────
        db.add_all([
            # P1: ahmed (PM), omar, lina, rania
            ProjectMembership(project_id=p1.id, user_id=ahmed.id,   role="project_manager", joined_at=dt(-54)),
            ProjectMembership(project_id=p1.id, user_id=omar.id,    role="participant",     joined_at=dt(-52)),
            ProjectMembership(project_id=p1.id, user_id=lina.id,    role="participant",     joined_at=dt(-51)),
            ProjectMembership(project_id=p1.id, user_id=rania.id,   role="participant",     joined_at=dt(-50)),
            # P2: ahmed (PM), youssef, nadia
            ProjectMembership(project_id=p2.id, user_id=ahmed.id,   role="project_manager", joined_at=dt(-44)),
            ProjectMembership(project_id=p2.id, user_id=youssef.id, role="participant",     joined_at=dt(-43)),
            ProjectMembership(project_id=p2.id, user_id=nadia.id,   role="participant",     joined_at=dt(-42)),
            # P3: sara (PM), omar, lina
            ProjectMembership(project_id=p3.id, user_id=sara.id,    role="project_manager", joined_at=dt(-38)),
            ProjectMembership(project_id=p3.id, user_id=omar.id,    role="participant",     joined_at=dt(-37)),
            ProjectMembership(project_id=p3.id, user_id=lina.id,    role="participant",     joined_at=dt(-36)),
            # P4: youssef (PM), nadia, sara, rania
            ProjectMembership(project_id=p4.id, user_id=youssef.id, role="project_manager", joined_at=dt(-28)),
            ProjectMembership(project_id=p4.id, user_id=nadia.id,   role="participant",     joined_at=dt(-27)),
            ProjectMembership(project_id=p4.id, user_id=sara.id,    role="participant",     joined_at=dt(-26)),
            ProjectMembership(project_id=p4.id, user_id=rania.id,   role="participant",     joined_at=dt(-25)),
        ])
        db.flush()

        # ── 6. Invitations ──────────────────────────────────────────────────
        db.add_all([
            Invitation(project_id=p1.id, invitee_user_id=kareem.id, invited_by_user_id=ahmed.id,  project_domain="E-Commerce", status="pending",  created_at=dt(-4)),
            Invitation(project_id=p3.id, invitee_user_id=mona.id,   invited_by_user_id=sara.id,   project_domain="Education",  status="rejected", created_at=dt(-12), actioned_at=dt(-11)),
            Invitation(project_id=p2.id, invitee_user_id=rania.id,  invited_by_user_id=ahmed.id,  project_domain="Healthcare", status="accepted", created_at=dt(-30), actioned_at=dt(-29)),
        ])
        db.flush()

        # ── 7. Sessions ─────────────────────────────────────────────────────
        s1_1 = Session(title="Kickoff & Requirements Elicitation",        project_id=p1.id, status="in_progress", transcript_text=ECOM_TRANSCRIPT_S1,     detected_language="english", created_at=dt(-50))
        s1_2 = Session(title="Technical Architecture & Admin Experience",  project_id=p1.id, status="in_progress", transcript_text=ECOM_TRANSCRIPT_S2,     detected_language="english", created_at=dt(-40))
        s2_1 = Session(title="Patient Management Requirements",            project_id=p2.id, status="in_progress", transcript_text=HOSPITAL_TRANSCRIPT_S1, detected_language="english", created_at=dt(-42))
        s2_2 = Session(title="Clinical Workflows & System Integrations",   project_id=p2.id, status="in_progress", transcript_text=HOSPITAL_TRANSCRIPT_S2, detected_language="english", created_at=dt(-35))
        s3_1 = Session(title="Learning Management Feature Planning",       project_id=p3.id, status="in_progress", transcript_text=LMS_TRANSCRIPT_S1,      detected_language="english", created_at=dt(-36))
        s4_1 = Session(title="Inventory Tracking Core Requirements",       project_id=p4.id, status="in_progress", transcript_text=INVENTORY_TRANSCRIPT_S1,detected_language="english", created_at=dt(-26))

        db.add_all([s1_1, s1_2, s2_1, s2_2, s3_1, s4_1])
        db.flush()

        # ── 8. Session memberships ──────────────────────────────────────────
        db.add_all([
            SessionMembership(session_id=s1_1.id, user_id=ahmed.id,   role="project_manager"),
            SessionMembership(session_id=s1_1.id, user_id=omar.id,    role="participant"),
            SessionMembership(session_id=s1_1.id, user_id=lina.id,    role="participant"),
            SessionMembership(session_id=s1_2.id, user_id=ahmed.id,   role="project_manager"),
            SessionMembership(session_id=s1_2.id, user_id=omar.id,    role="participant"),
            SessionMembership(session_id=s1_2.id, user_id=rania.id,   role="participant"),
            SessionMembership(session_id=s2_1.id, user_id=ahmed.id,   role="project_manager"),
            SessionMembership(session_id=s2_1.id, user_id=youssef.id, role="participant"),
            SessionMembership(session_id=s2_1.id, user_id=nadia.id,   role="participant"),
            SessionMembership(session_id=s2_2.id, user_id=ahmed.id,   role="project_manager"),
            SessionMembership(session_id=s2_2.id, user_id=youssef.id, role="participant"),
            SessionMembership(session_id=s2_2.id, user_id=nadia.id,   role="participant"),
            SessionMembership(session_id=s3_1.id, user_id=sara.id,    role="project_manager"),
            SessionMembership(session_id=s3_1.id, user_id=omar.id,    role="participant"),
            SessionMembership(session_id=s3_1.id, user_id=lina.id,    role="participant"),
            SessionMembership(session_id=s4_1.id, user_id=youssef.id, role="project_manager"),
            SessionMembership(session_id=s4_1.id, user_id=nadia.id,   role="participant"),
            SessionMembership(session_id=s4_1.id, user_id=sara.id,    role="participant"),
        ])
        db.flush()

        # ── 9. Transcript segments ──────────────────────────────────────────
        add_segments(db, s1_1.id, ECOM_S1_SEGS)
        add_segments(db, s2_1.id, HOSPITAL_S1_SEGS)
        db.flush()

        # ── 10. Requirement runs, raws, session requirements ────────────────
        def make_run(project_id, session_id, run_type, reqs, delta):
            run = RequirementRun(project_id=project_id, session_id=session_id, run_type=run_type, grouped_json=reqs, created_at=dt(delta))
            db.add(run)
            db.flush()
            db.add(RequirementRaw(run_id=run.id, raw_json={"titles": [r["title"] for r in reqs["functional"] + reqs["non_functional"]]}, created_at=dt(delta)))
            sr = SessionRequirement(session_id=session_id, project_id=project_id, requirements_json=reqs, approval_status="approved", version=1, src_run_id=run.id, created_at=dt(delta))
            db.add(sr)
            db.flush()
            return run, sr

        run1, sr1 = make_run(p1.id, s1_1.id, "hybrid", ECOM_REQS, -49)
        run2, sr2 = make_run(p1.id, s1_2.id, "llm",    ECOM_REQS, -39)
        run3, sr3 = make_run(p2.id, s2_1.id, "hybrid", HOSPITAL_REQS, -41)
        run4, sr4 = make_run(p2.id, s2_2.id, "llm",    HOSPITAL_REQS, -34)
        run5, sr5 = make_run(p3.id, s3_1.id, "llm",    LMS_REQS, -35)
        run6, sr6 = make_run(p4.id, s4_1.id, "hybrid", INVENTORY_REQS, -25)

        # Pending session requirement for inventory (not yet approved)
        sr6.approval_status = "pending approval"
        db.flush()

        # ── 11. Project requirements ────────────────────────────────────────
        pr1 = ProjectRequirement(project_id=p1.id, aggregated_req_json=ECOM_REQS,      approval_status="approved",         version=2, created_at=dt(-38))
        pr2 = ProjectRequirement(project_id=p2.id, aggregated_req_json=HOSPITAL_REQS,  approval_status="approved",         version=1, created_at=dt(-40))
        pr3 = ProjectRequirement(project_id=p3.id, aggregated_req_json=LMS_REQS,       approval_status="approved",         version=1, created_at=dt(-34))
        pr4 = ProjectRequirement(project_id=p4.id, aggregated_req_json=INVENTORY_REQS, approval_status="pending approval", version=1, created_at=dt(-24))

        db.add_all([pr1, pr2, pr3, pr4])
        db.flush()

        # ── 12. Artifacts ───────────────────────────────────────────────────
        a_ecom_srs    = Artifact(project_id=p1.id, session_id=s1_1.id, artifact_type_id=at_srs.id,     file_path="artifacts/p1/srs_v1.pdf",            version="v1", approval_status="approved", created_at=dt(-48))
        a_ecom_uc     = Artifact(project_id=p1.id, session_id=s1_1.id, artifact_type_id=at_usecase.id, file_path="artifacts/p1/uml_usecase_v1.png",     version="v1", approval_status="approved", created_at=dt(-47))
        a_ecom_cls    = Artifact(project_id=p1.id, session_id=s1_2.id, artifact_type_id=at_class.id,   file_path="artifacts/p1/uml_class_v1.png",       version="v1", approval_status="pending",  created_at=dt(-38))
        a_hosp_srs    = Artifact(project_id=p2.id, session_id=s2_1.id, artifact_type_id=at_srs.id,     file_path="artifacts/p2/srs_v1.pdf",            version="v1", approval_status="approved", created_at=dt(-40))
        a_hosp_uc     = Artifact(project_id=p2.id, session_id=s2_1.id, artifact_type_id=at_usecase.id, file_path="artifacts/p2/uml_usecase_v1.png",     version="v1", approval_status="approved", created_at=dt(-39))
        a_lms_srs     = Artifact(project_id=p3.id, session_id=s3_1.id, artifact_type_id=at_srs.id,     file_path="artifacts/p3/srs_v1.pdf",            version="v1", approval_status="approved", created_at=dt(-34))
        a_lms_seq     = Artifact(project_id=p3.id, session_id=s3_1.id, artifact_type_id=at_seq.id,     file_path="artifacts/p3/uml_sequence_v1.png",    version="v1", approval_status="approved", created_at=dt(-33))

        db.add_all([a_ecom_srs, a_ecom_uc, a_ecom_cls, a_hosp_srs, a_hosp_uc, a_lms_srs, a_lms_seq])
        db.flush()

        # ── 13. Session-level approvals ─────────────────────────────────────
        db.add_all([
            # E-Commerce session 1 — fully approved
            Approval(session_id=s1_1.id, user_id=ahmed.id, feature="transcript",   aproved_at=dt(-48)),
            Approval(session_id=s1_1.id, user_id=ahmed.id, feature="requirements", aproved_at=dt(-48), version_id=sr1.id),
            Approval(session_id=s1_1.id, user_id=ahmed.id, feature="uml",          aproved_at=dt(-47), version_id=a_ecom_uc.id),
            Approval(session_id=s1_1.id, user_id=ahmed.id, feature="srs",          aproved_at=dt(-47), version_id=a_ecom_srs.id),
            # Hospital session 1 — transcript + requirements + srs approved
            Approval(session_id=s2_1.id, user_id=ahmed.id, feature="transcript",   aproved_at=dt(-41)),
            Approval(session_id=s2_1.id, user_id=ahmed.id, feature="requirements", aproved_at=dt(-40), version_id=sr3.id),
            Approval(session_id=s2_1.id, user_id=ahmed.id, feature="srs",          aproved_at=dt(-40), version_id=a_hosp_srs.id),
            Approval(session_id=s2_1.id, user_id=ahmed.id, feature="uml",          aproved_at=dt(-39), version_id=a_hosp_uc.id),
            # LMS session 1 — all approved
            Approval(session_id=s3_1.id, user_id=sara.id,  feature="transcript",   aproved_at=dt(-35)),
            Approval(session_id=s3_1.id, user_id=sara.id,  feature="requirements", aproved_at=dt(-34), version_id=sr5.id),
            Approval(session_id=s3_1.id, user_id=sara.id,  feature="srs",          aproved_at=dt(-34), version_id=a_lms_srs.id),
        ])

        # ── 14. Project-level approvals ─────────────────────────────────────
        db.add_all([
            ProjectApproval(project_id=p1.id, user_id=ahmed.id, feature="requirements", version_id=pr1.id, approved_at=dt(-37)),
            ProjectApproval(project_id=p1.id, user_id=ahmed.id, feature="srs",          version_id=a_ecom_srs.id, approved_at=dt(-47)),
            ProjectApproval(project_id=p2.id, user_id=ahmed.id, feature="requirements", version_id=pr2.id, approved_at=dt(-40)),
            ProjectApproval(project_id=p3.id, user_id=sara.id,  feature="requirements", version_id=pr3.id, approved_at=dt(-34)),
            ProjectApproval(project_id=p3.id, user_id=sara.id,  feature="srs",          version_id=a_lms_srs.id, approved_at=dt(-34)),
        ])
        db.flush()

        # ── 15. Notifications ───────────────────────────────────────────────
        db.add_all([
            Notification(user_id=kareem.id,  notification_type="invitation_received",  title="Project Invitation",                    message="You have been invited to join the E-Commerce Platform project by Ahmed Hassan.",              actor_name="Ahmed Hassan",  actor_email="ahmed.hassan@gmail.com",   project_id=p1.id, project_name="E-Commerce Platform",       is_read=False, created_at=dt(-4)),
            Notification(user_id=omar.id,    notification_type="requirements_approved", title="Requirements Approved",                 message="The requirements for 'Kickoff & Requirements Elicitation' have been approved.",               actor_name="Ahmed Hassan",  actor_email="ahmed.hassan@gmail.com",   project_id=p1.id, project_name="E-Commerce Platform",       session_id=s1_1.id, is_read=True,  created_at=dt(-48)),
            Notification(user_id=lina.id,    notification_type="srs_generated",         title="SRS Document Generated",                message="A new SRS has been generated for E-Commerce Platform.",                                       actor_name="System",        actor_email=None,                       project_id=p1.id, project_name="E-Commerce Platform",       is_read=True,  created_at=dt(-47)),
            Notification(user_id=rania.id,   notification_type="joined_project",        title="Welcome to E-Commerce Platform",        message="You have been added to E-Commerce Platform as a participant.",                                actor_name="Ahmed Hassan",  actor_email="ahmed.hassan@gmail.com",   project_id=p1.id, project_name="E-Commerce Platform",       is_read=True,  created_at=dt(-50)),
            Notification(user_id=youssef.id, notification_type="joined_project",        title="Welcome to Hospital Management System", message="You have been added to Hospital Management System as a participant.",                         actor_name="Ahmed Hassan",  actor_email="ahmed.hassan@gmail.com",   project_id=p2.id, project_name="Hospital Management System", is_read=True,  created_at=dt(-43)),
            Notification(user_id=nadia.id,   notification_type="requirements_approved", title="Requirements Approved",                 message="The requirements for 'Patient Management Requirements' have been approved.",                  actor_name="Ahmed Hassan",  actor_email="ahmed.hassan@gmail.com",   project_id=p2.id, project_name="Hospital Management System", session_id=s2_1.id, is_read=False, created_at=dt(-40)),
            Notification(user_id=omar.id,    notification_type="joined_project",        title="Welcome to University Learning Portal", message="You have been added to University Learning Portal as a participant.",                        actor_name="Sara Khalid",   actor_email="sara.khalid@outlook.com",  project_id=p3.id, project_name="University Learning Portal", is_read=True,  created_at=dt(-37)),
            Notification(user_id=lina.id,    notification_type="joined_project",        title="Welcome to University Learning Portal", message="You have been added to University Learning Portal as a participant.",                        actor_name="Sara Khalid",   actor_email="sara.khalid@outlook.com",  project_id=p3.id, project_name="University Learning Portal", is_read=True,  created_at=dt(-37)),
            Notification(user_id=sara.id,    notification_type="joined_project",        title="Welcome to Smart Inventory Tracker",    message="You have been added to Smart Inventory Tracker as a participant.",                           actor_name="Youssef Adel",  actor_email="youssef.adel@gmail.com",   project_id=p4.id, project_name="Smart Inventory Tracker",   is_read=False, created_at=dt(-26)),
            Notification(user_id=nadia.id,   notification_type="joined_project",        title="Welcome to Smart Inventory Tracker",    message="You have been added to Smart Inventory Tracker as a participant.",                           actor_name="Youssef Adel",  actor_email="youssef.adel@gmail.com",   project_id=p4.id, project_name="Smart Inventory Tracker",   is_read=True,  created_at=dt(-27)),
            Notification(user_id=admin.id,   notification_type="user_suspended",        title="User Account Suspended",                message="Mona Taha (mona.taha@gmail.com) has been suspended for community guideline violations.",     actor_name="System Admin",  actor_email=None,                       is_read=True,  created_at=dt(-15)),
            Notification(user_id=admin.id,   notification_type="user_pending",          title="New User Pending Approval",             message="Kareem Samy (kareem.samy@outlook.com) has registered and is awaiting activation.",           actor_name="System",        actor_email=None,                       is_read=False, created_at=dt(-5)),
            Notification(user_id=ahmed.id,   notification_type="invitation_response",   title="Invitation Accepted",                   message="Rania Ibrahim has accepted the invitation to join Hospital Management System.",              actor_name="Rania Ibrahim", actor_email="rania.ibrahim@gmail.com",  project_id=p2.id, project_name="Hospital Management System", is_read=True,  created_at=dt(-29)),
        ])

        # ═══════════════════════════════════════════════════════════════════
        # EXTENDED DATA — additional users, project, sessions, artifacts, logs
        # ═══════════════════════════════════════════════════════════════════

        # ── 16. Two more active users ───────────────────────────────────────
        tarek = User(email="tarek.mansour@gmail.com",  hashed_password=PASS, full_name="Tarek Mansour",  role="user", status="active", created_at=dt(-22), avatar_url="https://api.dicebear.com/7.x/initials/svg?seed=TarekMansour")
        dina  = User(email="dina.selim@outlook.com",   hashed_password=PASS, full_name="Dina Selim",     role="user", status="active", created_at=dt(-20), avatar_url="https://api.dicebear.com/7.x/initials/svg?seed=DinaSelim")
        db.add_all([tarek, dina])
        db.flush()

        # ── 17. Fifth project: FinTech ──────────────────────────────────────
        p5 = Project(name="FinTech Mobile Banking App", description="Challenger bank mobile app for young professionals: instant account opening, zero-fee international transfers, and AI-driven spending insights.", domain="Finance", project_status="in_progress", created_at=dt(-19))
        db.add(p5)
        db.flush()

        # ── 18. P5 memberships ──────────────────────────────────────────────
        db.add_all([
            ProjectMembership(project_id=p5.id, user_id=sara.id,   role="project_manager", joined_at=dt(-19)),
            ProjectMembership(project_id=p5.id, user_id=tarek.id,  role="participant",     joined_at=dt(-18)),
            ProjectMembership(project_id=p5.id, user_id=dina.id,   role="participant",     joined_at=dt(-18)),
            ProjectMembership(project_id=p5.id, user_id=rania.id,  role="participant",     joined_at=dt(-17)),
        ])
        db.flush()

        # ── 19. New invitations ─────────────────────────────────────────────
        db.add_all([
            Invitation(project_id=p5.id, invitee_user_id=omar.id,  invited_by_user_id=sara.id,   project_domain="Finance", status="pending",  created_at=dt(-2)),
            Invitation(project_id=p4.id, invitee_user_id=tarek.id, invited_by_user_id=youssef.id, project_domain="Manufacturing", status="accepted", created_at=dt(-10), actioned_at=dt(-9)),
        ])
        db.flush()

        # ── 20. Six new sessions ────────────────────────────────────────────
        s1_3 = Session(title="Security & Performance Architecture",      project_id=p1.id, status="in_progress", transcript_text=ECOM_TRANSCRIPT_S3,    detected_language="english", created_at=dt(-30))
        s2_3 = Session(title="Billing & Financial Reporting",            project_id=p2.id, status="in_progress", transcript_text=HOSPITAL_TRANSCRIPT_S3, detected_language="english", created_at=dt(-28))
        s3_2 = Session(title="Assessment Engine & Grading System",       project_id=p3.id, status="in_progress", transcript_text=LMS_TRANSCRIPT_S2,      detected_language="english", created_at=dt(-25))
        s4_2 = Session(title="Analytics & SAP ERP Integration Planning", project_id=p4.id, status="in_progress", transcript_text=INV_TRANSCRIPT_S2,      detected_language="english", created_at=dt(-18))
        s5_1 = Session(title="Core Banking Features Planning",           project_id=p5.id, status="in_progress", transcript_text=FINTECH_TRANSCRIPT_S1,  detected_language="english", created_at=dt(-17))
        s5_2 = Session(title="Security, Compliance & Fraud Prevention",  project_id=p5.id, status="in_progress", transcript_text=FINTECH_TRANSCRIPT_S2,  detected_language="english", created_at=dt(-10))

        db.add_all([s1_3, s2_3, s3_2, s4_2, s5_1, s5_2])
        db.flush()

        # ── 21. New session memberships ─────────────────────────────────────
        db.add_all([
            # P1 session 3
            SessionMembership(session_id=s1_3.id, user_id=ahmed.id,   role="project_manager"),
            SessionMembership(session_id=s1_3.id, user_id=omar.id,    role="participant"),
            SessionMembership(session_id=s1_3.id, user_id=rania.id,   role="participant"),
            # P2 session 3
            SessionMembership(session_id=s2_3.id, user_id=ahmed.id,   role="project_manager"),
            SessionMembership(session_id=s2_3.id, user_id=youssef.id, role="participant"),
            SessionMembership(session_id=s2_3.id, user_id=nadia.id,   role="participant"),
            # P3 session 2
            SessionMembership(session_id=s3_2.id, user_id=sara.id,    role="project_manager"),
            SessionMembership(session_id=s3_2.id, user_id=omar.id,    role="participant"),
            SessionMembership(session_id=s3_2.id, user_id=lina.id,    role="participant"),
            # P4 session 2
            SessionMembership(session_id=s4_2.id, user_id=youssef.id, role="project_manager"),
            SessionMembership(session_id=s4_2.id, user_id=nadia.id,   role="participant"),
            SessionMembership(session_id=s4_2.id, user_id=sara.id,    role="participant"),
            # P5 session 1
            SessionMembership(session_id=s5_1.id, user_id=sara.id,    role="project_manager"),
            SessionMembership(session_id=s5_1.id, user_id=tarek.id,   role="participant"),
            SessionMembership(session_id=s5_1.id, user_id=dina.id,    role="participant"),
            # P5 session 2
            SessionMembership(session_id=s5_2.id, user_id=sara.id,    role="project_manager"),
            SessionMembership(session_id=s5_2.id, user_id=tarek.id,   role="participant"),
            SessionMembership(session_id=s5_2.id, user_id=dina.id,    role="participant"),
            SessionMembership(session_id=s5_2.id, user_id=rania.id,   role="participant"),
        ])
        db.flush()

        # ── 22. New transcript segments ─────────────────────────────────────
        add_segments(db, s1_3.id, ECOM_S3_SEGS)
        add_segments(db, s5_1.id, FINTECH_S1_SEGS)
        add_segments(db, s5_2.id, FINTECH_S2_SEGS)
        db.flush()

        # ── 23. New requirement runs + session requirements ──────────────────
        run7,  sr7  = make_run(p1.id, s1_3.id, "hybrid", ECOM_REQS,      -29)
        run8,  sr8  = make_run(p2.id, s2_3.id, "hybrid", HOSPITAL_REQS,  -27)
        run9,  sr9  = make_run(p3.id, s3_2.id, "llm",    LMS_REQS,       -24)
        run10, sr10 = make_run(p4.id, s4_2.id, "hybrid", INVENTORY_REQS, -17)
        run11, sr11 = make_run(p5.id, s5_1.id, "hybrid", FINTECH_REQS,   -16)
        run12, sr12 = make_run(p5.id, s5_2.id, "llm",    FINTECH_REQS,   -9)

        # Approved state for ecom s3 and hospital s3; pending for rest
        sr7.approval_status  = "approved"
        sr8.approval_status  = "approved"
        sr9.approval_status  = "approved"
        sr10.approval_status = "pending approval"
        sr11.approval_status = "approved"
        sr12.approval_status = "pending approval"
        db.flush()

        # Updated project requirement versions
        pr1_v3 = ProjectRequirement(project_id=p1.id, aggregated_req_json=ECOM_REQS,      approval_status="approved",         version=3, created_at=dt(-28))
        pr2_v2 = ProjectRequirement(project_id=p2.id, aggregated_req_json=HOSPITAL_REQS,  approval_status="approved",         version=2, created_at=dt(-26))
        pr3_v2 = ProjectRequirement(project_id=p3.id, aggregated_req_json=LMS_REQS,       approval_status="approved",         version=2, created_at=dt(-23))
        pr5    = ProjectRequirement(project_id=p5.id, aggregated_req_json=FINTECH_REQS,   approval_status="approved",         version=1, created_at=dt(-15))
        db.add_all([pr1_v3, pr2_v2, pr3_v2, pr5])
        db.flush()

        # ── 24. New artifacts ───────────────────────────────────────────────
        a_ecom_srs_v2 = Artifact(project_id=p1.id, session_id=s1_3.id, artifact_type_id=at_srs.id,     file_path="artifacts/p1/srs_v2.pdf",          version="v2", approval_status="approved", created_at=dt(-28))
        a_ecom_seq    = Artifact(project_id=p1.id, session_id=s1_3.id, artifact_type_id=at_seq.id,     file_path="artifacts/p1/uml_sequence_v1.png",  version="v1", approval_status="approved", created_at=dt(-27))
        a_hosp_cls    = Artifact(project_id=p2.id, session_id=s2_3.id, artifact_type_id=at_class.id,   file_path="artifacts/p2/uml_class_v1.png",     version="v1", approval_status="pending",  created_at=dt(-26))
        a_lms_uc      = Artifact(project_id=p3.id, session_id=s3_2.id, artifact_type_id=at_usecase.id, file_path="artifacts/p3/uml_usecase_v1.png",   version="v1", approval_status="approved", created_at=dt(-23))
        a_ft_srs      = Artifact(project_id=p5.id, session_id=s5_1.id, artifact_type_id=at_srs.id,     file_path="artifacts/p5/srs_v1.pdf",           version="v1", approval_status="approved", created_at=dt(-14))
        a_ft_uc       = Artifact(project_id=p5.id, session_id=s5_2.id, artifact_type_id=at_usecase.id, file_path="artifacts/p5/uml_usecase_v1.png",   version="v1", approval_status="pending",  created_at=dt(-8))

        db.add_all([a_ecom_srs_v2, a_ecom_seq, a_hosp_cls, a_lms_uc, a_ft_srs, a_ft_uc])
        db.flush()

        # ── 25. Additional session-level approvals ──────────────────────────
        db.add_all([
            Approval(session_id=s1_3.id, user_id=ahmed.id, feature="transcript",   aproved_at=dt(-29)),
            Approval(session_id=s1_3.id, user_id=ahmed.id, feature="requirements", aproved_at=dt(-28), version_id=sr7.id),
            Approval(session_id=s1_3.id, user_id=ahmed.id, feature="srs",          aproved_at=dt(-28), version_id=a_ecom_srs_v2.id),
            Approval(session_id=s2_3.id, user_id=ahmed.id, feature="transcript",   aproved_at=dt(-27)),
            Approval(session_id=s2_3.id, user_id=ahmed.id, feature="requirements", aproved_at=dt(-27), version_id=sr8.id),
            Approval(session_id=s3_2.id, user_id=sara.id,  feature="transcript",   aproved_at=dt(-24)),
            Approval(session_id=s3_2.id, user_id=sara.id,  feature="requirements", aproved_at=dt(-23), version_id=sr9.id),
            Approval(session_id=s3_2.id, user_id=sara.id,  feature="uml",          aproved_at=dt(-23), version_id=a_lms_uc.id),
            Approval(session_id=s5_1.id, user_id=sara.id,  feature="transcript",   aproved_at=dt(-16)),
            Approval(session_id=s5_1.id, user_id=sara.id,  feature="requirements", aproved_at=dt(-15), version_id=sr11.id),
            Approval(session_id=s5_1.id, user_id=sara.id,  feature="srs",          aproved_at=dt(-14), version_id=a_ft_srs.id),
        ])

        # Additional project-level approvals
        db.add_all([
            ProjectApproval(project_id=p1.id, user_id=ahmed.id, feature="requirements", version_id=pr1_v3.id, approved_at=dt(-27)),
            ProjectApproval(project_id=p1.id, user_id=ahmed.id, feature="srs",          version_id=a_ecom_srs_v2.id, approved_at=dt(-28)),
            ProjectApproval(project_id=p2.id, user_id=ahmed.id, feature="requirements", version_id=pr2_v2.id, approved_at=dt(-26)),
            ProjectApproval(project_id=p3.id, user_id=sara.id,  feature="requirements", version_id=pr3_v2.id, approved_at=dt(-23)),
            ProjectApproval(project_id=p3.id, user_id=sara.id,  feature="uml",          version_id=a_lms_uc.id, approved_at=dt(-23)),
            ProjectApproval(project_id=p5.id, user_id=sara.id,  feature="requirements", version_id=pr5.id, approved_at=dt(-15)),
            ProjectApproval(project_id=p5.id, user_id=sara.id,  feature="srs",          version_id=a_ft_srs.id, approved_at=dt(-14)),
        ])
        db.flush()

        # ── 26. More notifications ──────────────────────────────────────────
        db.add_all([
            # FinTech project — new members
            Notification(user_id=tarek.id, notification_type="joined_project",        title="Welcome to FinTech Mobile Banking App",  message="You have been added to FinTech Mobile Banking App as a participant.",                  actor_name="Sara Khalid",   actor_email="sara.khalid@outlook.com",  project_id=p5.id, project_name="FinTech Mobile Banking App",  is_read=True,  created_at=dt(-18)),
            Notification(user_id=dina.id,  notification_type="joined_project",        title="Welcome to FinTech Mobile Banking App",  message="You have been added to FinTech Mobile Banking App as a participant.",                  actor_name="Sara Khalid",   actor_email="sara.khalid@outlook.com",  project_id=p5.id, project_name="FinTech Mobile Banking App",  is_read=True,  created_at=dt(-18)),
            Notification(user_id=rania.id, notification_type="joined_project",        title="Welcome to FinTech Mobile Banking App",  message="You have been added to FinTech Mobile Banking App as a participant.",                  actor_name="Sara Khalid",   actor_email="sara.khalid@outlook.com",  project_id=p5.id, project_name="FinTech Mobile Banking App",  is_read=False, created_at=dt(-17)),
            # FinTech — requirements and SRS
            Notification(user_id=tarek.id, notification_type="requirements_approved", title="Requirements Approved",                  message="The requirements for 'Core Banking Features Planning' have been approved.",             actor_name="Sara Khalid",   actor_email="sara.khalid@outlook.com",  project_id=p5.id, project_name="FinTech Mobile Banking App",  session_id=s5_1.id, is_read=True,  created_at=dt(-15)),
            Notification(user_id=dina.id,  notification_type="srs_generated",         title="SRS Document Generated",                 message="A new SRS has been generated for FinTech Mobile Banking App.",                         actor_name="System",        actor_email=None,                       project_id=p5.id, project_name="FinTech Mobile Banking App",  is_read=True,  created_at=dt(-14)),
            Notification(user_id=tarek.id, notification_type="srs_generated",         title="SRS Document Generated",                 message="A new SRS has been generated for FinTech Mobile Banking App.",                         actor_name="System",        actor_email=None,                       project_id=p5.id, project_name="FinTech Mobile Banking App",  is_read=False, created_at=dt(-14)),
            # E-Commerce — updated SRS
            Notification(user_id=omar.id,  notification_type="srs_generated",         title="Updated SRS (v2) Generated",             message="A revised SRS v2 has been generated for E-Commerce Platform after the security review.", actor_name="System",        actor_email=None,                       project_id=p1.id, project_name="E-Commerce Platform",        is_read=False, created_at=dt(-28)),
            Notification(user_id=rania.id, notification_type="requirements_approved", title="Requirements Approved",                  message="The requirements for 'Security & Performance Architecture' have been approved.",        actor_name="Ahmed Hassan",  actor_email="ahmed.hassan@gmail.com",   project_id=p1.id, project_name="E-Commerce Platform",        session_id=s1_3.id, is_read=True,  created_at=dt(-28)),
            # Hospital — billing session
            Notification(user_id=youssef.id, notification_type="requirements_approved", title="Requirements Approved",               message="The requirements for 'Billing & Financial Reporting' have been approved.",              actor_name="Ahmed Hassan",  actor_email="ahmed.hassan@gmail.com",   project_id=p2.id, project_name="Hospital Management System",  session_id=s2_3.id, is_read=False, created_at=dt(-27)),
            # Admin — new pending users / invitations
            Notification(user_id=admin.id, notification_type="user_activated",        title="User Account Activated",                 message="Rania Ibrahim's account has been activated by the admin.",                              actor_name="System Admin",  actor_email=None,                       is_read=True,  created_at=dt(-35)),
            # Omar — pending invite to FinTech
            Notification(user_id=omar.id,  notification_type="invitation_received",   title="Project Invitation",                     message="You have been invited to join the FinTech Mobile Banking App project by Sara Khalid.",  actor_name="Sara Khalid",   actor_email="sara.khalid@outlook.com",  project_id=p5.id, project_name="FinTech Mobile Banking App",  is_read=False, created_at=dt(-2)),
            # LMS — updated requirements
            Notification(user_id=lina.id,  notification_type="requirements_approved", title="Requirements Approved",                  message="The requirements for 'Assessment Engine & Grading System' have been approved.",         actor_name="Sara Khalid",   actor_email="sara.khalid@outlook.com",  project_id=p3.id, project_name="University Learning Portal",  session_id=s3_2.id, is_read=True,  created_at=dt(-23)),
        ])
        db.flush()

        # ── 27. Audit logs ──────────────────────────────────────────────────
        db.add_all([
            AuditLog(user_id=admin.id,    project_id=None,    action="USER_STATUS_CHANGED",    entity="User",              entity_id=mona.id,     details={"from": "active", "to": "suspended", "reason": "Violated community guidelines"},  created_at=dt(-15)),
            AuditLog(user_id=admin.id,    project_id=None,    action="USER_STATUS_CHANGED",    entity="User",              entity_id=rania.id,    details={"from": "pending", "to": "active"},                                                created_at=dt(-35)),
            AuditLog(user_id=ahmed.id,    project_id=p1.id,   action="PROJECT_CREATED",        entity="Project",           entity_id=p1.id,       details={"name": "E-Commerce Platform", "domain": "E-Commerce"},                           created_at=dt(-54)),
            AuditLog(user_id=ahmed.id,    project_id=p1.id,   action="SESSION_CREATED",        entity="Session",           entity_id=s1_1.id,     details={"title": "Kickoff & Requirements Elicitation"},                                   created_at=dt(-50)),
            AuditLog(user_id=ahmed.id,    project_id=p1.id,   action="REQUIREMENTS_APPROVED",  entity="SessionRequirement",entity_id=sr1.id,      details={"version": 1, "session_title": "Kickoff & Requirements Elicitation"},             created_at=dt(-48)),
            AuditLog(user_id=ahmed.id,    project_id=p1.id,   action="ARTIFACT_APPROVED",      entity="Artifact",          entity_id=a_ecom_srs.id, details={"artifact_type": "SRS", "version": "v1"},                                     created_at=dt(-47)),
            AuditLog(user_id=sara.id,     project_id=p3.id,   action="PROJECT_CREATED",        entity="Project",           entity_id=p3.id,       details={"name": "University Learning Portal", "domain": "Education"},                    created_at=dt(-38)),
            AuditLog(user_id=sara.id,     project_id=p5.id,   action="PROJECT_CREATED",        entity="Project",           entity_id=p5.id,       details={"name": "FinTech Mobile Banking App", "domain": "Finance"},                      created_at=dt(-19)),
            AuditLog(user_id=sara.id,     project_id=p5.id,   action="MEMBER_INVITED",         entity="ProjectMembership", entity_id=tarek.id,    details={"invitee": "tarek.mansour@gmail.com", "role": "participant"},                    created_at=dt(-18)),
            AuditLog(user_id=youssef.id,  project_id=p4.id,   action="PROJECT_CREATED",        entity="Project",           entity_id=p4.id,       details={"name": "Smart Inventory Tracker", "domain": "Manufacturing"},                   created_at=dt(-28)),
            AuditLog(user_id=ahmed.id,    project_id=p2.id,   action="SESSION_CREATED",        entity="Session",           entity_id=s2_1.id,     details={"title": "Patient Management Requirements"},                                      created_at=dt(-42)),
            AuditLog(user_id=sara.id,     project_id=p5.id,   action="REQUIREMENTS_APPROVED",  entity="ProjectRequirement",entity_id=pr5.id,      details={"version": 1, "req_count": len(FINTECH_REQS["functional"]) + len(FINTECH_REQS["non_functional"])}),
        ])
        db.flush()

        # ── 28. Background tasks ────────────────────────────────────────────
        db.add_all([
            BackgroundTask(user_id=ahmed.id,   task_type="extract_requirements", project_id=p1.id, session_id=s1_1.id, status="done",        task_input={"engine": "hybrid", "session_id": s1_1.id}, task_output={"session_req_id": sr1.id},  created_at=dt(-49)),
            BackgroundTask(user_id=ahmed.id,   task_type="generate_srs",         project_id=p1.id, session_id=s1_1.id, status="done",        task_input={"project_req_id": pr1.id},                  task_output={"artifact_id": a_ecom_srs.id}, created_at=dt(-48)),
            BackgroundTask(user_id=sara.id,    task_type="extract_requirements", project_id=p5.id, session_id=s5_1.id, status="done",        task_input={"engine": "hybrid", "session_id": s5_1.id}, task_output={"session_req_id": sr11.id}, created_at=dt(-16)),
            BackgroundTask(user_id=sara.id,    task_type="generate_srs",         project_id=p5.id, session_id=s5_1.id, status="done",        task_input={"project_req_id": pr5.id},                  task_output={"artifact_id": a_ft_srs.id},  created_at=dt(-14)),
            BackgroundTask(user_id=sara.id,    task_type="generate_uml",         project_id=p5.id, session_id=s5_2.id, status="in_progress", task_input={"diagram_type": "UML_USECASE", "session_id": s5_2.id}, task_output=None,            created_at=dt(-1)),
            BackgroundTask(user_id=youssef.id, task_type="extract_requirements", project_id=p4.id, session_id=s4_2.id, status="pending",     task_input={"engine": "llm", "session_id": s4_2.id},    task_output=None,                        created_at=dt(-0.5)),
            BackgroundTask(user_id=ahmed.id,   task_type="generate_uml",         project_id=p2.id, session_id=s2_3.id, status="failed",      task_input={"diagram_type": "UML_CLASS", "session_id": s2_3.id}, task_output=None, error_message="LLM timeout after 60s — please retry", created_at=dt(-26)),
        ])
        db.flush()

        # ── 29. Project leave requests ──────────────────────────────────────
        db.add_all([
            ProjectLeaveRequest(project_id=p1.id, user_id=lina.id,    role_at_request="participant", status="pending",  created_at=dt(-1)),
            ProjectLeaveRequest(project_id=p3.id, user_id=omar.id,    role_at_request="participant", status="approved", resolved_at=dt(-10), resolved_by_id=sara.id, created_at=dt(-12)),
            ProjectLeaveRequest(project_id=p2.id, user_id=nadia.id,   role_at_request="participant", status="rejected", rejection_reason="Critical session in progress — please wait until the billing sprint ends.", resolved_at=dt(-5), resolved_by_id=ahmed.id, created_at=dt(-7)),
        ])

        db.commit()

        # ── Summary ─────────────────────────────────────────────────────────
        print("Seed completed successfully!")
        print()
        print("Accounts (password for all: Demo@1234)")
        print("  admin@talk2system.com            — admin,     active")
        print("  ahmed.hassan@gmail.com           — user (PM), active   [PM: E-Commerce, Hospital]")
        print("  sara.khalid@outlook.com          — user (PM), active   [PM: LMS, FinTech]")
        print("  youssef.adel@gmail.com           — user (PM), active   [PM: Inventory]")
        print("  omar.nabil@gmail.com             — user,      active")
        print("  lina.mostafa@outlook.com         — user,      active")
        print("  nadia.fahmy@gmail.com            — user,      active")
        print("  rania.ibrahim@gmail.com          — user,      active")
        print("  tarek.mansour@gmail.com          — user,      active")
        print("  dina.selim@outlook.com           — user,      active")
        print("  kareem.samy@outlook.com          — user,      pending")
        print("  mona.taha@gmail.com              — user,      suspended")
        print()
        print("Projects (5):")
        print("  E-Commerce Platform | Hospital Management System | University Learning Portal")
        print("  Smart Inventory Tracker | FinTech Mobile Banking App")
        print()
        print("Sessions (12), Requirement runs (12), Project requirements (8),")
        print("Artifacts (13), Approvals (22 session + 12 project),")
        print("Notifications (25), Audit logs (12), Background tasks (7),")
        print("Project leave requests (3), Invitations (5)")

    except Exception as exc:
        db.rollback()
        print(f"Error — rolled back: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
