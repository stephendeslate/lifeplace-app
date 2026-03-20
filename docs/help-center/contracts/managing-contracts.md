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

Navigate to **Settings > Templates > Contract Templates** to manage your templates. Each template includes:

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

- Each required role (**CLIENT**, **COMPANY_REP**, **WITNESS**) must sign individually.
- Signatures are tracked with timestamps for each party.
- Once all required signatures are obtained, the contract status moves to **SIGNED**.

## Contract Amendments

If changes are needed after a contract has been signed:

1. Create an **amendment** from the original contract.
2. The amendment receives its own version number.
3. The original contract's status changes to **AMENDED**.
4. The amendment goes through the same signature process as a new contract.

## Viewing and Editing Contracts

- **View** a contract at `/contracts/<id>` (accessible from the event detail page).
- **Edit** a contract at `/contracts/<id>/edit` to modify content before sending.
- **Sign** a contract at `/contracts/<id>/sign` to capture signatures.
