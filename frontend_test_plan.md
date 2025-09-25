# Frontend Payment Method Management Testing Plan

## Test Environment
- **Backend**: http://localhost:8001
- **Frontend**: http://localhost:5174
- **Client Credentials**: john.doe@gmail.com / test123
- **Test Data**: 2 unpaid invoices available

## Test Scenarios

### 1. Payment Method Management Tab Testing

#### 1.1 Access Payment Methods Tab
- [ ] Navigate to Financial Portal
- [ ] Click on "Payment Methods" tab
- [ ] Verify tab displays correctly with count
- [ ] Check for empty state message (client has 0 methods)
- [ ] Verify "Add New" button is present

#### 1.2 Payment Methods Display
- [ ] Verify table headers: Payment Method, Type, Details, Status, Created, Actions
- [ ] Check empty state shows appropriate message and icon
- [ ] Verify responsive design on different screen sizes

#### 1.3 CRUD Operations (will test after saving a card)
- [ ] Edit payment method nickname
- [ ] Set/unset default status
- [ ] Delete payment method with confirmation
- [ ] Verify proper error handling

### 2. Invoice Payment with Save Card Testing

#### 2.1 Navigate to Invoice Payment
- [ ] Go to Invoices tab
- [ ] Find unpaid invoice (INV-20250923-142-52 for ₱36,288.00)
- [ ] Click "Pay Now" button
- [ ] Verify payment dialog opens

#### 2.2 Payment Dialog Interface
- [ ] Verify dialog title and invoice details
- [ ] Check invoice amount display
- [ ] Verify payment method selector is present
- [ ] Check "Save this card for future payments" checkbox

#### 2.3 Stripe Payment Form
- [ ] Verify Stripe Elements load correctly
- [ ] Check card element accepts input
- [ ] Verify form validation works
- [ ] Test security indicators are present

#### 2.4 Card Save Functionality
- [ ] Check "Save this card for future payments" checkbox
- [ ] Submit payment with card save enabled
- [ ] Verify success message mentions both payment and card save
- [ ] Check if payment method appears in Payment Methods tab

#### 2.5 Payment Processing
- [ ] Submit valid card information
- [ ] Verify loading states during processing
- [ ] Check success/error message handling
- [ ] Verify invoice status updates after payment

### 3. Error Handling Testing

#### 3.1 Payment Form Errors
- [ ] Test invalid card number handling
- [ ] Test expired card error
- [ ] Test insufficient funds error
- [ ] Verify network error handling

#### 3.2 API Error Handling
- [ ] Test backend downtime scenario
- [ ] Test authentication token expiry
- [ ] Test malformed response handling

### 4. Security Testing

#### 4.1 Authentication
- [ ] Test access without login
- [ ] Test with expired token
- [ ] Verify proper redirects

#### 4.2 Data Isolation
- [ ] Verify client only sees own data
- [ ] Test cross-user data access prevention

### 5. Performance Testing

#### 5.1 Loading Performance
- [ ] Check initial page load time
- [ ] Test payment method list loading
- [ ] Verify invoice data loading speed

#### 5.2 Responsiveness
- [ ] Test on mobile viewport
- [ ] Test on tablet viewport
- [ ] Verify desktop experience

## Expected Results

### Payment Methods Tab
- Shows appropriate empty state initially
- Displays saved payment methods after card save
- CRUD operations work correctly
- Security boundaries enforced

### Invoice Payment
- Payment dialog opens correctly
- Stripe integration works properly
- Card save checkbox functions
- Success messages are accurate
- Invoice status updates correctly

### Error Handling
- Graceful error messages displayed
- No console errors or warnings
- Proper fallback behavior

### Security
- Authentication required for all operations
- Data properly isolated per user
- No sensitive data exposed in frontend