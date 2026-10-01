# QA Test Cases - User Management Module

## Overview
This document contains comprehensive QA test cases for the User Management module in the DTRS-DOST system. The module handles user creation, editing, deactivation, reactivation, and password reset operations with role-based access control.

---

## Module Scope
- **Add User** (POST /user/new)
- **Edit User** (PUT /user/:id)
- **Deactivate User**
- **Reactivate User**
- **Reset User Password**
- **List Users** with filtering and pagination

---

# PART A: FORM VALIDATION TEST CASES

## A.1: Required Field Validation - Add User

### TC-A1.1: Empty Full Name
**Precondition:** Add User modal is open with empty form
**Steps:**
1. Leave "Full Name" field empty
2. Fill all other required fields (Email, Role, Password)
3. Click "Add User" button

**Expected Result:** Error message "Name is required." appears below Full Name field
**Data:** name=""

---

### TC-A1.2: Empty Email Field
**Precondition:** Add User modal is open
**Steps:**
1. Fill Full Name field
2. Leave Email field empty
3. Fill Role and Password
4. Click "Add User"

**Expected Result:** Error message "Email is required." appears below Email field
**Data:** email=""

---

### TC-A1.3: Empty Role Selection
**Precondition:** Add User modal is open
**Steps:**
1. Fill Full Name and Email
2. Leave Role dropdown blank
3. Fill Password
4. Click "Add User"

**Expected Result:** Error message "Role is required." appears below Role dropdown
**Data:** role=""

---

### TC-A1.4: Empty Password Field
**Precondition:** Add User modal is open
**Steps:**
1. Fill Name, Email, Role
2. Leave Password empty
3. Click "Add User"

**Expected Result:** Error message "Password is required." appears below Password field
**Data:** password=""

---

### TC-A1.5: Empty Division for Division Role
**Precondition:** Add User modal is open with Division role selected
**Steps:**
1. Fill Name, Email, Password
2. Select "Division" as Role
3. Leave Division field empty
4. Click "Add User"

**Expected Result:** Error message "Division is required." appears below Division field
**Data:** role="Division", division=""

---

## A.2: Email Validation - Add User

### TC-A2.1: Invalid Email Format - Missing @ Symbol
**Precondition:** Add User modal is open
**Steps:**
1. Fill Name, Role, Password
2. Enter email without @ symbol: "user123gmail.com"
3. Click "Add User"

**Expected Result:** Error message "Enter a valid email." appears
**Data:** email="user123gmail.com"

---

### TC-A2.2: Invalid Email Format - Missing Domain Extension
**Precondition:** Add User modal is open
**Steps:**
1. Fill required fields
2. Enter email: "user@domain"
3. Click "Add User"

**Expected Result:** Error message "Enter a valid email." appears
**Data:** email="user@domain"

---

### TC-A2.3: Invalid Email Format - Multiple @ Symbols
**Precondition:** Add User modal is open
**Steps:**
1. Fill required fields
2. Enter email: "user@@domain.com"
3. Click "Add User"

**Expected Result:** Error message "Enter a valid email." appears
**Data:** email="user@@domain.com"

---

### TC-A2.4: Valid Email Format - Government Domain
**Precondition:** Add User modal is open
**Steps:**
1. Fill Name, Role, Password
2. Enter email: "user@peo.gov.ph"
3. Click "Add User"

**Expected Result:** No validation error, form proceeds to submission
**Data:** email="user@peo.gov.ph"

---

### TC-A2.5: Valid Email Format - Standard Domain
**Precondition:** Add User modal is open
**Steps:**
1. Fill required fields
2. Enter email: "juan.dela.cruz@example.com"
3. Click "Add User"

**Expected Result:** No validation error, form accepts the email
**Data:** email="juan.dela.cruz@example.com"

---

## A.3: Form Trimming and Optional Fields - Add User

### TC-A3.1: Whitespace-Only Name Field
**Precondition:** Add User modal is open
**Steps:**
1. Enter only spaces in Name field: "   "
2. Fill Email, Role, Password
3. Click "Add User"

**Expected Result:** Error message "Name is required." appears (trimmed whitespace = empty)
**Data:** name="   "

---

### TC-A3.2: Optional Position Field Empty
**Precondition:** Add User modal is open with valid required fields
**Steps:**
1. Leave Position field empty
2. Fill Name, Email, Role, Password
3. Click "Add User"

**Expected Result:** Form submits successfully, position is optional
**Data:** position=""

---

### TC-A3.3: Optional Contact Field Empty
**Precondition:** Add User modal is open
**Steps:**
1. Leave Contact Number field empty
2. Fill Name, Email, Role, Password
3. Click "Add User"

**Expected Result:** Form submits successfully, contact is optional
**Data:** contact=""

---

### TC-A3.4: Optional Position Field with Whitespace
**Precondition:** Add User modal is open with valid data
**Steps:**
1. Enter only spaces in Position: "   "
2. Fill other required fields
3. Click "Add User"

**Expected Result:** Form submits with position as undefined/null (trimmed)
**Data:** position="   "

---

### TC-A3.5: Optional Contact with Whitespace
**Precondition:** Add User modal is open with valid data
**Steps:**
1. Enter only spaces in Contact: "   "
2. Fill other required fields
3. Click "Add User"

**Expected Result:** Form submits with contact_number as undefined/null (trimmed)
**Data:** contact="   "

---

## A.4: Edit User Validation

### TC-A4.1: Edit - Empty Name
**Precondition:** Edit User modal is open with existing user data
**Steps:**
1. Clear the Full Name field
2. Click "Save Changes"

**Expected Result:** Error message "Name is required." appears
**Data:** name=""

---

### TC-A4.2: Edit - Invalid Email on Update
**Precondition:** Edit User modal is open
**Steps:**
1. Keep valid name and role
2. Change email to invalid format: "notanemail"
3. Click "Save Changes"

**Expected Result:** Error message "Enter a valid email." appears
**Data:** email="notanemail"

---

### TC-A4.3: Edit - Empty Division for Division Role
**Precondition:** Edit User modal for Division role user
**Steps:**
1. User has role="Division" with division="Highway Division"
2. Clear Division field
3. Click "Save Changes"

**Expected Result:** Error message "Division is required." appears
**Data:** division=""

---

### TC-A4.4: Edit - Change from Non-Division to Division Role
**Precondition:** Edit User modal with user currently having Admin role
**Steps:**
1. Change Role from "Admin" to "Division"
2. Leave Division field empty
3. Click "Save Changes"

**Expected Result:** Error message "Division is required." appears
**Data:** role="Division", division=""

---

### TC-A4.5: Edit - No Changes, Save Button Click
**Precondition:** Edit User modal with existing data loaded
**Steps:**
1. Open modal with user data
2. Make no changes to any field
3. Click "Save Changes"

**Expected Result:** Modal closes without API call (onClose triggered), success toast shown
**Behavior:** buildChangedPayload returns empty object, API is not called

---

## A.5: Password Generation and Display

### TC-A5.1: Generate Password - Default Format
**Precondition:** Add User modal is open with Name="Juan dela Cruz"
**Steps:**
1. Click "Generate Password" button
2. Verify password field is populated

**Expected Result:** Password follows format: `{FirstName}@Dtrs.{RandomWord}{6DigitCode}`
**Example:** `Juan@Dtrs.Cloud12345` or `Juan@Dtrs.Mango98765`
**Expected Pattern:** `/^[A-Z][a-z]+@Dtrs\.(Mango|River|Cloud|Paper|Forest)\d{6}$/`

---

### TC-A5.2: Generate Password - Auto-Select Password Field
**Precondition:** Add User modal with password field focused
**Steps:**
1. Click "Generate Password" button
2. Verify password appears and is auto-selected

**Expected Result:** Password text is selected (requestAnimationFrame ensures DOM update), ready to copy
**Data:** Password should be highlighted/selected in input field

---

### TC-A5.3: Copy Password to Clipboard
**Precondition:** Add User modal with generated password
**Steps:**
1. Click "Generate Password"
2. Click copy icon next to Password field
3. Paste in notepad to verify

**Expected Result:** Toast message "Password copied to clipboard." appears
**Clipboard Content:** Exact password value

---

### TC-A5.4: Password Visibility Toggle
**Precondition:** Add User modal with generated password
**Steps:**
1. Generate password
2. Click eye icon to hide password
3. Click eye icon again to show

**Expected Result:** 
- Initially visible: password text shows normally
- After click: password masked as dots/asterisks
- After second click: password visible again

---

### TC-A5.5: Copy Password When Empty
**Precondition:** Add User modal with empty password field
**Steps:**
1. Leave Password field empty
2. Click copy icon

**Expected Result:** Copy action is ignored (no clipboard write), no error shown
**Behavior:** Function returns early if !form.password

---

## A.6: User Credentials Modal Display

### TC-A6.1: Credentials Modal After Successful User Creation
**Precondition:** User successfully created via Add User form
**Steps:**
1. Fill and submit Add User form
2. Wait for successful response

**Expected Result:** 
- UserCredentialsModal appears
- Displays created email
- Displays generated password (masked)
- Shows warning message about saving password

---

### TC-A6.2: Credentials Modal - Copy Both Credentials
**Precondition:** Credentials modal is displayed after user creation
**Steps:**
1. Click "Copy both" button
2. Paste in text editor

**Expected Result:** 
- Toast message "Credentials copied to clipboard." appears
- Clipboard contains: "Email: {email}\nPassword: {password}"

---

### TC-A6.3: Credentials Modal - Show/Hide Password
**Precondition:** Credentials modal displayed
**Steps:**
1. Click eye icon on password row
2. Password reveals
3. Click again to hide

**Expected Result:** Password visibility toggles correctly
**Initial State:** Password masked as dots
**After Click:** Password visible

---

### TC-A6.4: Credentials Modal - Close Modal
**Precondition:** Credentials modal displayed
**Steps:**
1. Click "Close" or backdrop outside modal
2. Verify modal closes and Add User modal closes too

**Expected Result:** Modal closes, user is returned to User Management page
**Behavior:** onClose callback is triggered from AddUserModal

---

---

# PART B: FORM STATE AND INTERACTION TEST CASES

## B.1: Form State Management - Add User

### TC-B1.1: Form Field Update Clears Associated Error
**Precondition:** Add User modal showing validation error on Name field
**Steps:**
1. Name field shows error "Name is required."
2. User types in Name field
3. Observe error clearing

**Expected Result:** Error message disappears as user types (onChange handler clears error)
**Behavior:** setErrors removes the specific field error

---

### TC-B1.2: Form Reset to Empty State
**Precondition:** Add User modal is open
**Steps:**
1. Fill all fields: Name, Email, Role, Password
2. Clear form by clicking "Cancel"
3. Open modal again

**Expected Result:** Form returns to EMPTY_FORM state:
- name: ""
- email: ""
- role: ""
- contact: ""
- password: ""
- position: ""

---

### TC-B1.3: Role Change Updates Division Visibility
**Precondition:** Add User modal with Role dropdown
**Steps:**
1. Select "Admin" role
2. Division combobox not visible
3. Change role to "Division"
4. Division combobox appears

**Expected Result:** Division combobox conditionally renders based on role="Division"

---

### TC-B1.4: Non-Division Roles - Division Payload Excluded
**Precondition:** Add User modal with role="Admin"
**Steps:**
1. Fill Name, Email, Password, Position
2. Leave Division field empty (not visible)
3. Submit form

**Expected Result:** 
- division field is undefined in CreateUserPayload
- API payload: {full_name, email, password, role_id, position, contact_number}
- No division key in payload

---

### TC-B1.5: Multiple Field Errors Display Simultaneously
**Precondition:** Add User modal is open
**Steps:**
1. Leave Name empty
2. Enter invalid email "notanemail"
3. Leave Role empty
4. Leave Password empty
5. Click "Add User"

**Expected Result:** All errors display:
- Name: "Name is required."
- Email: "Enter a valid email."
- Role: "Role is required."
- Password: "Password is required."

---

## B.2: Form State Management - Edit User

### TC-B2.1: Form Loaded with User Data
**Precondition:** Opening Edit User modal for existing user
**Steps:**
1. User data: {name: "Juan dela Cruz", email: "juan@peo.gov.ph", role: "Admin", position: "Highway Head"}
2. Modal opens with useEditUserFormModal(initial)
3. Verify all fields populated

**Expected Result:** Form state matches initial user data:
- name: "Juan dela Cruz"
- email: "juan@peo.gov.ph"
- role: "Admin"
- position: "Highway Head"

---

### TC-B2.2: Change Detection - Name Field Change
**Precondition:** Edit User modal loaded with user data
**Steps:**
1. Initial name: "Juan dela Cruz"
2. Change name to "Maria Santos"
3. Click "Save Changes"

**Expected Result:** buildChangedPayload detects change and includes:
- {full_name: "Maria Santos"} in payload

---

### TC-B2.3: Change Detection - Role Field Change
**Precondition:** Edit User modal loaded with role="Admin"
**Steps:**
1. Change role to "Receiver"
2. Click "Save Changes"

**Expected Result:** buildChangedPayload includes:
- {role_id: "3"} (Receiver role ID is 3)

---

### TC-B2.4: No Changes - No API Call
**Precondition:** Edit User modal loaded with user data
**Steps:**
1. Open modal with user data
2. Make no changes to any fields
3. Click "Save Changes"

**Expected Result:** 
- buildChangedPayload returns empty {}
- updateUser.mutate is NOT called
- Modal closes immediately
- No API request sent

---

### TC-B2.5: Partial Update - Only Position Changed
**Precondition:** Edit User modal loaded
**Steps:**
1. Keep Name, Email, Role unchanged
2. Change Position from "Head" to "Officer"
3. Click "Save Changes"

**Expected Result:** Only position in payload:
- {position: "Officer"}
- Other fields not included unless changed

---

### TC-B2.6: Null Handling for Optional Fields
**Precondition:** Edit User modal with optional fields
**Steps:**
1. User initially has position="Highway Head", contact="09xxxxxxxxxx"
2. Clear Position field (or leave whitespace)
3. Click "Save Changes"

**Expected Result:** buildChangedPayload includes:
- {position: null} (trimmed whitespace becomes null)

---

## B.3: Password Input State

### TC-B3.1: Show/Hide Password Toggle State
**Precondition:** Add User modal with generated password
**Steps:**
1. Generate password
2. showPassword state is false
3. Click eye icon
4. showPassword state becomes true
5. Click again

**Expected Result:** 
- Input type toggles between "password" and "text"
- showPassword boolean state toggles correctly

---

### TC-B3.2: Password Copy Success State
**Precondition:** Add User modal with password
**Steps:**
1. Copy password to clipboard
2. Observe toast success message
3. Copy again

**Expected Result:** Toast message appears each time, no error
**State Change:** copied state shows CheckLineIcon briefly

---

### TC-B3.3: Password Ref Auto-Select
**Precondition:** Add User modal open
**Steps:**
1. Call handleGeneratePassword()
2. Password field should be auto-selected

**Expected Result:** requestAnimationFrame ensures password text is selected (passwordRef.current?.select() is called)

---

---

# PART C: ROLE AND PERMISSION TEST CASES

## C.1: Role-Based Form Differences

### TC-C1.1: Admin Role - No Division Field
**Precondition:** Add User modal is open
**Steps:**
1. Select Role: "Admin"
2. Check if Division field is visible

**Expected Result:** Division combobox is NOT rendered
**Visible Fields:** Name, Position, Role, Email, Contact, Password

---

### TC-C1.2: Receiver Role - No Division Field
**Precondition:** Add User modal is open
**Steps:**
1. Select Role: "Receiver"
2. Check Division field visibility

**Expected Result:** Division combobox is NOT rendered
**Visible Fields:** Name, Position, Role, Email, Contact, Password

---

### TC-C1.3: Division Role - Division Field Required
**Precondition:** Add User modal is open
**Steps:**
1. Select Role: "Division"
2. Check if Division field appears

**Expected Result:** Division combobox is rendered and marked required
**Visible Fields:** Name, Position, Role, Division (required), Email, Contact, Password

---

### TC-C1.4: Division Role Change - Division Becomes Optional-to-Required
**Precondition:** Edit User modal for Admin role user
**Steps:**
1. Current role: "Admin" (no division field)
2. Change role to "Division"
3. Check division requirement

**Expected Result:** Division field appears and validation requires it
**Error on Save:** "Division is required." if division is empty

---

### TC-C1.5: Role Description Display - Admin
**Precondition:** Add User modal with role="Admin"
**Steps:**
1. Select Admin role
2. Check description text below role selector

**Expected Result:** Description displays: "System admins who manage users and settings."

---

### TC-C1.6: Role Description Display - Receiver
**Precondition:** Add User modal with role="Receiver"
**Steps:**
1. Select Receiver role
2. Observe description text

**Expected Result:** Description displays: "Updates document receipt and status."

---

### TC-C1.7: Role Description Display - Division
**Precondition:** Add User modal with role="Division"
**Steps:**
1. Select Division role
2. Observe description text

**Expected Result:** Description displays: "Division units that submit and track documents."

---

## C.2: Role ID Mapping

### TC-C2.1: Admin Role ID Mapping
**Precondition:** User selects Admin role in form
**Steps:**
1. Select Role: "Admin"
2. Submit form
3. Check API payload

**Expected Result:** role_id in payload = "2"

---

### TC-C2.2: Receiver Role ID Mapping
**Precondition:** User selects Receiver role
**Steps:**
1. Select Role: "Receiver"
2. Submit form

**Expected Result:** role_id in payload = "3"

---

### TC-C2.3: Division Role ID Mapping
**Precondition:** User selects Division role
**Steps:**
1. Select Role: "Division"
2. Select a division
3. Submit form

**Expected Result:** role_id in payload = "4"

---

---

# PART D: EDGE CASES AND BOUNDARY CONDITIONS

## D.1: Input Length Edge Cases

### TC-D1.1: Maximum Name Length
**Precondition:** Add User modal is open
**Steps:**
1. Enter name with 255 characters (very long name)
2. Fill other required fields
3. Click "Add User"

**Expected Result:** Form submits successfully (typically no explicit length validation in frontend)

---

### TC-D1.2: Special Characters in Name
**Precondition:** Add User modal is open
**Steps:**
1. Enter name: "Juan de la Cruz-López"
2. Fill other required fields
3. Submit form

**Expected Result:** Name with hyphens and special characters submitted successfully

---

### TC-D1.3: Unicode Characters in Name
**Precondition:** Add User modal is open
**Steps:**
1. Enter name: "José María Núñez"
2. Fill other required fields
3. Submit form

**Expected Result:** Form accepts and submits Unicode characters

---

### TC-D1.4: Numbers in Name
**Precondition:** Add User modal is open
**Steps:**
1. Enter name: "Juan2024 Cruz"
2. Fill other fields
3. Submit form

**Expected Result:** Name with numbers is accepted

---

### TC-D1.5: Very Long Email
**Precondition:** Add User modal is open
**Steps:**
1. Enter email: "very.long.email.address.with.many.characters@subdomain.example.com"
2. Verify format is valid
3. Submit form

**Expected Result:** Email is accepted if format is valid

---

### TC-D1.6: Email with Plus Addressing
**Precondition:** Add User modal is open
**Steps:**
1. Enter email: "user+tag@domain.com"
2. Submit form

**Expected Result:** Email with + character accepted (valid format)

---

### TC-D1.7: Email with Dots in Local Part
**Precondition:** Add User modal is open
**Steps:**
1. Enter email: "user.name.with.dots@domain.com"
2. Submit form

**Expected Result:** Email accepted

---

### TC-D1.8: Maximum Position Length
**Precondition:** Add User modal is open
**Steps:**
1. Enter 200+ character position string
2. Fill other required fields
3. Submit form

**Expected Result:** Form accepts long position strings

---

### TC-D1.9: Contact Number with Different Formats
**Precondition:** Add User modal is open
**Steps:**
1. Enter contact: "09173245678" (11 digits)
2. Submit form

**Expected Result:** Contact number accepted (no specific format validation in code)

---

### TC-D1.10: Contact with Hyphens
**Precondition:** Add User modal is open
**Steps:**
1. Enter contact: "0917-3245-678"
2. Submit form

**Expected Result:** Contact with hyphens accepted

---

## D.2: Form State Edge Cases

### TC-D2.1: Rapid Field Changes
**Precondition:** Add User modal is open
**Steps:**
1. Quickly type in Name field: "J", "Ju", "Jua", "Juan"
2. Observe state updates

**Expected Result:** All changes captured, no missed states
**Behavior:** Each onChange updates state and clears error

---

### TC-D2.2: Copy Button When No Password Exists
**Precondition:** Add User modal with password field empty
**Steps:**
1. Leave password empty
2. Click copy icon

**Expected Result:** Copy action returns early, no error, silent fail
**Behavior:** if (!form.password) return;

---

### TC-D2.3: Generate Password Multiple Times
**Precondition:** Add User modal is open
**Steps:**
1. Click "Generate Password"
2. Wait briefly
3. Click "Generate Password" again
4. Verify different password

**Expected Result:** Each generation produces unique password (due to timestamp + random)

---

### TC-D2.4: Focus Lost and Regained on Input Fields
**Precondition:** Add User modal with focus management
**Steps:**
1. Tab through fields rapidly
2. Shift+Tab back through fields
3. Check form state integrity

**Expected Result:** Form state maintained correctly regardless of focus changes

---

### TC-D2.5: Submit While Fields are Being Edited
**Precondition:** Add User modal with multi-tab input
**Steps:**
1. User typing in Name field
2. While editing, click "Add User" button
3. Name still being edited

**Expected Result:** Current state value is captured at submit time, in-progress keystroke not added

---

## D.3: Validation Edge Cases

### TC-D3.1: Email Validation - Space Before @ 
**Precondition:** Add User modal is open
**Steps:**
1. Enter email: "user @domain.com"
2. Click "Add User"

**Expected Result:** Error "Enter a valid email." (space makes it invalid)

---

### TC-D3.2: Email Validation - Space After @
**Precondition:** Add User modal is open
**Steps:**
1. Enter email: "user@ domain.com"
2. Click "Add User"

**Expected Result:** Error "Enter a valid email."

---

### TC-D3.3: Email Validation - Leading/Trailing Spaces
**Precondition:** Add User modal is open
**Steps:**
1. Enter email: " user@domain.com " (spaces around)
2. Click "Add User"

**Expected Result:** Error "Enter a valid email." (regex won't match with spaces)

---

### TC-D3.4: Name - Only Numbers as Whitespace
**Precondition:** Add User modal is open
**Steps:**
1. Enter name: "123"
2. Fill other required fields
3. Click "Add User"

**Expected Result:** Form accepts (no regex validation on name, only trim check)

---

### TC-D3.5: Division Required When Changed to Division Role
**Precondition:** Edit User modal for user with role="Admin"
**Steps:**
1. Change role to "Division"
2. Don't select a division
3. Try to save

**Expected Result:** Error "Division is required." appears
**Validation:** if (form.role === "Division" && !form.division?.trim())

---

## D.4: API Response and Error Handling

### TC-D4.1: User Creation Failure - Email Already Exists
**Precondition:** Add User modal with valid form filled
**Steps:**
1. Enter email that already exists in system
2. Click "Add User"
3. API returns error

**Expected Result:** Error is caught in createUser mutation
**Toast:** Error message displayed via getApiErrorMessage

---

### TC-D4.2: User Update Failure - Network Error
**Precondition:** Edit User modal during network outage
**Steps:**
1. Make changes to user data
2. Click "Save Changes"
3. Network fails

**Expected Result:** Error is caught, modal remains open, error message shown

---

### TC-D4.3: User Update Failure - Invalid Role ID
**Precondition:** Edit User modal with tampered role_id
**Steps:**
1. Attempt to change to invalid role_id
2. Click "Save Changes"

**Expected Result:** API rejects with validation error, handled by mutation

---

### TC-D4.4: Concurrent Mutation Calls - Prevent Double Submit
**Precondition:** Add User modal with form filled
**Steps:**
1. Click "Add User" button
2. Immediately click again (double-click)
3. Check if submit called twice

**Expected Result:** isSubmitting state prevents double submission
**Button State:** disabled={isSubmitting}

---

### TC-D4.5: Network Timeout - Long Wait
**Precondition:** Add User modal during slow network
**Steps:**
1. Fill and submit form
2. Wait 30 seconds for response

**Expected Result:** User can see loading state, can eventually see error if timeout occurs

---

## D.5: Form State Persistence Edge Cases

### TC-D5.1: Modal Close and Reopen - State Reset
**Precondition:** Add User modal with partial form filled
**Steps:**
1. Fill Name and Email
2. Click "Cancel"
3. Reopen Add User modal

**Expected Result:** Form resets to EMPTY_FORM, previous data not retained
**Behavior:** New instance of hook with fresh state

---

### TC-D5.2: Browser Back Button - Form State
**Precondition:** Add User modal open, user navigates away
**Steps:**
1. Fill form
2. Use browser back button or navigate away
3. Return to page

**Expected Result:** Form state lost, new empty form on reopen (no persistence)

---

### TC-D5.3: Tab Switch - Form State Persistence
**Precondition:** Add User modal open in browser tab
**Steps:**
1. Fill some fields in modal
2. Switch to another browser tab
3. Switch back

**Expected Result:** Form state maintained while modal component is mounted

---

## D.6: Internationalization and Character Encoding

### TC-D6.1: Arabic Characters in Name
**Precondition:** Add User modal is open
**Steps:**
1. Enter name: "محمد علي" (Arabic characters)
2. Fill other required fields
3. Submit

**Expected Result:** Form accepts and submits Arabic text

---

### TC-D6.2: Chinese Characters in Position
**Precondition:** Add User modal is open
**Steps:**
1. Enter position: "工程师" (Chinese for Engineer)
2. Fill other required fields
3. Submit

**Expected Result:** Position with Chinese characters accepted

---

### TC-D6.3: Mixed Language Email
**Precondition:** Add User modal is open
**Steps:**
1. Enter email: "user.中文@domain.com"
2. Click "Add User"

**Expected Result:** Email validation may fail (IDN emails require special handling)

---

---

# PART E: INTEGRATION TEST CASES

## E.1: Create User and Verify User Data

### TC-E1.1: Create Admin User - Complete Flow
**Precondition:** User Management page loaded, user has create permission
**Steps:**
1. Click "Add New User" button
2. Fill: Name="Juan Cruz", Email="juan@peo.gov.ph", Role="Admin", Password="generated"
3. Leave Position and Contact empty
4. Click "Add User"
5. Wait for success

**Expected Result:** 
- Credentials modal appears with email and password
- After close, user list refreshes
- New user appears in table with Admin role

---

### TC-E1.2: Create Division User - Division Assignment
**Precondition:** Add User modal open
**Steps:**
1. Fill: Name="Maria Santos", Email="maria@peo.gov.ph", Role="Division"
2. Select Division: "Highway Division"
3. Fill Password
4. Click "Add User"

**Expected Result:** 
- User created with division_id set
- User list shows user under Highway Division
- Division field persists

---

### TC-E1.3: Create User and Verify in API Payload
**Precondition:** Add User modal with all fields filled
**Steps:**
1. Enter: Name="Test User", Position="Test Officer", Email="test@peo.gov.ph", Role="Receiver", Contact="09171234567", Password="generated"
2. Inspect network request

**Expected Result:** API Payload matches:
```json
{
  "full_name": "Test User",
  "position": "Test Officer",
  "email": "test@peo.gov.ph",
  "role_id": "3",
  "contact_number": "09171234567",
  "password": "generated..."
}
```

---

## E.2: Edit User and Verify Changes

### TC-E2.1: Edit User Name - Partial Update
**Precondition:** User "Juan Cruz" exists in system
**Steps:**
1. Open User Management page
2. Find and click Edit on "Juan Cruz"
3. Change name to "Juan Miguel Cruz"
4. Click "Save Changes"

**Expected Result:** 
- User updated successfully
- Toast shows success message
- User list refreshes showing new name

---

### TC-E2.2: Edit User Role - Role Change
**Precondition:** User with role="Admin" exists
**Steps:**
1. Open edit modal for Admin user
2. Change role from "Admin" to "Receiver"
3. Click "Save Changes"

**Expected Result:** 
- User role updated
- User list shows new role "Receiver"

---

### TC-E2.3: Edit User - No Changes
**Precondition:** Edit modal open for existing user
**Steps:**
1. Open edit modal
2. Don't change any field
3. Click "Save Changes"

**Expected Result:** 
- Modal closes without network request
- No toast shown (or success without API call)
- User list displayed

---

## E.3: User List Filtering and Display

### TC-E3.1: Filter Users by Name
**Precondition:** User Management page with multiple users
**Steps:**
1. Type "Juan" in search field
2. Wait for filter to apply

**Expected Result:** User list shows only users with "Juan" in name

---

### TC-E3.2: Filter Users by Role
**Precondition:** User Management page
**Steps:**
1. Click Role filter dropdown
2. Select "Admin"
3. Observe list

**Expected Result:** User list shows only Admin users

---

### TC-E3.3: Sort Users by Date
**Precondition:** User Management page
**Steps:**
1. Click sort toggle (newest/oldest)
2. Observe user order change

**Expected Result:** Users reorder by creation date

---

## E.4: User Management with Permission Constraints

### TC-E4.1: User Without Add Permission - Add Button Hidden
**Precondition:** User has no "Add" permission in user_management_permissions
**Steps:**
1. Navigate to User Management page
2. Check for "Add New User" button

**Expected Result:** Button is not displayed or disabled

---

### TC-E4.2: User Without Edit Permission - Edit Disabled
**Precondition:** User has no "Edit" permission
**Steps:**
1. Open User Management page
2. Check Edit action on user row

**Expected Result:** Edit action is hidden or disabled

---

### TC-E4.3: User Without Deactivate Permission - Action Hidden
**Precondition:** User has no "Deactivate" permission
**Steps:**
1. View user row actions
2. Check for Deactivate option

**Expected Result:** Deactivate action is hidden

---

---

# PART F: ACCESSIBILITY TEST CASES

## F.1: Keyboard Navigation

### TC-F1.1: Tab Navigation Through Form Fields
**Precondition:** Add User modal is open
**Steps:**
1. Press Tab to navigate through form fields
2. Verify order: Name → Position → Role → Email → Contact → Password → Buttons

**Expected Result:** Tab order is logical and accessible

---

### TC-F1.2: Enter Key to Submit Form
**Precondition:** Add User modal with valid form filled
**Steps:**
1. Focus on any form field
2. Press Enter

**Expected Result:** Form submits (if last field, button should have type="submit")

---

### TC-F1.3: Space to Toggle Show/Hide Password
**Precondition:** Add User modal with password field, eye icon focused
**Steps:**
1. Tab to eye icon
2. Press Space or Enter

**Expected Result:** Password visibility toggles

---

## F.2: Screen Reader Support

### TC-F2.1: aria-label on Show/Hide Password Button
**Precondition:** Add User modal with password field
**Steps:**
1. Inspect show/hide password button
2. Check aria-label attribute

**Expected Result:** aria-label exists and reads: "Show password" or "Hide password" based on state

---

### TC-F2.2: aria-label on Copy Button
**Precondition:** Add User modal with password field
**Steps:**
1. Inspect copy button
2. Check aria-label

**Expected Result:** aria-label exists and reads: "Copy password"

---

### TC-F2.3: Label Association with Input Fields
**Precondition:** Add User modal form fields
**Steps:**
1. Inspect Name, Email, Role input fields
2. Check for associated <label> elements with htmlFor attribute

**Expected Result:** All inputs have properly associated labels

---

### TC-F2.4: Required Field Indicators
**Precondition:** Add User modal is open
**Steps:**
1. Check labels for required fields
2. Look for aria-required or labelRequired indicator

**Expected Result:** Required fields clearly marked visually and in markup

---

## F.3: Color Contrast and Visual Design

### TC-F3.1: Error Message Color Contrast
**Precondition:** Form showing validation error
**Steps:**
1. View error message text color
2. Test contrast ratio against background

**Expected Result:** Error text meets WCAG AA contrast ratio (4.5:1 minimum)

---

---

# PART G: PERFORMANCE TEST CASES

## G.1: Form Rendering Performance

### TC-G1.1: Modal Open Time
**Precondition:** User Management page loaded
**Steps:**
1. Click "Add New User" button
2. Measure time to modal fully rendered

**Expected Result:** Modal renders in < 500ms

---

### TC-G1.2: Form Field Render Performance
**Precondition:** Add User modal with Division role selected
**Steps:**
1. Switch role to "Division"
2. Measure Division combobox render time

**Expected Result:** Division combobox appears without noticeable delay

---

## G.2: Data Processing Performance

### TC-G2.1: Password Generation Performance
**Precondition:** Add User modal is open
**Steps:**
1. Click "Generate Password" 10 times in rapid succession
2. Measure time for each generation

**Expected Result:** Each generation < 50ms

---

### TC-G2.2: Form Validation Performance
**Precondition:** Add User form with all fields filled
**Steps:**
1. Enter invalid data in multiple fields
2. Click "Add User" to trigger validation

**Expected Result:** Validation completes in < 100ms

---

---

# PART H: REGRESSION TEST CASES

## H.1: Previous Functionality Preservation

### TC-H1.1: Basic CRUD Operations Still Work
**Precondition:** After code changes to user management
**Steps:**
1. Create new user - PASS/FAIL
2. Edit existing user - PASS/FAIL
3. List users with pagination - PASS/FAIL
4. Filter users - PASS/FAIL

**Expected Result:** All operations work as before

---

### TC-H1.2: Form Validation Not Bypassed
**Precondition:** After changes
**Steps:**
1. Try to create user with empty name
2. Try to create user with invalid email
3. Try to create Division user without division

**Expected Result:** All validations still enforce

---

### TC-H1.3: Permissions Still Enforced
**Precondition:** After permission system changes
**Steps:**
1. User without Add permission cannot add user
2. User without Edit permission cannot edit user
3. User without Delete permission cannot delete user

**Expected Result:** All permission checks still enforce

---

---

# APPENDIX: TEST DATA REQUIREMENTS

## Required Test Data Setup

### Users to Create in Backend
```
1. Super Admin User (role_id=1)
   - Email: superadmin@peo.gov.ph
   - Full Name: Super Administrator
   - All permissions enabled

2. Admin User with Full Permissions
   - Email: admin@peo.gov.ph
   - Full Name: Administrator
   - User Management: All permissions (Add, Edit, Deactivate, Reactivate, ResetPassword, Delete, View)

3. Admin User with No Permissions
   - Email: admin-noperm@peo.gov.ph
   - Full Name: Limited Admin
   - User Management: All permissions OFF

4. Receiver Officer
   - Email: receiver@peo.gov.ph
   - Full Name: Receiver Officer
   - Role ID: 3

5. Division User
   - Email: division@peo.gov.ph
   - Full Name: Division Staff
   - Role ID: 4
   - Division: Highway Division

6. Multiple Test Users for Filtering
   - Users with different roles
   - Users with different divisions
   - Users in different states (active/deactivated)
```

### Divisions to Create
- Highway Division
- Traffic Management Division
- Operations Division
- Maintenance Division

---

## Expected Error Messages

```
Field Validation Errors:
- "Name is required."
- "Email is required."
- "Role is required."
- "Password is required."
- "Division is required."
- "Enter a valid email."

API Errors:
- "Failed to create user"
- "Failed to update user"
- "Email already exists"
- "Invalid role"
- "Unauthorized"
```

---

## Notes for QA Team

1. **Testing Environment**: Test in both light and dark mode
2. **Browsers**: Test in Chrome, Firefox, Safari, Edge
3. **Devices**: Test on desktop, tablet, mobile screens
4. **Permissions**: Set up test users with various permission combinations
5. **Network Conditions**: Test with slow networks, offline scenarios
6. **Concurrent Operations**: Test multiple users managing users simultaneously
7. **Audit Trail**: Verify all user management actions are logged
8. **Email Notifications**: Verify new user credentials are sent if applicable

---

## Test Execution Checklist

- [ ] All form validation tests pass
- [ ] All state management tests pass
- [ ] All role/permission tests pass
- [ ] All edge case tests pass
- [ ] All integration tests pass
- [ ] Accessibility tests pass
- [ ] Performance benchmarks met
- [ ] Regression tests pass
- [ ] Cross-browser compatibility verified
- [ ] Mobile responsiveness verified

---

**Document Version**: 1.0  
**Last Updated**: 2026-10-01  
**Module**: User Management (Client-Side)  
**Framework**: React + TypeScript  
**Test Framework**: Vitest / Testing Library
