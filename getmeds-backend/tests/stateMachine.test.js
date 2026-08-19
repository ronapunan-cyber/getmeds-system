const stateMachine = require('../src/workflow/stateMachine');

describe('GetMeds Order State Machine', () => {
  // Valid transitions
  describe('Valid transitions', () => {
    const validCases = [
      ['draft', 'submitted'],
      ['draft', 'cancelled'],
      ['submitted', 'validating'],
      ['submitted', 'exception'],
      ['validating', 'so_pending'],
      ['validating', 'exception'],
      ['so_pending', 'so_created'],
      ['so_pending', 'exception'],
      ['so_created', 'waiting_for_payment'],
      ['so_created', 'ready_for_dispatch'],
      ['waiting_for_payment', 'payment_verified'],
      ['waiting_for_payment', 'on_hold'],
      ['waiting_for_payment', 'cancelled'],
      ['payment_verified', 'ready_for_dispatch'],
      ['ready_for_dispatch', 'picking_packing'],
      ['ready_for_dispatch', 'on_hold'],
      ['picking_packing', 'dispatched'],
      ['picking_packing', 'on_hold'],
      ['dispatched', 'tracking_shared'],
      ['dispatched', 'exception'],
      ['tracking_shared', 'completed'],
      ['on_hold', 'ready_for_dispatch'],
      ['on_hold', 'cancelled'],
      ['on_hold', 'exception'],
      ['exception', 'on_hold'],
      ['exception', 'cancelled'],
    ];

    test.each(validCases)('%s → %s should be valid', (from, to) => {
      expect(stateMachine.canTransition(from, to)).toBe(true);
    });

    test.each(validCases)('%s → %s should return new status', (from, to) => {
      expect(stateMachine.transition(from, to)).toBe(to);
    });
  });

  // Invalid transitions
  describe('Invalid transitions', () => {
    const invalidCases = [
      ['completed', 'draft'],
      ['completed', 'submitted'],
      ['completed', 'cancelled'],
      ['cancelled', 'draft'],
      ['cancelled', 'submitted'],
      ['cancelled', 'ready_for_dispatch'],
      ['draft', 'ready_for_dispatch'],
      ['draft', 'completed'],
      ['dispatched', 'draft'],
      ['waiting_for_payment', 'dispatched'],
      ['payment_verified', 'waiting_for_payment'],
    ];

    test.each(invalidCases)('%s → %s should be invalid', (from, to) => {
      expect(stateMachine.canTransition(from, to)).toBe(false);
    });

    test.each(invalidCases)('%s → %s should throw error', (from, to) => {
      expect(() => stateMachine.transition(from, to)).toThrow();
    });
  });

  // getValidTransitions
  describe('getValidTransitions', () => {
    test('completed has no valid transitions', () => {
      expect(stateMachine.getValidTransitions('completed')).toEqual([]);
    });

    test('cancelled has no valid transitions', () => {
      expect(stateMachine.getValidTransitions('cancelled')).toEqual([]);
    });

    test('draft has correct transitions', () => {
      expect(stateMachine.getValidTransitions('draft')).toEqual(expect.arrayContaining(['submitted', 'cancelled']));
    });

    test('ready_for_dispatch has correct transitions', () => {
      const valid = stateMachine.getValidTransitions('ready_for_dispatch');
      expect(valid).toContain('picking_packing');
      expect(valid).toContain('on_hold');
    });

    test('unknown status returns empty array', () => {
      expect(stateMachine.getValidTransitions('nonexistent_status')).toEqual([]);
    });
  });
});
