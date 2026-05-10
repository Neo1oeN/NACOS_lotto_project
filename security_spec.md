# Security Specification for NACOS Lottery System

## 1. Data Invariants
- A user can only see their own receipts and tickets.
- A receipt status can only be changed by an admin.
- A ticket can only be created by an admin when a receipt is verified.
- Settings (bank details, total pool) can only be edited by an admin.
- Registration number must follow the format `EU - CC - CCC - DD - NNN`.
- Lottery numbers must follow the format `XXXX XXXX XXXX`.

## 2. The "Dirty Dozen" Payloads
1. **User Spoof**: Trying to create a ticket for yourself.
2. **Status Hijack**: A user trying to set their receipt status to 'verified'.
3. **Admin Settings Leak**: A user trying to edit the bank account details.
4. **Data Injection**: Injecting a 1MB string into the `note` field of a receipt.
5. **Role Escalation**: Trying to create a user document with `role: 'admin'`.
6. **Orphaned Ticket**: Creating a ticket without a valid receipt ID.
7. **Negative Reward**: Setting the reward pool to a negative number.
8. **Unauthorized List**: A user trying to list all receipts in the system.
9. **Duplicate ID**: Trying to use a stolen UID to register.
10. **Shadow Field**: Adding `isFake: true` to a ticket document.
11. **Self-Verification**: User B verifying User A's receipt.
12. **Future Timestamp**: Setting `createdAt` to a future date.

## 3. Test Runner (Draft)
The tests will be implemented in `firebase.rules.test.ts` (conceptual) to ensure these are denied.

## 4. Admin Access
Admin UID will be identified by a document in `admins/{uid}` or a `role: 'admin'` in `users/{uid}`. To be safe and compliant with guidelines, I'll check `exists(/databases/$(database)/documents/users/$(request.auth.uid))` and check the `role` field.
Wait, the instructions say "Auth tokens NEVER contain custom claims... You MUST explicitly look up roles using get() or exists()".

I'll use `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'`.
