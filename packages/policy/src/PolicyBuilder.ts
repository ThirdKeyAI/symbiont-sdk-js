import {
  Policy,
  PolicyRule,
  PolicyCondition,
  PolicyEffect,
  PolicyOperator,
  PolicyConfiguration,
  PolicySchema,
  PolicyValidationResult,
  PolicyValidationError,
  EnhancedPolicyDefinition
} from '@symbiont/types';

/**
 * Generate a simple unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Builder class for constructing Policy objects with a fluent API
 */
export class PolicyBuilder {
  private policy: Partial<Policy>;
  private currentRule: Partial<PolicyRule> | null = null;
  private ruleIdCounter = 0;

  constructor(name?: string) {
    this.policy = {
      id: generateId(),
      name: name || `policy_${Date.now()}`,
      version: '1.0.0',
      rules: [],
      metadata: {},
    };
  }

  /**
   * Set the policy name
   */
  setName(name: string): PolicyBuilder {
    this.policy.name = name;
    return this;
  }

  /**
   * Set the policy description
   */
  setDescription(description: string): PolicyBuilder {
    this.policy.description = description;
    return this;
  }

  /**
   * Set the policy version
   */
  setVersion(version: string): PolicyBuilder {
    this.policy.version = version;
    return this;
  }

  /**
   * Add metadata to the policy
   */
  addMetadata(key: string, value: unknown): PolicyBuilder {
    if (!this.policy.metadata) {
      this.policy.metadata = {};
    }
    this.policy.metadata[key] = value;
    return this;
  }

  /**
   * Set the policy configuration
   */
  setConfiguration(config: PolicyConfiguration): PolicyBuilder {
    this.policy.configuration = config;
    return this;
  }

  /**
   * Start creating a new rule with allow effect
   */
  allow(...actions: string[]): PolicyBuilder {
    this.finalizeCurrentRule();
    this.currentRule = {
      id: `rule_${++this.ruleIdCounter}`,
      effect: 'allow' as PolicyEffect,
      actions: actions,
      conditions: [],
      priority: 0,
    };
    return this;
  }

  /**
   * Start creating a new rule with deny effect
   */
  deny(...actions: string[]): PolicyBuilder {
    this.finalizeCurrentRule();
    this.currentRule = {
      id: `rule_${++this.ruleIdCounter}`,
      effect: 'deny' as PolicyEffect,
      actions: actions,
      conditions: [],
      priority: 0,
    };
    return this;
  }

  /**
   * Start creating a new rule with require effect
   */
  require(...actions: string[]): PolicyBuilder {
    this.finalizeCurrentRule();
    this.currentRule = {
      id: `rule_${++this.ruleIdCounter}`,
      effect: 'require' as PolicyEffect,
      actions: actions,
      conditions: [],
      priority: 0,
    };
    return this;
  }

  /**
   * Start creating a new rule with audit effect
   */
  audit(...actions: string[]): PolicyBuilder {
    this.finalizeCurrentRule();
    this.currentRule = {
      id: `rule_${++this.ruleIdCounter}`,
      effect: 'audit' as PolicyEffect,
      actions: actions,
      conditions: [],
      priority: 0,
    };
    return this;
  }

  /**
   * Add a condition to the current rule
   */
  where(fact: string, operator: PolicyOperator, value: string | number | boolean | unknown[]): PolicyBuilder {
    if (!this.currentRule) {
      throw new Error('Cannot add condition without starting a rule. Call allow(), deny(), require(), or audit() first.');
    }

    const condition: PolicyCondition = {
      fact,
      operator,
      value,
    };

    if (!this.currentRule.conditions) {
      this.currentRule.conditions = [];
    }
    this.currentRule.conditions.push(condition);
    return this;
  }

  /**
   * Set the target for the current rule
   */
  forTarget(target: string): PolicyBuilder {
    if (!this.currentRule) {
      throw new Error('Cannot set target without starting a rule. Call allow(), deny(), require(), or audit() first.');
    }
    this.currentRule.target = target;
    return this;
  }

  /**
   * Set the priority for the current rule
   */
  withPriority(priority: number): PolicyBuilder {
    if (!this.currentRule) {
      throw new Error('Cannot set priority without starting a rule. Call allow(), deny(), require(), or audit() first.');
    }
    this.currentRule.priority = priority;
    return this;
  }

  /**
   * Set the description for the current rule
   */
  withDescription(description: string): PolicyBuilder {
    if (!this.currentRule) {
      throw new Error('Cannot set description without starting a rule. Call allow(), deny(), require(), or audit() first.');
    }
    this.currentRule.description = description;
    return this;
  }

  /**
   * Add a complete rule to the policy
   */
  addRule(rule: PolicyRule): PolicyBuilder {
    this.finalizeCurrentRule();
    if (!this.policy.rules) {
      this.policy.rules = [];
    }
    this.policy.rules.push(rule);
    return this;
  }

  /**
   * Validate the current policy structure
   */
  validate(): PolicyValidationResult {
    const errors: PolicyValidationError[] = [];
    const warnings: PolicyValidationError[] = [];

    // Finalize any pending rule
    this.finalizeCurrentRule();

    // Validate required fields
    if (!this.policy.name || this.policy.name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'Policy name is required',
        code: 'REQUIRED_FIELD',
        value: this.policy.name,
      });
    }

    if (!this.policy.rules || this.policy.rules.length === 0) {
      errors.push({
        field: 'rules',
        message: 'Policy must have at least one rule',
        code: 'MIN_RULES',
        value: this.policy.rules?.length || 0,
      });
    }

    // Validate rules
    if (this.policy.rules) {
      this.policy.rules.forEach((rule, index) => {
        if (!rule.actions || rule.actions.length === 0) {
          errors.push({
            field: `rules[${index}].actions`,
            message: 'Rule must have at least one action',
            code: 'MIN_ACTIONS',
            value: rule.actions,
          });
        }

        if (rule.priority < 0) {
          errors.push({
            field: `rules[${index}].priority`,
            message: 'Rule priority must be non-negative',
            code: 'INVALID_PRIORITY',
            value: rule.priority,
          });
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Build and return the completed policy object
   */
  build(): Policy {
    this.finalizeCurrentRule();

    const validation = this.validate();
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join(', ');
      throw new Error(`Policy validation failed: ${errorMessages}`);
    }

    // Use Zod schema to validate and transform the policy
    const result = PolicySchema.parse({
      ...this.policy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return result;
  }

  /**
   * Build and return an enhanced policy definition (for use with agents)
   */
  buildDefinition(): EnhancedPolicyDefinition {
    this.finalizeCurrentRule();

    const validation = this.validate();
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join(', ');
      throw new Error(`Policy validation failed: ${errorMessages}`);
    }

    return {
      name: this.policy.name!,
      description: this.policy.description,
      rules: this.policy.rules!,
      configuration: this.policy.configuration,
    };
  }

  /**
   * Reset the builder to start creating a new policy
   */
  reset(): PolicyBuilder {
    this.policy = {
      id: generateId(),
      name: `policy_${Date.now()}`,
      version: '1.0.0',
      rules: [],
      metadata: {},
    };
    this.currentRule = null;
    this.ruleIdCounter = 0;
    return this;
  }

  /**
   * Create a copy of the current builder
   */
  clone(): PolicyBuilder {
    const builder = new PolicyBuilder();
    builder.policy = JSON.parse(JSON.stringify(this.policy));
    builder.currentRule = this.currentRule ? JSON.parse(JSON.stringify(this.currentRule)) : null;
    builder.ruleIdCounter = this.ruleIdCounter;
    return builder;
  }

  /**
   * Finalize the current rule and add it to the policy
   */
  private finalizeCurrentRule(): void {
    if (this.currentRule && this.currentRule.effect && this.currentRule.actions) {
      if (!this.policy.rules) {
        this.policy.rules = [];
      }
      this.policy.rules.push(this.currentRule as PolicyRule);
      this.currentRule = null;
    }
  }
}

/**
 * Factory function to create a new PolicyBuilder instance
 */
export function createPolicyBuilder(name?: string): PolicyBuilder {
  return new PolicyBuilder(name);
}