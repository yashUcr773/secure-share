// Test for basic utility functions
describe('Utility Functions', () => {
  test('should be able to test basic functions', () => {
    const add = (a: number, b: number) => a + b;
    expect(add(2, 3)).toBe(5);
  });

  test('should handle string operations', () => {
    const concat = (a: string, b: string) => a + b;
    expect(concat('hello', 'world')).toBe('helloworld');
  });
});
