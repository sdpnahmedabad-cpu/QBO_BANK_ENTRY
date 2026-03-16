-- 1. Create Industry Templates Table
CREATE TABLE IF NOT EXISTS public.industry_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Industry COA Templates Table
CREATE TABLE IF NOT EXISTS public.industry_coa_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_id UUID REFERENCES public.industry_templates(id) ON DELETE CASCADE,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    detail_type TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.industry_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_coa_templates ENABLE ROW LEVEL SECURITY;

-- 4. Policies (Allow all authenticated users to read)
DROP POLICY IF EXISTS "Allow all to view industry templates" ON public.industry_templates;
CREATE POLICY "Allow all to view industry templates" ON public.industry_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all to view COA templates" ON public.industry_coa_templates;
CREATE POLICY "Allow all to view COA templates" ON public.industry_coa_templates FOR SELECT USING (true);

-- 5. Data Seeding
-- Seed Industries
INSERT INTO public.industry_templates (name) VALUES 
('Retail'), 
('Professional Services'), 
('Real Estate'),
('Manufacturing')
ON CONFLICT (name) DO NOTHING;

-- Seed COA Templates for Retail (Example)
DO $$ 
DECLARE 
    retail_id UUID;
    services_id UUID;
BEGIN
    SELECT id INTO retail_id FROM public.industry_templates WHERE name = 'Retail';
    SELECT id INTO services_id FROM public.industry_templates WHERE name = 'Professional Services';

    -- Retail Accounts
    IF retail_id IS NOT NULL THEN
        INSERT INTO public.industry_coa_templates (industry_id, account_name, account_type, detail_type, description) VALUES
        (retail_id, 'Inventory Asset', 'Other Current Asset', 'Inventory', 'Stock of goods for resale'),
        (retail_id, 'Sales of Product Income', 'Income', 'SalesOfProductIncome', 'Revenue from selling goods'),
        (retail_id, 'Cost of Goods Sold', 'Cost of Goods Sold', 'SuppliesMaterialsCogs', 'Cost of items sold'),
        (retail_id, 'Store Supplies', 'Expense', 'SuppliesMaterials', 'Operating supplies for the store');
    END IF;

    -- Professional Services Accounts
    IF services_id IS NOT NULL THEN
        INSERT INTO public.industry_coa_templates (industry_id, account_name, account_type, detail_type, description) VALUES
        (services_id, 'Service Income', 'Income', 'ServiceFeeIncome', 'Revenue from consulting/services'),
        (services_id, 'Professional Fees', 'Expense', 'LegalProfessionalFees', 'Legal and accounting fees'),
        (services_id, 'Software Subscriptions', 'Expense', 'OtherBusinessExpenses', 'Monthly SaaS costs'),
        (services_id, 'Travel Expense', 'Expense', 'Travel', 'Business related travel');
    END IF;
END $$;
