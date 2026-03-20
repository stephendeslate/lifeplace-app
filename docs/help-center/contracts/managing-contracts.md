# Managing Contracts

This article covers the full contract lifecycle -- from creation through signing and amendments.

## Contract Lifecycle

| Status | Meaning |
|---|---|
| DRAFT | Being prepared |
| SENT | Sent to client for signature |
| PARTIALLY_SIGNED | Some required signatures obtained, others pending |
| SIGNED | All required signatures collected -- fully executed |
| EXPIRED | Validity period passed without full signature |
| VOID | Contract has been voided |
| AMENDED | An amendment has been created from this contract |

## How Contracts Are Created

Contracts can be created in two ways:

1. **Automatically** -- via workflow automation when a quote is accepted (automation_type = CONTRACT). This is the most common path.
2. **Manually** -- from the event detail page, if you need to generate a contract outside the standard workflow.

Each contract is generated from a **Contract Template** configured in Settings.

## Contract Templates

Navigate to **Settings > Template Management > Contract Templates** to manage your templates. Each template includes:

- **Name and description**
- **Event type association** (optional) -- when set, the template is auto-selected based on the event type
- **Content** -- the contract text, with variable placeholders for dynamic fields
- **Variables** -- dynamic fields such as client name, event date, pricing details, and custom values
- **Sections** -- structured JSON sections for organizing contract content
- **Signature requirements:**
  - Client (always required)
  - Company Representative (toggle on/off)
  - Witness (toggle on/off)
- **Amendment settings** -- whether amendments are allowed and whether they require signatures

## Contract Signatures

LifePlace supports multi-party signing:

- Each required role must sign individually. Available signature roles are: **CLIENT**, **WITNESS**, **COMPANY_REP**, **GUARDIAN**, **PARTNER**, and **OTHER**.
- Signatures are tracked with timestamps for each party.
- Once all required signatures are obtained, the contract status moves to **SIGNED**.

## Contract Amendments

If changes are needed after a contract has been signed:

1. Create an **amendment** from the original contract.
2. The parent **EventContract** tracks the **amendment number** (incremented each time an amendment is created).
3. The original contract's status changes to **AMENDED**.
4. The amendment goes through a review/approval workflow before signatures:
   - **REQUESTED** -- amendment has been requested (default initial status)
   - **DRAFT** -- amendment is being prepared
   - **SENT_FOR_REVIEW** -- sent for review by relevant parties
   - **APPROVED** -- approved and ready for signatures
   - **SIGNED** -- amendment has been signed
   - **REJECTED** -- rejected with feedback (can be revised and resubmitted)
   - **CANCELLED** -- amendment was cancelled
5. Once approved, the amendment goes through the same signature process as a new contract.

## Viewing and Editing Contracts

- **View** a contract at `/contracts/<id>` (accessible from the event detail page).
- **Edit** a contract at `/contracts/<id>/edit` to modify content before sending.
- **Sign** a contract at `/contracts/<id>/sign` to capture signatures.

## Contract Documents and Notes

- **Contract Documents** (ContractDocument) -- attach supporting files to a contract, such as floor plans, rider agreements, or addenda. Each document tracks the uploader and upload date.
- **Contract Notes** (ContractNote) -- add internal notes to a contract for team communication. Notes are timestamped and attributed to the staff member who created them. These are not visible to the client.
