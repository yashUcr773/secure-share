// Test config values
import { config } from '../config';

describe('Config', () => {
  it('should have valid keyDerivationIterations', () => {
    console.log('keyDerivationIterations:', config.keyDerivationIterations);
    console.log('typeof keyDerivationIterations:', typeof config.keyDerivationIterations);
    console.log('process.env.KEY_DERIVATION_ITERATIONS:', process.env.KEY_DERIVATION_ITERATIONS);
    
    expect(config.keyDerivationIterations).toBeDefined();
    expect(typeof config.keyDerivationIterations).toBe('number');
    expect(config.keyDerivationIterations).toBeGreaterThan(0);
  });
  
  it('should have valid JWT secret', () => {
    expect(config.jwtSecret).toBeDefined();
    expect(typeof config.jwtSecret).toBe('string');
    expect(config.jwtSecret.length).toBeGreaterThan(0);
  });
});
