

# SnowPro Core Exam Prep App

## Overview
A comprehensive study platform to help Snowflake engineers prepare for and pass the SnowPro Core Certification exam (COF-C02). Features realistic practice tests, study mode, detailed explanations, and progress tracking — all behind user accounts with cloud-saved data.

---

## Pages & Features

### 1. Landing Page
- Clean, professional hero section explaining the app's purpose
- Key stats: 100-question timed tests, 5 domains, scaled scoring
- Call-to-action buttons: **Sign Up** / **Log In** / **Start Studying**

### 2. Authentication (Sign Up / Log In)
- Email + password authentication via Supabase
- User profile with display name
- Protected routes — must be logged in to access tests and progress

### 3. Dashboard (Home after login)
- Overview cards: tests taken, average score, pass/fail rate
- Domain breakdown chart showing strengths and weaknesses across all 5 domains
- Quick-start buttons: **Start Practice Test** or **Enter Study Mode**
- Recent test history with scores

### 4. Practice Test Mode (Exam Simulation)
- **100 questions** per test, drawn from your provided question bank
- Mix of **multiple choice** (single answer) and **multiple select** (pick 2+)
- Questions weighted by domain to match real exam distribution:
  - AI Data Cloud Features & Architecture — ~31 questions
  - Account Management & Data Governance — ~20 questions
  - Data Loading, Unloading & Connectivity — ~18 questions
  - Performance Optimization, Querying & Transformation — ~21 questions
  - Data Collaboration — ~10 questions
- **115-minute countdown timer** visible at all times
- Question navigator panel to jump between questions and see flagged/answered status
- Ability to **flag questions** for review
- Auto-submit when timer expires
- **Scaled scoring (0–1000)** with 750+ as passing
- Cannot see answers until test is submitted

### 5. Study Mode
- Untimed, relaxed practice
- Choose specific domains to focus on, or study all
- After answering each question, immediately see if you're correct
- Detailed explanation shown per question
- No formal scoring — just learn at your own pace

### 6. Test Results & Review
- Score displayed with pass/fail indicator (750+ = pass)
- Breakdown by domain showing percentage correct in each
- Full question-by-question review:
  - Your answer vs. correct answer
  - Detailed explanation for every question
- Option to retake or start a new test

### 7. Progress Tracking
- Score history over time (line chart)
- Domain-level performance heatmap — easily see weak areas
- Total questions answered, accuracy rate, tests completed
- Track improvement trends

### 8. Question Bank Management
- You'll provide questions (via JSON/CSV upload or we'll seed them into the database)
- Each question includes: domain, question text, answer options, correct answer(s), explanation, question type (single/multi)
- Questions stored in Supabase for easy updates

---

## Backend (Supabase)
- **Auth**: Email/password user accounts
- **Database tables**: profiles, questions, test_attempts, test_answers, study_progress
- **Row-Level Security**: Users can only access their own data
- **Scaled scoring logic**: Implemented in the app based on domain weights

---

## Design Style
- Clean, modern UI with a professional feel (think certification prep platform)
- Snowflake-inspired color palette (blue/teal accents on white)
- Responsive — works on desktop and tablet for studying on the go

