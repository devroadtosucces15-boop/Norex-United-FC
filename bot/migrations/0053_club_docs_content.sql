-- Club docs reset + first real content (founder's documents, condensed). Content only: this migration sends NOTHING.
-- No pins, no notifications, no rules-acknowledgement prompt, no Discord post. Go-live is a separate, explicit step
-- (see the docs_release hold in bot/docs.js).

-- Reset: take down everything on the docs page (kept with removed_at, like a manager removal), clear acknowledgements,
-- reset the rules version to "nothing to acknowledge" and drop any open acknowledge-the-rules notifications.
UPDATE docs SET removed_at = CAST(strftime('%s','now') AS INTEGER) * 1000 WHERE removed_at IS NULL AND area != 'playstyle';
DELETE FROM doc_acks;
DELETE FROM notifications WHERE ref LIKE 'rules:%';
INSERT INTO meta (key, value) VALUES ('rules_version', '0') ON CONFLICT (key) DO UPDATE SET value = '0';
DELETE FROM meta WHERE key IN ('rules_at', 'rules_remind_at');
-- Hold on: while docs_release is not '1', club docs never notify, pin-nag, post to Discord or ask for acknowledgement.
INSERT INTO meta (key, value) VALUES ('docs_release', '0') ON CONFLICT (key) DO UPDATE SET value = '0';

INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('announce', 'A message from the founder', 'To everyone representing NOREX UNITED,

I appreciate everyone who has been part of NOREX, from the beginning or more recently. We''ve built a community with its own identity, friendships, rivalries and memorable moments. I''m not a perfect owner, teammate or player, so when I talk about standards, I''m including myself.

**What I want isn''t perfection.** Nobody has to play flawlessly, agree on everything or give every free hour. What I do want is consistency in how we represent NOREX: playing as a team, respecting each other''s time, communicating, taking fair criticism, and making small sacrifices for the squad. Sometimes that means a new position, giving someone else a chance, or accepting a manager''s decision.

**Rules aren''t there to take the fun out.** They exist to avoid misunderstandings and repeat arguments so we spend more time enjoying football together.

**Community and competition were never opposites.** We once sat among the top clubs, second or third, without chasing it. Along the way, protecting the community, we drifted from that competitive side. I don''t regret putting people first, but we never had to give up one for the other. No ranking is worth losing the people who made this club.

These standards apply to everyone, management and longtime members included. Mistakes, jokes, respectful disagreement and off days are all fine.

Nobody is obligated to be part of NOREX. If this direction suits you, I hope you stay. If it doesn''t, no hard feelings.

## What happens next
Everyone has **one week** to read the updated club documents and accept them on the web app. This isn''t an ultimatum. If someone chooses not to accept, I''ll respect that, and if most of the club prefers to carry on as it is, I''ll respect that too.

**We don''t need perfect players. We need people willing to be good teammates.**

NOREX UNITED F.C.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 0);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('announce', 'Our club philosophy', 'NOREX UNITED was built around a community worth being part of and a team that takes pride in competing. We want to find that balance again and build beyond it without losing the people who made it possible.

## The club comes first
No player, manager, founder or individual record is above the club. Skill matters, but so do respect, reliability, awareness and making the players around you better.

## Competition without pressure to be perfect
We want to win and improve: good decisions, playing our roles, supporting teammates, learning from hard matches. That doesn''t mean flawless performances, endless availability, or trading friendships for a leaderboard spot.

## Fair chances and shared responsibility
A place in a competitive lineup is earned through contribution, teamwork, availability and what the squad needs, never favoritism. Players get clear communication and real chances to develop. In return, everyone adapts, accepts feedback and sometimes puts the squad ahead of their first preference.

## How we move forward
We''re not replacing the club we built. We''re restoring the link between community and competitive football that once defined us: a NOREX where people enjoy showing up, trust their teammates and take pride in how we play.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 1);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('rules', '1. Respect every member', 'Treat teammates, opponents and staff with respect. No personal attacks, discrimination, harassment, threats or targeted humiliation. Banter is fine while it is mutual; stop when someone says it is unwelcome.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 2);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('rules', '2. Play for the team', 'Rush and League are team modes. Use your teammates, spot passing options, make supporting runs and help defend. Creativity is welcome; repeatedly ignoring the team to force personal plays is not.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 3);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('rules', '3. Respect your position and the agreed setup', 'Play the role you accepted and keep the team shape. Don''t repeatedly abandon your assignment or change the approach mid-match without saying so. Discuss positional changes between games or when the squad agrees.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 4);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('rules', '4. Do not deliberately disrupt matches', 'No intentional own goals, sabotage, trolling teammates or quitting just to punish the squad. If you have to leave, tell the group when you can.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 5);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('rules', '5. Keep match communication constructive', 'Call out runs, mark assignments, give useful feedback. Avoid constant blame, shouting over others and long arguments mid-play. Save detailed disagreements for after the match.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 6);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('rules', '6. Be fair with lobby spots and rotations', 'Nobody owns a lobby or is entitled to every match. When demand beats spots, staff communicate the selection or rotation plan. Competitive lineups may favor fit and readiness, but never personally.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 7);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('rules', '7. Respect the North American playing region', 'NOREX organizes sessions around North American connections to keep play fair and playable. Follow the region and connection requirements for organized sessions and don''t knowingly bypass an eligibility decision.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 8);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('rules', '8. Honor match-night commitments', 'If you confirm a match or tournament, arrive ready and tell the organizer promptly if that changes. Repeated no-shows without notice may affect future selection.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 9);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('rules', '9. Follow competition-specific rules', 'Tournament roster limits, club eligibility, suspensions, scheduling and match reporting follow the rules published for that event. Casual lobby habits don''t carry over.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 10);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('rules', '10. Respect decisions, keep the right to question them', 'You can challenge a decision respectfully. Raise concerns privately with the manager or founder, not as a public confrontation. Staff must listen and explain when appropriate.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 11);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('rules', '11. No favoritism or misuse of staff roles', 'Managers and the founder follow the same conduct rules as everyone. Staff must not use access, roles or lineup authority to settle personal disagreements.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 12);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('rules', '12. Protect the community', 'Don''t share private member information, impersonate others or use NOREX channels to target members. Respect Discord channel purposes and official communications.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 13);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('rules', '13. Accept feedback and take responsibility', 'Mistakes happen. Own them, listen to reasonable feedback and give others the same chance to improve. Repeatedly refusing to cooperate is different from an off game.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 14);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('rules', '14. How rule issues are handled', 'Staff weigh context, impact and repeated behavior. Responses range from a conversation or warning to temporary exclusion from organized sessions, removal of a staff role, or removal from the club. Serious misconduct may warrant immediate action. You can ask the founder to review any decision.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 15);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('requirements', 'What members can expect, and what we ask', '## You can expect
Respectful treatment, clear rules, honest communication, chances to play and develop, and a fair process when concerns come up. Nobody can promise a starting spot or preferred position every session.

## We ask
Be reliable when you commit, respect the squad, make an honest effort in your assigned role and be willing to adapt. You don''t have to be the best player in the lobby, but you do need to add to the experience of those playing with you.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 16);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('requirements', 'What managers are responsible for', '- Organize sessions and communicate lineup and rotation decisions.
- Welcome and assess trial players fairly.
- Explain the approach for organized matches.
- Handle issues without favoritism, lead by example and take reasonable criticism.

## Playing time and selection
Casual sessions should make room for fair rotation. Competitive matches may need a set lineup, formation or role balance. Managers stay transparent about which is which and never treat friendship as a selection criterion.

## Resolving disagreements
Talk directly and respectfully, ideally after a match. If it continues, contact a manager or the founder with the details. Everyone involved gets a fair chance to explain before a decision is made.

## Recognition
Awards look beyond goals and assists: defending, chance creation, positioning, smart passing, clutch moments, reliability, improvement and helping teammates.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 17);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('requirements', 'How we play: Rush, League and Grounds', '## Rush: five players, shared responsibility
Keep passing lanes open, give the ball carrier options and rotate sensibly when teammates push up. Defending belongs to everyone; don''t leave one player isolated at the back or force skills when a team option is clear. Quick decisions and chemistry beat individual highlights.

## League: structure and coordination
Respect the chosen formation and positions. Keep width and balance, call runs and defensive cover, and work through midfield instead of forcing every attack. Selection weighs availability, role fit, coordination and team needs.

## Grounds: room to experiment
Test builds, movement, camera settings and ideas with teammates who know the session''s purpose. Agree when a lobby is experimental. Testing never excuses wasting teammates'' time.

## Before a session
Confirm the mode, positions, whether the lobby is competitive or experimental, and how extra players rotate. If you''re leaving early or testing a build, say so first.

## After a difficult match
Keep feedback specific: a passing option, missing cover, a formation tweak. No personal attacks. Agree what to change and move into the next game together.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 18);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('faq', 'Welcome to NOREX UNITED', 'NOREX is a North American EA FC27 club built around competitive football and a strong community. Read our philosophy and rules, connect on Discord and check the available Rush, League and Grounds sessions.

## Before joining a lobby
Check the mode and open positions. Tell the squad if you''re testing a build or only available briefly. If the lobby is full, ask about rotation or another session instead of interrupting a match.

## Organized match reminder
If you confirm attendance, check the posted schedule and lineup, arrive ready, and tell the organizer as soon as you know you can''t make it.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 19);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('faq', 'Do I need to be an elite player?', 'No. We value effort, awareness, cooperation and improvement. Organized competitive lineups may need particular roles or readiness, but everyone gets respectful treatment and a fair opportunity.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 20);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('faq', 'Can I play any position?', 'You can ask to try a new one. For an organized match, agree the change with the manager or squad first.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 21);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('faq', 'Are skill moves or solo goals discouraged?', 'No, creativity is part of football. The concern is repeatedly ignoring teammates or forcing plays that hurt the squad.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 22);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('faq', 'What if I disagree with a decision?', 'Raise it respectfully with the manager after the match, or take it to the founder if it stays unresolved. Disagreement is allowed; personal attacks and public pile-ons are not.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 23);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('faq', 'Why does connection region matter?', 'We focus on North American play to reduce unfair lag and keep matches consistent for the squad.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 24);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('faq', 'Where do I find official updates?', 'On the NOREX website and in the Discord announcement areas. A rumor or casual message is not an official rule change.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 25);
INSERT INTO docs (area, title, body, pinned, public, by_name, at) VALUES ('faq', 'Where do I confirm the updated rules and vision?', 'Use the acceptance option on the NOREX web app during the one-week review period announced by the founder.', 0, 0, 'NOREX UNITED', CAST(strftime('%s','now') AS INTEGER) * 1000 + 26);
