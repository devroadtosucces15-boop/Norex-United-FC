// Phase E runtime pass: keyboard focus never lands on hidden menus, dialogs trap Tab, layout is reserved before JS builds a page.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './mock.mjs';
import { t, done } from './lib.mjs';

const rd = (f) => fs.readFileSync(path.join(ROOT, 'next/static', f), 'utf8');
const fx = rd('fx.js'), motion = rd('motion.js'), css = rd('motion.css');
t('menus: the hidden menu styles, closed fan and closed island list are inert', /set\(orb, m !== 'orb'/.test(fx) && /set\(fan, !orb\.classList\.contains\('open'\)\)/.test(fx) && /set\(il, !isl\.classList\.contains\('open'\)\)/.test(fx));
t('menus: Escape closes and gives focus back to the button', /close = \(back\)/.test(fx) && /e\.key === 'Escape'\) close\(true\)/.test(fx));
t('dialogs: the motion sheet traps Tab inside itself', /e\.key === 'Tab'/.test(motion) && /z\.focus\(\)/.test(motion));
t('layout: space is reserved for the XI pitch and short pages keep the footer down', /#xiPitch:empty\{min-height:600px\}/.test(css) && /main\{min-height:calc\(100dvh/.test(css));
t('contrast: rating and result chips use the AA colours', /#0f6a36/.test(css) && /#7a5b12/.test(css) && /\.wx \.s-res\{background:linear-gradient/.test(css));
t('weight: the floating menu uses the small crest', /src="crest-sm\.png"/.test(fx));
done();
