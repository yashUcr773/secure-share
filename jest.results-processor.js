// Jest test results processor for enhanced reporting
module.exports = (testResults) => {
  const {
    numTotalTests,
    numPassedTests,
    numFailedTests,
    numPendingTests,
    testResults: results,
    coverageMap,
  } = testResults;

  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${numPassedTests}`);
  console.log(`❌ Failed: ${numFailedTests}`);
  console.log(`⏸️  Pending: ${numPendingTests}`);
  console.log(`📝 Total: ${numTotalTests}`);
  
  const passRate = numTotalTests > 0 ? ((numPassedTests / numTotalTests) * 100).toFixed(1) : 0;
  console.log(`📈 Pass Rate: ${passRate}%`);

  // Report slow tests
  const slowTests = results
    .flatMap(result => result.testResults)
    .filter(test => test.duration > 1000)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5);

  if (slowTests.length > 0) {
    console.log('\n🐌 Slowest Tests:');
    slowTests.forEach(test => {
      console.log(`  ${test.title}: ${test.duration}ms`);
    });
  }

  // Report failed tests with details
  if (numFailedTests > 0) {
    console.log('\n❌ Failed Tests:');
    results.forEach(result => {
      const failed = result.testResults.filter(test => test.status === 'failed');
      if (failed.length > 0) {
        console.log(`\n📁 ${result.testFilePath}`);
        failed.forEach(test => {
          console.log(`  ❌ ${test.title}`);
          if (test.failureMessages && test.failureMessages[0]) {
            // Extract just the error message, not the full stack
            const errorLine = test.failureMessages[0].split('\n')[0];
            console.log(`     ${errorLine}`);
          }
        });
      }
    });
  }

  return testResults;
};
