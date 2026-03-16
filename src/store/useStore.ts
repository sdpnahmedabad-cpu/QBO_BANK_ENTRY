import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  role?: 'admin' | 'coworker';
  name?: string;
  firm_name?: string;
}

interface Company {
  id: string;
  name: string;
}

// Rules Interface
export type ConditionOperator =
  | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'equals'
  | 'gt' | 'lt' | 'eq' | 'gte' | 'lte';

export type ConditionField = 'Description' | 'Amount';

export type TransactionType = 'Expense' | 'Income' | 'Transfer' | 'Check' | 'Bill' | 'Purchase' | 'Credit Card Credit' | 'Credit Note' | 'Journal Entry';

export interface RuleCondition {
  id: string;
  field: ConditionField;
  operator: ConditionOperator;
  value: string;
}


export interface Rule {
  id: string;
  client_id: string;
  rule_name: string;
  conditions: RuleCondition[];
  matchType: 'AND' | 'OR';
  rule_type: TransactionType;
  actions: {
    ledger: string;
    contactId?: string;
  };
  is_active: boolean;
}

// Contacts (Mock)
export interface Contact {
  id: string;
  name: string;
  type: 'Customer' | 'Vendor' | 'Employee';
}

export interface MasterRule extends Omit<Rule, 'id' | 'client_id' | 'is_active'> {
  id: string;
  appliedClientIds: string[]; // List of client IDs this rule applies to
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  sidebarOpen: boolean;
  selectedCompany: Company;
  toggleSidebar: () => void;
  setCompany: (company: Company) => void;
  setConnectedCompanies: (companies: Company[]) => void;
  connectedCompanies: Company[];
  disconnectCompany: (realmId: string) => Promise<void>;

  // Data
  contacts: Contact[];

  // Rules State
  rules: Rule[];
  masterRules: MasterRule[];
  fetchRules: (companyId: string) => Promise<void>;
  addRule: (rule: Omit<Rule, 'id'>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  editRule: (id: string, updatedRule: Partial<Rule>) => Promise<void>;

  // Master Rules Actions
  addMasterRule: (rule: Omit<MasterRule, 'id'>) => void;
  deleteMasterRule: (id: string) => void;
  editMasterRule: (id: string, updatedRule: Partial<MasterRule>) => void;
}


export const useStore = create<AppState>((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: async () => {
    // Note: Actual Supabase signOut should happen in the component/action area
    set({
      user: null,
      selectedCompany: { id: '', name: '' },
      connectedCompanies: [],
      rules: [],
      masterRules: []
    });
  },
  sidebarOpen: true,
  selectedCompany: { id: '', name: '' },
  connectedCompanies: [],
  contacts: [],
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setCompany: (company) => {
    set({ selectedCompany: company });
    // Fetch rules when company changes
    if (company.id) {
      get().fetchRules(company.id);
    }
  },
  setConnectedCompanies: (companies: Company[]) => set({ connectedCompanies: companies }),
  disconnectCompany: async (realmId: string) => {
    try {
      const res = await fetch('/api/qbo/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: realmId })
      });

      if (!res.ok) throw new Error('Failed to disconnect');

      // Refresh companies list
      const compRes = await fetch('/api/qbo/companies');
      if (compRes.ok) {
        const companies = await compRes.json();
        set({ connectedCompanies: companies });

        // If the disconnected company was the selected one, switch to another or clear
        const { selectedCompany } = get();
        if (selectedCompany.id === realmId) {
          if (companies.length > 0) {
            set({ selectedCompany: companies[0] });
          } else {
            set({ selectedCompany: { id: '', name: '' } });
          }
        }
      }
    } catch (error) {
      console.error("Failed to disconnect company", error);
      throw error;
    }
  },

  // Rules Actions
  rules: [],
  fetchRules: async (companyId) => {
    try {
      const res = await fetch(`/api/rules?companyId=${companyId}`);
      if (res.ok) {
        const rules = await res.json();
        set({ rules });
      }
    } catch (error) {
      console.error("Failed to fetch rules", error);
    }
  },
  addRule: async (rule) => {
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });
      if (res.ok) {
        const newRule = await res.json();
        set((state) => ({ rules: [...state.rules, newRule] }));
      }
    } catch (error) {
      console.error("Failed to add rule", error);
    }
  },
  deleteRule: async (id) => {
    try {
      const res = await fetch(`/api/rules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        set((state) => ({
          rules: state.rules.filter((r) => r.id !== id)
        }));
      }
    } catch (error) {
      console.error("Failed to delete rule", error);
    }
  },
  editRule: async (id, updatedRule) => {
    try {
      const res = await fetch(`/api/rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRule),
      });
      if (res.ok) {
        const savedRule = await res.json();
        set((state) => ({
          rules: state.rules.map((r) => (r.id === id ? savedRule : r)),
        }));
      }
    } catch (error) {
      console.error("Failed to edit rule", error);
    }
  },

  // Master Rules Actions
  masterRules: [],
  addMasterRule: (rule) => set((state) => ({
    masterRules: [...state.masterRules, { id: Math.random().toString(36).substr(2, 9), ...rule } as MasterRule]
  })),
  deleteMasterRule: (id) => set((state) => ({
    masterRules: state.masterRules.filter((r) => r.id !== id)
  })),
  editMasterRule: (id, updatedRule) => set((state) => ({
    masterRules: state.masterRules.map((r) => (r.id === id ? { ...r, ...updatedRule } as MasterRule : r)),
  })),
}));
