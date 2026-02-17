# Policy Creation Guide

This guide covers creating sophisticated access control policies using the Symbiont SDK's [`PolicyBuilder`](../api/classes/PolicyBuilder.html). Policies define what actions are allowed, denied, or require special handling within your AI agents and workflows.

## Table of Contents

- [Overview](#overview)
- [Basic Policy Creation](#basic-policy-creation)
- [Policy Rules](#policy-rules)
- [Conditions and Logic](#conditions-and-logic)
- [Advanced Patterns](#advanced-patterns)
- [Policy Validation](#policy-validation)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Overview

The [`PolicyBuilder`](../api/classes/PolicyBuilder.html) provides a fluent API for constructing complex access control policies. Policies consist of rules that define what actions are permitted under specific conditions.

### Key Concepts

- **Policy**: A collection of rules that govern access and behavior
- **Rule**: A specific directive with an effect (allow, deny, require, audit)
- **Condition**: Criteria that must be met for a rule to apply
- **Effect**: The action taken when a rule matches (allow, deny, require, audit)
- **Priority**: The order in which rules are evaluated

### Policy Effects

- **Allow**: Explicitly permit an action
- **Deny**: Explicitly forbid an action
- **Require**: Action is allowed but additional requirements must be met
- **Audit**: Action is permitted but must be logged/audited

## Basic Policy Creation

### Simple Policy

```typescript
import { PolicyBuilder } from '@symbi/policy';

// Create a simple access control policy
const policy = new PolicyBuilder('dataAccessPolicy')
  .setDescription('Controls access to customer data')
  .setVersion('1.0.0')
  
  // Allow read access for analysts
  .allow('read')
    .where('user.role', 'equals', 'analyst')
    .forTarget('customer-data/*')
    .withDescription('Analysts can read customer data')
    
  // Deny delete operations for everyone except admins
  .deny('delete')
    .where('user.role', 'not-equals', 'admin')
    .forTarget('customer-data/*')
    .withPriority(100)
    
  .build();

console.log('Policy created:', policy.name);
console.log('Rules:', policy.rules.length);
```

### Using the Client's PolicyBuilder

```typescript
import { SymbiontClient } from '@symbi/core';

const client = new SymbiontClient({
  apiKey: process.env.SYMBIONT_API_KEY
});

// Access the policy builder through the client
const policy = client.policyBuilder
  .setName('agentExecutionPolicy')
  .setDescription('Controls agent execution permissions')
  
  .allow('execute')
    .where('user.department', 'equals', 'engineering')
    .where('agent.category', 'in', ['data-processing', 'analysis'])
    .withDescription('Engineers can execute data processing agents')
    
  .build();
```

## Policy Rules

### Allow Rules

```typescript
const policy = new PolicyBuilder('fileAccessPolicy')
  // Basic allow rule
  .allow('read', 'write')
    .forTarget('files/public/*')
    .withDescription('Public files are freely accessible')
    
  // Conditional allow rule
  .allow('read')
    .where('user.clearanceLevel', 'greater-than-or-equals', 3)
    .forTarget('files/confidential/*')
    .withDescription('High clearance users can read confidential files')
    
  // Time-based allow rule
  .allow('execute')
    .where('request.time', 'between', ['09:00', '17:00'])
    .where('request.day', 'in', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
    .withDescription('Agent execution allowed during business hours')
    
  .build();
```

### Deny Rules

```typescript
const securityPolicy = new PolicyBuilder('securityPolicy')
  // Deny dangerous operations
  .deny('delete', 'modify')
    .forTarget('system/*')
    .withDescription('System files cannot be modified')
    .withPriority(1000) // High priority
    
  // Deny access from specific locations
  .deny('*')
    .where('request.ipCountry', 'in', ['blocked-country-1', 'blocked-country-2'])
    .withDescription('Blocked countries cannot access system')
    
  // Deny after hours for sensitive operations
  .deny('export', 'backup')
    .where('request.time', 'not-between', ['09:00', '17:00'])
    .forTarget('sensitive-data/*')
    .withDescription('Sensitive operations restricted to business hours')
    
  .build();
```

### Require Rules

```typescript
const compliancePolicy = new PolicyBuilder('compliancePolicy')
  // Require additional authentication for sensitive data
  .require('access')
    .where('data.classification', 'equals', 'sensitive')
    .withDescription('Sensitive data requires MFA')
    .addMetadata('mfa-required', true)
    .addMetadata('approval-required', false)
    
  // Require approval for high-risk operations
  .require('delete', 'export')
    .where('data.value', 'greater-than', 1000000)
    .withDescription('High-value operations require approval')
    .addMetadata('approval-required', true)
    .addMetadata('approvers', ['security-team', 'data-owner'])
    
  .build();
```

### Audit Rules

```typescript
const auditPolicy = new PolicyBuilder('auditPolicy')
  // Audit all administrative actions
  .audit('create', 'update', 'delete')
    .where('user.role', 'equals', 'admin')
    .withDescription('All admin actions must be audited')
    .addMetadata('audit-level', 'detailed')
    .addMetadata('retention-days', 2555) // 7 years
    
  // Audit access to financial data
  .audit('read', 'export')
    .forTarget('financial-data/*')
    .withDescription('Financial data access must be logged')
    .addMetadata('audit-level', 'comprehensive')
    .addMetadata('compliance-framework', 'SOX')
    
  .build();
```

## Conditions and Logic

### Basic Conditions

```typescript
const policy = new PolicyBuilder('conditionalPolicy')
  .allow('read')
    // Equality
    .where('user.department', 'equals', 'sales')
    
    // Inequality  
    .where('user.level', 'not-equals', 'intern')
    
    // Numeric comparisons
    .where('user.experience', 'greater-than', 2)
    .where('data.size', 'less-than-or-equals', 1000000)
    
    // String operations
    .where('user.email', 'contains', '@company.com')
    .where('file.name', 'starts-with', 'report-')
    .where('file.extension', 'ends-with', '.pdf')
    
    // Array operations
    .where('user.permissions', 'includes', 'data-access')
    .where('user.role', 'in', ['manager', 'director', 'vp'])
    .where('file.tags', 'not-in', ['confidential', 'restricted'])
    
  .build();
```

### Complex Conditions

```typescript
const advancedPolicy = new PolicyBuilder('advancedPolicy')
  .allow('execute')
    // Multiple conditions (AND logic)
    .where('user.department', 'equals', 'engineering')
    .where('user.clearance', 'greater-than-or-equals', 'L3')
    .where('agent.risk-level', 'less-than-or-equals', 'medium')
    .where('request.time', 'between', ['08:00', '20:00'])
    
  // Different rule with OR-like logic using multiple rules
  .allow('read')
    .where('user.role', 'equals', 'data-scientist')
    .forTarget('datasets/public/*')
    
  .allow('read')
    .where('user.role', 'equals', 'analyst')
    .forTarget('datasets/public/*')
    
  .build();
```

### Dynamic Conditions

```typescript
const dynamicPolicy = new PolicyBuilder('dynamicPolicy')
  .allow('access')
    // Time-based conditions
    .where('request.timestamp', 'greater-than', '${currentTime - 3600}') // Last hour
    .where('session.created', 'less-than', '${currentTime - 28800}') // Session < 8 hours old
    
    // Context-dependent conditions
    .where('resource.owner', 'equals', '${user.id}') // User owns the resource
    .where('project.members', 'includes', '${user.id}') // User is project member
    
    // Calculated conditions
    .where('usage.monthly', 'less-than', '${user.quota * 0.8}') // Under 80% quota
    
  .build();
```

## Advanced Patterns

### Hierarchical Policies

```typescript
// Create a base policy for common rules
const basePolicy = new PolicyBuilder('baseSecurityPolicy')
  .deny('*')
    .where('user.status', 'not-equals', 'active')
    .withDescription('Inactive users have no access')
    .withPriority(1000)
    
  .audit('*')
    .where('user.role', 'equals', 'admin')
    .withDescription('Audit all admin actions')
    
  .buildDefinition(); // Build as definition for reuse

// Extend the base policy
const projectPolicy = new PolicyBuilder('projectAccessPolicy')
  // Add base rules
  .addRule(...basePolicy.rules)
  
  // Add specific rules for this project
  .allow('read', 'write')
    .where('user.project', 'equals', 'project-alpha')
    .forTarget('project-alpha/*')
    
  .require('approval')
    .where('action', 'equals', 'deploy')
    .forTarget('project-alpha/production/*')
    
  .build();
```

### Role-Based Access Control (RBAC)

```typescript
const rbacPolicy = new PolicyBuilder('rbacPolicy')
  // Admin role - full access
  .allow('*')
    .where('user.role', 'equals', 'admin')
    .withDescription('Admins have full access')
    .withPriority(900)
    
  // Manager role - broad access with some restrictions
  .allow('read', 'write', 'execute')
    .where('user.role', 'equals', 'manager')
    .forTarget('*')
    .withDescription('Managers have broad access')
    
  .deny('delete')
    .where('user.role', 'equals', 'manager')
    .forTarget('critical-data/*')
    .withDescription('Managers cannot delete critical data')
    .withPriority(800)
    
  // Employee role - limited access
  .allow('read')
    .where('user.role', 'equals', 'employee')
    .where('resource.department', 'equals', '${user.department}')
    .withDescription('Employees can read departmental resources')
    
  .allow('write')
    .where('user.role', 'equals', 'employee')
    .where('resource.owner', 'equals', '${user.id}')
    .withDescription('Employees can write to their own resources')
    
  // Guest role - very limited access
  .allow('read')
    .where('user.role', 'equals', 'guest')
    .forTarget('public/*')
    .withDescription('Guests can only read public resources')
    
  .build();
```

### Attribute-Based Access Control (ABAC)

```typescript
const abacPolicy = new PolicyBuilder('abacPolicy')
  .allow('access')
    // Subject attributes
    .where('user.department', 'equals', 'finance')
    .where('user.clearance', 'greater-than-or-equals', 'confidential')
    
    // Resource attributes
    .where('resource.classification', 'in', ['public', 'internal', 'confidential'])
    .where('resource.department', 'equals', 'finance')
    
    // Environmental attributes
    .where('request.location', 'equals', 'office')
    .where('request.time', 'between', ['06:00', '22:00'])
    .where('system.risk-level', 'less-than-or-equals', 'medium')
    
    // Action attributes
    .where('action.type', 'in', ['read', 'analyze'])
    .where('action.purpose', 'equals', 'business-analytics')
    
  .withDescription('ABAC policy for financial data access')
  .build();
```

### Data Classification Policies

```typescript
const dataClassificationPolicy = new PolicyBuilder('dataClassificationPolicy')
  // Public data - open access
  .allow('*')
    .where('data.classification', 'equals', 'public')
    .withDescription('Public data is freely accessible')
    
  // Internal data - employees only
  .allow('read', 'write')
    .where('data.classification', 'equals', 'internal')
    .where('user.type', 'equals', 'employee')
    
  // Confidential data - need to know basis
  .allow('read')
    .where('data.classification', 'equals', 'confidential')
    .where('user.clearance', 'greater-than-or-equals', 'confidential')
    .where('user.project', 'includes', '${data.project}')
    
  .require('justification')
    .where('data.classification', 'equals', 'confidential')
    .withDescription('Confidential data access requires justification')
    
  // Restricted data - special approval required
  .require('approval')
    .where('data.classification', 'equals', 'restricted')
    .where('user.clearance', 'equals', 'top-secret')
    .addMetadata('approvers', ['security-officer', 'data-owner'])
    
  .audit('*')
    .where('data.classification', 'in', ['confidential', 'restricted'])
    .withDescription('All access to sensitive data must be audited')
    
  .build();
```

## Policy Validation

### Validating Policies

```typescript
// Validate a policy before using it
const policy = new PolicyBuilder('testPolicy')
  .allow('read')
    .where('user.role', 'equals', 'user')
  .deny('write')
    .where('user.role', 'equals', 'guest');

// Validate the policy
const validation = policy.validate();

if (!validation.valid) {
  console.error('Policy validation failed:');
  validation.errors.forEach(error => {
    console.error(`- ${error.field}: ${error.message}`);
  });
} else {
  console.log('Policy is valid');
  
  if (validation.warnings && validation.warnings.length > 0) {
    console.warn('Policy warnings:');
    validation.warnings.forEach(warning => {
      console.warn(`- ${warning.field}: ${warning.message}`);
    });
  }
}

// Only build if validation passes
if (validation.valid) {
  const finalPolicy = policy.build();
}
```

### Testing Policies

```typescript
// Test policy against sample contexts
function testPolicy(policy: Policy, testCases: any[]) {
  console.log(`Testing policy: ${policy.name}`);
  
  testCases.forEach((testCase, index) => {
    console.log(`\nTest Case ${index + 1}: ${testCase.description}`);
    console.log(`Context: ${JSON.stringify(testCase.context)}`);
    
    // In a real implementation, you would evaluate the policy
    // against the context using a policy engine
    const result = evaluatePolicy(policy, testCase.context, testCase.action);
    
    console.log(`Expected: ${testCase.expected}`);
    console.log(`Actual: ${result.decision}`);
    console.log(`Match: ${result.decision === testCase.expected ? '✅' : '❌'}`);
    
    if (result.matchedRules.length > 0) {
      console.log(`Matched Rules: ${result.matchedRules.map(r => r.id).join(', ')}`);
    }
  });
}

// Example test cases
const testCases = [
  {
    description: 'Admin user accessing system files',
    context: { user: { role: 'admin' }, resource: { path: 'system/config.json' } },
    action: 'read',
    expected: 'allow'
  },
  {
    description: 'Guest user accessing confidential data',
    context: { user: { role: 'guest' }, resource: { classification: 'confidential' } },
    action: 'read',
    expected: 'deny'
  }
];

// Mock evaluation function (replace with actual policy engine)
function evaluatePolicy(policy: Policy, context: any, action: string) {
  // This would be implemented by a real policy evaluation engine
  return {
    decision: 'allow', // or 'deny', 'require', 'audit'
    matchedRules: [],
    metadata: {}
  };
}
```

## Best Practices

### 1. Policy Organization

```typescript
// ✅ Good: Well-organized, specific policies
const userAccessPolicy = new PolicyBuilder('userAccessPolicy')
  .setDescription('Controls user access to application resources')
  .setVersion('2.1.0')
  .addMetadata('owner', 'security-team')
  .addMetadata('review-date', '2024-12-31')
  
  // Group related rules together
  // Admin permissions
  .allow('*')
    .where('user.role', 'equals', 'admin')
    .withDescription('Admins have full access')
    .withPriority(100)
    
  // Manager permissions  
  .allow('read', 'write', 'execute')
    .where('user.role', 'equals', 'manager')
    .withDescription('Managers have broad access')
    .withPriority(200)
    
  .build();

// ❌ Bad: Overly complex, single policy
const monolithPolicy = new PolicyBuilder('everythingPolicy')
  .allow('*').where('user.role', 'equals', 'admin')
  .allow('read').where('user.role', 'equals', 'user')
  .deny('delete').where('resource.type', 'equals', 'critical')
  // ... 100 more rules
  .build();
```

### 2. Rule Naming and Documentation

```typescript
// ✅ Good: Clear descriptions and metadata
const policy = new PolicyBuilder('dataGovernancePolicy')
  .allow('export')
    .where('user.department', 'equals', 'analytics')
    .where('data.classification', 'not-equals', 'restricted')
    .withDescription('Analytics team can export non-restricted data for reporting')
    .addMetadata('business-justification', 'Required for monthly business reports')
    .addMetadata('compliance-requirement', 'SOX-404')
    .addMetadata('last-reviewed', '2024-01-15')
    
  .build();
```

### 3. Priority Management

```typescript
// ✅ Good: Logical priority ordering
const prioritizedPolicy = new PolicyBuilder('prioritizedPolicy')
  // Highest priority - security overrides
  .deny('*')
    .where('user.status', 'equals', 'suspended')
    .withPriority(1000)
    .withDescription('Suspended users have no access')
    
  // High priority - administrative access
  .allow('*')
    .where('user.role', 'equals', 'admin')
    .withPriority(900)
    .withDescription('Admin override')
    
  // Medium priority - role-based access
  .allow('read', 'write')
    .where('user.role', 'equals', 'editor')
    .withPriority(500)
    .withDescription('Editor permissions')
    
  // Low priority - default restrictions
  .deny('delete')
    .withPriority(100)
    .withDescription('Default: no delete access')
    
  .build();
```

### 4. Error Handling

```typescript
// ✅ Good: Comprehensive error handling
function createPolicySafely(policyConfig: any) {
  try {
    const builder = new PolicyBuilder(policyConfig.name)
      .setDescription(policyConfig.description)
      .setVersion(policyConfig.version);
    
    // Add rules from configuration
    policyConfig.rules.forEach((ruleConfig: any) => {
      let rule;
      
      switch (ruleConfig.effect) {
        case 'allow':
          rule = builder.allow(...ruleConfig.actions);
          break;
        case 'deny':
          rule = builder.deny(...ruleConfig.actions);
          break;
        case 'require':
          rule = builder.require(...ruleConfig.actions);
          break;
        case 'audit':
          rule = builder.audit(...ruleConfig.actions);
          break;
        default:
          throw new Error(`Unknown rule effect: ${ruleConfig.effect}`);
      }
      
      // Add conditions
      if (ruleConfig.conditions) {
        ruleConfig.conditions.forEach((condition: any) => {
          rule.where(condition.fact, condition.operator, condition.value);
        });
      }
      
      // Add metadata
      if (ruleConfig.description) {
        rule.withDescription(ruleConfig.description);
      }
      
      if (ruleConfig.priority) {
        rule.withPriority(ruleConfig.priority);
      }
    });
    
    // Validate before building
    const validation = builder.validate();
    if (!validation.valid) {
      throw new Error(`Policy validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }
    
    return builder.build();
    
  } catch (error) {
    console.error('Failed to create policy:', error.message);
    return null;
  }
}
```

## Examples

### Complete Real-World Policy

```typescript
// Comprehensive enterprise data access policy
const enterpriseDataPolicy = new PolicyBuilder('enterpriseDataAccessPolicy')
  .setDescription('Enterprise-wide data access control policy')
  .setVersion('3.2.1')
  .addMetadata('owner', 'Chief Data Officer')
  .addMetadata('compliance-frameworks', ['GDPR', 'CCPA', 'SOX'])
  .addMetadata('last-review', '2024-01-01')
  .addMetadata('next-review', '2024-07-01')
  
  // Emergency access override
  .allow('*')
    .where('user.role', 'equals', 'incident-commander')
    .where('system.emergency-mode', 'equals', true)
    .withDescription('Emergency access override for incident response')
    .withPriority(1000)
    .addMetadata('requires-justification', true)
    .addMetadata('auto-expire-hours', 4)
  
  // Data owner full access
  .allow('*')
    .where('user.id', 'equals', '${resource.owner}')
    .withDescription('Data owners have full control over their data')
    .withPriority(950)
  
  // Administrative access with audit
  .allow('read', 'write', 'execute')
    .where('user.role', 'in', ['data-admin', 'system-admin'])
    .withDescription('Administrative access to data systems')
    .withPriority(900)
  
  .audit('*')
    .where('user.role', 'in', ['data-admin', 'system-admin'])
    .withDescription('All admin actions must be audited')
    .addMetadata('audit-level', 'detailed')
  
  // Department-based access
  .allow('read', 'analyze')
    .where('user.department', 'equals', '${resource.department}')
    .where('resource.classification', 'in', ['public', 'internal'])
    .withDescription('Users can access departmental non-confidential data')
    .withPriority(800)
  
  // Role-based confidential data access
  .allow('read')
    .where('user.role', 'in', ['analyst', 'data-scientist', 'manager'])
    .where('user.clearance', 'greater-than-or-equals', 'confidential')
    .where('resource.classification', 'equals', 'confidential')
    .where('user.training.data-privacy', 'equals', 'current')
    .withDescription('Trained analysts can access confidential data')
    .withPriority(700)
  
  .require('purpose-limitation')
    .where('resource.classification', 'equals', 'confidential')
    .withDescription('Confidential data access requires stated purpose')
    .addMetadata('max-purpose-categories', 3)
  
  // PII special handling
  .require('consent-verification')
    .where('resource.contains-pii', 'equals', true)
    .where('action', 'in', ['read', 'process', 'analyze'])
    .withDescription('PII access requires consent verification')
    .withPriority(600)
  
  .audit('*')
    .where('resource.contains-pii', 'equals', true)
    .withDescription('All PII access must be audited')
    .addMetadata('audit-level', 'comprehensive')
    .addMetadata('retention-years', 7)
  
  // Time-based restrictions
  .deny('export', 'backup')
    .where('request.time', 'not-between', ['06:00', '23:00'])
    .where('resource.classification', 'in', ['confidential', 'restricted'])
    .withDescription('Sensitive data operations restricted to business hours')
    .withPriority(500)
  
  // Location-based restrictions
  .deny('*')
    .where('request.country', 'in', ['restricted-country-1', 'restricted-country-2'])
    .withDescription('Access denied from restricted countries')
    .withPriority(950)
  
  .require('vpn')
    .where('request.location', 'not-equals', 'office')
    .where('resource.classification', 'in', ['confidential', 'restricted'])
    .withDescription('Remote access to sensitive data requires VPN')
    .withPriority(400)
  
  // Data retention and deletion
  .require('retention-check')
    .where('action', 'equals', 'delete')
    .where('resource.age-days', 'less-than', '${resource.retention-period}')
    .withDescription('Cannot delete data before retention period expires')
    .withPriority(300)
  
  .audit('delete')
    .withDescription('All delete operations must be audited')
    .addMetadata('audit-level', 'detailed')
    .addMetadata('require-approval', true)
  
  // Default deny for undefined scenarios
  .deny('*')
    .withDescription('Default deny for undefined access scenarios')
    .withPriority(1)
    .addMetadata('review-required', true)
  
  .build();

console.log('Enterprise policy created with', enterpriseDataPolicy.rules.length, 'rules');
```

## Next Steps

- **[Secrets Management Guide](./secrets-management.md)** - Learn how to securely handle credentials
- **[Agent Management](./agent-management.md)** - Apply policies to AI agents
- **[Tool Review Workflow](./tool-review-workflow.md)** - Submit policies for security review
- **[API Reference](../api/classes/PolicyBuilder.html)** - Complete PolicyBuilder API documentation

For more policy examples and templates, check out the [examples directory](../../examples/).