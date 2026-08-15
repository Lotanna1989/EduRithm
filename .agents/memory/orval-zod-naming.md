---
name: Orval Zod body naming
description: How Orval names Zod request-body validators — they follow the operationId, not the schema $ref name.
---

# Orval Zod body naming

## Rule
When importing a Zod validator for a request body from `@workspace/api-zod`, the export name is derived from the **operationId**, not the `$ref` schema name.

Pattern: `{PascalCase(operationId)}Body`

**Examples:**
- operationId `reviewHtml` + schema `ReviewInput` → exported as `ReviewHtmlBody`
- operationId `importClassroomSubmissions` + schema `ClassroomImportInput` → exported as `ImportClassroomSubmissionsBody`
- operationId `createBatchSubmissions` + schema `BatchSubmissionInput` → exported as `CreateBatchSubmissionsBody`

## Why
Orval generates Zod schemas per-operation to namespace them, ignoring the component schema name for body validators.

## How to apply
Before importing a body schema in a new route file, run:
```
grep -n "Body\|Params" lib/api-zod/src/generated/api.ts | grep -i <keyword>
```
to confirm the exact export name. Never assume the schema `$ref` name maps directly.
