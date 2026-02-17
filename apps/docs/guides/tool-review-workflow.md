# Tool Review Workflow Guide

This guide covers the complete tool review workflow using the Symbiont SDK, from submitting tools for security review to downloading approved and signed packages.

## Table of Contents

- [Overview](#overview)
- [Submitting Tools for Review](#submitting-tools-for-review)
- [Managing Review Sessions](#managing-review-sessions)
- [Review Process](#review-process)
- [Security Analysis](#security-analysis)
- [Review Decisions](#review-decisions)
- [Tool Signing](#tool-signing)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The Tool Review API provides a comprehensive security review process for AI tools and agents before they can be deployed in production environments. The [`ToolReviewClient`](../api/classes/ToolReviewClient.html) handles all interactions with the review system.

### Key Concepts

- **Tool Submission**: The process of submitting a tool package for security review
- **Review Session**: A container for managing the review of one or more tools
- **Security Analysis**: Automated security scanning and vulnerability assessment
- **Review Decision**: Human reviewer's decision on tool approval or rejection
- **Tool Signing**: Cryptographic signing of approved tools for authenticity

### Review Levels

- **Standard**: Basic security checks and manual review
- **Enhanced**: Comprehensive analysis including static code analysis
- **Critical**: Full security audit with penetration testing

## Submitting Tools for Review

### Basic Tool Submission

```typescript
import { SymbiontClient } from '@symbi/core';

const client = new SymbiontClient({
  apiKey: process.env.SYMBIONT_API_KEY,
  jwt: process.env.SYMBIONT_JWT_TOKEN // Required for Tool Review API
});

await client.connect();

// Submit a tool for review
const submission = await client.toolReview.submitForReview({
  toolMetadata: {
    name: 'dataValidator',
    version: '1.0.0',
    description: 'Validates and sanitizes input data',
    author: 'dev@company.com',
    category: 'data-processing'
  },
  toolPackage: {
    type: 'archive',
    url: 'https://storage.example.com/tools/data-validator-1.0.0.zip',
    checksum: 'sha256:abcd1234...',
    size: 1024576
  },
  reviewLevel: 'standard',
  priority: 'normal',
  requestedCompletionDate: '2024-01-31T23:59:59Z',
  additionalNotes: 'This tool processes customer data and requires privacy compliance review'
});

console.log('Tool submitted for review:', submission.sessionId);
console.log('Estimated completion:', submission.estimatedCompletion);
```

### Submitting Multiple Tools

```typescript
// Submit multiple related tools in a single session
const multiToolSubmission = await client.toolReview.submitForReview({
  tools: [
    {
      toolMetadata: {
        name: 'inputValidator',
        version: '2.1.0',
        description: 'Validates user input',
        author: 'security-team@company.com',
        category: 'security'
      },
      toolPackage: {
        type: 'npm',
        name: '@company/input-validator',
        version: '2.1.0',
        registry: 'https://npm.company.com'
      }
    },
    {
      toolMetadata: {
        name: 'outputSanitizer',
        version: '1.5.0',
        description: 'Sanitizes output data',
        author: 'security-team@company.com',
        category: 'security'
      },
      toolPackage: {
        type: 'git',
        repository: 'https://github.com/company/output-sanitizer',
        ref: 'v1.5.0'
      }
    }
  ],
  reviewLevel: 'enhanced',
  priority: 'high',
  compliance: {
    frameworks: ['SOC2', 'GDPR', 'HIPAA'],
    requirements: ['data-encryption', 'audit-logging']
  }
});
```

### Submission with Custom Requirements

```typescript
// Submit with specific security requirements
const criticalSubmission = await client.toolReview.submitForReview({
  toolMetadata: {
    name: 'financialCalculator',
    version: '3.0.0',
    description: 'Performs financial calculations for trading algorithms',
    author: 'quant-team@bank.com',
    category: 'financial',
    tags: ['trading', 'algorithms', 'high-frequency']
  },
  toolPackage: {
    type: 'container',
    image: 'registry.bank.com/financial-calculator:3.0.0',
    digest: 'sha256:fedcba09...'
  },
  reviewLevel: 'critical',
  priority: 'critical',
  securityRequirements: {
    codeReview: true,
    penetrationTesting: true,
    vulnerabilityScanning: true,
    complianceCheck: ['PCI-DSS', 'SOX'],
    runtimeAnalysis: true
  },
  businessJustification: 'Critical trading algorithm update required for Q1 launch',
  stakeholders: [
    'security@bank.com',
    'compliance@bank.com',
    'cto@bank.com'
  ]
});
```

## Managing Review Sessions

### Listing Review Sessions

```typescript
// Get all review sessions
const sessions = await client.toolReview.listReviewSessions();

console.log(`Found ${sessions.sessions.length} review sessions:`);
sessions.sessions.forEach(session => {
  console.log(`- ${session.id}: ${session.status} (${session.tools.length} tools)`);
});

// Filter sessions with pagination
const filteredSessions = await client.toolReview.listReviewSessions({
  page: 1,
  pageSize: 20,
  status: 'in-review',
  priority: 'high',
  submitter: 'dev@company.com',
  sortBy: 'created',
  sortOrder: 'desc'
});
```

### Getting Session Details

```typescript
// Get detailed session information
const sessionId = 'session-123';
const session = await client.toolReview.getReviewSession(sessionId);

console.log('Session Details:');
console.log(`- Status: ${session.status}`);
console.log(`- Priority: ${session.priority}`);
console.log(`- Review Level: ${session.reviewLevel}`);
console.log(`- Created: ${session.createdAt}`);
console.log(`- Estimated Completion: ${session.estimatedCompletion}`);
console.log(`- Tools: ${session.tools.length}`);

// Display tool information
session.tools.forEach((tool, index) => {
  console.log(`  Tool ${index + 1}: ${tool.name} v${tool.version} - ${tool.status}`);
  if (tool.findings && tool.findings.length > 0) {
    console.log(`    Findings: ${tool.findings.length}`);
  }
});
```

### Monitoring Session Progress

```typescript
// Monitor review progress
async function monitorReviewProgress(sessionId: string) {
  const pollInterval = 30000; // 30 seconds
  let isComplete = false;
  
  console.log(`Monitoring review session: ${sessionId}`);
  
  while (!isComplete) {
    try {
      const session = await client.toolReview.getReviewSession(sessionId);
      
      console.log(`Status: ${session.status}`);
      
      if (session.status === 'completed' || session.status === 'rejected') {
        isComplete = true;
        return session;
      }
      
      // Show progress for each tool
      session.tools.forEach(tool => {
        console.log(`- ${tool.name}: ${tool.status}`);
      });
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
    } catch (error) {
      console.error('Error monitoring session:', error.message);
      break;
    }
  }
}

const finalSession = await monitorReviewProgress(sessionId);
```

## Review Process

### Understanding Review Stages

```typescript
// Check current review stage
async function checkReviewStage(sessionId: string) {
  const session = await client.toolReview.getReviewSession(sessionId);
  
  console.log(`Current stage: ${session.currentStage}`);
  
  switch (session.currentStage) {
    case 'submitted':
      console.log('✅ Tool submitted and queued for review');
      break;
    case 'scanning':
      console.log('🔍 Automated security scanning in progress');
      break;
    case 'analysis':
      console.log('📊 Security analysis and report generation');
      break;
    case 'human-review':
      console.log('👤 Human security expert review');
      break;
    case 'decision':
      console.log('⚖️ Final decision being made');
      break;
    case 'signing':
      console.log('✍️ Tool being signed and packaged');
      break;
    case 'completed':
      console.log('✅ Review completed');
      break;
    case 'rejected':
      console.log('❌ Tool rejected');
      break;
  }
  
  if (session.estimatedTimeRemaining) {
    console.log(`Estimated time remaining: ${session.estimatedTimeRemaining} minutes`);
  }
}
```

### Getting Review Queue Status

```typescript
// Check current review queue
const queue = await client.toolReview.getReviewQueue();

console.log('Review Queue Status:');
console.log(`- Total items in queue: ${queue.totalItems}`);
console.log(`- Your position: ${queue.yourPosition || 'N/A'}`);
console.log(`- Estimated wait time: ${queue.estimatedWaitTime} minutes`);

// Queue breakdown by priority
queue.queueBreakdown.forEach(item => {
  console.log(`- ${item.priority}: ${item.count} items`);
});

// Recent completions
if (queue.recentCompletions) {
  console.log('\nRecent Completions:');
  queue.recentCompletions.forEach(completion => {
    console.log(`- ${completion.toolName}: ${completion.decision} (${completion.reviewTime}min)`);
  });
}
```

## Security Analysis

### Retrieving Security Analysis

```typescript
// Get security analysis results
const analysisId = 'analysis-456';
const analysis = await client.toolReview.getAnalysis(analysisId);

console.log('Security Analysis Results:');
console.log(`- Overall Risk Score: ${analysis.riskScore}/100`);
console.log(`- Security Grade: ${analysis.securityGrade}`);
console.log(`- Total Findings: ${analysis.findings.length}`);

// Categorize findings by severity
const findingsBySeverity = analysis.findings.reduce((acc, finding) => {
  acc[finding.severity] = (acc[finding.severity] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log('\nFindings by Severity:');
Object.entries(findingsBySeverity).forEach(([severity, count]) => {
  console.log(`- ${severity}: ${count}`);
});
```

### Understanding Security Findings

```typescript
// Process and display security findings
function processSecurityFindings(analysis: SecurityAnalysis) {
  const criticalFindings = analysis.findings.filter(f => f.severity === 'critical');
  const highFindings = analysis.findings.filter(f => f.severity === 'high');
  
  console.log('\n🚨 Critical Findings:');
  criticalFindings.forEach(finding => {
    console.log(`- ${finding.title}`);
    console.log(`  Category: ${finding.category}`);
    console.log(`  Description: ${finding.description}`);
    if (finding.remediation) {
      console.log(`  Remediation: ${finding.remediation}`);
    }
    console.log(`  CWE ID: ${finding.cweId || 'N/A'}`);
  });
  
  console.log('\n⚠️ High Priority Findings:');
  highFindings.forEach(finding => {
    console.log(`- ${finding.title}: ${finding.description}`);
  });
  
  // Compliance checks
  if (analysis.complianceResults) {
    console.log('\n📋 Compliance Results:');
    Object.entries(analysis.complianceResults).forEach(([framework, result]) => {
      console.log(`- ${framework}: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
      if (!result.passed && result.issues) {
        result.issues.forEach((issue: string) => {
          console.log(`  • ${issue}`);
        });
      }
    });
  }
}
```

## Review Decisions

### Submitting Review Decisions (For Reviewers)

```typescript
// Submit approval decision
const approvalDecision = await client.toolReview.submitDecision(sessionId, {
  decision: 'approved',
  reviewerNotes: 'Security analysis passed. Minor recommendations implemented.',
  conditions: [
    'Deploy only in production environment',
    'Enable audit logging',
    'Monitor for unusual activity'
  ],
  validUntil: '2024-12-31T23:59:59Z',
  requiredUpdates: []
});

console.log('Approval submitted:', approvalDecision.decisionId);
```

```typescript
// Submit rejection with required changes
const rejectionDecision = await client.toolReview.submitDecision(sessionId, {
  decision: 'rejected',
  reviewerNotes: 'Critical security vulnerabilities found that must be addressed.',
  requiredChanges: [
    {
      severity: 'critical',
      category: 'input-validation',
      description: 'SQL injection vulnerability in user input processing',
      remediation: 'Implement parameterized queries and input sanitization',
      affectedFiles: ['src/database/queries.js', 'src/api/user-handler.js']
    },
    {
      severity: 'high',
      category: 'authentication',
      description: 'Weak password requirements',
      remediation: 'Implement stronger password policy with minimum complexity requirements'
    }
  ],
  resubmissionRequired: true,
  estimatedFixTime: '3-5 business days'
});
```

```typescript
// Submit conditional approval
const conditionalApproval = await client.toolReview.submitDecision(sessionId, {
  decision: 'conditional-approval',
  reviewerNotes: 'Approved with mandatory conditions that must be met before deployment.',
  conditions: [
    'Add rate limiting to all API endpoints',
    'Implement comprehensive audit logging',
    'Add input validation for all user inputs',
    'Enable security headers in HTTP responses'
  ],
  requiredUpdates: [
    {
      description: 'Add rate limiting middleware',
      priority: 'high',
      estimatedEffort: '1 day'
    }
  ],
  validUntil: '2024-06-30T23:59:59Z',
  revalidationRequired: true
});
```

### Handling Review Decisions

```typescript
// Handle different review outcomes
async function handleReviewDecision(sessionId: string) {
  const session = await client.toolReview.getReviewSession(sessionId);
  
  switch (session.decision?.decision) {
    case 'approved':
      console.log('✅ Tool approved for production use');
      console.log('Conditions:', session.decision.conditions);
      
      // Download signed tool
      await downloadApprovedTool(sessionId);
      break;
      
    case 'conditional-approval':
      console.log('⚠️ Tool conditionally approved');
      console.log('Required updates:');
      session.decision.requiredUpdates?.forEach((update, index) => {
        console.log(`${index + 1}. ${update.description} (${update.priority})`);
      });
      break;
      
    case 'rejected':
      console.log('❌ Tool rejected');
      console.log('Required changes:');
      session.decision.requiredChanges?.forEach((change, index) => {
        console.log(`${index + 1}. [${change.severity}] ${change.description}`);
        console.log(`   Remediation: ${change.remediation}`);
      });
      break;
      
    default:
      console.log('Review still in progress');
  }
}
```

## Tool Signing

### Checking Signing Status

```typescript
// Check tool signing status
const signingStatus = await client.toolReview.getSigningStatus(sessionId);

console.log('Signing Status:');
console.log(`- Status: ${signingStatus.status}`);
console.log(`- Progress: ${signingStatus.progress}%`);
console.log(`- Signing Method: ${signingStatus.signingMethod}`);
console.log(`- Certificate Authority: ${signingStatus.certificateAuthority}`);

if (signingStatus.certificate) {
  console.log(`- Certificate Fingerprint: ${signingStatus.certificate.fingerprint}`);
  console.log(`- Valid Until: ${signingStatus.certificate.validUntil}`);
}
```

### Downloading Signed Tools

```typescript
// Download signed tool package
async function downloadApprovedTool(sessionId: string) {
  try {
    console.log('Downloading signed tool package...');
    
    const signedPackage = await client.toolReview.downloadSignedTool(sessionId);
    
    // In a browser environment
    if (typeof window !== 'undefined') {
      const url = URL.createObjectURL(signedPackage);
      const a = document.createElement('a');
      a.href = url;
      a.download = `approved-tool-${sessionId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } 
    // In Node.js environment
    else {
      const fs = require('fs');
      const buffer = Buffer.from(await signedPackage.arrayBuffer());
      fs.writeFileSync(`approved-tool-${sessionId}.zip`, buffer);
      console.log(`Tool package saved as approved-tool-${sessionId}.zip`);
    }
    
    console.log('✅ Signed tool package downloaded successfully');
    
  } catch (error) {
    console.error('Failed to download signed tool:', error.message);
  }
}
```

### Verifying Tool Signatures

```typescript
// Verify tool signature (pseudo-code)
async function verifyToolSignature(toolPath: string, sessionId: string) {
  const signingStatus = await client.toolReview.getSigningStatus(sessionId);
  
  if (!signingStatus.certificate) {
    throw new Error('No certificate available for verification');
  }
  
  // In a real implementation, you would:
  // 1. Extract the signature from the tool package
  // 2. Verify against the certificate
  // 3. Check certificate chain validity
  
  console.log('Signature verification steps:');
  console.log('1. Extract signature from tool package');
  console.log('2. Verify signature against certificate');
  console.log('3. Check certificate chain validity');
  console.log('4. Verify certificate authority trust');
  
  return {
    valid: true,
    certificate: signingStatus.certificate,
    signedAt: signingStatus.signedAt,
    algorithm: signingStatus.signingMethod
  };
}
```

## Best Practices

### 1. Submission Best Practices

```typescript
// ✅ Good: Comprehensive tool metadata
const goodSubmission = {
  toolMetadata: {
    name: 'userDataProcessor',
    version: '2.1.0',
    description: 'Processes user data with GDPR compliance and privacy protection',
    author: 'data-team@company.com',
    category: 'data-processing',
    tags: ['gdpr', 'privacy', 'data-processing'],
    documentation: 'https://docs.company.com/tools/user-data-processor',
    repository: 'https://github.com/company/user-data-processor',
    license: 'MIT'
  },
  reviewLevel: 'enhanced', // Appropriate for data processing
  businessJustification: 'Required for new customer onboarding flow',
  estimatedUsers: 1000,
  dataClassification: 'confidential'
};

// ❌ Bad: Minimal metadata
const badSubmission = {
  toolMetadata: {
    name: 'tool',
    version: '1.0.0',
    description: 'Does stuff',
    author: 'dev'
  }
};
```

### 2. Error Handling

```typescript
// ✅ Good: Comprehensive error handling
async function submitToolSafely(toolData: any) {
  try {
    const submission = await client.toolReview.submitForReview(toolData);
    return { success: true, sessionId: submission.sessionId };
  } catch (error) {
    if (error.status === 413) {
      return { 
        success: false, 
        error: 'Tool package too large. Maximum size is 100MB.' 
      };
    } else if (error.status === 422) {
      return { 
        success: false, 
        error: 'Invalid tool metadata. Check required fields.' 
      };
    } else if (error.status === 429) {
      return { 
        success: false, 
        error: 'Rate limit exceeded. Try again later.',
        retryAfter: error.headers['retry-after']
      };
    } else {
      return { 
        success: false, 
        error: `Submission failed: ${error.message}` 
      };
    }
  }
}
```

### 3. Monitoring and Alerting

```typescript
// ✅ Good: Set up monitoring for critical reviews
class ReviewMonitor {
  private criticalSessions = new Set<string>();
  
  async monitorCriticalReviews() {
    const sessions = await client.toolReview.listReviewSessions({
      priority: 'critical',
      status: 'in-review'
    });
    
    for (const session of sessions.sessions) {
      this.criticalSessions.add(session.id);
      
      // Check if approaching deadline
      const deadline = new Date(session.estimatedCompletion);
      const now = new Date();
      const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursRemaining < 24 && hoursRemaining > 0) {
        await this.sendDeadlineAlert(session);
      }
    }
  }
  
  private async sendDeadlineAlert(session: any) {
    // Send alert to stakeholders
    console.log(`⚠️ Critical review ${session.id} approaching deadline`);
    console.log(`Tool: ${session.tools[0]?.name}`);
    console.log(`Deadline: ${session.estimatedCompletion}`);
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Submission Failures

```typescript
// Handle common submission issues
async function debugSubmissionFailure(error: any, toolData: any) {
  console.log('Debugging submission failure...');
  
  if (error.status === 422) {
    console.log('Validation errors:');
    error.details?.forEach((detail: any) => {
      console.log(`- ${detail.field}: ${detail.message}`);
    });
  }
  
  if (error.message.includes('checksum')) {
    console.log('Checksum mismatch. Verify tool package integrity.');
  }
  
  if (error.message.includes('authentication')) {
    console.log('Authentication failed. Check JWT token validity.');
    
    // Test token
    try {
      await client.toolReview.getStats();
      console.log('JWT token is valid');
    } catch {
      console.log('JWT token is invalid or expired');
    }
  }
}
```

#### 2. Review Delays

```typescript
// Handle unexpected review delays
async function handleReviewDelay(sessionId: string) {
  const session = await client.toolReview.getReviewSession(sessionId);
  const submissionTime = new Date(session.createdAt);
  const now = new Date();
  const hoursElapsed = (now.getTime() - submissionTime.getTime()) / (1000 * 60 * 60);
  
  console.log(`Review has been in progress for ${hoursElapsed.toFixed(1)} hours`);
  
  if (hoursElapsed > 48 && session.priority === 'critical') {
    console.log('Critical review is overdue. Consider escalating.');
  }
  
  if (session.currentStage === 'scanning' && hoursElapsed > 2) {
    console.log('Scanning is taking longer than expected. Large tool package?');
  }
}
```

#### 3. Download Issues

```typescript
// Handle download failures
async function safeDownload(sessionId: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const signedPackage = await client.toolReview.downloadSignedTool(sessionId);
      return signedPackage;
    } catch (error) {
      console.log(`Download attempt ${i + 1} failed:`, error.message);
      
      if (i === retries - 1) {
        throw new Error(`Download failed after ${retries} attempts`);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## API Reference

For complete API documentation, see the [`ToolReviewClient`](../api/classes/ToolReviewClient.html) reference.

### Key Methods

- [`submitForReview()`](../api/classes/ToolReviewClient.html#submitForReview) - Submit tools for security review
- [`listReviewSessions()`](../api/classes/ToolReviewClient.html#listReviewSessions) - List and filter review sessions
- [`getReviewSession()`](../api/classes/ToolReviewClient.html#getReviewSession) - Get detailed session information
- [`getAnalysis()`](../api/classes/ToolReviewClient.html#getAnalysis) - Retrieve security analysis results
- [`submitDecision()`](../api/classes/ToolReviewClient.html#submitDecision) - Submit review decisions
- [`downloadSignedTool()`](../api/classes/ToolReviewClient.html#downloadSignedTool) - Download approved tools

## Next Steps

- **[Policy Creation Guide](./policy-creation.md)** - Learn how to create access control policies
- **[Secrets Management](./secrets-management.md)** - Securely handle credentials
- **[Agent Management](./agent-management.md)** - Create and manage AI agents
- **[API Reference](../api/index.html)** - Complete API documentation

For more examples and advanced workflows, check out the [examples directory](../../examples/).