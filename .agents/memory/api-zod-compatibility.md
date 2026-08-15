---
name: OpenAPI to Zod compatibility
description: OpenAPI formats and integer types can generate methods unavailable in this workspace's Zod runtime.
---

This workspace currently runs Zod 3 at runtime while the OpenAPI generator can emit newer Zod helpers. Prefer generator-compatible plain strings and numbers for identifiers and counts unless the generated output is verified against the installed runtime.

**Why:** An API server restart can compile successfully but crash during module initialization when generated schemas call unavailable helpers such as `uuid()` or `int()`.

**How to apply:** After every OpenAPI change, run codegen and inspect the generated Zod output before restarting the API workflow.