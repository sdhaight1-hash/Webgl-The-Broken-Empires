import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveCheck, makeCharacter, isCharacter, safeReadRoster } from './engine.ts';

test('roll-under success and tens-die success levels', () => {
  assert.equal(resolveCheck(52, 65).levels, 5);
  assert.equal(resolveCheck(6, 65).levels, 1);
  assert.equal(resolveCheck(68, 65).levels, 0);
  assert.equal(resolveCheck(68, 65).success, false);
});
test('automatic success and failure boundaries', () => {
  assert.equal(resolveCheck(5, 0).success, true);
  assert.equal(resolveCheck(6, 0).success, false);
  assert.equal(resolveCheck(98, 100).success, true);
  assert.equal(resolveCheck(99, 100).success, false);
  assert.equal(resolveCheck(100, 100).success, false);
});
test('matching dice are critical and success doubles gain 3 SL', () => {
  assert.equal(resolveCheck(44, 60).levels, 7);
  assert.equal(resolveCheck(66, 50).note, 'Critical failure');
  assert.equal(resolveCheck(55, 55).critical, true);
});
test('dice laboratory rejects invalid roll and targets', () => {
  assert.throws(() => resolveCheck(0, 50));
  assert.throws(() => resolveCheck(101, 50));
  assert.throws(() => resolveCheck(10, 125));
  assert.throws(() => resolveCheck(10, NaN));
});
test('character and saved roster have safe defaults', () => {
  const c = makeCharacter();
  assert.ok(isCharacter(c));
  assert.equal(safeReadRoster('bad json').length, 0);
  assert.equal(safeReadRoster(JSON.stringify([c, {id: 1}])).length, 1);
});
