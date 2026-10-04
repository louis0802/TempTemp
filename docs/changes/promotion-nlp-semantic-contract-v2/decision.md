# Decision: A — semantic contract still unsafe

V2 demonstrates meaningful partial improvement, especially explicit exclusion polarity, null positive scope and several product/editorial controls. It does not establish A2.

Two usable primary association failures survive: a before-5pm Student Meal Dishes restriction is associated with the selected after-5pm main-menu discount, and Collab Partners declares merchandise editorial as primary while promotion classification quotes another fries proposition. Bari Lunch invents midnight from unknown opening time. Local Faves is malformed and visibly still assigns app-check Monday as availability; its syntax failure cannot be taken as a semantic fix.

On 40 usable outputs: zero participating/excluded polarity reversals, invented campaign start/end dates, invented physical participating identities, unsupported positive scopes, qualifier-loss events and unstated-year inference. These are observed usable-output counts; nine malformed cases remain unassessable. Three usable cases misuse scope/date labels as named-location rules. Seven restriction-role errors survive. At all 49, precision rises to 100%, recall falls to 69.23%, non-promotion correctness is 87.50%, and malformed rate rises to 18.37%. Usable recall is 90%; this is a capability signal, not authorization or full-run reliability.

A2's conservative association/validity and zero contamination gate fails regardless of classification precision. No B/C/D recommendation. The research implementation is complete; the desired semantic success bar was evaluated and not met.

Next investigation should improve primary-proposition selection/segmentation, restriction association coverage and explicit named-location identity boundaries, with another pre-frozen benchmark. Association quotes alone do not establish a semantic relationship. Relaxing or patching the validator with merchant/contest regex is not recommended. A future strict-output API comparison can distinguish formatting from semantic capability, but should follow semantic corrections and needs separate authorization. This run uses no hosted model API, no production NLP, no migration, publication-gate change, source activation, scheduler, commit or push.

Full evidence: evaluation.md, v1-v2-comparison.md, source-review.json and evaluation-metrics.json. Raw artifacts stay under the separate ignored v2 run root; original v1 bytes and its sealed run remain untouched.
