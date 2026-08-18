/* engine.js 同梱のセルフテスト9件を Vitest へ写した回帰テスト。
 * 帳票はすべて posted な仕訳から導出されることを検証する。 */
import { describe, expect, it } from 'vitest';
import {
  SCN, balance, entryBalanced, entryFromScenario, openingEntries, posted, profit, runTests,
  traceSources, trialBalance
} from './engine';
import type { Entry } from './types';

const fresh = (): Entry[] => openingEntries();
const postS = (es: Entry[], sid: string): Entry[] => {
  es.push(entryFromScenario(SCN[sid], 'test-' + sid, 'posted'));
  return es;
};

/** s1〜s7 まで登録済みの帳簿 */
const through7 = (): Entry[] => {
  const es = fresh();
  ['s1', 's2', 's3', 's4', 's5', 's6', 's7'].forEach(sid => postS(es, sid));
  return es;
};

describe('会計エンジン', () => {
  it('掛売上の登録で売掛金と売上が増加する', () => {
    const es = postS(fresh(), 's1');
    expect(balance(es, '110')).toBe(100000);
    expect(-balance(es, '401')).toBe(100000);
  });

  it('売掛金回収で現金が増加し売掛金が減少する', () => {
    const es = postS(postS(fresh(), 's1'), 's2');
    expect(balance(es, '101')).toBe(1060000);
    expect(balance(es, '110')).toBe(40000);
  });

  it('回収時に売上と利益が変化しない', () => {
    const es = postS(fresh(), 's1');
    const profitBefore = profit(es).profit;
    postS(es, 's2');
    expect(profit(es).profit).toBe(profitBefore);
    expect(-balance(es, '401')).toBe(100000);
  });

  it('減価償却で減価償却費と累計額が増加する', () => {
    const es = through7();
    expect(balance(es, '502')).toBe(4000);
    expect(-balance(es, '159')).toBe(4000);
  });

  it('全posted仕訳で借方合計と貸方合計が一致する', () => {
    expect(posted(through7()).every(entryBalanced)).toBe(true);
  });

  it('試算表の借方合計と貸方合計が一致する', () => {
    expect(trialBalance(through7()).balanced).toBe(true);
  });

  it('財務諸表の金額から元の仕訳まで追跡できる', () => {
    const es = through7();
    const ids = traceSources(es, '401');
    expect(ids).toHaveLength(1);
    expect(es.find(e => e.id === ids[0])!.scenarioId).toBe('s1');
    expect(SCN['s1'].evidence).toBeTruthy();
  });

  it('draft仕訳は帳簿へ反映されない', () => {
    const es = fresh();
    es.push(entryFromScenario(SCN['s1'], 'd1', 'draft'));
    expect(balance(es, '110')).toBe(0);
    expect(trialBalance(es).rows).toHaveLength(2);
  });

  it('保存データから正しく復元できる', () => {
    const es = through7();
    const snap = { entries: es, completed: ['s1'], attempts: { s1: 2 } };
    const back = JSON.parse(JSON.stringify(snap));
    expect(back).toEqual(snap);
    expect(balance(back.entries, '101')).toBe(balance(es, '101'));
  });

  it('同梱のセルフテスト（9件）が全て合格する', () => {
    const results = runTests();
    expect(results).toHaveLength(9);
    expect(results.filter(r => !r.pass)).toEqual([]);
  });
});
