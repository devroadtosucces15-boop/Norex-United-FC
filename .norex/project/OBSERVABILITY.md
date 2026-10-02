# Usage and Observability v1

Track task/execution/provider/capability, route reason, billing mode, allowance when exposed, elapsed time, retries/fallbacks, deterministic validation, result and Mike correction/override.

Never log raw prompts containing secrets or raw credentials. Prefer structured metadata + redacted artifact references.

UI should answer:
- what is working now?
- which provider/capability is active?
- why was it selected?
- what did it cost / what allowance was consumed?
- what failed or fell back?
- what evidence was produced?

$0.00 means measured/authorized incremental metered cost, not an unsupported claim that all underlying subscriptions are free.
